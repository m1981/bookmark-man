document.addEventListener('DOMContentLoaded', function() {
  const bookmarksElement = document.getElementById('bookmarks');
  
  // Function to recursively process folder structure
  function processFolderStructure(bookmarkNodes, level = 0) {
    let html = '';
    const indent = '&nbsp;'.repeat(level * 4);

    for (const node of bookmarkNodes) {
      if (!node.url && node.children) {
        // It's a folder
        html += `<div class="folder">${indent}${node.title}</div>`;
        html += processFolderStructure(node.children, level + 1);
      }
    }

    return html;
  }

  // Function to recursively process bookmark nodes
  function processBookmarks(bookmarkNodes, level = 0) {
    let html = '';
    const indent = '&nbsp;'.repeat(level * 4);

    for (const node of bookmarkNodes) {
      if (node.url) {
        // It's a bookmark - display title and URL on separate lines with proper indentation
        html += `<div class="bookmark" data-id="${node.id}">
          ${indent}${node.title}<br>
          ${indent}${node.url}<br>
          ${indent}&nbsp;<br>
        </div>`;
      } else if (node.children) {
        // It's a folder
        html += `<div class="folder">${indent}${node.title}</div>`;
        html += processBookmarks(node.children, level + 1);
      }
    }

    return html;
  }

  // Get all bookmarks
  chrome.bookmarks.getTree(function(bookmarkTreeNodes) {
    // Display folder structure first
    let html = '<h3>Folder Structure</h3>';
    html += processFolderStructure(bookmarkTreeNodes);

    // Then display all bookmarks
    html += '<h3>Bookmarks</h3>';
    html += processBookmarks(bookmarkTreeNodes);

    bookmarksElement.innerHTML = html;
    
    // Add event listeners to delete buttons
    document.querySelectorAll('.delete-btn').forEach(button => {
      button.addEventListener('click', function(e) {
        const bookmarkId = this.getAttribute('data-id');
        
        // Delete the bookmark
        chrome.bookmarks.remove(bookmarkId, function() {
          // Remove the bookmark element from DOM
          document.querySelector(`.bookmark[data-id="${bookmarkId}"]`).remove();
        });
        
        e.stopPropagation(); // Prevent link click
      });
    });
  });
});