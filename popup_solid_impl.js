// SOLID implementation of popup script
import { initializeServices } from './src/lib/services/serviceInitializer.js';
import { getRestructuringService } from './src/lib/services/serviceInitializer.js';
import DOMUIService from './src/lib/services/DOMUIService.js';

export function initializeSolidPopup() {
  // Initialize services
  const services = initializeServices();
  const { bookmarkRepository, restructuringService } = services;
  const uiService = new DOMUIService(document);
  
  // Load bookmarks
  loadBookmarks();
  
  // Add event listeners
  document.getElementById('organize-btn')?.addEventListener('click', showOrganizeDialog);
  document.getElementById('manage-btn')?.addEventListener('click', showSnapshotManager);
  
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
    uiService.showDialog({
      type: 'snapshot',
      title: 'Manage Bookmark Snapshots',
      content: 'Your saved bookmark snapshots:',
      buttons: [
        { id: 'create', text: 'Create New Snapshot' },
        { id: 'close', text: 'Close' }
      ]
    }).then(async (result) => {
      if (result.buttonId === 'create') {
        const name = prompt('Enter a name for this snapshot:', `Snapshot ${new Date().toLocaleString()}`);
        if (name) {
          await services.transactionManager.createSnapshot(name);
          showSnapshotManager(); // Refresh the dialog
        }
      }
    });
  }
}