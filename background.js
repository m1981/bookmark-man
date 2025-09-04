// Simplified background script - SOLID only
import { initializeSolidBackground } from './background_solid_impl.js';

// Initialize the SOLID background script
async function initializeBackgroundScript() {
  try {
    console.log('Initializing SOLID implementation');
    initializeSolidBackground();
  } catch (error) {
    console.error('Error initializing SOLID implementation:', error);
    setupMinimalFunctionality();
  }
  
  // Minimal functionality setup as fallback
  function setupMinimalFunctionality() {
    console.log('Setting up minimal functionality');
    
    if (chrome.action && typeof chrome.action.setPopup === 'function') {
      chrome.action.setPopup({ popup: 'popup.html' });
    }
  }
}

// Start initialization
initializeBackgroundScript();