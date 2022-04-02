import Parser from 'rss-parser';
import { ExtendedOutput } from '../domain/ExtendedOutput';
import { ParserFeedType } from '../domain/ParserFeedType';
import { ParserItemType } from '../domain/ParserItemType';
import { reduceGuid } from './reduceGuid';
import { removeInvalidItems } from './removeInvalidItems';
import { removeTitlelessItems } from './removeTitlelessItems';

/**
 * Match a guid to each item for the subfeed and check for empty/invalid entries.
 * @param {object} feed The subfeed as retrieved by rss-parser - make sure artid and org are populated.
 * @param {MediumDefinition} medium The medium as defined in media.json
 * @param {string} feedname The name of feed, which will be injected in the article.
 * @param {string} countrycode The ISO 3166-1 Alpha-2 countrycode as defined in media.json
 * @return {object} The feed with all extra variables injected and empty/invalid entries removed.
 */
export const processFeed = async (feed: ParserFeedType & Parser.Output<ParserItemType>, medium: MediumDefinition, feedname: string, countrycode: string): Promise<ExtendedOutput> => {
  if (!feed.items) {
    throw new Error('No items in feed');
  }

  let feedItems = await removeTitlelessItems(feed.items);

  feedItems = feedItems.map((item) => {
    item.artid = reduceGuid(item[medium.id_container], medium.id_mask) as string;
    item.org = medium.name;
    item.feedtitle = feed.title as string;
    item.sourcefeed = feedname;
    item.lang = countrycode;
    item.title = item.title.trim();
    return item;
  });

  // Remove articles for which no guid exists or none was found
  feed.items = await removeInvalidItems(feedItems);
  return feed as unknown as ExtendedOutput;
}
