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
    console.log('DOMUIService.showDialog called with options:', options); // Debug log
    
    return new Promise((resolve) => {
      const dialog = this.createDialogElement(options);
      this.document.body.appendChild(dialog);
      
      // Add event listeners for buttons
      options.buttons.forEach(button => {
        const buttonElement = this.document.getElementById(`dialog-btn-${button.id}`);
        if (buttonElement) {
          buttonElement.addEventListener('click', () => {
            let data = null;
            
            // Get data from dialog based on type
            if (options.type === 'organize') {
              const textArea = this.document.getElementById('target-structure');
              if (textArea) {
                data = { structureText: textArea.value };
              }
            }
            
            // Remove dialog
            this.document.body.removeChild(dialog);
            
            // Resolve promise
            resolve({ buttonId: button.id, data });
          });
        }
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
      });
    }
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
    } else if (options.type === 'snapshot') {
      // We'll load snapshots dynamically
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
}