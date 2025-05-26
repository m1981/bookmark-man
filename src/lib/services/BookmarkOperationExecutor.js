import IOperationExecutor from './IOperationExecutor.js';

/**
 * Implementation of bookmark operation executor
 * @implements {IOperationExecutor}
 */
export default class BookmarkOperationExecutor extends IOperationExecutor {
  /**
   * @constructor
   * @param {import('../repositories/IBookmarkRepository').default} repository - Bookmark repository
   */
  constructor(repository) {
    super();
    this.repository = repository;
    this.idMap = new Map(); // Maps temporary IDs to real IDs
    this.folderIds = new Set(['0', '1', '2', '3']); // Start with Chrome's default folders
  }

  /**
   * Executes a list of bookmark operations
   * @param {Array<Object>} operations - List of operations to execute
   * @returns {Promise<void>}
   */
  async execute(operations) {
    if (!operations || !Array.isArray(operations) || operations.length === 0) {
      return;
    }
    
    // Sort operations to create folders first, then move items
    operations.sort((a, b) => {
      if (a.type === 'create' && b.type === 'move') return -1;
      if (a.type === 'move' && b.type === 'create') return 1;
      return 0;
    });
    
    // Process operations sequentially
    for (const operation of operations) {
      if (!this.validateOperation(operation)) {
        console.warn('Skipping invalid operation:', operation);
        continue;
      }
      
      try {
        if (operation.type === 'create') {
          await this.executeCreateOperation(operation);
        } else if (operation.type === 'move') {
          await this.executeMoveOperation(operation);
        } else if (operation.type === 'remove') {
          await this.executeRemoveOperation(operation);
        }
      } catch (error) {
        console.error(`Error executing operation:`, operation, error);
        throw error; // Propagate error for transaction rollback
      }
    }
  }

  /**
   * Validates an operation
   * @private
   * @param {Object} operation - Operation to validate
   * @returns {boolean} Whether the operation is valid
   */
  validateOperation(operation) {
    if (!operation || typeof operation !== 'object') {
      return false;
    }
    
    if (!operation.type) {
      return false;
    }
    
    if (operation.type === 'create') {
      return operation.data && operation.data.title;
    } else if (operation.type === 'move') {
      return operation.id && operation.destination && operation.destination.parentId;
    } else if (operation.type === 'remove') {
      return operation.id;
    }
    
    return false;
  }

  /**
   * Executes a create operation
   * @private
   * @param {Object} operation - Create operation
   * @returns {Promise<void>}
   */
  async executeCreateOperation(operation) {
    const { data, tempId } = operation;
    
    // Resolve parent ID if it's a temporary ID
    if (data.parentId && this.idMap.has(data.parentId)) {
      data.parentId = this.idMap.get(data.parentId);
    }
    
    let result;
    if (data.url) {
      // Create bookmark
      result = await this.repository.create(data);
    } else {
      // Create folder
      result = await this.repository.createFolder(data);
      this.folderIds.add(result.id);
    }
    
    // Store mapping from temp ID to real ID if provided
    if (tempId) {
      this.idMap.set(tempId, result.id);
    }
  }

  /**
   * Executes a move operation
   * @private
   * @param {Object} operation - Move operation
   * @returns {Promise<void>}
   */
  async executeMoveOperation(operation) {
    const { id, destination } = operation;
    
    // Resolve IDs if they're temporary
    const realId = this.idMap.has(id) ? this.idMap.get(id) : id;
    
    const realDestination = { ...destination };
    if (realDestination.parentId && this.idMap.has(realDestination.parentId)) {
      realDestination.parentId = this.idMap.get(realDestination.parentId);
    }
    
    await this.repository.move(realId, realDestination);
  }

  /**
   * Executes a remove operation
   * @private
   * @param {Object} operation - Remove operation
   * @returns {Promise<void>}
   */
  async executeRemoveOperation(operation) {
    const { id } = operation;
    
    // Resolve ID if it's temporary
    const realId = this.idMap.has(id) ? this.idMap.get(id) : id;
    
    await this.repository.remove(realId);
  }
}