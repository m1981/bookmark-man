document.addEventListener('DOMContentLoaded', function() {
  const bookmarksElement = document.getElementById('bookmarks');
  
  // Add Organize Folders button
  const organizeButton = document.createElement('button');
  organizeButton.textContent = 'Organize Folders';
  organizeButton.className = 'organize-btn';
  document.body.insertBefore(organizeButton, bookmarksElement);
  
  // Add event listener for the organize button
  organizeButton.addEventListener('click', function() {
    showOrganizeDialog();
  });
  
  // Function to show the organize dialog
  function showOrganizeDialog() {
    const dialog = document.createElement('div');
    dialog.className = 'organize-dialog';
    dialog.innerHTML = `
      <h3>Enter Target Folder Structure</h3>
      <p>Format: Use indentation (spaces) to indicate hierarchy. Prefix folders with 📁</p>
      <textarea id="target-structure" rows="20" cols="60" placeholder="📁 FOR MYSELF & FAMILY
    📁 Dom Piękne
        📁 Meble i Wyposażenie
            - Fotele Krzesła Biurowe
            - Lustra"></textarea>
      <div class="dialog-buttons">
        <button id="simulate-btn">Simulate Restructure</button>
        <button id="cancel-btn">Cancel</button>
      </div>
    `;
    
    document.body.appendChild(dialog);
    
    // Add event listeners for dialog buttons
    document.getElementById('simulate-btn').addEventListener('click', function() {
      const targetStructureText = document.getElementById('target-structure').value;
      simulateRestructure(targetStructureText);
      document.body.removeChild(dialog);
    });
    
    document.getElementById('cancel-btn').addEventListener('click', function() {
      document.body.removeChild(dialog);
    });
  }
  
  // Function to parse text structure into object structure
  function parseStructureText(text) {
    const lines = text.split('\n');
    const result = [];
    const stack = [{ level: -1, item: result }];
    
    for (const line of lines) {
      if (!line.trim()) continue;
      
      const level = line.search(/\S|$/) / 4; // Assuming 4 spaces per level
      const content = line.trim();
      
      // Determine if it's a folder or bookmark
      let item;
      if (content.startsWith('📁')) {
        item = {
          type: 'folder',
          title: content.substring(2).trim(),
          children: []
        };
      } else if (content.startsWith('-')) {
        item = {
          type: 'bookmark',
          title: content.substring(1).trim()
        };
      } else {
        continue; // Skip invalid lines
      }
      
      // Find the appropriate parent
      while (stack.length > 1 && stack[stack.length - 1].level >= level) {
        stack.pop();
      }
      
      // Add to parent
      const parent = stack[stack.length - 1].item;
      if (Array.isArray(parent)) {
        parent.push(item);
      } else {
        parent.children.push(item);
      }
      
      // If it's a folder, add it to the stack
      if (item.type === 'folder') {
        stack.push({ level, item });
      }
    }
    
    return result;
  }
  
  // Function to simulate restructuring
  function simulateRestructure(targetStructureText) {
    chrome.bookmarks.getTree(function(bookmarkTreeNodes) {
      const targetStructure = parseStructureText(targetStructureText);
      
      // Create a mapping of all existing bookmarks/folders by name
      const nameToIdMap = createNameToIdMapping(bookmarkTreeNodes);
      
      // Simulate creating missing folders
      const createdFolders = simulateCreateMissingFolders(targetStructure, nameToIdMap);
      
      // Simulate moving items
      const operations = simulateMoveItems(targetStructure, nameToIdMap, createdFolders);
      
      // Log the operations to console
      console.log('SIMULATION ONLY - No actual changes made');
      console.log('Operations to perform:', operations);
      
      // Create a visual representation of operations
      let operationsHtml = '<h3>Simulated Operations (No Changes Made)</h3>';
      operationsHtml += '<pre>';
      
      for (const op of operations) {
        if (op.type === 'create') {
          operationsHtml += `CREATE FOLDER: "${op.folder.title}" in parent ID: ${op.folder.parentId}\n`;
        } else if (op.type === 'move') {
          const item = nameToIdMap.get(op.id) || { title: `Item with ID ${op.id}` };
          operationsHtml += `MOVE: "${item.title}" to parent ID: ${op.destination.parentId} at position ${op.destination.index}\n`;
        }
      }
      
      operationsHtml += '</pre>';
      
      // Display the operations
      const resultsDialog = document.createElement('div');
      resultsDialog.className = 'results-dialog';
      resultsDialog.innerHTML = operationsHtml + '<button id="close-results">Close</button>';
      document.body.appendChild(resultsDialog);
      
      document.getElementById('close-results').addEventListener('click', function() {
        document.body.removeChild(resultsDialog);
      });
    });
  }
  
  // Creates a mapping of folder/bookmark names to their IDs
  function createNameToIdMapping(bookmarkNodes, map = new Map(), path = '') {
    for (const node of bookmarkNodes) {
      const nodePath = path ? `${path}/${node.title}` : node.title;
      map.set(node.title, { id: node.id, title: node.title, path: nodePath });
      
      // Also map the full path to handle duplicate names
      map.set(nodePath, { id: node.id, title: node.title, path: nodePath });
      
      if (node.children) {
        createNameToIdMapping(node.children, map, nodePath);
      }
    }
    return map;
  }
  
  // Simulates creating missing folders
  function simulateCreateMissingFolders(targetStructure, nameToIdMap, parentId = '1') {
    const createdFolders = new Map();
    const operations = [];
    
    function processLevel(structure, currentParentId) {
      for (const item of structure) {
        if (item.type === 'folder') {
          let folderId;
          
          // Check if folder exists
          if (nameToIdMap.has(item.title)) {
            folderId = nameToIdMap.get(item.title).id;
          } else {
            // Simulate creating new folder
            folderId = 'new_' + Math.random().toString(36).substr(2, 9);
            operations.push({
              type: 'create',
              folder: {
                title: item.title,
                parentId: currentParentId
              }
            });
            nameToIdMap.set(item.title, { id: folderId, title: item.title, isNew: true });
          }
          
          createdFolders.set(item.title, folderId);
          
          // Process children recursively
          if (item.children) {
            processLevel(item.children, folderId);
          }
        }
      }
    }
    
    processLevel(targetStructure, parentId);
    return { folders: createdFolders, operations };
  }
  
  // Simulates moving items to their target locations
  function simulateMoveItems(targetStructure, nameToIdMap, createdFoldersResult) {
    const operations = [...createdFoldersResult.operations];
    const createdFolders = createdFoldersResult.folders;
    
    function processTargetLevel(structure, parentId, index = 0) {
      for (const item of structure) {
        if (item.type === 'folder') {
          const folderId = createdFolders.get(item.title) || 
                          (nameToIdMap.has(item.title) ? nameToIdMap.get(item.title).id : null);
          
          if (folderId) {
            // Move folder to correct position
            operations.push({
              type: 'move',
              id: folderId,
              destination: { parentId, index }
            });
            
            // Process children
            if (item.children) {
              processTargetLevel(item.children, folderId);
            }
          }
          
          index++;
        } else if (item.type === 'bookmark') {
          // Find bookmark by title
          if (nameToIdMap.has(item.title)) {
            const bookmarkInfo = nameToIdMap.get(item.title);
            
            operations.push({
              type: 'move',
              id: bookmarkInfo.id,
              destination: { parentId, index }
            });
          }
          
          index++;
        }
      }
    }
    
    processTargetLevel(targetStructure, '1');
    return operations;
  }
  
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