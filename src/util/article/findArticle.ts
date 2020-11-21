import { Db } from "mongodb";

/**
 * Find an article in the database for a given organisation and ID.
 * @param {object} find Object with org and articleid to query with the DB.
 */
export const findArticle = async (find: object, dbo: Db): Promise<Error | Article | null> => {
  return new Promise((resolve) => {
    dbo.collection('articles').findOne(find, function(err, res) {
      if (err) {
        resolve(new Error(JSON.stringify(err)));
      }

      resolve(res)
    });
  });
}