// Debug helper for the extension
import { getFeatureFlags, setFeatureFlag } from './src/lib/utils/featureFlags.js';

// Create a debug panel
function createDebugPanel() {
  const panel = document.createElement('div');
  panel.id = 'debug-panel';
  panel.style.position = 'fixed';
  panel.style.bottom = '10px';
  panel.style.right = '10px';
  panel.style.backgroundColor = 'rgba(0, 0, 0, 0.8)';
  panel.style.color = 'white';
  panel.style.padding = '10px';
  panel.style.borderRadius = '5px';
  panel.style.fontSize = '12px';
  panel.style.zIndex = '9999';
  panel.style.maxWidth = '300px';
  panel.style.maxHeight = '200px';
  panel.style.overflow = 'auto';
  
  return panel;
}

// Initialize debug panel
export async function initializeDebugPanel() {
  const flags = await getFeatureFlags();
  
  if (!flags.debugMode) return;
  
  const panel = createDebugPanel();
  
  // Add feature flag information
  const flagsDiv = document.createElement('div');
  flagsDiv.innerHTML = '<h3>Feature Flags</h3>';
  
  for (const [flag, value] of Object.entries(flags)) {
    const flagDiv = document.createElement('div');
    flagDiv.textContent = `${flag}: ${value}`;
    flagsDiv.appendChild(flagDiv);
  }
  
  panel.appendChild(flagsDiv);
  
  // Add toggle buttons
  const buttonsDiv = document.createElement('div');
  buttonsDiv.innerHTML = '<h3>Toggle Flags</h3>';
  
  for (const [flag, value] of Object.entries(flags)) {
    const button = document.createElement('button');
    button.textContent = `Toggle ${flag}`;
    button.style.margin = '2px';
    button.style.padding = '2px 5px';
    button.style.fontSize = '10px';
    
    button.addEventListener('click', async () => {
      await setFeatureFlag(flag, !value);
      location.reload();
    });
    
    buttonsDiv.appendChild(button);
  }
  
  panel.appendChild(buttonsDiv);
  
  // Add to body
  document.body.appendChild(panel);
}