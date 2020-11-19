import { Db } from "mongodb"
import moment from 'moment';

export const getRecentArticles = async (medium: MediumDefinition, dbo: Db, days = 3): Promise<Article[]> => {
  const now = moment().subtract(days, 'days').unix();

  const articles = await dbo.collection('articles')
    .find({
      org: medium.name,
      "titles.0.timestamp": {
          $gte: now
      }
    })
    .sort({"titles.0.timestamp": -1})
    .limit(500)
    .toArray();

  return articles;
}