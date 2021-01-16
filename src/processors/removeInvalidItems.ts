import { ExtendedItem } from '../domain';

export const removeInvalidItems = (feed: ExtendedItem[]): Promise<ExtendedItem[]> => {
  return new Promise((resolve) => {
    resolve(feed.filter((item) => {
      return !!item.artid;
    }) as ExtendedItem[]);
  });
}