import { ExtendedItem } from "../domain";
import { Db } from "mongodb";
import { Clog, LOGLEVEL } from '@fdebijl/clog';
import moment from 'moment';

import { findArticle } from "./findArticle";
import { itemToArticle } from "./itemToArticle";
import { Notifier } from "../notifiers";

const clog = new Clog();

/**
 * Check with the database if the given article exists and update any titles if we have a new one.
 */
export const insertTitleToDB = (article: Article, possiblyNewTitle: string, dbo: Db, notifier: Notifier): Promise<void> => {
  return new Promise(async (resolve) => {
    const find = {
      org: article.org,
      articleID: article.articleID,
    };

    const res = await findArticle(find, dbo);

    if (res instanceof Error) {
      clog.log(res, LOGLEVEL.ERROR);
      resolve();
    }

    if (!(res instanceof Error)) {
      if (res && res.titles) {
        if (res.titles[res.titles.length - 1].title !== possiblyNewTitle) {
          // Article was already seen but we have a new title, add the latest title
          res.titles.push({title: possiblyNewTitle, datetime: moment().format('MMMM Do YYYY, h:mm:ss a'), timestamp: moment.now()});
          dbo.collection('articles').replaceOne(find, res);
          clog.log(`[${article.org}:${article.articleID}] New title added for article`, LOGLEVEL.DEBUG);
          await notifier.notifyListeners(res);
          return;
        } else {
          clog.log(`No new title for [${article.org}:${article.articleID}]`, LOGLEVEL.DEBUG);
        }
      }
    }
  });
}