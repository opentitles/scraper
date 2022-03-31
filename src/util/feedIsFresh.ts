import { Db } from "mongodb"
import Parser from "rss-parser"
import moment from "moment";
import { ParserItemType } from "../domain/ParserItemType";
import { ParserFeedType } from "../domain/ParserFeedType";

export const feedIsFresh = async (feedname: string, medium: MediumDefinition, feed: ParserFeedType & Parser.Output<ParserItemType>, dbo: Db): Promise<{fresh: boolean, reason: string}> => {
  if (!feed.pubDate) {
    // There's no way of knowing if the feed is fresh if there's no pubdate, so we let it slide
    return {
      fresh: true,
      reason: 'nopubdate'
    };
  }

  const feedDateEntry: {
    org: string;
    feed: string;
    pubdate: string;
  } | null = await dbo.collection('feeddates').findOne({
    org: medium.name,
    feed: feedname
  }) as unknown as {
    org: string;
    feed: string;
    pubdate: string;
  } | null

  if (!feedDateEntry) {
    // No feeddate so it's likely to be fresh. Let's insert a new feeddate here.

    await dbo.collection('feeddates').insertOne({
      org: medium.name,
      feed: feedname,
      pubdate: feed.pubDate
    });

    return {
      fresh: true,
      reason: 'noDbEntry'
    };
  }

  // RSS Feeds use RFC-822
  const feedDateParsed = moment(feedDateEntry.pubdate, 'ddd, DD MMM YYYY HH:mm:ss ZZ');
  const pubDateParsed  = moment(feed.pubDate, 'ddd, DD MMM YYYY HH:mm:ss ZZ')

  if (feedDateParsed.isBefore(pubDateParsed)) {
    /// The saved date (i.e. last seen date) is before the current pubDate, so the feed must be fresh. Let's update the DB to reflect this.
    await dbo.collection('feeddates').updateOne({
      org: medium.name,
      feed: feedname
    }, {
      $set: { pubdate: feed.pubDate }
    });

    return {
      fresh: true,
      reason: 'fresherThanStoredDate'
    };
  }

  // The saved date is newer or same as the pubdate, so the feed is not fresh.
  return {
    fresh: false,
    reason: 'defaultCase'
  };
}
