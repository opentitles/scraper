import fs from 'fs';
import moment from 'moment';
import async from 'async';
import Parser from 'rss-parser';
import { MongoClient, Db } from 'mongodb';
import { Clog, LOGLEVEL } from '@fdebijl/clog';

import * as Sentry from '@sentry/node';
import { RewriteFrames } from '@sentry/integrations';

import * as CONFIG from './config';
import { ExtendedOutput, ExtendedItem } from './domain';
import { deduplicate, processFeed } from './processors';
import { NotifierFactory, Notifier } from './notifiers';
import { checkAndPropagate, feedIsFresh } from './util';
import { ParserFeedType, ParserItemType} from './domain';

declare global {
  // eslint-disable-next-line @typescript-eslint/no-namespace
  namespace NodeJS {
    interface Global {
      __rootdir__: string;
    }
  }
}

global.__rootdir__ = __dirname || process.cwd();

if (process.env.DSN) {
  Sentry.init({
    dsn: process.env.DSN,
    integrations: [
      new RewriteFrames({
        root: global.__rootdir__,
      }),
    ]
  });
}

const parser: Parser<ParserFeedType, ParserItemType> = new Parser({
  headers: {'User-Agent': 'OpenTitles Scraper by contact@opentitles.info'},
  timeout: 5000,
  maxRedirects: 3,
  customFields: {
    feed: ['pubDate'],
    item: ['wp:arc_uuid'],
  },
});

// Note on logging: some extremely frequent events are supressed using LOGLEVEL.OFF in this file
export const clog = new Clog();

if (!fs.existsSync('media.json')) {
  throw new Error('Media.json could not be found in the scraper directory.');
} const config = JSON.parse(fs.readFileSync('media.json', 'utf8')) as MediaDefinition;

let dbo: Db;
let notifier: Notifier;

const init = async (): Promise<MongoClient> => {
  const client = await MongoClient.connect(CONFIG.MONGO_URL, {
    appName: 'OpenTitles Scraper'
  });

  const dbname = CONFIG.isProd ? CONFIG.MONGO_DB_PROD : CONFIG.MONGO_DB_TEST;
  dbo = client.db(dbname);
  clog.log(`Connected to ${CONFIG.MONGO_URL} with database ${dbname}`, LOGLEVEL.DEBUG);
  notifier = NotifierFactory();
  return client;
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
                  const { fresh, reason } = await feedIsFresh(feedname, medium, feed, dbo);
                  if (fresh) {
                    // Only process the feed if it's fresh
                    const confirmedFeed = await processFeed(feed, medium, feedname, countrycode) as ExtendedOutput;
                    mediumfeed.items.push(...confirmedFeed.items);
                    clog.log(`Fresh feed [${medium.name}.${feedname}] (picked up pubdate: ${feed.pubDate}), Reason: ${reason}`, LOGLEVEL.DEBUG)
                  } else {
                    clog.log(`RSS Feed [${medium.name}.${feedname}] was not fresh! (picked up pubdate: ${feed.pubDate}), Reason: ${reason}`, LOGLEVEL.DEBUG)
                  }
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
    clog.log('Starting scraping run...');
    retrieveArticles().then(() => {
      const end = moment();
      clog.log(`Finished scraping run after ${end.diff(start, 'seconds')}s`);
      process.exit(1);
    })
  })
  .catch((error) => {
    clog.log(`Could not init OpenTitles.Scraper: ${error}`, LOGLEVEL.ERROR);
    Sentry.captureException(error);
    process.exit(1);
  });
