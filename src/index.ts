import fs from 'fs';
import moment from 'moment';
import async from 'async';
import request from 'request';
import Parser from 'rss-parser';
import { MongoClient, Db } from 'mongodb';
import * as CONFIG from './config';

import { clog } from './util/logging';
import { itemToArticle } from './util/article';
import { ExtendedOutput } from './domain/ExtendedOutput';
import { ExtendedItem } from './domain/ExtendedItem';
import { deduplicate } from './processors/deduplicate';
import { processFeed } from './processors/processFeed';

const parser = new Parser({
  headers: {'User-Agent': 'OpenTitles Scraper by floris@debijl.xyz'},
  timeout: 5000,
  maxRedirects: 3,
  customFields: {
    item: ['wp:arc_uuid'],
  },
});

const listeners: Listener[] = [
  {
    name: 'NOSEdits',
    interestedOrgs: ['NOS'],
    webhookuri: 'http://10.10.10.15:7676/notify',
  },
];

if (!fs.existsSync('media.json')) {
  throw new Error('Media.json could not be found in the server directory.');
} const config = JSON.parse(fs.readFileSync('media.json', 'utf8')) as MediaDefinition;

let dbo: Db;

const init = (): Promise<MongoClient> => {
  return new Promise((resolve, reject) => {
    MongoClient.connect(CONFIG.MONGO_URL, {
      appname: 'OpenTitles Scraper',
      useNewUrlParser: true,
      useUnifiedTopology: true
    }).then((client) => {
      dbo = client.db('opentitles');
      clog(`Connected to ${CONFIG.MONGO_URL}`);
      resolve(client);
    }).catch((err) => {
      reject(err);
    });
  });
}

/**
 * Notify all defined listeners that the title for an article has changed.
 * @param {Object} article The article object.
 */
const notifyListeners = async (article: Article): Promise<void> => {
  return new Promise((resolve) => {
    if (!article.org || !article.articleID) {
      resolve();
    }

    if (listeners.length === 0) {
      resolve();
    }

    listeners.forEach((listener) => {
      if (listener.interestedOrgs.includes(article.org)) {
        request.post({
          uri: listener.webhookuri,
          json: true,
          body: article,
        }, (err) => {
          if (err) {
            clog(`Could not reach ${listener.name} when issuing webhook.`);
          } else {
            clog(`Reached ${listener.name} for [${article.org}:${article.articleID}].`);
          }
        });
      }
    });

    return;
  });
}

/**
 * Find an article in the database for a given organisation and ID.
 * @param {object} find Object with org and articleid to query with the DB.
 */
const findArticle = async (find: object): Promise<Error | Article | null> => {
  return new Promise((resolve) => {
    dbo.collection('articles').findOne(find, function(err, res) {
      if (err) {
        resolve(new Error(JSON.stringify(err)));
      }

      resolve(res)
    });
  });
}

/**
 * Check with the database if the given article exists and update the title if we have a new one.
 */
const checkWithDB = (item: ExtendedItem): Promise<void> => {
  return new Promise(async (resolve) => {
    const find = {
      org: item.org,
      articleID: item.artid,
    };

    const res = await findArticle(find);

    if (res instanceof Error) {
      clog(res);
      resolve();
    }

    if (!res) {
      // Does not exit yet in DB
      const newArticle = await itemToArticle(item);
      dbo.collection('articles').insertOne(newArticle);
      // clog(`[${item.org}:${item.artid}] Added new article to collection`);
      resolve();
    }

    if (!(res instanceof Error)) {
      if (res && res.titles) {
        if (res.titles[res.titles.length - 1].title !== item.title) {
          // Article was already seen but we have a new title, add the latest title
          res.titles.push({title: item.title, datetime: moment().format('MMMM Do YYYY, h:mm:ss a'), timestamp: moment.now()});
          dbo.collection('articles').replaceOne(find, res);
          // clog(`[${item.org}:${item.artid}] New title added for article`);
          await notifyListeners(res);
          return;
        } else {
          // clog(`No new title for [${item.org}:${item.artid}]`);
        }
      }
    }
  });
}

/**
 * Send every item to be checked by the DB.
 */
const checkAndPropagate = async (items: ExtendedItem[]): Promise<void> => {
  return new Promise((resolve, reject) => {
    let i = 0;
    const limit = items.length;

    const check = async (): Promise<void> => {
      if (i < limit) {
        const item = items[i];
        checkWithDB(item);
        i++;
        return check();
      } else {
        resolve();
        return;
      }
    }

    check();
  });
}

/**
 * Iterate over all RSS feeds and check for each article if we've seen it already or not
 */
const retrieveArticles = (): Promise<void> => {
  return new Promise((resolve) => {
    const limit = Object.entries(config.feeds).length;
    let i = 0;

    const retrieveNextCountry = (): void => {
      if (i < limit) {
        const country = Object.entries(config.feeds)[i];
        const countrycode = country[0];
        const media = country[1];

        async.forEachSeries(media, (medium, nextMedium) => {
          let mediumfeed: {items: ExtendedItem[]} = {items: []};

          async.forEachSeries(medium.feeds, (feedname, nextFeed) => {
            parser.parseURL(medium.prefix + feedname + medium.suffix)
                .then(async (feed) => {
                  const confirmedFeed = await processFeed(feed, medium, feedname, countrycode) as ExtendedOutput;
                  mediumfeed.items.push(...confirmedFeed.items);
                  return nextFeed();
                })
                .catch((err) => {
                  clog(`Could not retrieve ${medium.prefix + feedname + medium.suffix}`);
                  return nextFeed();
                });
          }, async (err) => {
            // Callback function once all feeds are processed.
            if (err) {
              // Something went wrong when retrieving the feeds.
              clog(err);
              return;
            }

            mediumfeed = await deduplicate(mediumfeed);
            await checkAndPropagate(mediumfeed.items);

            return nextMedium();
          });
        }, (err) => {
          // Callback function once all media are processed.
          clog(`Processed all media for ${countrycode}, retrieving next country`)
          if (err) {
            // One of the media failed to process, do something here.
            clog(err);
          }

          i++;
          retrieveNextCountry();
        });
      } else {
        resolve();
      }
    };

    retrieveNextCountry();
  });
}

init()
  .then(() => {
    const start = moment();
    retrieveArticles().then(() => {
      const end = moment();
      clog(`Finished scraping run after ${end.diff(start, 'seconds')}s`);
      process.exit(1);
    })
  })
  .catch((error) => {
    clog(`Could not init OpenTitles.Scraper:`);
    clog(error);
    process.exit(1);
  });
