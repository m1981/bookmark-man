// Main background script that chooses between implementations
import { isFeatureEnabled } from './src/lib/utils/featureFlags.js';

// Initialize the appropriate background script based on feature flag
async function initializeBackgroundScript() {
  try {
    const useSolidImplementation = await isFeatureEnabled('useSolidImplementation');
    const debugMode = await isFeatureEnabled('debugMode');
    
    if (debugMode) {
      console.log(`Debug mode enabled. Using ${useSolidImplementation ? 'SOLID' : 'Classic'} implementation`);
    }
    
    if (useSolidImplementation) {
      console.log('Using SOLID implementation');
      try {
        // Import and initialize the SOLID implementation
        const { initializeSolidBackground } = await import('./background_solid_impl.js');
        initializeSolidBackground();
      } catch (importError) {
        console.error('Error importing SOLID implementation:', importError);
        fallbackToClassic();
      }
    } else {
      console.log('Using classic implementation');
      try {
        // Import and initialize the classic implementation
        const { initializeClassicBackground } = await import('./background_classic_impl.js');
        initializeClassicBackground();
      } catch (importError) {
        console.error('Error importing classic implementation:', importError);
        // If both implementations fail, set up minimal functionality
        setupMinimalFunctionality();
      }
    }
  } catch (error) {
    console.error('Error initializing background script:', error);
    fallbackToClassic();
  }
  
  // Fallback function
  async function fallbackToClassic() {
    try {
      const { initializeClassicBackground } = await import('./background_classic_impl.js');
      initializeClassicBackground();
    } catch (fallbackError) {
      console.error('Error in fallback implementation:', fallbackError);
      setupMinimalFunctionality();
    }
  }
  
  // Minimal functionality setup
  function setupMinimalFunctionality() {
    console.log('Setting up minimal functionality');
    
    // Set up basic popup
    if (chrome.action && typeof chrome.action.setPopup === 'function') {
      chrome.action.setPopup({ popup: 'popup.html' });
    }
  }
}

// Start initialization
initializeBackgroundScript();