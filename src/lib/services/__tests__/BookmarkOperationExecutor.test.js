import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import BookmarkOperationExecutor from '../BookmarkOperationExecutor.js';

// Mock repository
class MockBookmarkRepository {
  constructor() {
    this.create = vi.fn().mockImplementation(bookmark => Promise.resolve({ ...bookmark, id: 'real_id_1' }));
    this.createFolder = vi.fn().mockImplementation(folder => Promise.resolve({ ...folder, id: 'real_folder_id_1' }));
    this.move = vi.fn().mockImplementation(() => Promise.resolve());
    this.remove = vi.fn().mockImplementation(() => Promise.resolve());
  }
}

describe('BookmarkOperationExecutor', () => {
  let executor;
  let mockRepository;

  beforeEach(() => {
    mockRepository = new MockBookmarkRepository();
    executor = new BookmarkOperationExecutor(mockRepository);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('execute', () => {
    it('should do nothing for empty operations array', async () => {
      await executor.execute([]);
      
      expect(mockRepository.create).not.toHaveBeenCalled();
      expect(mockRepository.createFolder).not.toHaveBeenCalled();
      expect(mockRepository.move).not.toHaveBeenCalled();
      expect(mockRepository.remove).not.toHaveBeenCalled();
    });
  });
});