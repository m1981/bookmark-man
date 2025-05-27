# Bookmark Lister Extension Specification

## Project Overview
A Chrome extension built with SvelteKit 5 that displays and manages Chrome bookmarks.

## API Contracts

### Chrome API Integration

#### Bookmark Service (`src/lib/services/bookmarkService.js`)

| Function | Parameters | Return Type | Description |
|----------|------------|-------------|-------------|
| `getBookmarks()` | None | `Promise<Array>` | Fetches the complete bookmark tree from Chrome |
| `deleteBookmark(id)` | `id: string` | `Promise<void>` | Deletes a bookmark by its ID |
| `createBookmark(title, url, parentId)` | `title: string, url: string, parentId?: string` | `Promise<BookmarkNode>` | Creates a new bookmark |
| `createFolder(title, parentId)` | `title: string, parentId?: string` | `Promise<BookmarkNode>` | Creates a new bookmark folder |
| `moveBookmark(id, destination)` | `id: string, destination: { parentId: string, index?: number }` | `Promise<void>` | Moves a bookmark to a different folder |
| `searchBookmarks(query)` | `query: string` | `Promise<Array<BookmarkNode>>` | Searches bookmarks by title or URL |

### Component Contracts

#### BookmarkItem (`src/lib/components/BookmarkItem.svelte`)

**Props:**
- `bookmark: BookmarkNode` - The bookmark data object
- `indent: number` - Indentation level for nested display

**Events:**
- `deleted` - Dispatched when a bookmark is deleted, with payload `{ id: string }`

#### FolderItem (`src/lib/components/FolderItem.svelte`)

**Props:**
- `folder: BookmarkNode` - The folder data object
- `indent: number` - Indentation level for nested display
- `expanded: boolean` - Whether the folder is expanded

**Events:**
- `toggle` - Event when folder is expanded/collapsed

### Data Types

#### BookmarkNode
```typescript
interface BookmarkNode {
  id: string;
  title: string;
  url?: string;
  dateAdded?: number;
  dateGroupModified?: number;
  parentId?: string;
  index?: number;
  children?: BookmarkNode[];
}
```

## SOLID Architecture

### Core Interfaces

#### IBookmarkRepository
```typescript
interface IBookmarkRepository {
  getTree(): Promise<BookmarkNode[]>;
  getById(id: string): Promise<BookmarkNode>;
  create(bookmark: { title: string, url?: string, parentId?: string }): Promise<BookmarkNode>;
  createFolder(folder: { title: string, parentId?: string }): Promise<BookmarkNode>;
  move(id: string, destination: { parentId: string, index?: number }): Promise<void>;
  remove(id: string): Promise<void>;
  search(query: string): Promise<BookmarkNode[]>;
  exists(id: string): Promise<boolean>;
  isFolder(id: string): Promise<boolean>;
}
```

#### IBookmarkTransactionManager
```typescript
interface IBookmarkTransactionManager {
  createSnapshot(name?: string): Promise<BookmarkSnapshot>;
  getSnapshots(): Promise<BookmarkSnapshot[]>;
  restoreSnapshot(snapshotId: string): Promise<boolean>;
  cleanupSnapshots(maxToKeep?: number): Promise<void>;
}
```

#### IBookmarkRestructuringService
```typescript
interface IBookmarkRestructuringService {
  parseStructureText(text: string): BookmarkStructureNode[];
  simulateRestructure(sourceStructure: BookmarkNode[], targetStructure: BookmarkStructureNode[]): Operation[];
  executeRestructure(operations: Operation[]): Promise<RestructureResult>;
}
```

#### IOperationExecutor
```typescript
interface IOperationExecutor {
  execute(operations: Operation[]): Promise<void>;
}
```

#### IUIService
```typescript
interface IUIService {
  showDialog(options: DialogOptions): Promise<DialogResult>;
  showResults(result: RestructureResult): void;
  renderBookmarkTree(bookmarks: BookmarkNode[]): void;
}
```

### Additional Data Types

```typescript
type Operation = {
  type: 'create' | 'move';
  id?: string;
  tempId?: string;
  folder?: { title: string, parentId: string };
  destination?: { parentId: string, index?: number };
};

type BookmarkSnapshot = {
  id: string;
  name?: string;
  timestamp: number;
  tree: BookmarkNode[];
};

type RestructureResult = {
  success: boolean;
  message: string;
  snapshotId?: string;
  operations?: Operation[];
};

type BookmarkStructureNode = {
  type: 'folder' | 'bookmark';
  title: string;
  url?: string;
  children?: BookmarkStructureNode[];
};

type DialogOptions = {
  type: 'organize' | 'results' | 'snapshot';
  title: string;
  content?: string;
  buttons: Array<{ id: string, text: string }>;
};

type DialogResult = {
  buttonId: string;
  data?: any;
};
```

### Architecture Diagram

```mermaid
classDiagram
    class BookmarkNode {
        +string id
        +string title
        +string? url
        +number? dateAdded
        +string? parentId
        +BookmarkNode[]? children
    }
    
    class IBookmarkRepository {
        <<interface>>
        +getTree() Promise~BookmarkNode[]~
        +getById(id) Promise~BookmarkNode~
        +create(bookmark) Promise~BookmarkNode~
        +createFolder(folder) Promise~BookmarkNode~
        +move(id, destination) Promise~void~
        +remove(id) Promise~void~
        +search(query) Promise~BookmarkNode[]~
    }
    
    class ChromeBookmarkRepository {
        +getTree() Promise~BookmarkNode[]~
        +getById(id) Promise~BookmarkNode~
        +create(bookmark) Promise~BookmarkNode~
        +createFolder(folder) Promise~BookmarkNode~
        +move(id, destination) Promise~void~
        +remove(id) Promise~void~
        +search(query) Promise~BookmarkNode[]~
    }
    
    class IBookmarkTransactionManager {
        <<interface>>
        +createSnapshot(name?) Promise~BookmarkSnapshot~
        +getSnapshots() Promise~BookmarkSnapshot[]~
        +restoreSnapshot(snapshotId) Promise~boolean~
        +cleanupSnapshots(maxToKeep?) Promise~void~
    }
    
    class ChromeBookmarkTransactionManager {
        -IBookmarkRepository repository
        -number maxSnapshots
        +createSnapshot(name?) Promise~BookmarkSnapshot~
        +getSnapshots() Promise~BookmarkSnapshot[]~
        +restoreSnapshot(snapshotId) Promise~boolean~
        +cleanupSnapshots(maxToKeep?) Promise~void~
    }
    
    class IBookmarkRestructuringService {
        <<interface>>
        +parseStructureText(text) BookmarkStructureNode[]
        +simulateRestructure(source, target) Operation[]
        +executeRestructure(operations) Promise~RestructureResult~
    }
    
    class BookmarkRestructuringService {
        -IBookmarkRepository repository
        -IBookmarkTransactionManager transactionManager
        -IOperationExecutor operationExecutor
        +parseStructureText(text) BookmarkStructureNode[]
        +simulateRestructure(source, target) Operation[]
        +executeRestructure(operations) Promise~RestructureResult~
        -createNameToIdMapping(bookmarks) Map
        -createMissingFolders(target, nameMap) Object
        -moveItemsToTargetStructure(target, nameMap, folders) Operation[]
    }
    
    class IOperationExecutor {
        <<interface>>
        +execute(operations) Promise~void~
    }
    
    class BookmarkOperationExecutor {
        -IBookmarkRepository repository
        +execute(operations) Promise~void~
        -validateOperation(operation) boolean
        -executeCreateOperation(operation) Promise~string~
        -executeMoveOperation(operation) Promise~void~
    }
    
    class IUIService {
        <<interface>>
        +showDialog(options) Promise~DialogResult~
        +showResults(result) void
        +renderBookmarkTree(bookmarks) void
    }
    
    class DOMUIService {
        +showDialog(options) Promise~DialogResult~
        +showResults(result) void
        +renderBookmarkTree(bookmarks) void
        -createDialogElement(options) HTMLElement
        -attachEventListeners(element, options) void
    }
    
    class BookmarkApp {
        -IBookmarkRepository repository
        -IBookmarkRestructuringService restructuringService
        -IUIService uiService
        +initialize() void
        +handleRestructureRequest() Promise~void~
        +handleSnapshotManagement() Promise~void~
        +renderBookmarks() Promise~void~
    }
    
    IBookmarkRepository <|.. ChromeBookmarkRepository
    IBookmarkTransactionManager <|.. ChromeBookmarkTransactionManager
    IBookmarkRestructuringService <|.. BookmarkRestructuringService
    IOperationExecutor <|.. BookmarkOperationExecutor
    IUIService <|.. DOMUIService
    
    ChromeBookmarkTransactionManager --> IBookmarkRepository
    BookmarkRestructuringService --> IBookmarkRepository
    BookmarkRestructuringService --> IBookmarkTransactionManager
    BookmarkRestructuringService --> IOperationExecutor
    BookmarkOperationExecutor --> IBookmarkRepository
    BookmarkApp --> IBookmarkRepository
    BookmarkApp --> IBookmarkRestructuringService
    BookmarkApp --> IUIService
```

### Dependency Flow Diagram

```mermaid
flowchart TD
    A[BookmarkApp] --> B[IBookmarkRepository]
    A --> C[IBookmarkRestructuringService]
    A --> D[IUIService]
    
    C --> B
    C --> E[IBookmarkTransactionManager]
    C --> F[IOperationExecutor]
    
    E --> B
    F --> B
    
    B -.-> G[Chrome Bookmarks API]
    E -.-> H[Chrome Storage API]
    D -.-> I[DOM]
    
    subgraph "Core Domain"
    B
    C
    E
    F
    end
    
    subgraph "Infrastructure"
    G
    H
    I
    end
    
    subgraph "Presentation"
    A
    D
    end
```

## Bookmark Restructuring Algorithm

The extension includes a powerful bookmark restructuring algorithm that allows users to reorganize their bookmarks according to a target structure. Below is a detailed analysis of how this algorithm works.

### Algorithm Overview

```mermaid
flowchart TD
    A[Start Restructuring] --> B[Create Name-to-ID Mapping]
    B --> C[Create Missing Folders]
    C --> D[Move Items to Target Structure]
    D --> E[Execute Operations]
    E --> F[End Restructuring]
    
    subgraph "Error Handling"
    E -- Error --> G[Rollback to Snapshot]
    G --> F
    end
```

### Detailed Process Flow

```mermaid
flowchart TD
    A[restructureBookmarks] --> B[createNameToIdMapping]
    A --> C[createMissingFolders]
    A --> D[moveItemsToTargetStructure]
    D --> E[executeOperations]
    
    subgraph "Transaction Support"
    E --> F[createBookmarkSnapshot]
    E -- Error --> G[restoreFromSnapshot]
    end
    
    B --> H[Map of names to IDs]
    C --> I[List of folder creation operations]
    C --> J[Map of new folder names to IDs]
    D --> K[List of move operations]
    
    I --> E
    J --> D
    K --> E
    H --> C
    H --> D
```

### Operation Execution Flow

```mermaid
flowchart TD
    A[executeOperations] --> B[Sort operations]
    B --> C[Process operations sequentially]
    
    C --> D{Operation type?}
    D -- Create --> E[Create folder]
    D -- Move --> F[Move bookmark/folder]
    
    E --> G[Map temp ID to real ID]
    F --> H[Check if parent is folder]
    H -- Yes --> I[Move item]
    H -- No --> J[Use default parent]
    
    G --> C
    I --> C
    J --> C
    
    C --> K[All operations completed]
```

### Name-to-ID Mapping Process

```mermaid
flowchart TD
    A[createNameToIdMapping] --> B[Process bookmark nodes]
    B --> C[Map title to ID]
    B --> D[Map full path to ID]
    C --> E[Return mapping]
    D --> E
    
    B -- Has children --> B
```

### Error Handling and Recovery

```mermaid
flowchart TD
    A[executeRestructureWithTransaction] --> B[Create snapshot]
    B --> C[Execute operations]
    C -- Success --> D[Return success]
    C -- Error --> E[Restore from snapshot]
    E --> F[Return failure]
    
    subgraph "Snapshot Management"
    G[BookmarkTransactionManager] --> H[getSnapshots]
    G --> I[createNamedSnapshot]
    G --> J[cleanupSnapshots]
    G --> K[restoreFromSnapshot]
    end
```

### Key Algorithm Components

1. **Name-to-ID Mapping**: Creates a map of bookmark/folder names to their IDs for quick lookup
2. **Missing Folder Creation**: Identifies and creates folders that exist in the target structure but not in the current bookmarks
3. **Item Movement**: Moves bookmarks and folders to their new locations according to the target structure
4. **Transaction Support**: Creates snapshots before making changes and supports rollback in case of errors
5. **Error Handling**: Validates operations and provides fallbacks for invalid operations

### Common Issues and Solutions

| Issue | Solution |
|-------|----------|
| Invalid parent ID | Default to Bookmarks Bar ('1') |
| Duplicate folder names | Use full path for disambiguation |
| Temporary IDs | Map temporary IDs to real IDs after creation |
| Non-folder as parent | Check if ID is a folder before using as parent |
| Missing bookmarks | Skip move operations for non-existent items |


