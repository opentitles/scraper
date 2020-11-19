import { ExtendedItem } from "../domain";
import { Db } from "mongodb";
import { Clog, LOGLEVEL } from '@fdebijl/clog';
import moment from 'moment';

import { findArticle } from "./findArticle";
import { itemToArticle } from "./itemToArticle";
import { Notifier } from "../notifiers";

const clog = new Clog();

/**
 * Check with the database if the given article exists and insert if we have a new one.
 */
export const insertArticleToDB = (item: ExtendedItem, dbo: Db, notifier: Notifier): Promise<void> => {
  return new Promise(async (resolve) => {
    const find = {
      org: item.org,
      articleID: item.artid,
    };

    const res = await findArticle(find, dbo);

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
    } else {
      resolve();
    }
  });
}