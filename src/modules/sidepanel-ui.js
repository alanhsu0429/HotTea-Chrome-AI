// HotTea UI State Management Module
// Handles UI view switching, loading states, error display, etc.

import { logger } from '../utils/logger.js';

import { getMessage, getRandomLoadingMessage } from '../utils/i18n-helper.js';
import { detectContentIssues, getContentIssueMessageKey } from '../utils/content-validator.js';
import {
  currentUser,
  userStats,
  refreshUserStats,
  handleGoogleLogin
} from './sidepanel-auth.js';
import {
  displayDialogue,
  displayDialogueStreaming,
  setCurrentArticleData,
  resetStreamingState,
  addStreamingMessage,
  showTypingIndicator,
  hideTypingIndicator,
  showGenericTypingIndicator,
  getStreamingMessages,
  switchToResultView
} from './sidepanel-dialogue.js';
import { setupQAEventListeners, resetQAHistory } from './sidepanel-qa.js';
import { resetSuggestions, renderSuggestions } from './sidepanel-suggestions.js';
import { callGeminiAPIWithApiKeyStreamingJSONLines, getSuggestedQuestions } from '../api-client.js';

// UI state variables
export let loadingInterval = null;
export let loadingTimeoutId = null; // 10-second timer
export let currentRequestController = null; // AbortController instance

// Unified event listener setup function

export function setupEventListeners() {

  logger.log('🔧 Setting up event listeners...');



  // Get DOM elements

  const loginBtn = document.getElementById('loginBtn');

  const melonBtn = document.getElementById('melonBtn');

  const headerBackBtn = document.getElementById('headerBackBtn');

  const headerRegenerateBtn = document.getElementById('headerRegenerateBtn');

  const retryBtn = document.getElementById('retryBtn');

  const cancelLoadingBtn = document.getElementById('cancelLoadingBtn');



  if (!loginBtn || !melonBtn || !headerBackBtn || !headerRegenerateBtn || !retryBtn || !cancelLoadingBtn) {

    logger.error('❌ Some DOM elements not found, unable to bind events');

    return;

  }



  // Login button - trigger Google login flow

  loginBtn.addEventListener('click', async () => {

    logger.log('🔑 Login button clicked');

    try {

      await handleGoogleLogin();

    } catch (error) {

      showError(error.message || getMessage('loginFailed'));

    }

  });



  // Main button - directly trigger generation process

  melonBtn.addEventListener('click', handleMelonClick);



  // Header control buttons

  headerBackBtn.addEventListener('click', () => {

    logger.log('⬅️ Back button clicked');

    showView('welcome');

    resetQAHistory();

    resetSuggestions();

  });



  headerRegenerateBtn.addEventListener('click', async () => {

    logger.log('🔄 Regenerate button clicked');

    await handleMelonClick(); // Reuse main logic

  });



  // Retry button

  retryBtn.addEventListener('click', async () => {

    logger.log('🔄 Retry button clicked');

    await handleMelonClick();

  });



  // Cancel loading button

  cancelLoadingBtn.addEventListener('click', () => {

    logger.log('🛑 Cancel button clicked');

    handleCancelLoading();

  });



  // Setup Q&A feature listeners

  setupQAEventListeners();



  logger.log('✅ All event listeners setup complete');

}



// Check and ensure content script is loaded

async function checkContentScript(tabId) {

  try {

    // First attempt to ping

    const response = await chrome.tabs.sendMessage(tabId, { action: 'ping' });

    logger.log('✅ Content script ping successful:', response);

    return true;

  } catch (error) {

    if (error.message.includes('Could not establish connection')) {

      logger.log('⚠️ Content script not loaded, attempting manual injection...');



      try {

        // Manually inject script (using new three-tier architecture)

        await chrome.scripting.executeScript({

          target: { tabId: tabId },

          files: ['lib/readability.js', 'lib/readability-readerable.js', 'lib/content-extractor-unified.js', 'content.js']

        });



        logger.log('✅ Manual injection complete, waiting for initialization...');



        // Wait for script initialization

        await new Promise(resolve => setTimeout(resolve, 200));



        // Retry ping

        const retryResponse = await chrome.tabs.sendMessage(tabId, { action: 'ping' });

        logger.log('✅ Ping successful after manual injection:', retryResponse);

        return true;



      } catch (injectError) {

        logger.error('❌ Manual injection failed:', injectError);

        return false;

      }

    } else {

      logger.error('❌ Unexpected error during ping check:', error);

      throw error;

    }

  }

}



// Get current tab

async function getCurrentTab() {

  try {

    // Directly query current active tab (activeTab permission allows)

    const [tab] = await chrome.tabs.query({

      active: true,

      lastFocusedWindow: true

    });



    if (!tab) {

      throw new Error(getMessage('webPageRequired'));

    }



    if (!tab.url || !tab.url.startsWith('http')) {

      throw new Error(getMessage('webPageRequired'));

    }



    logger.log('📋 Current tab retrieved:', { url: tab.url, title: tab.title });

    return tab;

  } catch (error) {

    logger.error('Failed to get current tab:', error);

    throw error;

  }

}



// Handle melon button click (simplified version)

async function handleMelonClick() {
  // Check login status first
  if (!currentUser) {
    logger.error('❌ User not logged in, cannot proceed');
    showError(getMessage('loginRequired'));
    return;
  }

  currentRequestController = new AbortController();
  showLoading();

  try {
    logger.log('🍈 Start processing current page (Sidepanel-driven)');

    const tab = await getCurrentTab();
    logger.log('📰 Processing page:', tab.url);

    const isContentScriptReady = await checkContentScript(tab.id);
    if (!isContentScriptReady) {
      throw new Error(getMessage('pageNotReady'));
    }
    logger.log('✅ Content script ready');

    const extractResponse = await chrome.tabs.sendMessage(tab.id, { action: 'extractArticle' });
    if (!extractResponse.success) {
      throw new Error(extractResponse.error || getMessage('errorContentExtraction'));
    }

    const articleData = extractResponse.data;
    logger.group('📊 Page parsing result');
    logger.log('🔗 URL:', tab.url);
    logger.log('🔧 Parser:', articleData.source);
    logger.log('📈 Confidence:', articleData.confidence);
    logger.log('📏 Content length:', articleData.content?.length || 0);
    logger.groupEnd();

    if (!articleData || !articleData.content || articleData.content.length < 50) {
      throw new Error(getMessage('insufficientContent'));
    }

    const contentIssue = detectContentIssues(articleData);
    if (contentIssue) {
      throw new Error(getMessage(getContentIssueMessageKey(contentIssue.type)));
    }

    articleData.url = tab.url;
    setCurrentArticleData(articleData);

    // [Core change] Call AI with JSON Lines streaming for progressive message display
    const { url, title, content } = articleData;
    const stored = await chrome.storage.local.get(['currentUser']);
    // Use first name from Google account, or default to "User" if not logged in
    const userName = stored.currentUser?.name ? stored.currentUser.name.split(' ')[0] : getMessage('defaultUserName');
    const userLanguage = chrome.i18n.getUILanguage();

    // Reset all UI states for new article
    // Note: Dialogue generation uses one-time sessions, no need to destroy here
    // Q&A session will be destroyed in resetQAHistory()
    logger.log('🔄 Resetting UI states for new article');
    resetStreamingState();      // Clear dialogue messages
    resetSuggestions();         // Clear suggested questions
    resetQAHistory();           // Clear Q&A history (also destroys Q&A session)

    // Switch to result view immediately when first message arrives
    let hasShownResultView = false;
    let lastSpeaker = null;
    const speakers = new Set();

    // Message callback for progressive display with typing indicators
    const onMessage = async (message) => {
      logger.log(`💬 Message received: ${message.speaker}`);

      // Switch to result view on first message
      if (!hasShownResultView) {
        stopLoadingTextRotation();
        switchToResultView();
        hasShownResultView = true;
        logger.log('📺 Switched to result view (first message arrived)');
      }

      // Hide previous typing indicator
      hideTypingIndicator();

      // Display this message
      await addStreamingMessage(message);

      // Track speakers for character extraction
      speakers.add(message.speaker);
      lastSpeaker = message.speaker;

      // Show generic typing indicator (no specific speaker, centered)
      showGenericTypingIndicator();
    };

    const response = await callGeminiAPIWithApiKeyStreamingJSONLines(
      url, title, content, userName, userLanguage,
      currentRequestController.signal,
      onMessage
    );

    if (response && response.success) {
      logger.log(`✅ Dialogue generation complete. ${response.messageCount} messages received`);

      // Hide final typing indicator
      hideTypingIndicator();

      // Extract characters from collected messages
      const allMessages = getStreamingMessages();
      const characters = [];
      const seenSpeakers = new Set();

      for (const msg of allMessages) {
        if (!seenSpeakers.has(msg.speaker)) {
          seenSpeakers.add(msg.speaker);
          characters.push({
            name: msg.speaker,
            role: msg.speaker === userName ? 'The curious friend' : 'News figure'
          });
        }
      }

      // Store complete dialogue data for Q&A
      const dialogueData = {
        characters,
        dialogue: allMessages,
        summary: response.summary || 'Conversation about the news article'
      };

      // This allows Q&A and other features to access the dialogue
      setCurrentArticleData({
        ...articleData,
        dialogueData
      });

      // Get and render suggested questions
      const suggestions = await getSuggestedQuestions(
        allMessages,
        content,
        title,
        userLanguage,
        currentRequestController.signal
      );

      if (suggestions && suggestions.questions.length > 0) {
        renderSuggestions(suggestions.questions);
      }
    } else {
      throw new Error(response.error || getMessage('errorGenerationFailed'));
    }

  } catch (error) {
    logger.error('❌ Processing failed:', error);
    if (error.name === 'AbortError') {
      logger.log('✋ User cancelled generation');
      showError(getMessage('generationCancelled'));
    } else {
      showError(error.message);
    }
  } finally {
    currentRequestController = null;
  }
}

// Handle cancel loading
function handleCancelLoading() {
  logger.log('🛑 User clicked cancel button');

  // Abort request
  if (currentRequestController) {
    currentRequestController.abort();
    currentRequestController = null;
  }

  // Clear timers
  if (loadingTimeoutId) {
    clearTimeout(loadingTimeoutId);
    loadingTimeoutId = null;
  }

  // Restore UI
  stopLoadingTextRotation();
  const loading = document.getElementById('loading');
  const welcomeView = document.getElementById('welcome');
  const cancelLoadingBtn = document.getElementById('cancelLoadingBtn');

  if (loading) loading.style.display = 'none';
  if (welcomeView) {
    welcomeView.classList.remove('slide-down');
    welcomeView.style.display = 'block';
  }

  // Hide cancel button
  if (cancelLoadingBtn) {
    cancelLoadingBtn.style.display = 'none';
  }

  logger.log('✅ Cancel operation complete, initial state restored');
}

// Loading text rotation control - uses i18n system with smooth transition effects
function startLoadingTextRotation() {
  const loadingTextElement = document.getElementById('loadingText');

  if (!loadingTextElement) return;

  // Clear previous interval (prevent duplicates)
  stopLoadingTextRotation();

  // Immediately show first message
  loadingTextElement.textContent = getRandomLoadingMessage();
  loadingTextElement.style.opacity = '1';

  // Switch every 2 seconds with fade in/out effect
  loadingInterval = setInterval(() => {
    // Fade out
    loadingTextElement.style.opacity = '0';

    setTimeout(() => {
      // Switch text
      loadingTextElement.textContent = getRandomLoadingMessage();
      // Fade in
      loadingTextElement.style.opacity = '1';
    }, 150); // Half of fade out animation time
  }, 2000); // 2 second interval
}

function stopLoadingTextRotation() {
  if (loadingInterval) {
    clearInterval(loadingInterval);
    loadingInterval = null;
  }
}

// Show loading state
function showLoading() {
  const welcomeView = document.getElementById('welcome');
  const loading = document.getElementById('loading');
  const resultView = document.getElementById('result');
  const errorView = document.getElementById('error');
  const cancelLoadingBtn = document.getElementById('cancelLoadingBtn');

  // Trigger background image exit animation
  if (welcomeView) {
    welcomeView.classList.add('slide-down');
  }

  // Clear previous timer
  if (loadingTimeoutId) {
    clearTimeout(loadingTimeoutId);
  }

  // Hide cancel button
  if (cancelLoadingBtn) {
    cancelLoadingBtn.style.display = 'none';
  }

  // Delay hiding welcome view to match animation
  setTimeout(() => {
    if (welcomeView) welcomeView.style.display = 'none';
    if (resultView) resultView.style.display = 'none';
    if (errorView) errorView.style.display = 'none';
    if (loading) loading.style.display = 'block';

    // Start text rotation
    startLoadingTextRotation();

    // Show cancel button after 10 seconds
    loadingTimeoutId = setTimeout(() => {
      if (cancelLoadingBtn && loading && loading.style.display === 'block') {
        logger.log('⏰ Loading exceeded 10 seconds, showing cancel button');
        cancelLoadingBtn.style.display = 'inline-block';
      }
    }, 10000);
  }, 250); // Half of animation time
}

// Show error
export function showError(customMessage = null) {
  const headerResult = document.getElementById('headerResult');
  const headerDefault = document.getElementById('headerDefault');
  const welcomeView = document.getElementById('welcome');
  const resultView = document.getElementById('result');
  const loading = document.getElementById('loading');
  const errorView = document.getElementById('error');
  const cancelLoadingBtn = document.getElementById('cancelLoadingBtn');

  // Switch back to default header
  if (headerResult) headerResult.style.display = 'none';
  if (headerDefault) headerDefault.style.display = 'flex';

  stopLoadingTextRotation(); // Stop rotation

  // Clean up cancel button related state
  if (loadingTimeoutId) {
    clearTimeout(loadingTimeoutId);
    loadingTimeoutId = null;
  }

  if (cancelLoadingBtn) {
    cancelLoadingBtn.style.display = 'none';
  }

  if (welcomeView) welcomeView.style.display = 'none';
  if (resultView) resultView.style.display = 'none';
  if (loading) loading.style.display = 'none';
  if (errorView) errorView.style.display = 'block';

  // Custom error message
  if (customMessage) {
    const errorTextElement = document.getElementById('errorText');
    if (errorTextElement) {
      errorTextElement.textContent = customMessage;
    }
  }
}

// Show specific view
export function showView(viewName) {
  const views = ['welcome', 'loading', 'result', 'error'];
  const headerDefault = document.getElementById('headerDefault');
  const headerResult = document.getElementById('headerResult');
  const qaInput = document.getElementById('qaInput');

  views.forEach(view => {
    const element = document.getElementById(view);
    if (element) {
      element.style.display = view === viewName ? (view === 'error' ? 'flex' : 'block') : 'none';
    }
  });

  // Switch header state
  if (headerDefault && headerResult) {
    if (viewName === 'result') {
      headerDefault.style.display = 'none';
      headerResult.style.display = 'flex';
    } else {
      headerDefault.style.display = 'flex';
      headerResult.style.display = 'none';
    }
  }

  // Control Q&A input display
  if (qaInput) {
    qaInput.style.display = viewName === 'result' ? 'block' : 'none';
  }

  // Stop loading related animations
  if (viewName !== 'loading') {
    stopLoadingTextRotation();
  }
}