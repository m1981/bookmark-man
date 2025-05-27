
import { describe, it, expect, beforeEach, vi, afterEach } from 'vitest';
import BookmarkOperationExecutor from '../BookmarkOperationExecutor';

describe('BookmarkOperationExecutor', () => {
  let executor;
  let mockRepository;

  beforeEach(() => {
    // Create mock repository with all required methods
    mockRepository = {
      create: vi.fn(),
      createFolder: vi.fn(), // Add missing createFolder method
      move: vi.fn(),
      remove: vi.fn()
    };

    // Initialize executor with mock repository
    executor = new BookmarkOperationExecutor(mockRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
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
  });
});