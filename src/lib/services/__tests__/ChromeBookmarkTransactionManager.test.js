import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import ChromeBookmarkTransactionManager from '../ChromeBookmarkTransactionManager.js';

// Mock repository
class MockBookmarkRepository {
  constructor() {
    this.mockTree = [
      {
        id: '0',
        title: 'root',
        children: [
          {
            id: '1',
            title: 'Bookmarks Bar',
            children: [
              {
                id: '10',
                title: 'Example Bookmark',
                url: 'https://example.com'
              }
            ]
          }
        ]
      }
    ];
  }

  async getTree() {
    return this.mockTree;
  }

  async getById(id) {
    // Simplified implementation for testing
    if (id === '10') {
      return {
        id: '10',
        title: 'Example Bookmark',
        url: 'https://example.com',
        parentId: '1'
      };
    }
    throw new Error(`Bookmark with ID ${id} not found`);
  }

  async create(bookmark) {
    return { ...bookmark, id: 'new_id' };
  }

  async move(id, destination) {
    return;
  }

  async remove(id) {
    return;
  }
}

// Mock Chrome API
const createMockChromeAPI = () => {
  const storage = {};
  
  return {
    storage: {
      local: {
        get: vi.fn((keys, callback) => {
          if (keys === null) {
            callback(storage);
          } else if (typeof keys === 'string') {
            const result = {};
            if (storage[keys]) {
              result[keys] = storage[keys];
            }
            callback(result);
          } else if (Array.isArray(keys)) {
            const result = {};
            keys.forEach(key => {
              if (storage[key]) {
                result[key] = storage[key];
              }
            });
            callback(result);
          } else {
            const result = {};
            Object.keys(keys).forEach(key => {
              result[key] = storage[key] || keys[key];
            });
            callback(result);
          }
        }),
        set: vi.fn((items, callback) => {
          Object.assign(storage, items);
          if (callback && typeof callback === 'function') {
            callback();
          }
        }),
        remove: vi.fn((key, callback) => {
          delete storage[key];
          if (callback && typeof callback === 'function') {
            callback();
          }
        })
      }
    },
    bookmarks: {
      update: vi.fn((id, changes, callback) => {
        if (callback && typeof callback === 'function') {
          callback();
        }
      })
    },
    runtime: {
      lastError: null
    }
  };
};

describe('ChromeBookmarkTransactionManager', () => {
  let transactionManager;
  let mockRepository;
  let mockChrome;
  let storage;

  beforeEach(() => {
    mockRepository = new MockBookmarkRepository();
    mockChrome = createMockChromeAPI();
    storage = {}; // Initialize storage for each test
    
    // Override the storage in mockChrome to use our test storage
    mockChrome.storage.local.get = vi.fn((keys, callback) => {
      if (keys === null) {
        callback({...storage});
      } else if (typeof keys === 'string') {
        const result = {};
        if (storage[keys]) {
          result[keys] = storage[keys];
        }
        callback(result);
      } else if (Array.isArray(keys)) {
        const result = {};
        keys.forEach(key => {
          if (storage[key]) {
            result[key] = storage[key];
          }
        });
        callback(result);
      } else {
        const result = {};
        Object.keys(keys).forEach(key => {
          result[key] = storage[key] || keys[key];
        });
        callback(result);
      }
    });
    
    mockChrome.storage.local.set = vi.fn((items, callback) => {
      Object.assign(storage, items);
      if (callback && typeof callback === 'function') {
        callback();
      }
    });
    
    mockChrome.storage.local.remove = vi.fn((key, callback) => {
      delete storage[key];
      if (callback && typeof callback === 'function') {
        callback();
      }
    });
    
    transactionManager = new ChromeBookmarkTransactionManager(
      mockRepository,
      mockChrome,
      5 // maxSnapshots
    );
  });

  afterEach(() => {
    vi.clearAllMocks();
  });

  describe('createSnapshot', () => {
    it('should create a snapshot with the current bookmark tree', async () => {
      const snapshot = await transactionManager.createSnapshot('Test Snapshot');
      
      expect(snapshot).toHaveProperty('id');
      expect(snapshot).toHaveProperty('timestamp');
      expect(snapshot).toHaveProperty('tree');
      expect(snapshot).toHaveProperty('name', 'Test Snapshot');
      expect(snapshot.tree).toEqual(mockRepository.mockTree);
      
      expect(mockChrome.storage.local.set).toHaveBeenCalledWith(
        expect.objectContaining({
          [`bookmark_snapshot_${snapshot.id}`]: snapshot
        }),
        expect.any(Function)
      );
    });

    it('should use default name if none provided', async () => {
      const snapshot = await transactionManager.createSnapshot();
      
      expect(snapshot.name).toMatch(/^Snapshot /);
    });
  });

  describe('getSnapshots', () => {
    it('should retrieve and sort snapshots', async () => {
      // Create some test snapshots
      const snapshot1 = {
        id: 'snapshot_1',
        timestamp: 1000,
        name: 'Snapshot 1',
        tree: []
      };
      
      const snapshot2 = {
        id: 'snapshot_2',
        timestamp: 2000,
        name: 'Snapshot 2',
        tree: []
      };
      
      // Add snapshots to storage
      storage['bookmark_snapshot_snapshot_1'] = snapshot1;
      storage['bookmark_snapshot_snapshot_2'] = snapshot2;
      storage['other_key'] = 'other_value';
      
      const snapshots = await transactionManager.getSnapshots();
      
      expect(snapshots).toHaveLength(2);
      expect(snapshots[0]).toEqual(expect.objectContaining({
        id: 'snapshot_2',
        timestamp: 2000,
        name: 'Snapshot 2'
      })); // Newest first
      expect(snapshots[1]).toEqual(expect.objectContaining({
        id: 'snapshot_1',
        timestamp: 1000,
        name: 'Snapshot 1'
      }));
    });

    it('should return empty array when no snapshots exist', async () => {
      const snapshots = await transactionManager.getSnapshots();
      
      expect(snapshots).toHaveLength(0);
    });
  });

  describe('cleanupSnapshots', () => {
    it('should remove old snapshots beyond the maximum limit', async () => {
      // Create 15 test snapshots
      const snapshots = [];
      for (let i = 0; i < 15; i++) {
        const id = `snapshot_${i}`;
        const snapshot = {
          id,
          timestamp: Date.now() - i * 1000, // Newer first
          name: `Snapshot ${i}`,
          tree: []
        };
        snapshots.push(snapshot);
        
        // Add to storage
        storage[`bookmark_snapshot_${id}`] = snapshot;
      }
      
      // Add to bookmarkSnapshots array
      storage.bookmarkSnapshots = snapshots;
      
      // Run cleanup with max 10 snapshots
      await transactionManager.cleanupSnapshots(10);
      
      // Verify only 10 snapshots remain in the array
      expect(storage.bookmarkSnapshots.length).toBe(10);
      
      // Verify the oldest snapshots were removed
      for (let i = 0; i < 10; i++) {
        const id = `snapshot_${i}`;
        expect(storage[`bookmark_snapshot_${id}`]).toBeDefined();
      }
      
      for (let i = 10; i < 15; i++) {
        const id = `snapshot_${i}`;
        expect(storage[`bookmark_snapshot_${id}`]).toBeUndefined();
      }
    });

    it('should not remove any snapshots if under the limit', async () => {
      // Create 3 test snapshots
      const snapshots = [];
      
      for (let i = 1; i <= 3; i++) {
        const snapshot = {
          id: `snapshot_${i}`,
          timestamp: i * 1000,
          name: `Snapshot ${i}`,
          tree: []
        };
        snapshots.push(snapshot);
        
        // Add to storage
        storage[`bookmark_snapshot_${snapshot.id}`] = snapshot;
      }
      
      // Add snapshots to storage array
      storage.bookmarkSnapshots = snapshots;
      
      // Clean up snapshots (max 5)
      await transactionManager.cleanupSnapshots(5);
      
      // Verify no snapshots were removed
      expect(mockChrome.storage.local.remove).not.toHaveBeenCalled();
      
      // Verify all snapshots still exist
      for (let i = 1; i <= 3; i++) {
        expect(storage[`bookmark_snapshot_snapshot_${i}`]).toBeDefined();
      }
    });
  });
});