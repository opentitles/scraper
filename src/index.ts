import fs from 'fs';
import moment from 'moment';
import async from 'async';
import Parser from 'rss-parser';
import { MongoClient, Db } from 'mongodb';
import { Clog, LOGLEVEL } from '@fdebijl/clog';

import * as CONFIG from './config';
import { itemToArticle } from './util/article';
import { ExtendedOutput, ExtendedItem } from './domain';
import {  } from './domain/ExtendedItem';
import { deduplicate, processFeed } from './processors';
import { Notifier, WebhookNotifier, NullNotifier } from './notifiers';

const parser = new Parser({
  headers: {'User-Agent': 'OpenTitles Scraper by contact@opentitles.info'},
  timeout: 5000,
  maxRedirects: 3,
  customFields: {
    item: ['wp:arc_uuid'],
  },
});

// Note on logging: some extremely frequent events are supressed using LOGLEVEL.OFF in this file
const clog = new Clog(CONFIG.MIN_LOGLEVEL as LOGLEVEL);

if (!fs.existsSync('media.json')) {
  throw new Error('Media.json could not be found in the scraper directory.');
} const config = JSON.parse(fs.readFileSync('media.json', 'utf8')) as MediaDefinition;

let dbo: Db;
let notifier: Notifier;

const init = (): Promise<MongoClient> => {
  return new Promise((resolve, reject) => {
    MongoClient.connect(CONFIG.MONGO_URL, {
      appname: 'OpenTitles Scraper',
      useNewUrlParser: true,
      useUnifiedTopology: true
    }).then((client) => {
      dbo = client.db('opentitles');
      clog.log(`Connected to ${CONFIG.MONGO_URL}`, LOGLEVEL.DEBUG);
      notifier = new WebhookNotifier();
      resolve(client);
    }).catch((err) => {
      reject(err);
    });
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
      clog.log(res, LOGLEVEL.ERROR);
      resolve();
    }

    if (!res) {
      // Does not exit yet in DB
      const newArticle = await itemToArticle(item);
      dbo.collection('articles').insertOne(newArticle);
      clog.log(`[${item.org}:${item.artid}] Added new article to collection`, LOGLEVEL.OFF);
      resolve();
    }

    if (!(res instanceof Error)) {
      if (res && res.titles) {
        if (res.titles[res.titles.length - 1].title !== item.title) {
          // Article was already seen but we have a new title, add the latest title
          res.titles.push({title: item.title, datetime: moment().format('MMMM Do YYYY, h:mm:ss a'), timestamp: moment.now()});
          dbo.collection('articles').replaceOne(find, res);
          clog.log(`[${item.org}:${item.artid}] New title added for article`, LOGLEVEL.OFF);
          await notifier.notifyListeners(res);
          return;
        } else {
          clog.log(`No new title for [${item.org}:${item.artid}]`, LOGLEVEL.OFF);
        }
      }
    }
  });
}

/**
 * Send every item to be checked by the DB.
 */
const checkAndPropagate = async (items: ExtendedItem[]): Promise<void> => {
  return new Promise((resolve) => {
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
                  clog.log(`Could not retrieve ${medium.prefix + feedname + medium.suffix}: ${err}`);
                  return nextFeed();
                });
          }, async (err) => {
            // Callback function once all feeds are processed.
            if (err) {
              // Something went wrong when retrieving the feeds.
              clog.log(err);
              return;
            }

            mediumfeed = await deduplicate(mediumfeed);
            await checkAndPropagate(mediumfeed.items);

            return nextMedium();
          });
        }, (err) => {
          // Callback function once all media are processed.
          clog.log(`Processed all media for ${countrycode}, retrieving next country`)
          if (err) {
            // One of the media failed to process, do something here.
            clog.log(err);
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
      clog.log(`Finished scraping run after ${end.diff(start, 'seconds')}s`);
      process.exit(1);
    })
  })
  .catch((error) => {
    clog.log(`Could not init OpenTitles.Scraper: ${error}`, LOGLEVEL.ERROR);
    process.exit(1);
  });
