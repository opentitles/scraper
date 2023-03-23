import { ExtendedItem } from '../domain';
import { Db } from 'mongodb';
import { LOGLEVEL } from '@fdebijl/clog';
import moment from 'moment';

import { findArticle } from './findArticle';
import { itemToArticle } from './itemToArticle';
import { Notifier } from '../notifiers';
import { clog } from '..';

/**
 * Check with the database if the given article exists and update the title if we have a new one.
 */
export const checkWithDB = async (item: ExtendedItem, dbo: Db, notifier: Notifier): Promise<void> => {
  const find = {
    org: item.org,
    articleID: item.artid,
  };

  const res = await findArticle(find, dbo);

  if (res instanceof Error) {
    clog.log(res, LOGLEVEL.ERROR);
    return;
  }

  if (!res) {
    // Does not exit yet in DB
    const newArticle = await itemToArticle(item);
    dbo.collection('articles').insertOne(newArticle);
    clog.log(`[${item.org}:${item.artid}] Added new article to collection`, LOGLEVEL.OFF);
    return;
  }

  if (!(res instanceof Error)) {
    if (res && res.titles) {
      if (res.titles[res.titles.length - 1].title !== item.title) {
        // Article was already seen but we have a new title, add the latest title
        res.titles.push({title: item.title, datetime: moment().format('MMMM Do YYYY, h:mm:ss a'), timestamp: moment.now()});
        dbo.collection('articles').replaceOne(find, res);
        clog.log(`[${item.org}:${item.artid}] New title added for article`, LOGLEVEL.OFF);
        await notifier.notifyListeners(res);
      } else {
        clog.log(`No new title for [${item.org}:${item.artid}]`, LOGLEVEL.OFF);
      }
    }
  }
}
