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
          } else {
            const result = {};
            keys.forEach(key => {
              if (storage[key]) {
                result[key] = storage[key];
              }
            });
            callback(result);
          }
        }),
        set: vi.fn((items, callback) => {
          Object.assign(storage, items);
          callback();
        }),
        remove: vi.fn((key, callback) => {
          delete storage[key];
          callback();
        })
      }
    },
    bookmarks: {
      update: vi.fn((id, changes, callback) => callback())
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

  beforeEach(() => {
    mockRepository = new MockBookmarkRepository();
    mockChrome = createMockChromeAPI();
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
      await new Promise(resolve => {
        mockChrome.storage.local.set({
          'bookmark_snapshot_snapshot_1': snapshot1,
          'bookmark_snapshot_snapshot_2': snapshot2,
          'other_key': 'other_value'
        }, resolve);
      });
      
      const snapshots = await transactionManager.getSnapshots();
      
      expect(snapshots).toHaveLength(2);
      expect(snapshots[0]).toEqual(snapshot2); // Newest first
      expect(snapshots[1]).toEqual(snapshot1);
    });

    it('should return empty array when no snapshots exist', async () => {
      const snapshots = await transactionManager.getSnapshots();
      
      expect(snapshots).toHaveLength(0);
    });
  });

  describe('cleanupSnapshots', () => {
    it('should remove old snapshots beyond the maximum limit', async () => {
      // Create test snapshots
      const snapshots = [];
      
      for (let i = 1; i <= 10; i++) {
        snapshots.push({
          id: `snapshot_${i}`,
          timestamp: i * 1000,
          name: `Snapshot ${i}`,
          tree: []
        });
      }
      
      // Add snapshots to storage
      const storageData = {};
      snapshots.forEach(snapshot => {
        storageData[`bookmark_snapshot_${snapshot.id}`] = snapshot;
      });
      
      await new Promise(resolve => {
        mockChrome.storage.local.set(storageData, resolve);
      });
      
      // Clean up snapshots (max 5)
      await transactionManager.cleanupSnapshots(5);
      
      // Verify the right snapshots were removed
      expect(mockChrome.storage.local.remove).toHaveBeenCalledTimes(5);
      
      // Should remove the oldest 5 snapshots
      for (let i = 1; i <= 5; i++) {
        expect(mockChrome.storage.local.remove).toHaveBeenCalledWith(
          `bookmark_snapshot_snapshot_${i}`,
          expect.any(Function)
        );
      }
    });

    it('should not remove any snapshots if under the limit', async () => {
      // Create 3 test snapshots
      const snapshots = [];
      
      for (let i = 1; i <= 3; i++) {
        snapshots.push({
          id: `snapshot_${i}`,
          timestamp: i * 1000,
          name: `Snapshot ${i}`,
          tree: []
        });
      }
      
      // Add snapshots to storage
      const storageData = {};
      snapshots.forEach(snapshot => {
        storageData[`bookmark_snapshot_${snapshot.id}`] = snapshot;
      });
      
      await new Promise(resolve => {
        mockChrome.storage.local.set(storageData, resolve);
      });
      
      // Clean up snapshots (max 5)
      await transactionManager.cleanupSnapshots(5);
      
      // Verify no snapshots were removed
      expect(mockChrome.storage.local.remove).not.toHaveBeenCalled();
    });
  });
});