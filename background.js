// Main background script that chooses between implementations
import { isFeatureEnabled } from './src/lib/utils/featureFlags.js';
import { initializeSolidBackground } from './background_solid_impl.js';
import { initializeClassicBackground } from './background_classic_impl.js';

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
        initializeSolidBackground();
      } catch (error) {
        console.error('Error initializing SOLID implementation:', error);
        fallbackToClassic();
      }
    } else {
      console.log('Using classic implementation');
      try {
        initializeClassicBackground();
      } catch (error) {
        console.error('Error initializing classic implementation:', error);
        // If both implementations fail, set up minimal functionality
        setupMinimalFunctionality();
      }
    }
  } catch (error) {
    console.error('Error initializing background script:', error);
    fallbackToClassic();
  }
  
  // Fallback function
  function fallbackToClassic() {
    try {
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