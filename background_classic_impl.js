// Classic implementation of background script

export function initializeClassicBackground() {
  // Safely access Chrome APIs with feature detection
  const chromeAPI = {
    sidePanel: chrome?.sidePanel,
    tabs: chrome?.tabs,
    action: chrome?.action
  };

  // Initialize side panel if available
  if (chromeAPI.sidePanel) {
    try {
      // Configure the side panel behavior to open when the action icon is clicked
      chromeAPI.sidePanel.setPanelBehavior({ openPanelOnActionClick: true })
        .catch(error => console.error('Error setting panel behavior:', error));

      // Set default side panel options
      chromeAPI.sidePanel.setOptions({
        path: 'popup.html',
        enabled: true
      }).catch(error => console.error('Error setting side panel options:', error));
    } catch (error) {
      console.error('Error initializing side panel:', error);
    }
    
    // Initialize tab listeners if available
    try {
      if (chromeAPI.tabs && chromeAPI.tabs.onUpdated && typeof chromeAPI.tabs.onUpdated.addListener === 'function') {
        chromeAPI.tabs.onUpdated.addListener((tabId, changeInfo, tab) => {
          // You could implement site-specific behavior here if needed
        });
      }
    } catch (error) {
      console.error('Error setting up tab listeners:', error);
    }
  } else {
    // Fallback to popup behavior for browsers that don't support the Side Panel API
    try {
      if (chromeAPI.action && typeof chromeAPI.action.setPopup === 'function') {
        chromeAPI.action.setPopup({ popup: 'popup.html' });
      }
    } catch (error) {
      console.error('Error setting popup fallback:', error);
    }
  }
}