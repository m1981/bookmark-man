import { vi } from 'vitest';

// Mock global chrome API for tests
interface Chrome {
  bookmarks: {
    getTree: ReturnType<typeof vi.fn>;
    get: ReturnType<typeof vi.fn>;
    create: ReturnType<typeof vi.fn>;
    move: ReturnType<typeof vi.fn>;
    removeTree: ReturnType<typeof vi.fn>;
    search: ReturnType<typeof vi.fn>;
  };
  runtime: {
    lastError: null | Error;
    sendMessage?: ReturnType<typeof vi.fn>;
    onMessage?: {
      addListener: ReturnType<typeof vi.fn>;
      removeListener: ReturnType<typeof vi.fn>;
    };
  };
  storage: {
    local: {
      get: ReturnType<typeof vi.fn>;
      set: ReturnType<typeof vi.fn>;
      remove: ReturnType<typeof vi.fn>;
    };
  };
  sidePanel: {
    setOptions: ReturnType<typeof vi.fn>;
    setPanelBehavior: ReturnType<typeof vi.fn>;
  };
}

// Declare chrome as a global
declare global {
  var chrome: Chrome;
}

// Set up the mock
global.chrome = {
  bookmarks: {
    getTree: vi.fn(),
    get: vi.fn(),
    create: vi.fn(),
    move: vi.fn(),
    removeTree: vi.fn(),
    search: vi.fn()
  },
  runtime: {
    lastError: null
  },
  storage: {
    local: {
      get: vi.fn(),
      set: vi.fn(),
      remove: vi.fn()
    }
  },
  sidePanel: {
    setOptions: vi.fn(),
    setPanelBehavior: vi.fn()
  }
};