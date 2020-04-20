import Parser, { Item } from 'rss-parser';

import { ExtendedOutput } from "../domain/ExtendedOutput";
import { ConfirmedItem } from '../domain/ConfirmedItem';
import { BasicProcessor } from '../domain/BasicProcessor';

/**
 * The processer matches a guid to each item for the subfeed and check for empty/invalid entries.
 */
export class ValidatingProcessor extends BasicProcessor {
  /**
   * @param {object} feed The subfeed as retrieved by rss-parser - make sure artid and org are populated.
   * @param {MediumDefinition} medium The medium as defined in media.json
   * @param {string} feedname The name of feed, which will be injected in the article.
   * @param {string} countrycode The ISO 3166-1 Alpha-2 countrycode as defined in media.json
   */
  constructor(feed: Parser.Output, medium: MediumDefinition, feedname: string, countrycode: string) {
    super(feed, medium, feedname, countrycode);

    if (!feed.items) {
      throw new Error('No items in feed');
    }

    this.removeTitlelessItems(feed.items).then((feedItems) => {
      this.outputFeedItems = feedItems;
    })
  }

  async toExtendedOutput(): Promise<ExtendedOutput> {
    // Append additional metadata to each item
    this.outputFeedItems = this.outputFeedItems.map((item) => {
      item.artid = this.reduceGuid(item[this.inputMedium.id_container], this.inputMedium.id_mask);
      item.org = this.inputMedium.name;
      item.feedtitle = this.inputFeed.title;
      item.sourcefeed = this.inputFeedName;
      item.lang = this.inputCountryCode;
      item.title = item.title.trim();
      return item;
    });

    // Remove articles for which no guid exists or none was found
    this.inputFeed.items = await this.removeInvalidItems(this.outputFeedItems);
    return (this.inputFeed as ExtendedOutput);
  }

  /**
   * Remove any items from a feed that don't have an Article ID or are otherwise invalid
   * @param feed {Item[]} The feed from rss-parser
   */
  async removeInvalidItems(feed: Item[]): Promise<Item[]> {
    return new Promise((resolve) => {
      resolve(feed.filter((item) => {
        return !!item.artid;
      }));
    });
  }

  /**
   * Remove any items from a feed that don't have a title
   * @param feed {Item[]} The feed from rss-parser
   */
  async removeTitlelessItems(feed: Item[]): Promise<ConfirmedItem[]> {
    return new Promise((resolve) => {
      resolve(feed.filter((item) => {
        return !!item.title;
      }) as ConfirmedItem[]);
    });
  }

  /**
   * Reduce a given GUID (usually a URL) to a full ID used for tracking the article.
   * @param {string} guid The GUID for this article.
   * @param {string} mask The regex mask to extract the ID with.
   * @return {string} The article ID contained within the GUID.
   */
  reduceGuid(guid: string, mask: string): string | false {
    if (!guid) {
      return false;
    }

    const matches = guid.match(mask);
    if (!matches) {
      return false;
    } else {
      return matches[0];
    }
  }
}