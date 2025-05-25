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
    map.set(node.title, { id: node.id, title: node.title, path: nodePath });
    
    // Also map the full path to handle duplicate names
    map.set(nodePath, { id: node.id, title: node.title, path: nodePath });
    
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
  const operations = [];
  
  // Validate the initial parentId
  if (!parentId || parentId === 'undefined') {
    console.warn(`Invalid initial parentId: ${parentId}, defaulting to '1'`);
    parentId = '1';
  }
  
  console.log("Starting createMissingFolders with parentId:", parentId);
  console.log("Initial nameToIdMap:", Array.from(nameToIdMap.entries()));
  
  function processLevel(structure, currentParentId) {
    console.log(`Processing level with parentId: ${currentParentId}`);
    
    for (const item of structure) {
      if (item.type === 'folder') {
        console.log(`Processing folder: ${item.title}`);
        let folderId;
        
        // Check if folder exists
        if (nameToIdMap.has(item.title)) {
          folderId = nameToIdMap.get(item.title).id;
          console.log(`Folder "${item.title}" already exists with ID: ${folderId}`);
        } else {
          // Create new folder
          const tempId = `temp_${Math.random().toString(36).substr(2, 9)}`;
          operations.push({
            type: 'create',
            folder: {
              title: item.title,
              parentId: currentParentId
            },
            tempId: tempId
          });
          
          console.log(`Added operation to create folder "${item.title}" with parentId: ${currentParentId}, tempId: ${tempId}`);
          
          // Use a temporary placeholder
          folderId = tempId;
          nameToIdMap.set(item.title, { id: folderId, title: item.title, isNew: true });
        }
        
        createdFolders.set(item.title, folderId);
        console.log(`Set createdFolders mapping: "${item.title}" -> ${folderId}`);
        
        // Process children recursively
        if (item.children) {
          processLevel(item.children, folderId);
        }
      }
    }
  }
  
  processLevel(targetStructure, parentId);
  
  console.log("Final createdFolders:", Array.from(createdFolders.entries()));
  console.log("Generated operations:", operations);
  
  return { folders: createdFolders, operations };
}

/**
 * Moves items to their target locations
 */
function moveItemsToTargetStructure(targetStructure, nameToIdMap, createdFoldersResult) {
  const operations = [...createdFoldersResult.operations];
  const createdFolders = createdFoldersResult.folders;
  
  // Keep track of which IDs are folders vs bookmarks
  const folderIds = new Set();
  const bookmarkIds = new Set();
  
  // First, identify all folder IDs from nameToIdMap
  for (const [name, info] of nameToIdMap.entries()) {
    if (info.url) {
      // If it has a URL, it's a bookmark
      bookmarkIds.add(info.id);
    } else if (!name.includes('/')) {
      // If it doesn't have a URL and isn't a path, it's likely a folder
      folderIds.add(info.id);
    }
  }
  
  // Add all created folder IDs
  for (const folderId of createdFolders.values()) {
    folderIds.add(folderId);
  }
  
  // Add special Chrome folder IDs
  folderIds.add('0');  // Root
  folderIds.add('1');  // Bookmarks Bar
  folderIds.add('2');  // Other Bookmarks
  folderIds.add('3');  // Mobile Bookmarks
  
  console.log("Identified folder IDs:", Array.from(folderIds));
  console.log("Identified bookmark IDs:", Array.from(bookmarkIds));
  
  function processTargetLevel(structure, parentId, index = 0) {
    // Validate parent ID is a folder
    if (bookmarkIds.has(parentId) || !folderIds.has(parentId)) {
      console.warn(`Parent ID ${parentId} is not a folder. Using Bookmarks Bar instead.`);
      parentId = '1';  // Default to Bookmarks Bar
    }
    
    for (const item of structure) {
      if (item.type === 'folder') {
        const folderId = createdFolders.get(item.title) || 
                        (nameToIdMap.has(item.title) ? nameToIdMap.get(item.title).id : null);
        
        if (folderId) {
          // Add to our set of known folder IDs
          folderIds.add(folderId);
          
          // Move folder to correct position
          operations.push({
            type: 'move',
            id: folderId,
            destination: { parentId, index }
          });
          
          // Process children recursively
          if (item.children) {
            processTargetLevel(item.children, folderId);
          }
        }
        
        index++;
      } else if (item.type === 'bookmark') {
        // Find bookmark by title
        if (nameToIdMap.has(item.title)) {
          const bookmarkInfo = nameToIdMap.get(item.title);
          
          // Add to our set of known bookmark IDs
          bookmarkIds.add(bookmarkInfo.id);
          
          // Verify parent is a folder
          if (folderIds.has(parentId)) {
            operations.push({
              type: 'move',
              id: bookmarkInfo.id,
              destination: { parentId, index }
            });
          } else {
            console.warn(`Cannot move bookmark "${item.title}" to non-folder parent ${parentId}`);
          }
        }
        
        index++;
      }
    }
  }
  
  processTargetLevel(targetStructure, '1');
  return operations;
}

/**
 * Execute the operations in the correct order
 */
async function executeOperations(operations) {
  // Sort operations to create folders first, then move items
  operations.sort((a, b) => {
    if (a.type === 'create' && b.type === 'move') return -1;
    if (a.type === 'move' && b.type === 'create') return 1;
    return 0;
  });
  
  console.log("Sorted operations:", JSON.stringify(operations, null, 2));
  
  // Map to store temporary IDs to real IDs
  const idMap = new Map();
  
  // Keep track of which IDs are folders
  const folderIds = new Set(['0', '1', '2', '3']); // Start with Chrome's default folders
  
  // Process operations sequentially
  for (let i = 0; i < operations.length; i++) {
    const operation = operations[i];
    console.log(`Executing operation ${i+1}/${operations.length}:`, operation);
    
    try {
      if (operation.type === 'create' && operation.folder) {
        // Replace parent ID if it's a temporary ID
        let parentId = operation.folder.parentId;
        if (idMap.has(parentId)) {
          parentId = idMap.get(parentId);
          console.log(`Replaced temp parentId ${operation.folder.parentId} with real ID ${parentId}`);
        }
        
        // Validate parentId - default to '1' (Bookmarks Bar) if invalid
        if (!parentId || parentId === 'undefined' || !folderIds.has(parentId)) {
          console.warn(`Invalid parentId detected: ${parentId}, defaulting to Bookmarks Bar ('1')`);
          parentId = '1';
        }
        
        console.log(`Creating folder "${operation.folder.title}" with parentId: ${parentId}`);
        
        // Create the folder
        const realId = await createFolder(operation.folder.title, parentId);
        console.log(`Created folder "${operation.folder.title}" with real ID: ${realId}`);
        
        // Add to our set of known folder IDs
        folderIds.add(realId);
        
        // Store the mapping from temp ID to real ID
        if (operation.tempId) {
          idMap.set(operation.tempId, realId);
          console.log(`Mapped temp ID ${operation.tempId} to real ID ${realId}`);
        }
      } 
      else if (operation.type === 'move') {
        // Replace IDs with real IDs if they're temporary
        let itemId = operation.id;
        let parentId = operation.destination.parentId;
        
        if (idMap.has(itemId)) {
          itemId = idMap.get(itemId);
          console.log(`Replaced temp itemId ${operation.id} with real ID ${itemId}`);
        }
        
        if (idMap.has(parentId)) {
          parentId = idMap.get(parentId);
          console.log(`Replaced temp parentId ${operation.destination.parentId} with real ID ${parentId}`);
        }
        
        // Check if the parent ID is a folder
        const isFolder = await checkIsFolder(parentId);
        if (!isFolder) {
          console.warn(`Parent ID ${parentId} is not a folder. Using Bookmarks Bar instead.`);
          parentId = '1';
        }
        
        // Verify the item exists before trying to move it
        try {
          const itemExists = await checkBookmarkExists(itemId);
          if (!itemExists) {
            console.warn(`Item ${itemId} does not exist, skipping move operation`);
            continue;
          }
        } catch (err) {
          console.warn(`Error checking if item ${itemId} exists:`, err);
          continue;
        }
        
        console.log(`Moving item ${itemId} to parentId: ${parentId}, index: ${operation.destination.index}`);
        
        // Move the bookmark/folder
        await moveBookmark(itemId, {
          parentId: parentId,
          index: operation.destination.index
        });
        console.log(`Successfully moved item ${itemId}`);
      }
    } catch (error) {
      console.error(`Operation failed:`, error);
      throw new Error(`Operation failed: ${error.message}`);
    }
  }
}

// Helper functions that would use Chrome API
function createFolder(title, parentId) {
  return new Promise((resolve, reject) => {
    chrome.bookmarks.create({ title, parentId }, (result) => {
      if (chrome.runtime.lastError) {
        reject(new Error(chrome.runtime.lastError.message));
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
        reject(new Error(chrome.runtime.lastError.message));
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
        reject(new Error(chrome.runtime.lastError.message));
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
    // Skip special Chrome folders
    if (['0', '1', '2', '3'].includes(id)) {
      console.log(`Skipping removal of protected Chrome folder: ${id}`);
      resolve();
      return;
    }
    
    try {
      // First check if the bookmark exists
      chrome.bookmarks.get(id, (result) => {
        if (chrome.runtime.lastError) {
          console.log(`Bookmark ${id} doesn't exist, skipping removal`);
          resolve();
          return;
        }
        
        // Now try to remove it
        chrome.bookmarks.removeTree(id, () => {
          if (chrome.runtime.lastError) {
            console.warn('Error removing bookmark:', chrome.runtime.lastError.message);
            // Still resolve to continue the process, but with a warning logged
            resolve();
          } else {
            resolve();
          }
        });
      });
    } catch (e) {
      console.warn('Error in removeBookmark:', e.message || e);
      // Still resolve to continue the process
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
  console.log("Created snapshot before restructuring:", snapshot.id);
  console.log("Operations to execute:", operations);
  
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
    console.error('Error during restructuring:', error.message || JSON.stringify(error));
    
    // Attempt automatic rollback
    console.log("Attempting to rollback to snapshot:", snapshot.id);
    await restoreFromSnapshot(snapshot.id);
    
    return {
      success: false,
      snapshotId: snapshot.id,
      message: `Restructuring failed: ${error.message || 'Unknown error'}`
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

/**
 * Check if a bookmark exists
 */
function checkBookmarkExists(id) {
  return new Promise((resolve) => {
    chrome.bookmarks.get(id, (result) => {
      if (chrome.runtime.lastError) {
        resolve(false);
      } else {
        resolve(true);
      }
    });
  });
}

/**
 * Check if a bookmark ID is a folder
 */
function checkIsFolder(id) {
  return new Promise((resolve) => {
    chrome.bookmarks.get(id, (result) => {
      if (chrome.runtime.lastError) {
        resolve(false);
      } else if (result && result.length > 0) {
        // If it doesn't have a URL, it's a folder
        resolve(!result[0].url);
      } else {
        resolve(false);
      }
    });
  });
}
