// Simplified popup script - SOLID only
import { initializeSolidPopup } from './popup_solid_impl.js';

// Initialize the SOLID popup
async function initializePopup() {
  try {
    console.log('Initializing SOLID popup implementation');
    await initializeSolidPopup();
  } catch (error) {
    console.error('Error initializing SOLID popup:', error);
    // Show error message to user
    document.body.innerHTML = `
      <div style="padding: 20px; color: red;">
        <h3>Error Loading Extension</h3>
        <p>Please try refreshing or contact support.</p>
      </div>
    `;
  }
}

// Wait for DOM to be ready
if (document.readyState === 'loading') {
  document.addEventListener('DOMContentLoaded', initializePopup);
} else {
  initializePopup();
}