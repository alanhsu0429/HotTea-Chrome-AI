// HotTea Sidepanel - Modularized Refactored Version
// Restructured following Tidy First principles

import { logger } from './utils/logger.js';
import { initializeI18n } from './utils/i18n-helper.js';

// Import modularized features
import {
  checkAuthAndUpdateUI,
  handleSignOut
} from './modules/sidepanel-auth.js';

// Conversation-related features managed by UI module

// Q&A-related features managed by UI module

import { setupEventListeners } from './modules/sidepanel-ui.js';

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  logger.log('🍵 HotTea sidepanel loaded');

  // Initialize i18n internationalization
  initializeI18n();

  // Immediately bind event listeners
  setupEventListeners();

  // Check authentication status
  await checkAuthAndUpdateUI();

  logger.log('✅ HotTea sidepanel initialization complete');

  // No need for Supabase auth listener, using Chrome Identity API
});

// Create global handleSignOut function to maintain compatibility
window.handleSignOut = handleSignOut;

logger.log('🎯 Sidepanel script loaded complete');