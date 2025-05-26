import { describe, it, expect, beforeEach } from 'vitest';
import { getBookmarks, searchBookmarks } from './bookmarkService';

describe('Bookmark Service', () => {
  // Mock data
  const mockBookmarks = [
    {
      id: '1',
      title: 'Folder 1',
      children: [
        { id: '2', title: 'Bookmark 1', url: 'https://example.com' }
      ]
    }
  ];

  beforeEach(() => {
    // Setup mock returns
    chrome.bookmarks.getTree.mockResolvedValue(mockBookmarks);
    chrome.bookmarks.search.mockResolvedValue([mockBookmarks[0].children[0]]);
  });

  it('should fetch bookmarks', async () => {
    const result = await getBookmarks();
    
    expect(chrome.bookmarks.getTree).toHaveBeenCalled();
    expect(result).toEqual(mockBookmarks);
  });

  it('should search bookmarks', async () => {
    const query = 'example';
    const result = await searchBookmarks(query);
    
    expect(chrome.bookmarks.search).toHaveBeenCalledWith(query);
    expect(result).toEqual([mockBookmarks[0].children[0]]);
  });
});