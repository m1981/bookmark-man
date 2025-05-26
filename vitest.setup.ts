import { vi } from 'vitest';

// Extend the Chrome API types to include mock methods
interface MockFunction<T extends (...args: any) => any> {
  mockResolvedValue: (value: ReturnType<T> extends Promise<infer R> ? R : ReturnType<T>) => void;
  mockImplementation: (fn: T) => void;
  mockRejectedValue: (reason: any) => void;
}

// Define Chrome API with mock methods
interface ChromeBookmarks {
  getTree: ((callback: (results: chrome.bookmarks.BookmarkTreeNode[]) => void) => void) & 
           (() => Promise<chrome.bookmarks.BookmarkTreeNode[]>) &
           MockFunction<() => Promise<chrome.bookmarks.BookmarkTreeNode[]>>;
  
  search: ((query: string, callback: (results: chrome.bookmarks.BookmarkTreeNode[]) => void) => void) &
          ((query: string) => Promise<chrome.bookmarks.BookmarkTreeNode[]>) &
          ((query: chrome.bookmarks.BookmarkSearchQuery, callback: (results: chrome.bookmarks.BookmarkTreeNode[]) => void) => void) &
          ((query: chrome.bookmarks.BookmarkSearchQuery) => Promise<chrome.bookmarks.BookmarkTreeNode[]>) &
          MockFunction<(query: string) => Promise<chrome.bookmarks.BookmarkTreeNode[]>>;
  
  get: ((id: string, callback: (results: chrome.bookmarks.BookmarkTreeNode[]) => void) => void) &
       ((id: string) => Promise<chrome.bookmarks.BookmarkTreeNode[]>) &
       MockFunction<(id: string) => Promise<chrome.bookmarks.BookmarkTreeNode[]>>;
  
  create: ((bookmark: chrome.bookmarks.CreateDetails, callback?: (result: chrome.bookmarks.BookmarkTreeNode) => void) => void) &
          ((bookmark: chrome.bookmarks.CreateDetails) => Promise<chrome.bookmarks.BookmarkTreeNode>) &
          MockFunction<(bookmark: chrome.bookmarks.CreateDetails) => Promise<chrome.bookmarks.BookmarkTreeNode>>;
  
  move: ((id: string, destination: chrome.bookmarks.Destination, callback?: (result: chrome.bookmarks.BookmarkTreeNode) => void) => void) &
        ((id: string, destination: chrome.bookmarks.Destination) => Promise<chrome.bookmarks.BookmarkTreeNode>) &
        MockFunction<(id: string, destination: chrome.bookmarks.Destination) => Promise<chrome.bookmarks.BookmarkTreeNode>>;
  
  removeTree: ((id: string, callback?: () => void) => void) &
              ((id: string) => Promise<void>) &
              MockFunction<(id: string) => Promise<void>>;
}

interface ChromeStorage {
  local: {
    get: ((keys: string | string[] | object | null, callback: (items: { [key: string]: any }) => void) => void) &
         ((keys?: string | string[] | object | null) => Promise<{ [key: string]: any }>) &
         MockFunction<(keys?: string | string[] | object | null) => Promise<{ [key: string]: any }>>;
    
    set: ((items: object, callback?: () => void) => void) &
         ((items: object) => Promise<void>) &
         MockFunction<(items: object) => Promise<void>>;
    
    remove: ((keys: string | string[], callback?: () => void) => void) &
            ((keys: string | string[]) => Promise<void>) &
            MockFunction<(keys: string | string[]) => Promise<void>>;
  };
}

interface ChromeSidePanel {
  setOptions: ((options: chrome.sidePanel.Options) => Promise<void>) &
              MockFunction<(options: chrome.sidePanel.Options) => Promise<void>>;
  
  setPanelBehavior: ((behavior: chrome.sidePanel.PanelBehavior) => Promise<void>) &
                    MockFunction<(behavior: chrome.sidePanel.PanelBehavior) => Promise<void>>;
}

interface MockChrome {
  bookmarks: ChromeBookmarks;
  runtime: {
    lastError: chrome.runtime.LastError | null;
  };
  storage: ChromeStorage;
  sidePanel: ChromeSidePanel;
}

// Declare chrome as a global
declare global {
  var chrome: MockChrome;
}

// Create mock functions with the vi.fn() utility
function createMockFn<T extends (...args: any) => any>(): T & MockFunction<T> {
  const mockFn = vi.fn() as any;
  mockFn.mockResolvedValue = (value: any) => {
    mockFn.mockImplementation(() => Promise.resolve(value));
    return mockFn;
  };
  mockFn.mockRejectedValue = (reason: any) => {
    mockFn.mockImplementation(() => Promise.reject(reason));
    return mockFn;
  };
  return mockFn;
}

// Set up the mock
global.chrome = {
  bookmarks: {
    getTree: createMockFn(),
    get: createMockFn(),
    create: createMockFn(),
    move: createMockFn(),
    removeTree: createMockFn(),
    search: createMockFn()
  },
  runtime: {
    lastError: null
  },
  storage: {
    local: {
      get: createMockFn(),
      set: createMockFn(),
      remove: createMockFn()
    }
  },
  sidePanel: {
    setOptions: createMockFn(),
    setPanelBehavior: createMockFn()
  }
};