// HotTea Authentication Module
// Handles user login, logout, and authentication state management

import { logger } from '../utils/logger.js';
import { getMessage, setI18nText } from '../utils/i18n-helper.js';

// Authentication state variables
export let currentUser = null;
export let userStats = null;

// Check authentication status and update UI
export async function checkAuthAndUpdateUI() {
  try {
    // Read user info from Chrome Storage
    const stored = await chrome.storage.local.get(['isLoggedIn', 'currentUser']);

    if (stored.isLoggedIn && stored.currentUser) {
      currentUser = stored.currentUser;
      logger.log('✅ User logged in:', currentUser.email);
      await updateUIForLoggedInUser();
    } else {
      logger.log('❌ User not logged in');
      currentUser = null;
      updateUIForLoggedOutUser();
    }
  } catch (error) {
    logger.error('Authentication status check failed:', error);
    updateUIForLoggedOutUser();
  }
}

// Update UI for logged in user
async function updateUIForLoggedInUser() {
  try {
    // Use user stats from Chrome Storage
    userStats = {
      today_usage: 0, // This will be updated by API response
      daily_quota: currentUser.dailyQuota || 50,
      total_usage: currentUser.totalUsage || 0,
      is_premium: false
    };

    logger.log('📊 User stats:', userStats);

    // Update welcome screen
    updateWelcomeScreen();

    // Show main button, hide login button
    const melonBtn = document.getElementById('melonBtn');
    const loginBtn = document.getElementById('loginBtn');

    if (melonBtn) {
      melonBtn.style.display = 'block';
      melonBtn.disabled = false;
      setI18nText(melonBtn, 'eatMelon');
    }

    if (loginBtn) {
      loginBtn.style.display = 'none';
    }

    logger.log('✅ UI updated to logged-in state');
  } catch (error) {
    logger.error('Failed to update UI for logged-in user:', error);
  }
}

// Update UI for logged out user
function updateUIForLoggedOutUser() {
  const melonBtn = document.getElementById('melonBtn');
  const loginBtn = document.getElementById('loginBtn');

  // Hide main button, show login button
  if (melonBtn) {
    melonBtn.style.display = 'none';
  }

  if (loginBtn) {
    loginBtn.style.display = 'block';
    loginBtn.disabled = false;
    setI18nText(loginBtn, 'signInWithGoogle');
  }

  // Clear user data
  currentUser = null;
  userStats = null;

  updateWelcomeScreen();
}

// Update welcome screen
function updateWelcomeScreen() {
  const existingUserInfo = document.querySelector('.user-info');
  const existingSignOutBtn = document.querySelector('.sign-out-btn');

  if (existingUserInfo) {
    existingUserInfo.remove();
  }
  if (existingSignOutBtn) {
    existingSignOutBtn.remove();
  }

  const centerDiv = document.querySelector('.center');

  if (currentUser) {
    // If user is logged in, add sign out button below the melon button
    const signOutBtn = document.createElement('button');
    signOutBtn.className = 'sign-out-btn';
    signOutBtn.textContent = getMessage('signOut');
    signOutBtn.addEventListener('click', handleSignOut);

    // Insert sign out button after melonBtn
    if (centerDiv) {
      centerDiv.appendChild(signOutBtn);
    }
  }
}

// Handle Google login
export async function handleGoogleLogin() {
  try {
    logger.log('🔑 Starting Google login flow');

    // Show loading state
    const melonBtn = document.getElementById('melonBtn');
    if (melonBtn) {
      melonBtn.disabled = true;
      setI18nText(melonBtn, 'processingArticle');
    }

    const response = await chrome.runtime.sendMessage({
      action: 'signInWithGoogle'
    });

    if (response.success) {
      // Update UI state directly
      await checkAuthAndUpdateUI();
    } else {
      throw new Error(response.error || getMessage('loginFailed'));
    }
  } catch (error) {
    logger.error('❌ Google login failed:', error);

    // Reset button
    const melonBtn = document.getElementById('melonBtn');
    if (melonBtn) {
      melonBtn.disabled = false;
      melonBtn.innerHTML = getGoogleButtonHTML();
    }

    // Display error message
    logger.error('❌ Google login failed:', error.message);
    throw error; // Let caller handle error display
  }
}

// Handle sign out
export async function handleSignOut() {
  try {
    logger.log('🚪 Starting sign out flow');

    // Clear user info from Chrome Storage
    await chrome.storage.local.remove(['currentUser', 'isLoggedIn']);

    // Clear Chrome Identity token (if needed)
    const stored = await chrome.storage.local.get(['currentUser']);
    if (stored.currentUser?.token) {
      chrome.identity.removeCachedAuthToken({ token: stored.currentUser.token });
    }

    // Reset local variables
    currentUser = null;
    userStats = null;

    // Update UI
    updateUIForLoggedOutUser();

    logger.log('✅ Sign out successful');
  } catch (error) {
    logger.error('❌ Sign out failed:', error);
  }
}

// Refresh user stats
export async function refreshUserStats() {
  try {
    // User stats are updated directly by API response, no additional query needed
    updateWelcomeScreen();
  } catch (error) {
    logger.error('Failed to refresh user stats:', error);
  }
}

// Get user display name
export function getUserDisplayName() {
  if (!currentUser) return getMessage('defaultUserName');

  // Use Google-provided name, only take first name
  if (currentUser.name) {
    return currentUser.name.split(' ')[0];
  }

  return getMessage('defaultUserName');
}

// Check if speaker is user
export function isUserSpeaker(speaker) {
  if (!speaker) return false;
  return speaker === getMessage('defaultUserName') || speaker === getUserDisplayName();
}

// Get Google login button HTML
function getGoogleButtonHTML() {
  return `
    <svg width="18" height="18" viewBox="0 0 18 18" style="margin-right: 8px;">
      <path fill="#4285F4" d="M16.51 8H8.98v3h4.3c-.18 1-.74 1.48-1.6 2.04v2.01h2.6a7.8 7.8 0 0 0 2.38-5.88c0-.57-.05-.66-.15-1.18Z"/>
      <path fill="#34A853" d="M8.98 17c2.16 0 3.97-.72 5.3-1.94l-2.6-2.04a4.8 4.8 0 0 1-2.7.75 4.8 4.8 0 0 1-4.52-3.36H1.83v2.07A8 8 0 0 0 8.98 17Z"/>
      <path fill="#FBBC05" d="M4.46 10.41a4.8 4.8 0 0 1-.25-1.41c0-.49.09-.97.25-1.41V5.52H1.83a8 8 0 0 0 0 7.37l2.63-2.48Z"/>
      <path fill="#EA4335" d="M8.98 3.58c1.32 0 2.5.45 3.44 1.35l2.54-2.59A8 8 0 0 0 8.98 1 8 8 0 0 0 1.83 5.52L4.46 8a4.8 4.8 0 0 1 4.52-4.42Z"/>
    </svg>
    ${getMessage('signInWithGoogle')}
  `;
}

