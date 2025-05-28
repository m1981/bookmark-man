// Main popup script that chooses between implementations
import { isFeatureEnabled } from './src/lib/utils/featureFlags.js';
import { initializeSolidPopup } from './popup_solid_impl.js';
import { initializeClassicPopup } from './popup_classic_impl.js';

// Initialize the appropriate popup script based on feature flag
async function initializePopupScript() {
  try {
    const useSolidImplementation = await isFeatureEnabled('useSolidImplementation');
    const debugMode = await isFeatureEnabled('debugMode');
    
    if (debugMode) {
      // Add debug indicator to the UI
      const debugIndicator = document.createElement('div');
      debugIndicator.textContent = `Using ${useSolidImplementation ? 'SOLID' : 'Classic'} implementation`;
      debugIndicator.style.position = 'fixed';
      debugIndicator.style.bottom = '5px';
      debugIndicator.style.right = '5px';
      debugIndicator.style.fontSize = '10px';
      debugIndicator.style.color = '#999';
      document.body.appendChild(debugIndicator);
    }
    
    if (useSolidImplementation) {
      console.log('Using SOLID implementation');
      try {
        initializeSolidPopup();
      } catch (error) {
        console.error('Error initializing SOLID implementation:', error);
        fallbackToClassic();
      }
    } else {
      console.log('Using classic implementation');
      try {
        initializeClassicPopup();
      } catch (error) {
        console.error('Error initializing classic implementation:', error);
        // If both implementations fail, show an error
        document.getElementById('bookmarks').innerHTML = 
          '<div class="error">Error loading bookmarks. Please try again or check the console for details.</div>';
      }
    }
  } catch (error) {
    console.error('Error initializing popup script:', error);
    fallbackToClassic();
  }
  
  // Fallback function
  function fallbackToClassic() {
    try {
      initializeClassicPopup();
    } catch (fallbackError) {
      console.error('Error in fallback implementation:', fallbackError);
      document.getElementById('bookmarks').innerHTML = 
        '<div class="error">Error loading bookmarks. Please try again or check the console for details.</div>';
    }
  }
}

// Start initialization when DOM is ready
document.addEventListener('DOMContentLoaded', initializePopupScript);