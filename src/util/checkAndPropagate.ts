import { ExtendedItem } from "../domain";
import { Db } from "mongodb";
import { Notifier } from "../notifiers";
import { insertArticleToDB } from "./insertArticleToDB";

/**
 * Send every item to be stored in the DB.
 */
export const checkAndPropagate = async (items: ExtendedItem[], dbo: Db, notifier: Notifier): Promise<void> => {
  return new Promise((resolve) => {
    let i = 0;
    const limit = items.length;

    const check = async (): Promise<void> => {
      if (i < limit) {
        const item = items[i];
        insertArticleToDB(item, dbo, notifier);
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