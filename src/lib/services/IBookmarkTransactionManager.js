/**
 * Interface for bookmark transaction management
 * @interface
 */
export default class IBookmarkTransactionManager {
  /**
   * Creates a snapshot of the current bookmark structure
   * @param {string} [name] - Optional name for the snapshot
   * @returns {Promise<Object>} Promise resolving to bookmark snapshot
   */
  async createSnapshot(name) {
    throw new Error('Method not implemented');
  }

  /**
   * Gets all available snapshots
   * @returns {Promise<Array>} Promise resolving to array of snapshots
   */
  async getSnapshots() {
    throw new Error('Method not implemented');
  }

  /**
   * Restores bookmarks from a snapshot
   * @param {string} snapshotId - ID of the snapshot to restore
   * @returns {Promise<boolean>} Promise resolving to success status
   */
  async restoreSnapshot(snapshotId) {
    throw new Error('Method not implemented');
  }

  /**
   * Cleans up old snapshots
   * @param {number} [maxToKeep=10] - Maximum number of snapshots to keep
   * @returns {Promise<void>}
   */
  async cleanupSnapshots(maxToKeep = 10) {
    throw new Error('Method not implemented');
  }
}