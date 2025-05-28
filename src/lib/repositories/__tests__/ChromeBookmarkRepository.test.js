import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ChromeBookmarkRepository from '../ChromeBookmarkRepository.js';

// Mock Chrome API
const createMockChromeAPI = () => {
  return {
    bookmarks: {
      getTree: vi.fn((callback) => callback([])),
      get: vi.fn((id, callback) => callback([])),
      create: vi.fn((bookmark, callback) => callback({ id: 'new_id', ...bookmark })),
      move: vi.fn((id, destination, callback) => callback({ id, ...destination })),
      update: vi.fn((id, changes, callback) => callback({ id, ...changes })),
      remove: vi.fn((id, callback) => callback()),
      removeTree: vi.fn((id, callback) => callback()),
      search: vi.fn((query, callback) => callback([]))
    },
    runtime: {
      lastError: null
    }
  };
};

describe('ChromeBookmarkRepository', () => {
  let repository;
  let mockChrome;

  beforeEach(() => {
    mockChrome = createMockChromeAPI();
    repository = new ChromeBookmarkRepository(mockChrome);
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('getTree', () => {
    it('should return bookmark tree when successful', async () => {
      const mockTree = [{ id: '0', title: 'root', children: [] }];
      mockChrome.bookmarks.getTree.mockImplementation(callback => callback(mockTree));

      const result = await repository.getTree();
      
      expect(result).toEqual(mockTree);
      expect(mockChrome.bookmarks.getTree).toHaveBeenCalledTimes(1);
    });

    it('should reject with error when Chrome API fails', async () => {
      mockChrome.runtime.lastError = { message: 'API error' };
      mockChrome.bookmarks.getTree.mockImplementation(callback => callback([]));

      await expect(repository.getTree()).rejects.toThrow('API error');
      expect(mockChrome.bookmarks.getTree).toHaveBeenCalledTimes(1);
      
      // Reset lastError for other tests
      mockChrome.runtime.lastError = null;
    });
  });

  describe('getById', () => {
    it('should return bookmark when found', async () => {
      const mockBookmark = { id: '123', title: 'Test Bookmark' };
      mockChrome.bookmarks.get.mockImplementation((id, callback) => callback([mockBookmark]));

      const result = await repository.getById('123');
      
      expect(result).toEqual(mockBookmark);
      expect(mockChrome.bookmarks.get).toHaveBeenCalledWith('123', expect.any(Function));
    });

    it('should reject when bookmark not found', async () => {
      mockChrome.bookmarks.get.mockImplementation((id, callback) => callback([]));

      await expect(repository.getById('nonexistent')).rejects.toThrow('Bookmark with ID nonexistent not found');
      expect(mockChrome.bookmarks.get).toHaveBeenCalledWith('nonexistent', expect.any(Function));
    });
  });

  describe('create', () => {
    it('should create a bookmark successfully', async () => {
      const newBookmark = { title: 'New Bookmark', url: 'https://example.com' };
      const createdBookmark = { ...newBookmark, id: '123' };
      
      mockChrome.bookmarks.create.mockImplementation((bookmark, callback) => callback(createdBookmark));

      const result = await repository.create(newBookmark);
      
      expect(result).toEqual(createdBookmark);
      expect(mockChrome.bookmarks.create).toHaveBeenCalledWith(newBookmark, expect.any(Function));
    });
  });

  describe('createFolder', () => {
    it('should create a folder successfully', async () => {
      const newFolder = { title: 'New Folder', parentId: '1' };
      const createdFolder = { ...newFolder, id: '123' };
      
      mockChrome.bookmarks.create.mockImplementation((folder, callback) => callback(createdFolder));

      const result = await repository.createFolder(newFolder);
      
      expect(result).toEqual(createdFolder);
      expect(mockChrome.bookmarks.create).toHaveBeenCalledWith(newFolder, expect.any(Function));
    });
  });

  describe('move', () => {
    it('should move a bookmark successfully', async () => {
      const destination = { parentId: '1', index: 0 };
      
      mockChrome.bookmarks.move.mockImplementation((id, dest, callback) => callback());

      await repository.move('123', destination);
      
      expect(mockChrome.bookmarks.move).toHaveBeenCalledWith('123', destination, expect.any(Function));
    });
  });

  describe('remove', () => {
    it('should remove a bookmark successfully', async () => {
      mockChrome.bookmarks.removeTree.mockImplementation((id, callback) => callback());

      await repository.remove('123');
      
      expect(mockChrome.bookmarks.removeTree).toHaveBeenCalledWith('123', expect.any(Function));
    });

    it('should reject when trying to remove protected Chrome folders', async () => {
      await expect(repository.remove('1')).rejects.toThrow('Cannot remove protected Chrome folder: 1');
      expect(mockChrome.bookmarks.removeTree).not.toHaveBeenCalled();
    });
  });

  describe('search', () => {
    it('should search bookmarks successfully', async () => {
      const mockResults = [
        { id: '123', title: 'Test Bookmark', url: 'https://example.com' }
      ];
      
      mockChrome.bookmarks.search.mockImplementation((query, callback) => callback(mockResults));

      const result = await repository.search('test');
      
      expect(result).toEqual(mockResults);
      expect(mockChrome.bookmarks.search).toHaveBeenCalledWith('test', expect.any(Function));
    });
  });
});