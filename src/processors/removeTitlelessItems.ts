import { Item } from 'rss-parser';
import { ConfirmedItem } from '../domain/ConfirmedItem';

export const removeTitlelessItems = (feed: Item[]): Promise<ConfirmedItem[]> => {
  return new Promise((resolve) => {
    resolve(feed.filter((item) => {
      return !!item.title;
    }) as ConfirmedItem[]);
  });
}