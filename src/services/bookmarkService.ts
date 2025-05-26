interface BookmarkNode {
  id: string;
  title: string;
  url?: string;
  children?: BookmarkNode[];
}

/**
 * Fetches all bookmarks from Chrome
 * @returns {Promise<BookmarkNode[]>} Bookmark tree
 */
export const getBookmarks = async (): Promise<BookmarkNode[]> => {
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
 * @returns {Promise<BookmarkNode[]>} Matching bookmarks
 */
export const searchBookmarks = async (query: string): Promise<BookmarkNode[]> => {
  try {
    return await chrome.bookmarks.search(query);
  } catch (error) {
    console.error('Error searching bookmarks:', error);
    return [];
  }
};