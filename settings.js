import { getFeatureFlags, setFeatureFlag } from './src/lib/utils/featureFlags.js';

document.addEventListener('DOMContentLoaded', async function() {
  try {
    const flags = await getFeatureFlags();
    
    // Load current settings (remove implementation selector)
    document.getElementById('snapshot-checkbox').checked = flags.enableSnapshotManager;
    document.getElementById('debug-checkbox').checked = flags.debugMode;
    
    // Add save button handler
    document.getElementById('save-btn').addEventListener('click', async function() {
      try {
        const snapshotValue = document.getElementById('snapshot-checkbox').checked;
        const debugValue = document.getElementById('debug-checkbox').checked;
        
        // Save settings
        await setFeatureFlag('enableSnapshotManager', snapshotValue);
        await setFeatureFlag('debugMode', debugValue);
        
        // Show status
        const status = document.getElementById('status');
        status.textContent = 'Settings saved!';
        status.style.color = 'green';
        
        setTimeout(() => {
          status.textContent = '';
        }, 2000);
        
      } catch (error) {
        console.error('Error saving settings:', error);
        const status = document.getElementById('status');
        status.textContent = 'Error saving settings!';
        status.style.color = 'red';
      }
    });
    
  } catch (error) {
    console.error('Error loading settings:', error);
  }
});