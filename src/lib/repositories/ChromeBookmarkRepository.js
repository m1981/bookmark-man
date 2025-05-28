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
   * Get a bookmark by ID
   * @param {string} id - The bookmark ID
   * @returns {Promise<Object>} The bookmark
   */
  async getById(id) {
    return new Promise((resolve, reject) => {
      this.chrome.bookmarks.get(id, (results) => {
        if (this.chrome.runtime.lastError) {
          reject(new Error(this.chrome.runtime.lastError.message));
          return;
        }
        
        if (results && results.length > 0) {
          resolve(results[0]);
        } else {
          reject(new Error(`Bookmark with ID ${id} not found`));
        }
      });
    });
  }

  /**
   * Create a bookmark or folder
   * @param {Object} createInfo - The create info
   * @returns {Promise<Object>} The created bookmark
   */
  async create(createInfo) {
    return new Promise((resolve, reject) => {
      this.chrome.bookmarks.create(createInfo, (result) => {
        if (this.chrome.runtime.lastError) {
          reject(new Error(this.chrome.runtime.lastError.message));
        } else {
          resolve(result);
        }
      });
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
   * Move a bookmark
   * @param {string} id - The bookmark ID
   * @param {Object} destination - The destination
   * @returns {Promise<Object>} The moved bookmark
   */
  async move(id, destination) {
    return new Promise((resolve, reject) => {
      this.chrome.bookmarks.move(id, destination, (result) => {
        if (this.chrome.runtime.lastError) {
          reject(new Error(this.chrome.runtime.lastError.message));
        } else {
          resolve(result);
        }
      });
    });
  }

  /**
   * Remove a bookmark
   * @param {string} id - The bookmark ID
   * @returns {Promise<void>}
   */
  async remove(id) {
    // Check if this is a protected Chrome folder
    if (['0', '1', '2', '3'].includes(id)) {
      throw new Error(`Cannot remove protected Chrome folder: ${id}`);
    }
    
    return new Promise((resolve, reject) => {
      this.chrome.bookmarks.removeTree(id, () => {
        if (this.chrome.runtime.lastError) {
          reject(new Error(this.chrome.runtime.lastError.message));
        } else {
          resolve();
        }
      });
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