// HotTea Background Script - Simplified (No Authentication Required)
import { logger } from './utils/logger.js';
import { promptAPIService } from './services/prompt-api-service.js';

// Use unified logging system
function debugLog(message, ...args) {
  const timestamp = new Date().toLocaleTimeString();
  logger.log(`[HotTea ${timestamp}]`, message, ...args);
}

// Initialize extension
chrome.runtime.onInstalled.addListener(async () => {
  debugLog('🚀 HotTea extension installed');

  // Set side panel to open on icon click
  chrome.sidePanel.setPanelBehavior({ openPanelOnActionClick: true });

  debugLog('✅ Installation completed');
});

debugLog('🎯 Background script loaded successfully');

// Cleanup Prompt API session when extension is suspended or unloaded
// NOTE: Service Workers are short-lived, they may be suspended after 30s of inactivity
// We rely on promptAPIService to automatically recreate session when needed
chrome.runtime.onSuspend.addListener(() => {
  debugLog('💤 Service Worker suspending, cleaning up Prompt API session');
  promptAPIService.destroy();
});

// Also destroy session on extension update/reload
chrome.runtime.onUpdateAvailable.addListener(() => {
  debugLog('🔄 Extension update available, cleaning up Prompt API session');
  promptAPIService.destroy();
});
