import moment from 'moment';
import { ExtendedItem } from '../domain/ExtendedItem';

export const itemToArticle = async (article: ExtendedItem): Promise<Article> => {
  if (article.guid.startsWith('$')) {
    article.guid = article.guid.replace('$', '_$');
  }

  return {
    org: article.org,
    articleID: article.artid,
    feedtitle: article.feedtitle,
    sourcefeed: article.sourcefeed,
    lang: article.lang,
    link: article.link,
    guid: article.guid,
    titles: [{title: article.title, datetime: moment(article.pubDate).format('MMMM Do YYYY, h:mm:ss a'), timestamp: moment.now()}],
    first_seen: moment().format('MMMM Do YYYY, h:mm:ss a'),
    pub_date: moment(article.pubDate).format('MMMM Do YYYY, h:mm:ss a'),
  };
};
