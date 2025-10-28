// Secure Configuration Loader
// Avoid hardcoding sensitive information in code

import { logger } from './utils/logger.js';
import { getMessage } from './utils/i18n-helper.js';

let config = null;

// Load configuration
export async function loadConfig() {
  if (config) {
    return config;
  }

  try {
    // Try to load from config.json
    const response = await fetch(chrome.runtime.getURL('config.json'));
    if (response.ok) {
      config = await response.json();
      logger.log('✅ Configuration loaded successfully');
      return config;
    }
  } catch (error) {
    console.warn('⚠️ Unable to load config.json:', error.message);
  }

  // If unable to load config file, throw error
  throw new Error(getMessage('configLoadFailed'));
}

// Get Supabase configuration
export async function getSupabaseConfig() {
  const cfg = await loadConfig();
  return cfg.supabase;
}

// Get Google OAuth configuration
export async function getGoogleConfig() {
  const cfg = await loadConfig();
  return cfg.google;
}

// Check if in debug mode
export async function isDebugMode() {
  try {
    const cfg = await loadConfig();
    return cfg.development?.debug || false;
  } catch {
    return false;
  }
}