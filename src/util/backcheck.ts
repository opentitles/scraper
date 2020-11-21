import { Db } from "mongodb";
import { Clog, LOGLEVEL} from '@fdebijl/clog';

import { flattenMediaList } from "../media/flattenMediaList";
import { getRecentArticles } from "../media/getRecentArticles";
import { PubSubNotifier } from "../notifiers";

const clog = new Clog();
const notifier = new PubSubNotifier();

/**
 * Check all articles from all media from the last three days for title changes
 */
export const backcheck = async (config: MediaDefinition, dbo: Db): Promise<void> => {
  return new Promise(async (resolve) => {
    // Get a list of all media without the overlying country keys
    const media = await flattenMediaList(config);

    let i = 0;
    const limit = media.length;

    const checkMedium = async (): Promise<void> => {
      if (i < limit) {
        const medium = media[i];

        clog.log(`Starting recent article fetch for ${medium.name}`, LOGLEVEL.DEBUG)
        const articles = await getRecentArticles(medium, dbo);
        clog.log(`Got ${articles.length} articles`, LOGLEVEL.DEBUG);

        for (const article of articles) {
          await notifier.notifyListeners(article, medium);

        }

        i++;
        checkMedium();
      } else {
        resolve();
        return;
      }
    }

    checkMedium();
  });
}