import IBookmarkTransactionManager from './IBookmarkTransactionManager.js';

/**
 * Chrome implementation of bookmark transaction manager
 * @implements {IBookmarkTransactionManager}
 */
export default class ChromeBookmarkTransactionManager extends IBookmarkTransactionManager {
  /**
   * @constructor
   * @param {import('../repositories/IBookmarkRepository').default} repository - Bookmark repository
   * @param {Object} chromeAPI - Chrome API object (for testing)
   * @param {number} [maxSnapshots=10] - Maximum number of snapshots to keep
   */
  constructor(repository, chromeAPI = chrome, maxSnapshots = 10) {
    super();
    this.repository = repository;
    this.chrome = chromeAPI;
    this.maxSnapshots = maxSnapshots;
  }

  /**
   * Creates a snapshot of the current bookmark structure
   * @param {string} [name] - Optional name for the snapshot
   * @returns {Promise<Object>} Promise resolving to bookmark snapshot
   */
  async createSnapshot(name) {
    const bookmarkTree = await this.repository.getTree();
    
    // Store the complete tree and timestamp
    const snapshot = {
      timestamp: Date.now(),
      tree: JSON.parse(JSON.stringify(bookmarkTree)), // Deep clone
      id: `snapshot_${Date.now()}`,
      name: name || `Snapshot ${new Date().toLocaleString()}`
    };
    
    // Store in local storage
    return new Promise((resolve, reject) => {
      try {
        this.chrome.storage.local.set({ 
          [`bookmark_snapshot_${snapshot.id}`]: snapshot 
        }, () => {
          if (this.chrome.runtime.lastError) {
            reject(new Error(this.chrome.runtime.lastError.message));
          } else {
            resolve(snapshot);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Get all snapshots
   * @returns {Promise<Array>} The snapshots
   */
  async getSnapshots() {
    return new Promise((resolve) => {
      // First try to get from the bookmarkSnapshots array
      this.chrome.storage.local.get('bookmarkSnapshots', (result) => {
        if (result.bookmarkSnapshots && result.bookmarkSnapshots.length > 0) {
          console.log('Retrieved snapshots from array:', result.bookmarkSnapshots);
          resolve(result.bookmarkSnapshots);
          return;
        }
        
        // If not found, try to get individual snapshot keys
        this.chrome.storage.local.get(null, (allItems) => {
          console.log('All storage items:', allItems);
          const snapshots = [];
          
          // Look for keys that match the snapshot pattern
          for (const key in allItems) {
            if (key.startsWith('bookmark_snapshot_')) {
              const snapshot = allItems[key];
              snapshots.push({
                id: key.replace('bookmark_snapshot_', ''),
                timestamp: snapshot.timestamp || Date.now(),
                name: snapshot.name || 'Unnamed Snapshot',
                tree: snapshot.tree || []
              });
            }
          }
          
          console.log('Retrieved snapshots from individual keys:', snapshots);
          
          // Sort by timestamp (newest first)
          snapshots.sort((a, b) => b.timestamp - a.timestamp);
          
          // Save to the array format for future use
          if (snapshots.length > 0) {
            this.chrome.storage.local.set({ bookmarkSnapshots: snapshots }, () => {
              // Optional callback, do nothing
            });
          }
          
          resolve(snapshots);
        });
      });
    });
  }

  /**
   * Restore from a snapshot
   * @param {string} snapshotId - The snapshot ID
   * @returns {Promise<boolean>} Success
   */
  async restoreSnapshot(snapshotId) {
    try {
      console.log('Restoring from snapshot:', snapshotId);
      
      // Try to get the snapshot from both storage methods
      let snapshot = null;
      
      // First try from the array
      const snapshots = await this.getSnapshots();
      snapshot = snapshots.find(s => s.id === snapshotId);
      
      // If not found, try from individual key
      if (!snapshot) {
        const storageKey = `bookmark_snapshot_${snapshotId}`;
        const result = await new Promise(resolve => {
          this.chrome.storage.local.get(storageKey, resolve);
        });
        
        if (result[storageKey]) {
          snapshot = result[storageKey];
          snapshot.id = snapshotId;
        }
      }
      
      if (!snapshot) {
        console.error(`Snapshot with ID ${snapshotId} not found`);
        throw new Error(`Snapshot with ID ${snapshotId} not found`);
      }
      
      console.log('Found snapshot to restore:', snapshot);
      
      // Create a snapshot of the current state before restoring
      await this.createSnapshot('Auto-backup before restore');
      
      // Implement actual restore logic here
      console.log('Restoring bookmark structure from snapshot');
      
      // Create a map of existing bookmarks for tracking
      const existingBookmarks = new Map();
      await this.mapAllBookmarks(existingBookmarks);
      
      // Start restoring from the root of the snapshot tree
      for (const rootNode of snapshot.tree) {
        await this.restoreBookmarkNode(rootNode, null, existingBookmarks);
      }
      
      // Remove bookmarks that weren't in the snapshot
      for (const [id, data] of existingBookmarks.entries()) {
        if (data.notInSnapshot) {
          console.log(`Removing bookmark not in snapshot: ${id} (${data.title})`);
          await this.removeBookmark(id);
        }
      }
      
      console.log('Bookmark restoration complete');
      return true;
    } catch (error) {
      console.error('Error restoring from snapshot:', error);
      return false;
    }
  }

  /**
   * Cleans up old snapshots
   * @param {number} [maxToKeep=10] - Maximum number of snapshots to keep
   * @returns {Promise<void>}
   */
  async cleanupSnapshots(maxToKeep = this.maxSnapshots) {
    try {
      const snapshots = await this.getSnapshots();
      
      if (snapshots.length > maxToKeep) {
        const toRemove = snapshots.slice(maxToKeep);
        
        for (const snapshot of toRemove) {
          await new Promise((resolve, reject) => {
            const key = `bookmark_snapshot_${snapshot.id}`;
            this.chrome.storage.local.remove(key, () => {
              if (this.chrome.runtime.lastError) {
                reject(new Error(this.chrome.runtime.lastError.message));
              } else {
                resolve();
              }
            });
          });
        }
        
        // Update the bookmarkSnapshots array
        const keptSnapshots = snapshots.slice(0, maxToKeep);
        await new Promise((resolve, reject) => {
          this.chrome.storage.local.set({ bookmarkSnapshots: keptSnapshots }, () => {
            if (this.chrome.runtime.lastError) {
              reject(new Error(this.chrome.runtime.lastError.message));
            } else {
              resolve();
            }
          });
        });
      }
    } catch (error) {
      console.error('Error cleaning up snapshots:', error);
      throw error;
    }
  }

  /**
   * Maps all current bookmarks to a map for tracking
   * @private
   * @param {Map} bookmarkMap - Map to populate
   * @returns {Promise<void>}
   */
  async mapAllBookmarks(bookmarkMap) {
    const tree = await this.repository.getTree();
    
    function traverse(nodes) {
      for (const node of nodes) {
        if (node.id !== '0') { // Skip root
          bookmarkMap.set(node.id, { 
            title: node.title, 
            url: node.url,
            notInSnapshot: true // Mark for potential deletion
          });
        }
        
        if (node.children) {
          traverse(node.children);
        }
      }
    }
    
    traverse(tree);
  }

  /**
   * Recursively restores a bookmark node and its children
   * @private
   * @param {Object} node - Bookmark node to restore
   * @param {string} parentId - Parent folder ID
   * @param {Map} existingBookmarks - Map of existing bookmarks
   * @returns {Promise<void>}
   */
  async restoreBookmarkNode(node, parentId, existingBookmarks) {
    // Skip the root node
    if (node.id === '0') {
      for (const child of node.children || []) {
        await this.restoreBookmarkNode(child, null, existingBookmarks);
      }
      return;
    }
    
    // Handle special root folders (Bookmarks Bar, Other Bookmarks, Mobile Bookmarks)
    if (['1', '2', '3'].includes(node.id)) {
      for (const child of node.children || []) {
        await this.restoreBookmarkNode(child, node.id, existingBookmarks);
      }
      return;
    }
    
    // Mark this bookmark as found in the snapshot
    if (existingBookmarks.has(node.id)) {
      existingBookmarks.get(node.id).notInSnapshot = false;
    }
    
    let createdNode;
    
    try {
      // Check if the bookmark exists
      createdNode = await this.repository.getById(node.id);
    } catch (error) {
      // Bookmark doesn't exist, will create it
      createdNode = null;
    }
    
    if (createdNode) {
      // Update existing node
      try {
        await this.updateBookmark(node);
        
        // Move to correct position if needed
        if (createdNode.parentId !== parentId) {
          await this.repository.move(node.id, {
            parentId: parentId,
            index: node.index
          });
        }
      } catch (error) {
        console.warn(`Error updating bookmark ${node.id}:`, error);
      }
    } else {
      // Create new node
      try {
        const createData = {
          parentId: parentId,
          title: node.title,
          index: node.index
        };
        
        if (node.url) {
          createData.url = node.url;
        }
        
        await this.repository.create(createData);
      } catch (error) {
        console.warn(`Error creating bookmark ${node.title}:`, error);
      }
    }
    
    // Process children if this is a folder
    if (node.children) {
      for (const child of node.children) {
        await this.restoreBookmarkNode(child, node.id, existingBookmarks);
      }
    }
  }

  /**
   * Updates a bookmark's properties
   * @private
   * @param {Object} node - Bookmark node to update
   * @returns {Promise<void>}
   */
  async updateBookmark(node) {
    // Chrome doesn't have a direct update method, so we use move and create
    // to simulate an update
    const updateData = {};
    
    if (node.title) {
      updateData.title = node.title;
    }
    
    if (node.url) {
      updateData.url = node.url;
    }
    
    if (Object.keys(updateData).length > 0) {
      await new Promise((resolve, reject) => {
        this.chrome.bookmarks.update(node.id, updateData, () => {
          if (this.chrome.runtime.lastError) {
            reject(new Error(this.chrome.runtime.lastError.message));
          } else {
            resolve();
          }
        });
      });
    }
  }

  /**
   * Removes a bookmark
   * @private
   * @param {string} id - Bookmark ID
   * @returns {Promise<void>}
   */
  async removeBookmark(id) {
    // Skip special Chrome folders
    if (['0', '1', '2', '3'].includes(id)) {
      return;
    }
    
    try {
      await this.repository.remove(id);
    } catch (error) {
      console.warn(`Error removing bookmark ${id}:`, error);
    }
  }
}