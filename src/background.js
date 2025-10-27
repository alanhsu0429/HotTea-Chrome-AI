// HotTea Background Script with Chrome Prompt API Integration
import { logger } from './utils/logger.js';
import { registerUser, setUninstallToken } from './api-client.js';
import { getMessage } from './utils/i18n-helper.js';
import { promptAPIService } from './services/prompt-api-service.js';

let config = null;

// Load configuration (for uninstall tracking)
async function loadConfig() {
  if (config) return config;

  try {
    const response = await fetch(chrome.runtime.getURL('config.json'));
    config = await response.json();
    return config;
  } catch (error) {
    debugLog('❌ Failed to load configuration:', error);
    return null;
  }
}

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

  // Set up uninstall tracking URL
  await setUninstallTrackingURL();

  // Set up daily heartbeat (check if it already exists to avoid duplication)
  const existingAlarm = await chrome.alarms.get('dailyHeartbeat');
  if (!existingAlarm) {
    chrome.alarms.create('dailyHeartbeat', {
      delayInMinutes: 1,        // First execution after 1 minute
      periodInMinutes: 24 * 60  // Repeat every 24 hours
    });
    debugLog('⏰ Daily heartbeat configured');
  } else {
    debugLog('⏰ Daily heartbeat already exists, skipping setup');
  }
});

// Check user authentication status
async function checkAuthStatus() {
  try {
    const stored = await chrome.storage.local.get(['isLoggedIn', 'currentUser']);
    const isLoggedIn = stored.isLoggedIn && stored.currentUser;

    if (isLoggedIn) {
      // Check if token is still valid (optional)
      const loginTime = stored.currentUser.loginTime;
      const now = Date.now();
      const hoursSinceLogin = (now - loginTime) / (1000 * 60 * 60);

      // If over 24 hours, consider re-authentication (though Google tokens usually last longer)
      if (hoursSinceLogin > 24) {
        debugLog('⚠️ Token may be expired, recommend re-login');
      }
    }

    debugLog('🔐 User login status:', isLoggedIn);
    return isLoggedIn;
  } catch (error) {
    debugLog('❌ Failed to check login status:', error);
    return false;
  }
}

// Chrome Identity API Google login flow
async function signInWithGoogle() {
  try {
    debugLog('🔑 Starting Chrome Identity Google login flow');

    // Get Google token using Chrome Identity API
    const token = await new Promise((resolve, reject) => {
      chrome.identity.getAuthToken({ interactive: true }, (token) => {
        if (chrome.runtime.lastError) {
          debugLog('❌ Chrome Identity login failed:', chrome.runtime.lastError);
          reject(chrome.runtime.lastError);
        } else {
          debugLog('✅ Chrome Identity token obtained successfully');
          resolve(token);
        }
      });
    });

    // Get user info using token
    const response = await fetch('https://www.googleapis.com/oauth2/v2/userinfo', {
      headers: { Authorization: `Bearer ${token}` }
    });

    if (!response.ok) {
      throw new Error(getMessage('userDataMissing'));
    }

    const userInfo = await response.json();
    debugLog('✅ User info obtained:', { email: userInfo.email, name: userInfo.name });

    // Save user info to Chrome Storage
    const userData = {
      token: token,
      email: userInfo.email,
      name: userInfo.name,
      picture: userInfo.picture,
      loginTime: Date.now()
    };

    await chrome.storage.local.set({
      currentUser: userData,
      isLoggedIn: true
    });

    // Register user with Supabase and get API Key
    const apiKeyInfo = await registerUserAndGetApiKey(userData);
    userData.apiKey = apiKeyInfo.apiKey;
    userData.dailyQuota = apiKeyInfo.dailyQuota;

    // Re-save user data including API Key
    await chrome.storage.local.set({
      currentUser: userData,
      isLoggedIn: true
    });

    // Update uninstall tracking URL after successful login (with user's API Key)
    await setUninstallTrackingURL();

    debugLog('✅ Google login completed');
    return { success: true, user: userData };
  } catch (error) {
    debugLog('❌ Google login process error:', error);
    throw error;
  }
}

// Register user with Supabase and get API Key
async function registerUserAndGetApiKey(userData) {
  try {
    debugLog('📝 Registering user with Supabase and getting API Key:', userData.email);

    const apiKeyInfo = await registerUser(userData.email, userData.name);
    debugLog('✅ User API Key obtained successfully:', {
      hasApiKey: !!apiKeyInfo.api_key,
      dailyQuota: apiKeyInfo.daily_quota
    });

    return {
      apiKey: apiKeyInfo.api_key,
      dailyQuota: apiKeyInfo.daily_quota,
      totalUsage: apiKeyInfo.total_usage
    };
  } catch (error) {
    debugLog('❌ User registration process error:', error);
    throw new Error(getMessage('missingApiKey'));
  }
}





// Prompt generation moved to backend to protect IP
// Frontend now only passes news data, no longer assembles prompts

// ========== Uninstall Tracking Functions ==========

// Set uninstall tracking URL (secure version: using one-time token)
async function setUninstallTrackingURL() {
  try {
    debugLog('🔍 Starting secure uninstall tracking URL setup');

    const stored = await chrome.storage.local.get(['currentUser']);
    const apiKey = stored.currentUser?.apiKey;

    if (!apiKey) {
      // User not logged in, set generic uninstall URL
      const uninstallURL = 'https://hottea.app/feedback';
      await chrome.runtime.setUninstallURL(uninstallURL);
      debugLog('✅ Generic uninstall URL set:', uninstallURL);
      return;
    }

    // 1. Generate one-time token
    const uninstallToken = crypto.randomUUID();
    debugLog(`✨ One-time uninstall token generated: ${uninstallToken}`);

    // 2. Associate token with API Key
    const success = await setUninstallToken(apiKey, uninstallToken);

    if (!success) {
      // If setup fails, fall back to old URL to ensure functionality (but log error)
      debugLog('⚠️ Failed to set uninstall token, falling back to old URL');
      const fallbackURL = 'https://hottea.app/feedback?error=token_failure';
      await chrome.runtime.setUninstallURL(fallbackURL);
      return;
    }

    // 3. Set uninstall URL with token
    const uninstallURL = `https://hottea.app/feedback?token=${uninstallToken}`;
    await chrome.runtime.setUninstallURL(uninstallURL);

    debugLog('✅ Successfully set personalized, secure uninstall URL');

  } catch (error) {
    debugLog('❌ Failed to set uninstall tracking URL:', error);
    // Similarly, set a fallback URL with error info
    try {
      const fallbackURL = 'https://hottea.app/feedback?error=setup_exception';
      await chrome.runtime.setUninstallURL(fallbackURL);
    } catch (e) {
      debugLog('❌ Setting fallback URL also failed:', e);
    }
  }
}

// Send heartbeat (daily activity signal)
async function sendHeartbeat() {
  try {
    const stored = await chrome.storage.local.get(['currentUser']);
    const apiKey = stored.currentUser?.apiKey;

    if (!apiKey) {
      debugLog('⚠️ Not logged in, skipping heartbeat');
      return;
    }

    // Get Supabase configuration
    const cfg = await loadConfig();
    if (!cfg?.supabase?.url || !cfg?.supabase?.anonKey) {
      debugLog('❌ Unable to load Supabase configuration');
      return;
    }

    const supabaseUrl = cfg.supabase.url;
    const supabaseAnonKey = cfg.supabase.anonKey;

    // Call RPC function
    const response = await fetch(`${supabaseUrl}/rest/v1/rpc/update_heartbeat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'apikey': supabaseAnonKey,
        'Authorization': `Bearer ${supabaseAnonKey}`,
      },
      body: JSON.stringify({ p_api_key: apiKey })
    });

    if (response.ok) {
      debugLog('💓 Heartbeat sent successfully');
    } else {
      debugLog('⚠️ Heartbeat send failed:', await response.text());
    }
  } catch (error) {
    debugLog('❌ Heartbeat error:', error);
  }
}

// ========== End Uninstall Tracking Functions ==========

// Listen for alarm events (daily heartbeat)
chrome.alarms.onAlarm.addListener((alarm) => {
  if (alarm.name === 'dailyHeartbeat') {
    debugLog('⏰ Daily heartbeat triggered');
    sendHeartbeat();
  }
});

// Message handler
chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
  debugLog('📨 Message received:', request.action, 'from:', sender.tab?.id || 'extension');

  if (request.action === 'checkAuth') {
    checkAuthStatus()
      .then(isLoggedIn => {
        debugLog('✅ Login status check completed:', isLoggedIn);
        sendResponse({ success: true, isLoggedIn });
      })
      .catch(error => {
        debugLog('❌ Login status check failed:', error.message);
        sendResponse({ success: false, error: error.message });
      });
    return true; // Keep message channel open
  }

  if (request.action === 'signInWithGoogle') {
    signInWithGoogle()
      .then(result => {
        debugLog('✅ Google login completed');
        sendResponse({ success: true, data: result });
      })
      .catch(error => {
        debugLog('❌ Google login failed:', error.message);
        sendResponse({ success: false, error: error.message });
      });
    return true;
  }




  debugLog('⚠️ Unknown message action:', request.action);
});

debugLog('🎯 Background script loaded successfully');

// Initialize on Service Worker startup (ensures execution on reload/wake)
(async function initializeOnStartup() {
  debugLog('🔧 Service Worker started, executing initialization');

  // Ensure uninstall tracking URL is set (executes even on reload)
  await setUninstallTrackingURL();

  // Ensure heartbeat alarm is set (prevent alarm loss on reload)
  const existingAlarm = await chrome.alarms.get('dailyHeartbeat');
  if (!existingAlarm) {
    chrome.alarms.create('dailyHeartbeat', {
      delayInMinutes: 1,        // First execution after 1 minute
      periodInMinutes: 24 * 60  // Repeat every 24 hours
    });
    debugLog('⏰ Daily heartbeat configured (on startup)');
  } else {
    debugLog('⏰ Daily heartbeat already exists');
  }

  debugLog('✅ Startup initialization completed');
})();

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