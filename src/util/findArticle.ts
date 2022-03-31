import { Db } from "mongodb";

/**
 * Find an article in the database for a given organisation and ID.
 * @param {object} find Object with org and articleid to query with the DB.
 */
export const findArticle = async (find: object, dbo: Db): Promise<Error | Article | undefined | null> => {
  try {
    return dbo.collection('articles').findOne<Article>(find);
  } catch (error) {
    return new Error(JSON.stringify(error))
  }
}
