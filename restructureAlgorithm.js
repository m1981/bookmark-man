/**
 * Bookmark structure transformation algorithm
 */
function restructureBookmarks(sourceStructure, targetStructure) {
  // 1. Create a mapping of all existing bookmarks/folders by name
  const nameToIdMap = createNameToIdMapping(sourceStructure);
  
  // 2. Create missing folders in the target structure
  const createdFolders = createMissingFolders(targetStructure, nameToIdMap);
  
  // 3. Move bookmarks and folders to their new locations
  return moveItemsToTargetStructure(targetStructure, nameToIdMap, createdFolders);
}

/**
 * Creates a mapping of folder/bookmark names to their IDs
 */
function createNameToIdMapping(bookmarkNodes, map = new Map(), path = '') {
  for (const node of bookmarkNodes) {
    const nodePath = path ? `${path}/${node.title}` : node.title;
    map.set(node.title, { id: node.id, path: nodePath });
    
    // Also map the full path to handle duplicate names
    map.set(nodePath, { id: node.id, path: nodePath });
    
    if (node.children) {
      createNameToIdMapping(node.children, map, nodePath);
    }
  }
  return map;
}

/**
 * Creates folders that exist in target but not in source
 */
function createMissingFolders(targetStructure, nameToIdMap, parentId = '1') {
  const createdFolders = new Map();
  
  function processLevel(structure, currentParentId) {
    for (const item of structure) {
      if (item.type === 'folder') {
        let folderId;
        
        // Check if folder exists
        if (nameToIdMap.has(item.title)) {
          folderId = nameToIdMap.get(item.title).id;
        } else {
          // Create new folder
          folderId = createFolder(item.title, currentParentId);
          nameToIdMap.set(item.title, { id: folderId, isNew: true });
        }
        
        createdFolders.set(item.title, folderId);
        
        // Process children recursively
        if (item.children) {
          processLevel(item.children, folderId);
        }
      }
    }
  }
  
  processLevel(targetStructure, parentId);
  return createdFolders;
}

/**
 * Moves items to their target locations
 */
function moveItemsToTargetStructure(targetStructure, nameToIdMap, createdFolders) {
  const operations = [];
  
  function processTargetLevel(structure, parentId, index = 0) {
    for (const item of structure) {
      if (item.type === 'folder') {
        const folderId = createdFolders.get(item.title) || nameToIdMap.get(item.title).id;
        
        // Move folder to correct position
        operations.push({
          type: 'move',
          id: folderId,
          destination: { parentId, index }
        });
        
        // Process children
        if (item.children) {
          processTargetLevel(item.children, folderId);
        }
        
        index++;
      } else if (item.type === 'bookmark') {
        // Find bookmark by title or path
        const bookmarkInfo = nameToIdMap.get(item.title) || nameToIdMap.get(item.path);
        
        if (bookmarkInfo) {
          operations.push({
            type: 'move',
            id: bookmarkInfo.id,
            destination: { parentId, index }
          });
        } else {
          // Bookmark doesn't exist, create it if URL is provided
          if (item.url) {
            operations.push({
              type: 'create',
              bookmark: {
                parentId,
                title: item.title,
                url: item.url,
                index
              }
            });
          }
        }
        
        index++;
      }
    }
  }
  
  processTargetLevel(targetStructure, '1'); // '1' is typically the Bookmarks Bar
  return operations;
}

/**
 * Execute the operations in the correct order
 */
function executeOperations(operations) {
  // Sort operations to create folders first, then move items
  operations.sort((a, b) => {
    if (a.type === 'create' && b.type === 'move') return -1;
    if (a.type === 'move' && b.type === 'create') return 1;
    return 0;
  });
  
  return operations.reduce((promise, operation) => {
    return promise.then(() => {
      if (operation.type === 'move') {
        return moveBookmark(operation.id, operation.destination);
      } else if (operation.type === 'create') {
        return createBookmark(operation.bookmark);
      }
    });
  }, Promise.resolve());
}

// Helper functions that would use Chrome API
function createFolder(title, parentId) {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.create({ title, parentId }, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result.id);
      }
    });
  });
}

function moveBookmark(id, destination) {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.move(id, destination, () => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve();
      }
    });
  });
}

function createBookmark(bookmark) {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.create(bookmark, (result) => {
      if (chrome.runtime.lastError) {
        reject(chrome.runtime.lastError);
      } else {
        resolve(result.id);
      }
    });
  });
}

/**
 * Creates a snapshot of the current bookmark structure
 * @returns {Promise<Object>} Promise resolving to bookmark structure snapshot
 */
function createBookmarkSnapshot() {
  return new Promise((resolve) => {
    chrome.bookmarks.getTree((bookmarkTree) => {
      // Store the complete tree and timestamp
      const snapshot = {
        timestamp: Date.now(),
        tree: JSON.parse(JSON.stringify(bookmarkTree)), // Deep clone
        id: `snapshot_${Date.now()}`
      };
      
      // Store in local storage
      chrome.storage.local.set({ 
        [`bookmark_snapshot_${snapshot.id}`]: snapshot 
      }, () => {
        resolve(snapshot);
      });
    });
  });
}

/**
 * Restores bookmarks from a snapshot
 * @param {string} snapshotId - ID of the snapshot to restore
 * @returns {Promise<boolean>} Promise resolving to success status
 */
async function restoreFromSnapshot(snapshotId) {
  return new Promise((resolve) => {
    chrome.storage.local.get([`bookmark_snapshot_${snapshotId}`], async (result) => {
      const snapshot = result[`bookmark_snapshot_${snapshotId}`];
      
      if (!snapshot) {
        resolve(false);
        return;
      }
      
      try {
        // Create a new snapshot before restoring (for redo capability)
        const currentSnapshot = await createBookmarkSnapshot();
        
        // First, record all existing bookmarks to track what needs to be deleted
        const existingBookmarks = new Map();
        await mapAllBookmarks(existingBookmarks);
        
        // Start restoring from the snapshot
        await restoreBookmarkNode(snapshot.tree[0], null);
        
        // Remove any bookmarks that weren't in the snapshot
        for (const [id, info] of existingBookmarks.entries()) {
          if (info.notInSnapshot) {
            await removeBookmark(id);
          }
        }
        
        resolve(true);
      } catch (error) {
        console.error('Error restoring snapshot:', error);
        resolve(false);
      }
    });
  });
}

/**
 * Maps all current bookmarks to a map for tracking
 */
async function mapAllBookmarks(bookmarkMap) {
  return new Promise((resolve) => {
    chrome.bookmarks.getTree((tree) => {
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
      resolve();
    });
  });
}

/**
 * Recursively restores a bookmark node and its children
 */
async function restoreBookmarkNode(node, parentId) {
  // Skip the root node
  if (node.id === '0') {
    for (const child of node.children) {
      await restoreBookmarkNode(child, null);
    }
    return;
  }
  
  // Handle special root folders (Bookmarks Bar, Other Bookmarks, Mobile Bookmarks)
  if (['1', '2', '3'].includes(node.id)) {
    for (const child of node.children || []) {
      await restoreBookmarkNode(child, node.id);
    }
    return;
  }
  
  // Create or update the bookmark/folder
  let createdNode;
  
  try {
    // Check if node already exists
    try {
      createdNode = await new Promise((resolve) => {
        chrome.bookmarks.get(node.id, (result) => {
          if (chrome.runtime.lastError) {
            resolve(null);
          } else {
            resolve(result[0]);
          }
        });
      });
    } catch (e) {
      createdNode = null;
    }
    
    if (createdNode) {
      // Update existing node
      await new Promise((resolve) => {
        chrome.bookmarks.update(node.id, {
          title: node.title,
          url: node.url
        }, () => resolve());
      });
      
      // Move to correct position if needed
      if (createdNode.parentId !== parentId) {
        await new Promise((resolve) => {
          chrome.bookmarks.move(node.id, {
            parentId: parentId,
            index: node.index
          }, () => resolve());
        });
      }
    } else {
      // Create new node
      createdNode = await new Promise((resolve) => {
        chrome.bookmarks.create({
          parentId: parentId,
          title: node.title,
          url: node.url,
          index: node.index
        }, (newNode) => resolve(newNode));
      });
    }
    
    // Process children recursively
    if (node.children) {
      for (const child of node.children) {
        await restoreBookmarkNode(child, createdNode.id);
      }
    }
  } catch (error) {
    console.error('Error restoring node:', node, error);
    throw error;
  }
}

/**
 * Removes a bookmark or folder
 */
function removeBookmark(id) {
  return new Promise((resolve) => {
    try {
      chrome.bookmarks.removeTree(id, () => {
        if (chrome.runtime.lastError) {
          console.warn('Error removing bookmark:', chrome.runtime.lastError);
        }
        resolve();
      });
    } catch (e) {
      console.warn('Error in removeBookmark:', e);
      resolve();
    }
  });
}

/**
 * Execute restructuring with transaction support
 */
async function executeRestructureWithTransaction(operations) {
  // Create a snapshot before making changes
  const snapshot = await createBookmarkSnapshot();
  
  try {
    // Execute the operations
    await executeOperations(operations);
    
    // Return the snapshot ID for potential rollback
    return {
      success: true,
      snapshotId: snapshot.id,
      message: 'Restructuring completed successfully'
    };
  } catch (error) {
    console.error('Error during restructuring:', error);
    
    // Attempt automatic rollback
    await restoreFromSnapshot(snapshot.id);
    
    return {
      success: false,
      snapshotId: snapshot.id,
      message: 'Restructuring failed and was rolled back automatically'
    };
  }
}

/**
 * Manages bookmark snapshots
 */
const BookmarkTransactionManager = {
  // Store up to 10 recent snapshots
  maxSnapshots: 10,
  
  // Get all available snapshots
  async getSnapshots() {
    return new Promise((resolve) => {
      chrome.storage.local.get(null, (items) => {
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
    });
  },
  
  // Clean up old snapshots
  async cleanupSnapshots() {
    const snapshots = await this.getSnapshots();
    
    if (snapshots.length > this.maxSnapshots) {
      const toRemove = snapshots.slice(this.maxSnapshots);
      
      for (const snapshot of toRemove) {
        chrome.storage.local.remove(`bookmark_snapshot_${snapshot.id}`);
      }
    }
  },
  
  // Create a named snapshot
  async createNamedSnapshot(name) {
    const snapshot = await createBookmarkSnapshot();
    
    // Add name to the snapshot
    snapshot.name = name || `Snapshot ${new Date().toLocaleString()}`;
    
    // Update in storage
    chrome.storage.local.set({ 
      [`bookmark_snapshot_${snapshot.id}`]: snapshot 
    });
    
    await this.cleanupSnapshots();
    return snapshot;
  }
};