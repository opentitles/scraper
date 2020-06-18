export const articleIdIsValid = (articleId: string): boolean => {
  return !!articleId.match(/[a-z0-9]+/gi);
}