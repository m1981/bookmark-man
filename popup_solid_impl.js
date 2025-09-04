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
    }).then(async (dialogResult) => {
      console.log('Organize dialog result received:', dialogResult);
      
      if (dialogResult.buttonId === 'apply' && dialogResult.data) {
        console.log('Apply button clicked, processing structure text...');
        const targetStructureText = dialogResult.data.structureText;
        console.log('Target structure text:', targetStructureText);
        
        console.log('Parsing structure text...');
        const targetStructure = restructuringService.parseStructureText(targetStructureText);
        console.log('Parsed target structure:', targetStructure);
        
        console.log('Getting bookmark tree...');
        const bookmarkTreeNodes = await bookmarkRepository.getTree();
        console.log('Retrieved bookmark tree nodes:', bookmarkTreeNodes);
        
        // Generate and execute operations
        console.log('Simulating restructure...');
        const operations = restructuringService.simulateRestructure(bookmarkTreeNodes, targetStructure);
        console.log('Generated operations:', operations);
        
        console.log('Executing restructure...');
        const restructureResult = await restructuringService.executeRestructure(operations);
        console.log('Restructure result:', restructureResult);
        
        // Show result to user
        console.log('Showing results to user...');
        uiService.showResults(restructureResult);
        
        // Reload bookmarks
        console.log('Reloading bookmarks...');
        loadBookmarks();
      } else {
        console.log('Dialog cancelled or no data provided');
      }
    }).catch(error => {
      console.error('Error in organize dialog promise chain:', error);
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
    }).then(async (dialogResult) => {
      console.log('Snapshot dialog result received:', dialogResult);
      console.log('Dialog result type:', typeof dialogResult);
      console.log('Dialog result keys:', Object.keys(dialogResult || {}));
      
      if (dialogResult.buttonId === 'create') {
        console.log('Create button clicked');
        const name = prompt('Enter a name for this snapshot:', `Snapshot ${new Date().toLocaleString()}`);
        if (name) {
          console.log('Creating snapshot with name:', name);
          try {
            const snapshotResult = await transactionManager.createSnapshot(name);
            console.log('Snapshot created successfully:', snapshotResult);
            
            // Debug check storage after creating snapshot
            debugCheckStorage();
            
            showSnapshotManager(); // Refresh the dialog
          } catch (error) {
            console.error('Error creating snapshot:', error);
            alert('Error creating snapshot: ' + error.message);
          }
        } else {
          console.log('Snapshot creation cancelled - no name provided');
        }
      } else if (dialogResult.buttonId === 'restore' && dialogResult.data) {
        console.log('Restore button clicked');
        const snapshotId = dialogResult.data.snapshotId;
        console.log('Restoring snapshot:', snapshotId);
        
        if (confirm('Are you sure you want to restore this snapshot? Current bookmark structure will be replaced.')) {
          try {
            console.log('User confirmed restore, proceeding...');
            const restoreSuccess = await transactionManager.restoreSnapshot(snapshotId);
            console.log('Restore operation result:', restoreSuccess);
            
            if (restoreSuccess) {
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
        } else {
          console.log('User cancelled restore operation');
        }
      } else if (dialogResult.buttonId === 'close') {
        console.log('Close button clicked');
      } else {
        console.log('Unhandled dialog result:', dialogResult);
      }
    }).catch(error => {
      console.error('Error in snapshot dialog promise chain:', error);
      console.error('Error stack:', error.stack);
    });
  }
}