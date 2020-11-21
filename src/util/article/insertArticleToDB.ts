import { Db } from "mongodb";
import { Clog, LOGLEVEL } from '@fdebijl/clog';

import { findArticle } from "./findArticle";
import { itemToArticle } from "./itemToArticle";
import { ExtendedItem } from "../../domain";

const clog = new Clog();

/**
 * Check with the database if the given article exists and insert if we have a new one.
 */
export const insertArticleToDB = (item: ExtendedItem, dbo: Db): Promise<void> => {
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
      clog.log(`[${item.org}:${item.artid}] Added new article to collection`, LOGLEVEL.DEBUG);
      resolve();
    } else {
      resolve();
    }
  });
}