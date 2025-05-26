/**
 * Fetches all bookmarks from Chrome
 * @returns {Promise<Array>} Bookmark tree
 */
export const getBookmarks = async () => {
  try {
    return await chrome.bookmarks.getTree();
  } catch (error) {
    console.error('Error fetching bookmarks:', error);
    return [];
  }
};

/**
 * Searches bookmarks by query
 * @param {string} query - Search term
 * @returns {Promise<Array>} Matching bookmarks
 */
export const searchBookmarks = async (query) => {
  try {
    return await chrome.bookmarks.search(query);
  } catch (error) {
    console.error('Error searching bookmarks:', error);
    return [];
  }
};