// HotTea Sidepanel - Simplified (No Authentication Required)

import { logger } from './utils/logger.js';
import { initializeI18n } from './utils/i18n-helper.js';
import { setupEventListeners } from './modules/sidepanel-ui.js';

// Initialization
document.addEventListener('DOMContentLoaded', async () => {
  logger.log('🍵 HotTea sidepanel loaded');

  // Initialize i18n internationalization
  initializeI18n();

  // Bind event listeners
  setupEventListeners();

  logger.log('✅ HotTea sidepanel initialization complete');
});

logger.log('🎯 Sidepanel script loaded complete');
