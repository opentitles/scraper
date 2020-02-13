import { Item } from 'rss-parser';

export const removeInvalidItems = (feed: Item[]): Promise<Item[]> => {
  return new Promise((resolve) => {
    resolve(feed.filter((item) => {
      return !!item.artid;
    }));
  });
}