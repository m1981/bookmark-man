/**
 * UI Service implementation for DOM manipulation
 */
export default class DOMUIService {
  /**
   * Create a new DOMUIService
   * @param {Document} document - The document object
   */
  constructor(document) {
    this.document = document;
  }

  /**
   * Show a dialog
   * @param {DialogOptions} options - Dialog options
   * @returns {Promise<DialogResult>} Dialog result
   */
  showDialog(options) {
    return new Promise(async (resolve) => {
      const dialog = this.createDialogElement(options);
      this.document.body.appendChild(dialog);
      
      if (options.type === 'snapshot') {
        await this.loadSnapshotsIntoDialog(dialog);
      }
      
      // Handle copy button specifically for export dialog
      if (options.type === 'export') {
        const copyBtn = this.document.getElementById('dialog-btn-copy');
        if (copyBtn) {
          copyBtn.addEventListener('click', async () => {
            const textArea = this.document.getElementById('export-structure');
            if (textArea && textArea.value) {
              try {
                await navigator.clipboard.writeText(textArea.value);
                copyBtn.textContent = 'Copied!';
                setTimeout(() => {
                  copyBtn.textContent = 'Copy to Clipboard';
                }, 2000);
              } catch (error) {
                console.error('Failed to copy:', error);
                // Fallback selection
                textArea.select();
                textArea.setSelectionRange(0, 99999);
                alert('Text selected - press Ctrl+C to copy');
              }
            }
            // Don't close dialog on copy, let user copy multiple times
          });
        }
      }
      
      // Handle other buttons
      options.buttons.forEach(button => {
        if (button.id === 'copy' && options.type === 'export') return; // Already handled above
        
        const buttonElement = this.document.getElementById(`dialog-btn-${button.id}`);
        if (buttonElement) {
          buttonElement.addEventListener('click', () => {
            let data = null;
            
            if (options.type === 'organize') {
              const textArea = this.document.getElementById('target-structure');
              if (textArea) data = { structureText: textArea.value };
            } else if (options.type === 'snapshot' && button.id === 'restore') {
              const selected = this.document.querySelector('input[name="snapshot-select"]:checked');
              if (selected) data = { snapshotId: selected.value };
            }
            
            this.document.body.removeChild(dialog);
            resolve({ buttonId: button.id, data });
          });
        }
      });
    });
  }

  /**
   * Load snapshots into the dialog
   * @private
   * @param {HTMLElement} dialog - The dialog element
   */
  async loadSnapshotsIntoDialog(dialog) {
    const snapshotsListElement = dialog.querySelector('#snapshots-list');
    if (!snapshotsListElement) return;
    
    try {
      console.log('Loading snapshots into dialog');
      
      // Get snapshots from Chrome storage
      const snapshots = await this.getSnapshots();
      console.log('Retrieved snapshots for dialog:', snapshots);
      
      if (!snapshots || snapshots.length === 0) {
        snapshotsListElement.innerHTML = '<p>No snapshots available.</p>';
        return;
      }
      
      let html = '<ul class="snapshot-list">';
      
      for (const snapshot of snapshots) {
        const date = new Date(snapshot.timestamp).toLocaleString();
        const name = snapshot.name || date;
        
        html += `
          <li class="snapshot-item">
            <div class="snapshot-info">
              <span class="snapshot-name">${name}</span>
              <span class="snapshot-date">${date}</span>
            </div>
            <button class="restore-snapshot-btn" data-id="${snapshot.id}">Restore</button>
          </li>
        `;
      }
      
      html += '</ul>';
      snapshotsListElement.innerHTML = html;
    } catch (error) {
      console.error('Error loading snapshots:', error);
      snapshotsListElement.innerHTML = '<p class="error">Error loading snapshots. Please try again.</p>';
    }
  }

  /**
   * Get snapshots from Chrome storage
   * @private
   * @returns {Promise<Array>} Snapshots
   */
  async getSnapshots() {
    return new Promise((resolve) => {
      // First try to get from the bookmarkSnapshots array
      chrome.storage.local.get('bookmarkSnapshots', (result) => {
        if (result.bookmarkSnapshots && result.bookmarkSnapshots.length > 0) {
          console.log('Retrieved snapshots from array:', result.bookmarkSnapshots);
          resolve(result.bookmarkSnapshots);
          return;
        }
        
        // If not found, try to get individual snapshot keys
        chrome.storage.local.get(null, (allItems) => {
          console.log('All storage items:', allItems);
          const snapshots = [];
          
          // Look for keys that match the snapshot pattern
          for (const key in allItems) {
            if (key.startsWith('bookmark_snapshot_')) {
              const snapshot = allItems[key];
              snapshots.push({
                id: key.replace('bookmark_snapshot_', ''),
                timestamp: snapshot.timestamp || Date.now(),
                name: snapshot.name || 'Unnamed Snapshot',
                tree: snapshot.tree || []
              });
            }
          }
          
          console.log('Retrieved snapshots from individual keys:', snapshots);
          
          // Sort by timestamp (newest first)
          snapshots.sort((a, b) => b.timestamp - a.timestamp);
          
          resolve(snapshots);
        });
      });
    });
  }

  /**
   * Show results of an operation
   * @param {RestructureResult} result - The result to show
   */
  showResults(result) {
    console.log('DOMUIService.showResults called with result:', result); // Debug log
    
    const dialog = this.document.createElement('div');
    dialog.className = 'results-dialog';
    
    let content = `<h3>${result.success ? 'Success!' : 'Error'}</h3>`;
    content += `<p>${result.message}</p>`;
    
    if (result.snapshotId) {
      content += `
        <p>A snapshot was created before making changes. You can restore it if needed.</p>
        <button id="restore-btn" data-snapshot="${result.snapshotId}">Restore Previous Structure</button>
      `;
    }
    
    content += `<button id="close-results">Close</button>`;
    
    dialog.innerHTML = content;
    this.document.body.appendChild(dialog);
    
    // Add event listeners
    this.document.getElementById('close-results').addEventListener('click', () => {
      this.document.body.removeChild(dialog);
    });
    
    const restoreBtn = this.document.getElementById('restore-btn');
    if (restoreBtn) {
      restoreBtn.addEventListener('click', async () => {
        const snapshotId = restoreBtn.getAttribute('data-snapshot');
        // Implement restore functionality
        try {
          await this.restoreSnapshot(snapshotId);
          alert('Snapshot restored successfully!');
          location.reload(); // Reload to show updated bookmarks
        } catch (error) {
          console.error('Error restoring snapshot:', error);
          alert('Error restoring snapshot. Please try again.');
        }
        this.document.body.removeChild(dialog);
      });
    }
  }

  /**
   * Restore a snapshot
   * @private
   * @param {string} snapshotId - The snapshot ID
   * @returns {Promise<boolean>} Success
   */
  async restoreSnapshot(snapshotId) {
    return new Promise((resolve, reject) => {
      chrome.storage.local.get('bookmarkSnapshots', (result) => {
        const snapshots = result.bookmarkSnapshots || [];
        const snapshot = snapshots.find(s => s.id === snapshotId);
        
        if (!snapshot) {
          reject(new Error('Snapshot not found'));
          return;
        }
        
        // Implement restore logic here
        // This is a placeholder - you'll need to implement the actual restore logic
        console.log('Restoring snapshot:', snapshot);
        
        // For now, just resolve with success
        resolve(true);
      });
    });
  }

  /**
   * Render bookmark tree
   * @param {BookmarkNode[]} bookmarks - The bookmarks to render
   */
  renderBookmarkTree(bookmarks) {
    console.log('DOMUIService.renderBookmarkTree called with bookmarks:', bookmarks); // Debug log
    
    const bookmarksElement = this.document.getElementById('bookmarks');
    if (!bookmarksElement) return;
    
    // Display folder structure first
    let html = '<h3>Folder Structure</h3>';
    html += this.processFolderStructure(bookmarks);

    // Then display all bookmarks
    html += '<h3>Bookmarks</h3>';
    html += this.processBookmarks(bookmarks);

    bookmarksElement.innerHTML = html;
  }

  /**
   * Process folder structure
   * @private
   * @param {BookmarkNode[]} bookmarkNodes - The bookmark nodes
   * @param {number} level - The indentation level
   * @returns {string} HTML string
   */
  processFolderStructure(bookmarkNodes, level = 0) {
    let html = '';
    const indent = '&nbsp;'.repeat(level * 4);

    for (const node of bookmarkNodes) {
      if (!node.url && node.children) {
        // It's a folder
        html += `<div class="folder">${indent}📁 ${node.title}</div>`;
        html += this.processFolderStructure(node.children, level + 1);
      }
    }

    return html;
  }

  /**
   * Process bookmarks
   * @private
   * @param {BookmarkNode[]} bookmarkNodes - The bookmark nodes
   * @param {number} level - The indentation level
   * @returns {string} HTML string
   */
  processBookmarks(bookmarkNodes, level = 0) {
    let html = '';
    const indent = '&nbsp;'.repeat(level * 4);

    for (const node of bookmarkNodes) {
      if (node.url) {
        // It's a bookmark
        html += `<div class="bookmark" data-id="${node.id}">
          ${indent}${node.title}<br>
          <a href="${node.url}" target="_blank">${node.url}</a>
          <button class="delete-btn" data-id="${node.id}">Delete</button>
        </div>`;
      } else if (node.children) {
        // It's a folder
        html += `<div class="folder">${indent}📁 ${node.title}</div>`;
        html += this.processBookmarks(node.children, level + 1);
      }
    }

    return html;
  }

  /**
   * Create dialog element
   * @private
   * @param {DialogOptions} options - Dialog options
   * @returns {HTMLElement} Dialog element
   */
  createDialogElement(options) {
    const dialog = this.document.createElement('div');
    dialog.className = 'dialog';
    
    let content = `<h3>${options.title}</h3>`;
    
    if (options.content) {
      content += `<p>${options.content}</p>`;
    }
    
    // Add content based on dialog type
    if (options.type === 'organize') {
      content += `
        <textarea id="target-structure" rows="15" cols="50" placeholder="📁 Folder 1
    📁 Subfolder 1
        - Bookmark 1
        - Bookmark 2
📁 Folder 2
    - Bookmark 3"></textarea>
      `;
    } else if (options.type === 'export') {
      content += `
        <textarea id="export-structure" rows="15" cols="50" readonly>${options.data?.structureText || ''}</textarea>
      `;
    } else if (options.type === 'snapshot') {
      content += `<div id="snapshots-list">Loading snapshots...</div>`;
    }
    
    // Add buttons
    content += `<div class="dialog-buttons">`;
    options.buttons.forEach(button => {
      content += `<button id="dialog-btn-${button.id}">${button.text}</button>`;
    });
    content += `</div>`;
    
    dialog.innerHTML = content;
    return dialog;
  }

  exportBookmarkStructure(bookmarks) {
    return this.processBookmarksForExport(bookmarks);
  }

  cleanUrlForExport(url) {
    if (!url) return '';
    
    try {
      const urlObj = new URL(url);
      // Remove query parameters and fragments
      return `${urlObj.protocol}//${urlObj.host}${urlObj.pathname}`;
    } catch (error) {
      // If URL parsing fails, manually remove everything after '?'
      return url.split('?')[0];
    }
  }

  processBookmarksForExport(bookmarkNodes, level = 0) {
    let text = '';
    const indent = '    '.repeat(level);
    
    for (const node of bookmarkNodes) {
      if (node.url) {
        const cleanUrl = this.cleanUrlForExport(node.url);
        // Keep full title for matching, add URL for context
        text += `${indent}- ${node.title} (${cleanUrl})\n`;
      } else if (node.children) {
        text += `${indent}📁 ${node.title}\n`;
        text += this.processBookmarksForExport(node.children, level + 1);
      }
    }
    return text;
  }
}
