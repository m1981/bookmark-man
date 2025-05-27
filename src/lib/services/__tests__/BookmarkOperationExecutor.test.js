
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import BookmarkOperationExecutor from '../BookmarkOperationExecutor';

describe('BookmarkOperationExecutor', () => {
  let executor;
  let mockRepository;

  beforeEach(() => {
    // Create mock repository with all required methods
    mockRepository = {
      create: vi.fn(),
      createFolder: vi.fn(),
      move: vi.fn(),
      remove: vi.fn()
    };

    // Initialize executor with mock repository
    executor = new BookmarkOperationExecutor(mockRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  // Add this test to verify the initial state of folderIds
  it('should initialize with default Chrome folder IDs', () => {
    // Check that folderIds contains all default Chrome folder IDs
    expect(executor.folderIds.has('0')).toBe(true);
    expect(executor.folderIds.has('1')).toBe(true);
    expect(executor.folderIds.has('2')).toBe(true);
    expect(executor.folderIds.has('3')).toBe(true);
    
    // Check the size to ensure no extra or missing IDs
    expect(executor.folderIds.size).toBe(4);
    
    // Verify that empty string is not in the set
    expect(executor.folderIds.has('')).toBe(false);
  });

  describe('execute', () => {
    it('should return early for empty operations array', async () => {
      await executor.execute([]);
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.move).not.toHaveBeenCalled();
      expect(mockRepository.remove).not.toHaveBeenCalled();
    });

    it('should return early for null operations', async () => {
      await executor.execute(null);
      expect(mockRepository.create).not.toHaveBeenCalled();
    });

    it('should sort operations to create folders before moving items', async () => {
      // Setup operations in "wrong" order
      const operations = [
        { type: 'move', id: 'bookmark1', destination: { parentId: 'folder1' } },
        { type: 'create', data: { title: 'New Folder' }, tempId: 'folder1' } // Fix: use data instead of folder
      ];

      // Mock successful creation
      mockRepository.createFolder.mockResolvedValue({ id: 'real-folder-id' });
      mockRepository.move.mockResolvedValue({});

      // Execute operations
      await executor.execute(operations);

      // Verify create was called before move
      expect(mockRepository.createFolder).toHaveBeenCalledBefore(mockRepository.move);
    });

    it('should skip invalid operations', async () => {
      const operations = [
        { type: 'invalid' },
        { type: 'create', data: { title: 'Valid Folder' }, tempId: 'temp1' } // Fix: use data instead of folder
      ];

      // Spy on console.warn
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock successful creation
      mockRepository.createFolder.mockResolvedValue({ id: 'real-folder-id' });

      await executor.execute(operations);

      expect(warnSpy).toHaveBeenCalledWith(
        'Skipping invalid operation:',
        operations[0]
      );
      expect(mockRepository.createFolder).toHaveBeenCalledTimes(1);
      
      warnSpy.mockRestore();
    });

    it('should propagate errors during execution', async () => {
      const operations = [
        { type: 'create', data: { title: 'Test Folder' }, tempId: 'temp1' } // Fix: use data instead of folder
      ];

      const error = new Error('Creation failed');
      mockRepository.createFolder.mockRejectedValue(error);

      // Spy on console.error
      const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});

      // Use try/catch to verify error is thrown
      try {
        await executor.execute(operations);
        // Should not reach here
        expect(true).toBe(false);
      } catch (e) {
        expect(e.message).toBe('Creation failed');
      }
      
      expect(errorSpy).toHaveBeenCalled();
      errorSpy.mockRestore();
    });

    it('should return early for non-array operations', async () => {
      // This will pass with || but fail with &&
      await executor.execute({});
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.createFolder).not.toHaveBeenCalled();
      expect(mockRepository.move).not.toHaveBeenCalled();
      expect(mockRepository.remove).not.toHaveBeenCalled();
    });

    it('should process valid non-empty array of operations', async () => {
      // Create a spy to check if the sorting and processing logic is executed
      const sortSpy = vi.spyOn(Array.prototype, 'sort');
      
      const operations = [
        { type: 'create', data: { title: 'Test Folder' }, tempId: 'temp1' }
      ];
      
      mockRepository.createFolder.mockResolvedValue({ id: 'real-id' });
      
      await executor.execute(operations);
      
      // Verify sort was called (this would be skipped if early return happened)
      expect(sortSpy).toHaveBeenCalled();
      expect(mockRepository.createFolder).toHaveBeenCalled();
      
      sortSpy.mockRestore();
    });

    it('should handle edge cases in operations array', async () => {
      // Test with various edge cases that should trigger early return
      const edgeCases = [
        [], // Empty array
        null, // Null
        undefined, // Undefined
        "not an array", // String
        42, // Number
        { notAnArray: true } // Object but not array
      ];
      
      for (const testCase of edgeCases) {
        await executor.execute(testCase);
        expect(mockRepository.create).not.toHaveBeenCalled();
        expect(mockRepository.createFolder).not.toHaveBeenCalled();
        expect(mockRepository.move).not.toHaveBeenCalled();
        expect(mockRepository.remove).not.toHaveBeenCalled();
      }
    });
  });

  describe('executeCreateOperation', () => {
    it('should create a folder and store its real ID', async () => {
      const operation = {
        type: 'create',
        data: { title: 'New Folder', parentId: '1' }, // Fix: use data instead of folder
        tempId: 'temp_folder_1'
      };

      const createdFolder = {
        id: 'real_folder_id',
        title: 'New Folder',
        parentId: '1'
      };

      mockRepository.createFolder.mockResolvedValue(createdFolder);

      await executor.execute([operation]);

      expect(mockRepository.createFolder).toHaveBeenCalledWith(operation.data);
      
      // Test that subsequent operations can use the mapped ID
      const moveOperation = {
        type: 'move',
        id: 'bookmark1',
        destination: { parentId: 'temp_folder_1' }
      };

      await executor.execute([moveOperation]);

      expect(mockRepository.move).toHaveBeenCalledWith(
        'bookmark1',
        { parentId: 'real_folder_id' }
      );
    });

    it('should create a bookmark when URL is provided', async () => {
      const operation = {
        type: 'create',
        data: { 
          title: 'Test Bookmark', 
          url: 'https://example.com',
          parentId: '1' 
        },
        tempId: 'temp_bookmark_1'
      };

      const createdBookmark = {
        id: 'real_bookmark_id',
        title: 'Test Bookmark',
        url: 'https://example.com',
        parentId: '1'
      };

      mockRepository.create.mockResolvedValue(createdBookmark);

      await executor.execute([operation]);

      expect(mockRepository.create).toHaveBeenCalledWith(operation.data);
    });

    it('should add new folder IDs to folderIds set', async () => {
      const operation = {
        type: 'create',
        data: { title: 'New Folder' },
        tempId: 'temp_folder_1'
      };

      const createdFolder = {
        id: 'new_folder_id',
        title: 'New Folder'
      };

      mockRepository.createFolder.mockResolvedValue(createdFolder);

      // Check folderIds before execution
      expect(executor.folderIds.has('new_folder_id')).toBe(false);
      
      await executor.execute([operation]);

      // Verify the new folder ID was added to folderIds
      expect(executor.folderIds.has('new_folder_id')).toBe(true);
    });
  });

  describe('executeMoveOperation', () => {
    it('should move a bookmark to a destination', async () => {
      const operation = {
        type: 'move',
        id: 'bookmark1',
        destination: { parentId: 'folder1', index: 0 }
      };

      await executor.execute([operation]);

      expect(mockRepository.move).toHaveBeenCalledWith(
        'bookmark1',
        { parentId: 'folder1', index: 0 }
      );
    });

    it('should replace temp IDs with real IDs in destination', async () => {
      // First create a folder with a temp ID
      const createOperation = {
        type: 'create',
        data: { title: 'New Folder' }, // Fix: use data instead of folder
        tempId: 'temp_folder_1'
      };

      mockRepository.createFolder.mockResolvedValue({
        id: 'real_folder_id',
        title: 'New Folder'
      });

      await executor.execute([createOperation]);

      // Reset mocks to ensure clean state
      vi.clearAllMocks();

      // Then move a bookmark to that folder using the temp ID
      const moveOperation = {
        type: 'move',
        id: 'bookmark1',
        destination: { parentId: 'temp_folder_1', index: 0 }
      };

      await executor.execute([moveOperation]);

      // Verify the move used the real ID, not the temp ID
      expect(mockRepository.move).toHaveBeenCalledWith(
        'bookmark1',
        { parentId: 'real_folder_id', index: 0 }
      );
    });
  });

  describe('executeRemoveOperation', () => {
    it('should remove a bookmark by ID', async () => {
      const operation = {
        type: 'remove',
        id: 'bookmark1'
      };

      await executor.execute([operation]);

      expect(mockRepository.remove).toHaveBeenCalledWith('bookmark1');
    });
  });

  describe('validateOperation', () => {
    it('should reject non-object operations', async () => {
      // Test with null, undefined, string, number
      const invalidOperations = [null, undefined, 'string', 123];
      
      for (const op of invalidOperations) {
        // Call validateOperation directly to test the specific condition
        expect(executor.validateOperation(op)).toBe(false);
        
        // Also verify the operation is skipped during execution
        const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
        await executor.execute([op]);
        expect(warnSpy).toHaveBeenCalled();
        expect(mockRepository.create).not.toHaveBeenCalled();
        expect(mockRepository.move).not.toHaveBeenCalled();
        expect(mockRepository.remove).not.toHaveBeenCalled();
        warnSpy.mockRestore();
      }
    });
    
    it('should reject operations without a type', async () => {
      const operationWithoutType = { data: { title: 'Test' } };
      
      // Direct validation test
      expect(executor.validateOperation(operationWithoutType)).toBe(false);
      
      // Execution test
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      await executor.execute([operationWithoutType]);
      expect(warnSpy).toHaveBeenCalled();
      expect(mockRepository.create).not.toHaveBeenCalled();
      warnSpy.mockRestore();
    });

    it('should validate create operations', async () => {
      // Valid create operation
      const validCreate = {
        type: 'create',
        data: { title: 'Valid Folder' }, // Fix: use data instead of folder
        tempId: 'temp1'
      };

      // Invalid create operations
      const noData = { type: 'create', tempId: 'temp1' };
      const noTitle = { type: 'create', data: {}, tempId: 'temp2' };

      // Spy on console.warn
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});
      
      // Mock successful creation
      mockRepository.createFolder.mockResolvedValue({ id: 'real-folder-id' });

      await executor.execute([validCreate]);
      expect(mockRepository.createFolder).toHaveBeenCalledTimes(1);

      vi.clearAllMocks();

      await executor.execute([noData, noTitle]);
      expect(mockRepository.createFolder).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(2);
      
      warnSpy.mockRestore();
    });

    it('should validate move operations', async () => {
      // Valid move operation
      const validMove = {
        type: 'move',
        id: 'bookmark1',
        destination: { parentId: 'folder1' }
      };

      // Invalid move operations
      const noId = { type: 'move', destination: { parentId: 'folder1' } };
      const noDestination = { type: 'move', id: 'bookmark1' };
      const noParentId = { type: 'move', id: 'bookmark1', destination: {} };

      // Spy on console.warn
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await executor.execute([validMove]);
      expect(mockRepository.move).toHaveBeenCalledTimes(1);

      vi.clearAllMocks();

      await executor.execute([noId, noDestination, noParentId]);
      expect(mockRepository.move).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(3);
      
      warnSpy.mockRestore();
    });

    it('should validate remove operations', async () => {
      // Valid remove operation
      const validRemove = { type: 'remove', id: 'bookmark1' };

      // Invalid remove operation
      const noId = { type: 'remove' };

      // Spy on console.warn
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      await executor.execute([validRemove]);
      expect(mockRepository.remove).toHaveBeenCalledTimes(1);

      vi.clearAllMocks();

      await executor.execute([noId]);
      expect(mockRepository.remove).not.toHaveBeenCalled();
      expect(warnSpy).toHaveBeenCalledTimes(1);
      
      warnSpy.mockRestore();
    });

    it('should verify type check is enforced', async () => {
      // Create a spy on the validateOperation method to check internal behavior
      const validateSpy = vi.spyOn(executor, 'validateOperation');
      
      // Operation without type
      const operationWithoutType = { data: { title: 'Test' } };
      
      // Execute and verify
      await executor.execute([operationWithoutType]);
      
      // Check that validateOperation was called and returned false
      expect(validateSpy).toHaveBeenCalledWith(operationWithoutType);
      expect(validateSpy).toHaveReturnedWith(false);
      
      // Verify no repository methods were called
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.createFolder).not.toHaveBeenCalled();
      expect(mockRepository.move).not.toHaveBeenCalled();
      
      validateSpy.mockRestore();
    });
  });

  it('should map temporary parent IDs to real IDs during creation', async () => {
    // First create a folder with a temp ID
    const parentFolderOp = {
      type: 'create',
      data: { title: 'Parent Folder' },
      tempId: 'temp_parent'
    };
    
    mockRepository.createFolder.mockResolvedValue({
      id: 'real_parent_id',
      title: 'Parent Folder'
    });
    
    await executor.execute([parentFolderOp]);
    
    // Now create a child folder with the temp parent ID
    const childFolderOp = {
      type: 'create',
      data: { 
        title: 'Child Folder',
        parentId: 'temp_parent' // Using temp ID as parent
      },
      tempId: 'temp_child'
    };
    
    mockRepository.createFolder.mockResolvedValue({
      id: 'real_child_id',
      title: 'Child Folder',
      parentId: 'real_parent_id' // Should be mapped to real ID
    });
    
    // Reset mocks to track the next call clearly
    vi.clearAllMocks();
    
    await executor.execute([childFolderOp]);
    
    // Verify the parent ID was mapped from temp to real
    expect(mockRepository.createFolder).toHaveBeenCalledWith({
      title: 'Child Folder',
      parentId: 'real_parent_id' // Should be mapped from temp_parent
    });
    
    // For extra verification, check that the ID map contains both mappings
    expect(executor.idMap.get('temp_parent')).toBe('real_parent_id');
    expect(executor.idMap.get('temp_child')).toBe('real_child_id');
  });

  it('should track folder IDs for created folders', async () => {
    // Create multiple folders
    const operations = [
      { 
        type: 'create', 
        data: { title: 'Folder 1' }, 
        tempId: 'temp1' 
      },
      { 
        type: 'create', 
        data: { title: 'Folder 2' }, 
        tempId: 'temp2' 
      }
    ];
    
    mockRepository.createFolder
      .mockResolvedValueOnce({ id: 'real_folder_1', title: 'Folder 1' })
      .mockResolvedValueOnce({ id: 'real_folder_2', title: 'Folder 2' });
    
    // Initial size should be 4 (default Chrome folders)
    expect(executor.folderIds.size).toBe(4);
    
    await executor.execute(operations);
    
    // Size should now be 6 (4 defaults + 2 new folders)
    expect(executor.folderIds.size).toBe(6);
    expect(executor.folderIds.has('real_folder_1')).toBe(true);
    expect(executor.folderIds.has('real_folder_2')).toBe(true);
  });
});