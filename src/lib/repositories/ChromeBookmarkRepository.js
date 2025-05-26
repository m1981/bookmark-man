import IBookmarkRepository from './IBookmarkRepository.js';

/**
 * Chrome implementation of bookmark repository
 * @implements {IBookmarkRepository}
 */
export default class ChromeBookmarkRepository extends IBookmarkRepository {
  /**
   * @constructor
   * @param {Object} chromeAPI - Chrome API object (for testing)
   */
  constructor(chromeAPI = chrome) {
    super();
    this.chrome = chromeAPI;
  }

  /**
   * Gets the complete bookmark tree
   * @returns {Promise<Array>} Promise resolving to bookmark tree
   */
  async getTree() {
    return new Promise((resolve, reject) => {
      try {
        this.chrome.bookmarks.getTree((bookmarkTreeNodes) => {
          if (this.chrome.runtime.lastError) {
            reject(new Error(this.chrome.runtime.lastError.message));
          } else {
            resolve(bookmarkTreeNodes);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Gets a bookmark by ID
   * @param {string} id - Bookmark ID
   * @returns {Promise<Object>} Promise resolving to bookmark node
   */
  async getById(id) {
    return new Promise((resolve, reject) => {
      try {
        this.chrome.bookmarks.get(id, (result) => {
          if (this.chrome.runtime.lastError) {
            reject(new Error(this.chrome.runtime.lastError.message));
          } else if (result && result.length > 0) {
            resolve(result[0]);
          } else {
            reject(new Error(`Bookmark with ID ${id} not found`));
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Creates a new bookmark
   * @param {Object} bookmark - Bookmark data
   * @param {string} bookmark.title - Bookmark title
   * @param {string} bookmark.url - Bookmark URL
   * @param {string} [bookmark.parentId] - Parent folder ID
   * @returns {Promise<Object>} Promise resolving to created bookmark
   */
  async create(bookmark) {
    return new Promise((resolve, reject) => {
      try {
        this.chrome.bookmarks.create(bookmark, (result) => {
          if (this.chrome.runtime.lastError) {
            reject(new Error(this.chrome.runtime.lastError.message));
          } else {
            resolve(result);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Creates a new bookmark folder
   * @param {Object} folder - Folder data
   * @param {string} folder.title - Folder title
   * @param {string} [folder.parentId] - Parent folder ID
   * @returns {Promise<Object>} Promise resolving to created folder
   */
  async createFolder(folder) {
    // Folders in Chrome are just bookmarks without URLs
    return this.create({
      title: folder.title,
      parentId: folder.parentId
    });
  }

  /**
   * Moves a bookmark or folder
   * @param {string} id - Bookmark or folder ID
   * @param {Object} destination - Destination data
   * @param {string} destination.parentId - Destination parent folder ID
   * @param {number} [destination.index] - Position index
   * @returns {Promise<void>}
   */
  async move(id, destination) {
    return new Promise((resolve, reject) => {
      try {
        this.chrome.bookmarks.move(id, destination, () => {
          if (this.chrome.runtime.lastError) {
            reject(new Error(this.chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Removes a bookmark or folder
   * @param {string} id - Bookmark or folder ID
   * @returns {Promise<void>}
   */
  async remove(id) {
    return new Promise((resolve, reject) => {
      try {
        // Skip special Chrome folders
        if (['0', '1', '2', '3'].includes(id)) {
          reject(new Error(`Cannot remove protected Chrome folder: ${id}`));
          return;
        }
        
        this.chrome.bookmarks.removeTree(id, () => {
          if (this.chrome.runtime.lastError) {
            reject(new Error(this.chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Searches bookmarks
   * @param {string} query - Search query
   * @returns {Promise<Array>} Promise resolving to matching bookmarks
   */
  async search(query) {
    return new Promise((resolve, reject) => {
      try {
        this.chrome.bookmarks.search(query, (results) => {
          if (this.chrome.runtime.lastError) {
            reject(new Error(this.chrome.runtime.lastError.message));
          } else {
            resolve(results);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }
}