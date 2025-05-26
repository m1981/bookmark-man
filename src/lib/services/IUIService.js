/**
 * Interface for UI service
 * @interface
 */
export default class IUIService {
  /**
   * Shows a dialog to the user
   * @param {Object} options - Dialog options
   * @param {string} options.type - Dialog type ('organize', 'results', 'snapshot')
   * @param {string} options.title - Dialog title
   * @param {string} [options.content] - Dialog content
   * @param {Array} options.buttons - Dialog buttons
   * @returns {Promise<Object>} Promise resolving to dialog result
   */
  async showDialog(options) {
    throw new Error('Method not implemented');
  }

  /**
   * Shows restructuring results to the user
   * @param {Object} result - Restructure result
   * @param {boolean} result.success - Whether restructuring was successful
   * @param {string} result.message - Result message
   * @param {string} [result.snapshotId] - ID of created snapshot
   * @param {Array} [result.operations] - Executed operations
   * @returns {void}
   */
  showResults(result) {
    throw new Error('Method not implemented');
  }

  /**
   * Renders bookmark tree in the UI
   * @param {Array} bookmarks - Bookmark nodes to render
   * @returns {void}
   */
  renderBookmarkTree(bookmarks) {
    throw new Error('Method not implemented');
  }
}