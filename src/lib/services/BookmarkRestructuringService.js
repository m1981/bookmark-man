import IBookmarkRestructuringService from './IBookmarkRestructuringService.js';

/**
 * Implementation of bookmark restructuring service
 * @implements {IBookmarkRestructuringService}
 */
export default class BookmarkRestructuringService extends IBookmarkRestructuringService {
  /**
   * @constructor
   * @param {import('../repositories/IBookmarkRepository').default} repository - Bookmark repository
   * @param {import('./IBookmarkTransactionManager').default} transactionManager - Transaction manager
   * @param {import('./IOperationExecutor').default} operationExecutor - Operation executor
   */
  constructor(repository, transactionManager, operationExecutor) {
    super();
    this.repository = repository;
    this.transactionManager = transactionManager;
    this.operationExecutor = operationExecutor;
  }

  /**
   * Parses text structure into bookmark structure nodes
   * @param {string} text - Text representation of bookmark structure
   * @returns {Array} Array of bookmark structure nodes
   */
  parseStructureText(text) {
    if (!text || typeof text !== 'string') {
      return [];
    }
    
    const lines = text.split('\n').filter(line => line.trim().length > 0);
    const rootNode = { type: 'folder', title: 'Root', children: [] };
    const stack = [{ node: rootNode, level: -1 }];
    
    for (const line of lines) {
      const trimmedLine = line.trim();
      if (trimmedLine.startsWith('//') || trimmedLine.startsWith('#')) {
        continue; // Skip comments
      }
      
      // Calculate indentation level
      const indentMatch = line.match(/^(\s*)/);
      const indentation = indentMatch ? indentMatch[1].length : 0;
      const level = Math.floor(indentation / 2); // Assuming 2 spaces per level
      
      // Create node based on line content
      const isFolder = !trimmedLine.includes('http://') && !trimmedLine.includes('https://');
      const node = {
        type: isFolder ? 'folder' : 'bookmark',
        title: isFolder ? trimmedLine : trimmedLine.split(' - ')[0].trim()
      };
      
      if (!isFolder) {
        const urlMatch = trimmedLine.match(/(https?:\/\/[^\s]+)/);
        if (urlMatch) {
          node.url = urlMatch[1];
        } else {
          // Extract URL from format "Title - URL"
          const parts = trimmedLine.split(' - ');
          if (parts.length > 1) {
            node.url = parts[1].trim();
          }
        }
      } else {
        node.children = [];
      }
      
      // Find parent based on indentation level
      while (stack.length > 1 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      
      // Add node to parent's children
      const parent = stack[stack.length - 1].node;
      parent.children.push(node);
      
      // If folder, add to stack for potential children
      if (isFolder) {
        stack.push({ node, level });
      }
    }
    
    return rootNode.children;
  }

  /**
   * Simulates restructuring without making changes
   * @param {Array} sourceStructure - Current bookmark structure
   * @param {Array} targetStructure - Target bookmark structure
   * @returns {Array} Operations that would be performed
   */
  simulateRestructure(sourceStructure, targetStructure) {
    // Create a mapping of all existing bookmarks/folders by name
    const nameToIdMap = this.createNameToIdMapping(sourceStructure);
    
    // Create missing folders
    const createdFolders = this.createMissingFolders(targetStructure, nameToIdMap);
    
    // Move items to target structure
    return this.moveItemsToTargetStructure(targetStructure, nameToIdMap, createdFolders);
  }

  /**
   * Executes restructuring with transaction support
   * @param {Array} operations - Operations to execute
   * @returns {Promise<Object>} Result of restructuring
   */
  async executeRestructure(operations) {
    // Create a snapshot before making changes
    const snapshot = await this.transactionManager.createSnapshot("Before restructuring");
    console.log("Created snapshot before restructuring:", snapshot.id);
    console.log("Operations to execute:", operations);
    
    try {
      // Execute the operations
      await this.operationExecutor.execute(operations);
      
      // Return the snapshot ID for potential rollback
      return {
        success: true,
        snapshotId: snapshot.id,
        message: 'Restructuring completed successfully',
        operations: operations
      };
    } catch (error) {
      console.error('Error during restructuring:', error.message || JSON.stringify(error));
      
      // Attempt automatic rollback
      console.log("Attempting to rollback to snapshot:", snapshot.id);
      try {
        const restored = await this.transactionManager.restoreSnapshot(snapshot.id);
        if (restored) {
          return {
            success: false,
            snapshotId: snapshot.id,
            message: 'Restructuring failed and was rolled back automatically',
            error: error.message || 'Unknown error'
          };
        } else {
          return {
            success: false,
            snapshotId: snapshot.id,
            message: 'Restructuring failed and automatic rollback also failed',
            error: error.message || 'Unknown error'
          };
        }
      } catch (rollbackError) {
        console.error('Error during rollback:', rollbackError);
        return {
          success: false,
          snapshotId: snapshot.id,
          message: 'Restructuring failed and rollback failed',
          error: error.message || 'Unknown error',
          rollbackError: rollbackError.message || 'Unknown rollback error'
        };
      }
    }
  }

  /**
   * Creates a mapping of bookmark/folder names to IDs
   * @private
   * @param {Array} nodes - Bookmark nodes
   * @param {Map} [map=new Map()] - Map to populate
   * @param {string} [path=''] - Current path
   * @returns {Map} Map of names to IDs
   */
  createNameToIdMapping(nodes, map = new Map(), path = '') {
    for (const node of nodes) {
      const nodePath = path ? `${path}/${node.title}` : node.title;
      map.set(node.title, { id: node.id, title: node.title, path: nodePath, url: node.url });
      
      // Also map the full path to handle duplicate names
      map.set(nodePath, { id: node.id, title: node.title, path: nodePath, url: node.url });
      
      if (node.children) {
        this.createNameToIdMapping(node.children, map, nodePath);
      }
    }
    return map;
  }

  /**
   * Creates folders that exist in target but not in source
   * @private
   * @param {Array} targetStructure - Target structure
   * @param {Map} nameToIdMap - Mapping of names to IDs
   * @param {string} [parentId='1'] - Parent folder ID
   * @returns {Object} Created folders and operations
   */
  createMissingFolders(targetStructure, nameToIdMap, parentId = '1') {
    const createdFolders = new Map();
    const operations = [];
    
    // Validate the initial parentId
    if (!parentId || parentId === 'undefined') {
      console.warn(`Invalid initial parentId: ${parentId}, defaulting to '1'`);
      parentId = '1';
    }
    
    function processLevel(structure, currentParentId) {
      for (const item of structure) {
        if (item.type === 'folder') {
          let folderId;
          
          // Check if folder exists
          if (nameToIdMap.has(item.title)) {
            folderId = nameToIdMap.get(item.title).id;
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
            
            // Use a temporary placeholder
            folderId = tempId;
            nameToIdMap.set(item.title, { id: folderId, title: item.title, isNew: true });
          }
          
          // Add to createdFolders map regardless of whether it's new or existing
          createdFolders.set(item.title, folderId);
          
          // Process children recursively
          if (item.children) {
            processLevel(item.children, folderId);
          }
        }
      }
    }
    
    processLevel(targetStructure, parentId);
    
    return {
      folders: createdFolders,
      operations: operations
    };
  }

  /**
   * Moves items to their target locations
   * @private
   * @param {Array} targetStructure - Target structure
   * @param {Map} nameToIdMap - Mapping of names to IDs
   * @param {Object} createdFoldersResult - Result from createMissingFolders
   * @returns {Array} Operations to perform
   */
  moveItemsToTargetStructure(targetStructure, nameToIdMap, createdFoldersResult) {
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
            }
          }
          
          index++;
        }
      }
    }
    
    processTargetLevel(targetStructure, '1');
    return operations;
  }
}