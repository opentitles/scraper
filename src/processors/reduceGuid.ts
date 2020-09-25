/**
 * Reduce a given GUID (usually a URL) to a full ID used for tracking the article.
 * @param {string} guid The GUID for this article.
 * @param {string} mask The regex mask to extract the ID with.
 * @return {string} The article ID contained within the GUID.
 */
export const reduceGuid = (guid: string, mask: string): string | false => {
  if (!guid) {
    return false;
  }

  if (typeof guid !== 'string') {
    return false;
  }

  const matches = guid.match(mask);
  if (!matches) {
    return false;
  } else {
    return matches[0];
  }
}