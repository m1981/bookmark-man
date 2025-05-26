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
   * Gets all available snapshots
   * @returns {Promise<Array>} Promise resolving to array of snapshots
   */
  async getSnapshots() {
    return new Promise((resolve, reject) => {
      try {
        this.chrome.storage.local.get(null, (items) => {
          if (this.chrome.runtime.lastError) {
            reject(new Error(this.chrome.runtime.lastError.message));
            return;
          }
          
          const snapshots = [];
          
          for (const key in items) {
            if (key.startsWith('bookmark_snapshot_')) {
              snapshots.push(items[key]);
            }
          }
          
          // Sort by timestamp (newest first)
          snapshots.sort((a, b) => b.timestamp - a.timestamp);
          
          resolve(snapshots);
        });
      } catch (error) {
        reject(error);
      }
    });
  }

  /**
   * Restores bookmarks from a snapshot
   * @param {string} snapshotId - ID of the snapshot to restore
   * @returns {Promise<boolean>} Promise resolving to success status
   */
  async restoreSnapshot(snapshotId) {
    return new Promise((resolve, reject) => {
      try {
        this.chrome.storage.local.get([`bookmark_snapshot_${snapshotId}`], async (result) => {
          if (this.chrome.runtime.lastError) {
            reject(new Error(this.chrome.runtime.lastError.message));
            return;
          }
          
          const snapshot = result[`bookmark_snapshot_${snapshotId}`];
          
          if (!snapshot) {
            resolve(false);
            return;
          }
          
          try {
            // Create a new snapshot before restoring (for redo capability)
            const currentSnapshot = await this.createSnapshot("Before restore");
            
            // First, record all existing bookmarks to track what needs to be deleted
            const existingBookmarks = new Map();
            await this.mapAllBookmarks(existingBookmarks);
            
            // Start restoring from the snapshot
            await this.restoreBookmarkNode(snapshot.tree[0], null, existingBookmarks);
            
            // Remove any bookmarks that weren't in the snapshot
            for (const [id, info] of existingBookmarks.entries()) {
              if (info.notInSnapshot) {
                await this.removeBookmark(id);
              }
            }
            
            resolve(true);
          } catch (error) {
            console.error('Error restoring snapshot:', error);
            resolve(false);
          }
        });
      } catch (error) {
        reject(error);
      }
    });
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
            this.chrome.storage.local.remove(`bookmark_snapshot_${snapshot.id}`, () => {
              if (this.chrome.runtime.lastError) {
                reject(new Error(this.chrome.runtime.lastError.message));
              } else {
                resolve();
              }
            });
          });
        }
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
      for (const child of node.children) {
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