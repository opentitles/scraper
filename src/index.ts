import fs from 'fs';
import moment from 'moment';
import async from 'async';
import Parser from 'rss-parser';
import { MongoClient, Db } from 'mongodb';
import { Clog, LOGLEVEL } from '@fdebijl/clog';

import * as CONFIG from './config';
import { ExtendedOutput, ExtendedItem } from './domain';
import {  } from './domain/ExtendedItem';
import { deduplicate, processFeed } from './processors';
import { Notifier, PubSubNotifier } from './notifiers';
import { checkAndPropagate } from './util/checkAndPropagate';

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
      const dbname = CONFIG.isProd ? CONFIG.MONGO_DB_PROD : CONFIG.MONGO_DB_TEST;
      dbo = client.db(dbname);
      clog.log(`Connected to ${CONFIG.MONGO_URL} with database ${dbname}`, LOGLEVEL.DEBUG);
      notifier = new PubSubNotifier();
      resolve(client);
    }).catch((err) => {
      reject(err);
    });
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
            await checkAndPropagate(mediumfeed.items, dbo, notifier);

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
