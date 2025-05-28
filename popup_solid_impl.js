// SOLID implementation of popup script
import { initializeServices } from './src/lib/services/serviceInitializer.js';
import { getRestructuringService } from './src/lib/services/serviceInitializer.js';
import DOMUIService from './src/lib/services/DOMUIService.js';

export function initializeSolidPopup() {
  // Debug function to check storage
  function debugCheckStorage() {
    chrome.storage.local.get(null, (items) => {
      console.log('All storage items:', items);
      
      // Check for individual snapshot keys
      const snapshotKeys = Object.keys(items).filter(key => key.startsWith('bookmark_snapshot_'));
      console.log('Found snapshot keys:', snapshotKeys);
      
      // Log each snapshot
      snapshotKeys.forEach(key => {
        console.log(`Snapshot ${key}:`, items[key]);
      });
    });
    
    chrome.storage.local.get('bookmarkSnapshots', (result) => {
      console.log('Bookmark snapshots array in storage:', result.bookmarkSnapshots);
    });
  }

  // Call this at the beginning of initializeSolidPopup
  debugCheckStorage();

  // Initialize services
  const services = initializeServices();
  const { bookmarkRepository, transactionManager, restructuringService } = services;
  const uiService = new DOMUIService(document);
  
  // Load bookmarks
  loadBookmarks();
  
  // Add event listeners
  document.getElementById('organize-btn')?.addEventListener('click', showOrganizeDialog);
  document.getElementById('manage-btn')?.addEventListener('click', showSnapshotManager);
  
  // Ensure buttons exist
  ensureButtonsExist();
  
  // Function to ensure buttons exist
  function ensureButtonsExist() {
    const bookmarksElement = document.getElementById('bookmarks');
    
    // Check if organize button exists
    let organizeButton = document.getElementById('organize-btn');
    if (!organizeButton) {
      organizeButton = document.createElement('button');
      organizeButton.id = 'organize-btn';
      organizeButton.className = 'organize-btn';
      organizeButton.textContent = 'Organize Folders';
      document.body.insertBefore(organizeButton, bookmarksElement);
      
      // Add event listener
      organizeButton.addEventListener('click', showOrganizeDialog);
    }
    
    // Check if manage button exists
    let manageButton = document.getElementById('manage-btn');
    if (!manageButton) {
      manageButton = document.createElement('button');
      manageButton.id = 'manage-btn';
      manageButton.className = 'manage-btn';
      manageButton.textContent = 'Manage Bookmark Snapshots';
      document.body.insertBefore(manageButton, bookmarksElement);
      
      // Add event listener
      manageButton.addEventListener('click', showSnapshotManager);
    }
  }
  
  // Function to load bookmarks
  async function loadBookmarks() {
    try {
      const bookmarks = await bookmarkRepository.getTree();
      uiService.renderBookmarkTree(bookmarks);
    } catch (error) {
      console.error('Error loading bookmarks:', error);
      document.getElementById('bookmarks').innerHTML = 
        '<div class="error">Error loading bookmarks. Please try again.</div>';
    }
  }
  
  // Function to show organize dialog
  function showOrganizeDialog() {
    console.log('Showing organize dialog'); // Debug log
    uiService.showDialog({
      type: 'organize',
      title: 'Organize Bookmarks',
      content: 'Enter your desired bookmark structure:',
      buttons: [
        { id: 'apply', text: 'Apply Changes' },
        { id: 'cancel', text: 'Cancel' }
      ]
    }).then(async (result) => {
      if (result.buttonId === 'apply' && result.data) {
        const targetStructureText = result.data.structureText;
        const targetStructure = restructuringService.parseStructureText(targetStructureText);
        
        const bookmarkTreeNodes = await bookmarkRepository.getTree();
        
        // Generate and execute operations
        const operations = restructuringService.simulateRestructure(bookmarkTreeNodes, targetStructure);
        const result = await restructuringService.executeRestructure(operations);
        
        // Show result to user
        uiService.showResults(result);
        
        // Reload bookmarks
        loadBookmarks();
      }
    });
  }
  
  // Function to show snapshot manager
  function showSnapshotManager() {
    console.log('Showing snapshot manager'); // Debug log
    
    // Debug check storage before showing dialog
    debugCheckStorage();
    
    uiService.showDialog({
      type: 'snapshot',
      title: 'Manage Bookmark Snapshots',
      content: 'Your saved bookmark snapshots:',
      buttons: [
        { id: 'create', text: 'Create New Snapshot' },
        { id: 'close', text: 'Close' }
      ]
    }).then(async (result) => {
      console.log('Snapshot dialog result:', result);
      
      if (result.buttonId === 'create') {
        const name = prompt('Enter a name for this snapshot:', `Snapshot ${new Date().toLocaleString()}`);
        if (name) {
          console.log('Creating snapshot with name:', name);
          try {
            await transactionManager.createSnapshot(name);
            console.log('Snapshot created, refreshing dialog');
            
            // Debug check storage after creating snapshot
            debugCheckStorage();
            
            showSnapshotManager(); // Refresh the dialog
          } catch (error) {
            console.error('Error creating snapshot:', error);
            alert('Error creating snapshot: ' + error.message);
          }
        }
      } else if (result.buttonId === 'restore' && result.data) {
        const snapshotId = result.data.snapshotId;
        console.log('Restoring snapshot:', snapshotId);
        
        if (confirm('Are you sure you want to restore this snapshot? Current bookmark structure will be replaced.')) {
          try {
            const success = await transactionManager.restoreSnapshot(snapshotId);
            
            if (success) {
              alert('Snapshot restored successfully!');
              // Reload the page to refresh the bookmarks display
              window.location.reload();
            } else {
              alert('Failed to restore snapshot.');
            }
          } catch (error) {
            console.error('Error restoring snapshot:', error);
            alert('Error restoring snapshot: ' + error.message);
          }
        }
      }
    });
  }
}