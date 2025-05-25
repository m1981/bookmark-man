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