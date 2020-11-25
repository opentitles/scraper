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
    let jobs: {article: Article; medium: MediumDefinition}[] = [];

    const checkMedium = async (): Promise<void> => {
      if (i < limit) {
        const medium = media[i];

        clog.log(`Starting recent article fetch for ${medium.name}`, LOGLEVEL.DEBUG)
        const articles = await getRecentArticles(medium, dbo);
        clog.log(`Got ${articles.length} articles`, LOGLEVEL.DEBUG);

        jobs.push(...(articles.map(article => {
          return {
            article: article,
            medium: medium
          }
        })))

        i++;
        checkMedium();
      } else {
        jobs = shuffle(jobs);
        for (const job of jobs) {
          await notifier.notifyListeners(job.article, job.medium);
        }

        return;
      }
    }

    checkMedium();
  });
}

const shuffle = (a: Array<{article: Article; medium: MediumDefinition }>) => {
  for (let i = a.length - 1; i > 0; i--) {
      const j = Math.floor(Math.random() * (i + 1));
      [a[i], a[j]] = [a[j], a[i]];
  }

  return a;
}