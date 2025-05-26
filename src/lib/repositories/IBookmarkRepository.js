/**
 * Interface for bookmark repository operations
 * @interface
 */
export default class IBookmarkRepository {
  /**
   * Gets the complete bookmark tree
   * @returns {Promise<Array>} Promise resolving to bookmark tree
   */
  async getTree() {
    throw new Error('Method not implemented');
  }

  /**
   * Gets a bookmark by ID
   * @param {string} id - Bookmark ID
   * @returns {Promise<Object>} Promise resolving to bookmark node
   */
  async getById(id) {
    throw new Error('Method not implemented');
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
    throw new Error('Method not implemented');
  }

  /**
   * Creates a new bookmark folder
   * @param {Object} folder - Folder data
   * @param {string} folder.title - Folder title
   * @param {string} [folder.parentId] - Parent folder ID
   * @returns {Promise<Object>} Promise resolving to created folder
   */
  async createFolder(folder) {
    throw new Error('Method not implemented');
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
    throw new Error('Method not implemented');
  }

  /**
   * Removes a bookmark or folder
   * @param {string} id - Bookmark or folder ID
   * @returns {Promise<void>}
   */
  async remove(id) {
    throw new Error('Method not implemented');
  }

  /**
   * Searches bookmarks
   * @param {string} query - Search query
   * @returns {Promise<Array>} Promise resolving to matching bookmarks
   */
  async search(query) {
    throw new Error('Method not implemented');
  }
}