import { ExtendedOutput } from '../domain/ExtendedOutput';

/**
 * Takes a fully populated feed from one medium and removes the duplicates.
 * @param {object} feed The orgfeed as retrieved by rss-parser - make sure artid and org are populated.
 * @return {object} The mediumfeed without any duplicate entries.
 */
export const deduplicate = (feed: ExtendedOutput): Promise<ExtendedOutput> => {
  return new Promise((resolve) => {
    // Reduce feed items to unique ID's only
    const seen = {};

    feed.items = feed.items.filter((item) => {
      // Make sure required variables are present
      if (!item.artid || !item.org) {
        return false;
      }

      // eslint-disable-next-line
      // @ts-ignore
      // eslint-disable-next-line no-prototype-builtins
      return seen.hasOwnProperty(item.artid) ? false : (seen[item.artid] = true);
    });

    resolve(feed);
  });
}
