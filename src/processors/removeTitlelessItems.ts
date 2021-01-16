import { Item } from 'rss-parser';
import { ExtendedItem } from '../domain';

export const removeTitlelessItems = (feed: Item[]): Promise<ExtendedItem[]> => {
  return new Promise((resolve) => {
    resolve(feed.filter((item) => {
      return !!item.title;
    }) as ExtendedItem[]);
  });
}