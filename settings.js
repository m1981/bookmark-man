import { getFeatureFlags, setFeatureFlag } from './src/lib/utils/featureFlags.js';

document.addEventListener('DOMContentLoaded', async function() {
  try {
    // Load current settings
    const flags = await getFeatureFlags();
    
    // Set form values
    document.getElementById('implementation-select').value = flags.useSolidImplementation.toString();
    document.getElementById('snapshot-checkbox').checked = flags.enableSnapshotManager;
    document.getElementById('debug-checkbox').checked = flags.debugMode;
    
    // Add save button handler
    document.getElementById('save-btn').addEventListener('click', async function() {
      try {
        const implementationValue = document.getElementById('implementation-select').value === 'true';
        const snapshotValue = document.getElementById('snapshot-checkbox').checked;
        const debugValue = document.getElementById('debug-checkbox').checked;
        
        // Save settings
        await setFeatureFlag('useSolidImplementation', implementationValue);
        await setFeatureFlag('enableSnapshotManager', snapshotValue);
        await setFeatureFlag('debugMode', debugValue);
        
        // Show status
        const status = document.getElementById('status');
        status.textContent = 'Settings saved!';
        status.style.color = 'green';
        
        // Clear status after 3 seconds
        setTimeout(() => {
          status.textContent = '';
        }, 3000);
      } catch (error) {
        console.error('Error saving settings:', error);
        const status = document.getElementById('status');
        status.textContent = 'Error saving settings! Please try again.';
        status.style.color = 'red';
      }
    });

    // Add reset button handler
    document.getElementById('reset-btn').addEventListener('click', async function() {
      if (confirm('Are you sure you want to reset all settings to their default values?')) {
        try {
          // Clear all feature flags
          await chrome.storage.sync.remove('featureFlags');
          
          // Reload the page to show default values
          location.reload();
        } catch (error) {
          console.error('Error resetting settings:', error);
          const status = document.getElementById('status');
          status.textContent = 'Error resetting settings! Please try again.';
          status.style.color = 'red';
        }
      }
    });
  } catch (error) {
    console.error('Error loading settings:', error);
    const status = document.getElementById('status');
    status.textContent = 'Error loading settings! Please try again.';
    status.style.color = 'red';
  }
});