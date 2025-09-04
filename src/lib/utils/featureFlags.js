/**
 * Feature flag system for the extension
 */

// Simplified feature flags - remove implementation toggle
const DEFAULT_FLAGS = {
  enableSnapshotManager: true,
  debugMode: false
};

/**
 * Get all feature flags
 * @returns {Promise<Object>} The feature flags
 */
export async function getFeatureFlags() {
  return new Promise((resolve) => {
    chrome.storage.sync.get('featureFlags', (result) => {
      const flags = result.featureFlags || {};
      resolve({ ...DEFAULT_FLAGS, ...flags });
    });
  });
}

/**
 * Set a feature flag
 * @param {string} flag The flag name
 * @param {any} value The flag value
 * @returns {Promise<void>}
 */
export async function setFeatureFlag(flag, value) {
  return new Promise((resolve) => {
    chrome.storage.sync.get('featureFlags', (result) => {
      const flags = result.featureFlags || {};
      flags[flag] = value;
      chrome.storage.sync.set({ featureFlags: flags }, resolve);
    });
  });
}

/**
 * Check if a feature flag is enabled
 * @param {string} flag The flag name
 * @returns {Promise<boolean>} Whether the flag is enabled
 */
export async function isFeatureEnabled(flag) {
  const flags = await getFeatureFlags();
  return flags[flag] || false;
}