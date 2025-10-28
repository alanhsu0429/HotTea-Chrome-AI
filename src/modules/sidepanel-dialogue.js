// HotTea Dialogue Rendering Module
// Handles dialogue display, avatar management, person info popups, etc.

import { logger } from '../utils/logger.js';
import { wikipediaAvatarService } from '../wikipedia-avatar.js';
import {
  getMessage,
  formatMessage,
  getCurrentLanguage
} from '../utils/i18n-helper.js';
import { getUserDisplayName, isUserSpeaker } from './sidepanel-auth.js';
import { fetchAndDisplaySuggestions, resetSuggestions } from './sidepanel-suggestions.js';

// Global variables
export let currentDialogueData = null; // Store current dialogue data for Q&A
export let currentArticleData = null; // Store current article content data

// Progressive dialogue rendering for streaming (NEW)
export async function displayDialogueStreaming(partialData, isFinal = false) {
  logger.log(`🎭 Display streaming dialogue (${isFinal ? 'FINAL' : 'PARTIAL'}):`, partialData);

  try {
    const dialogueList = document.getElementById('dialogueList');
    if (!dialogueList) return;

    // Ensure UI is in result view on first chunk
    if (dialogueList.children.length === 0) {
      switchToResultView();
    }

    // Parse dialogue data
    let dialogue;
    if (typeof partialData === 'string') {
      dialogue = JSON.parse(partialData);
    } else {
      dialogue = partialData;
    }

    if (!dialogue.dialogue || !Array.isArray(dialogue.dialogue)) {
      logger.warn('⚠️ Partial data missing dialogue array, skipping render');
      return;
    }

    // Clear and re-render all messages (simple approach for MVP)
    // Future optimization: only render new messages
    dialogueList.innerHTML = '';

    let lastSpeaker = '';
    let messageGroup = [];
    const renderPromises = [];

    for (let index = 0; index < dialogue.dialogue.length; index++) {
      const item = dialogue.dialogue[index];

      if (item.speaker !== lastSpeaker) {
        if (messageGroup.length > 0) {
          renderPromises.push(renderMessageGroup(messageGroup));
        }
        messageGroup = [item];
        lastSpeaker = item.speaker;
      } else {
        messageGroup.push(item);
      }

      if (index === dialogue.dialogue.length - 1) {
        renderPromises.push(renderMessageGroup(messageGroup));
      }
    }

    await Promise.all(renderPromises);

    // Auto-scroll to bottom
    const resultView = document.getElementById('result');
    if (resultView) {
      resultView.scrollTop = resultView.scrollHeight;
    }

    // If final, store dialogue data and fetch suggestions
    if (isFinal) {
      currentDialogueData = {
        ...dialogue,
        newsContent: currentArticleData?.content || '',
        newsTitle: currentArticleData?.title || dialogue.title || 'News',
        newsUrl: currentArticleData?.url || window.location.href
      };

      // Asynchronously fetch suggested questions
      if (!dialogue.isError && currentArticleData) {
        logger.log('🔍 Preparing to fetch suggested questions');
        setTimeout(() => {
          fetchAndDisplaySuggestions(dialogue, currentArticleData).catch(error => {
            logger.warn('⚠️ Suggested questions fetch failed (silent handling):', error);
          });
        }, 100);
      }
    }

  } catch (error) {
    logger.error('❌ Display streaming dialogue failed:', error);
    // Don't show error for partial data parsing failures
    if (isFinal) {
      showError();
    }
  }
}

// Switch to result view (helper for streaming)
export function switchToResultView() {
  const welcomeView = document.getElementById('welcome');
  const loading = document.getElementById('loading');
  const errorView = document.getElementById('error');
  const resultView = document.getElementById('result');
  const headerDefault = document.getElementById('headerDefault');
  const headerResult = document.getElementById('headerResult');
  const qaInput = document.getElementById('qaInput');
  const cancelLoadingBtn = document.getElementById('cancelLoadingBtn');

  if (cancelLoadingBtn) cancelLoadingBtn.style.display = 'none';
  if (welcomeView) welcomeView.style.display = 'none';
  if (loading) loading.style.display = 'none';
  if (errorView) errorView.style.display = 'none';
  if (resultView) resultView.style.display = 'block';

  // Switch header
  if (headerDefault && headerResult) {
    headerDefault.style.display = 'none';
    headerResult.style.display = 'flex';
  }

  // Show Q&A input
  if (qaInput) {
    qaInput.style.display = 'block';
    if (resultView) {
      resultView.classList.add('with-qa-input');
    }
  }
}

// === JSON Lines Progressive Streaming Functions ===

// Global state for JSON Lines streaming
let streamingMessages = [];
let lastStreamingSpeaker = null;

// Reset streaming state
export function resetStreamingState() {
  streamingMessages = [];
  lastStreamingSpeaker = null;

  const dialogueList = document.getElementById('dialogueList');
  if (dialogueList) {
    dialogueList.innerHTML = '';
  }
}

// Add a single streaming message (called by JSON Lines parser)
export async function addStreamingMessage(message) {
  logger.log(`💬 Adding streaming message: ${message.speaker}`);

  const dialogueList = document.getElementById('dialogueList');
  if (!dialogueList) return;

  streamingMessages.push(message);

  // Render this message
  await renderMessageGroup([message]);

  // Auto-scroll to bottom
  const resultView = document.getElementById('result');
  if (resultView) {
    resultView.scrollTop = resultView.scrollHeight;
  }

  lastStreamingSpeaker = message.speaker;
}

// Show typing indicator for a speaker
export function showTypingIndicator(speaker) {
  const dialogueList = document.getElementById('dialogueList');
  if (!dialogueList) return;

  // Remove existing typing indicator
  const existingIndicator = document.getElementById('typing-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  const isNarrator = isUserSpeaker(speaker);
  const avatarColor = isNarrator ? '#FF8C00' : getAvatarColorForSpeaker(speaker);

  const indicatorElement = document.createElement('div');
  indicatorElement.id = 'typing-indicator';
  indicatorElement.className = `dialogue-message ${isNarrator ? 'narrator' : 'character'}`;

  if (isNarrator) {
    indicatorElement.innerHTML = `
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    `;
  } else {
    indicatorElement.innerHTML = `
      <div class="avatar" style="background-color: ${avatarColor};">${getEmojiAvatarForSpeaker(speaker)}</div>
      <div class="message-wrapper">
        <div class="speaker-name">${speaker}</div>
        <div class="typing-indicator">
          <span></span>
          <span></span>
          <span></span>
        </div>
      </div>
    `;
  }

  dialogueList.appendChild(indicatorElement);

  // Auto-scroll
  const resultView = document.getElementById('result');
  if (resultView) {
    resultView.scrollTop = resultView.scrollHeight;
  }
}

// Hide typing indicator
export function hideTypingIndicator() {
  const indicator = document.getElementById('typing-indicator');
  if (indicator) {
    indicator.remove();
  }
}

// Show generic typing indicator (no avatar, no name - centered)
export function showGenericTypingIndicator() {
  const dialogueList = document.getElementById('dialogueList');
  if (!dialogueList) return;

  // Remove existing typing indicator
  const existingIndicator = document.getElementById('typing-indicator');
  if (existingIndicator) {
    existingIndicator.remove();
  }

  const indicatorElement = document.createElement('div');
  indicatorElement.id = 'typing-indicator';
  indicatorElement.className = 'dialogue-message generic-typing';

  indicatorElement.innerHTML = `
    <div class="generic-typing-wrapper">
      <div class="typing-indicator">
        <span></span>
        <span></span>
        <span></span>
      </div>
    </div>
  `;

  dialogueList.appendChild(indicatorElement);

  // Auto-scroll
  const resultView = document.getElementById('result');
  if (resultView) {
    resultView.scrollTop = resultView.scrollHeight;
  }
}

// Get all streaming messages collected so far
export function getStreamingMessages() {
  return streamingMessages;
}

// Display dialogue result
export async function displayDialogue(data) {
  logger.log('🎭 Display dialogue result:', data);

  try {
    // Parse dialogue data
    let dialogue;
    if (typeof data === 'string') {
      dialogue = JSON.parse(data);
    } else if (data.candidates && data.candidates[0]) {
      const content = data.candidates[0].content;
      const text = content.parts[0].text;
      dialogue = JSON.parse(text);
    } else {
      dialogue = data;
    }

    // Check if error state
    if (dialogue.isError) {
      logger.group('❌ Received error state response');
      logger.error('🚨 Error type:', dialogue.errorType);
      logger.error('💬 Error message:', dialogue.summary || dialogue.errorMessage);
      logger.error('📰 News title:', dialogue.newsTitle);

      // Debug info returned from Edge Function
      if (dialogue.warning) {
        logger.error('⚠️ Warning:', dialogue.warning);
        logger.error('🔍 Original error:', dialogue.originalError);
        logger.error('📄 Gemini raw response:', dialogue.rawResponse);
      }
      logger.groupEnd();
      // Error state still displays as dialogue, but with special styling or hints
    }

    if (!dialogue.dialogue || !Array.isArray(dialogue.dialogue)) {
      throw new Error(getMessage('unexpectedResponseFormat'));
    }

    // Get DOM elements
    const dialogueList = document.getElementById('dialogueList');
    const welcomeView = document.getElementById('welcome');
    const loading = document.getElementById('loading');
    const errorView = document.getElementById('error');
    const resultView = document.getElementById('result');
    const headerDefault = document.getElementById('headerDefault');
    const headerResult = document.getElementById('headerResult');
    const qaInput = document.getElementById('qaInput');
    const cancelLoadingBtn = document.getElementById('cancelLoadingBtn');

    // Clear and refill dialogue list
    dialogueList.innerHTML = '';

    let lastSpeaker = '';
    let messageGroup = [];
    const renderPromises = [];

    for (let index = 0; index < dialogue.dialogue.length; index++) {
      const item = dialogue.dialogue[index];

      if (item.speaker !== lastSpeaker) {
        if (messageGroup.length > 0) {
          renderPromises.push(renderMessageGroup(messageGroup));
        }
        messageGroup = [item];
        lastSpeaker = item.speaker;
      } else {
        messageGroup.push(item);
      }

      if (index === dialogue.dialogue.length - 1) {
        renderPromises.push(renderMessageGroup(messageGroup));
      }
    }

    // Wait for all rendering to complete
    await Promise.all(renderPromises);

    // Store dialogue data for Q&A use, including original news content
    currentDialogueData = {
      ...dialogue,
      newsContent: currentArticleData?.content || '',  // Store original news content
      newsTitle: currentArticleData?.title || dialogue.title || 'News',
      newsUrl: currentArticleData?.url || window.location.href
    };

    // Switch to result header
    if (headerDefault && headerResult) {
      headerDefault.style.display = 'none';
      headerResult.style.display = 'flex';
    }

    // Show result page
    if (cancelLoadingBtn) {
      cancelLoadingBtn.style.display = 'none';
    }

    if (welcomeView) welcomeView.style.display = 'none';
    if (loading) loading.style.display = 'none';
    if (errorView) errorView.style.display = 'none';
    if (resultView) resultView.style.display = 'block';

    // If error state, add special styling hint
    if (dialogue.isError) {
      resultView.classList.add('error-state');
      logger.log('💡 Display error state dialogue, error type:', dialogue.errorType);
    } else {
      resultView.classList.remove('error-state');
    }

    // Show Q&A input (Q&A feature not shown in error state)
    if (qaInput) {
      if (dialogue.isError) {
        qaInput.style.display = 'none';
        resultView.classList.remove('with-qa-input');
      } else {
        qaInput.style.display = 'block';
        resultView.classList.add('with-qa-input');
      }
    }

    // Asynchronously fetch suggested questions (non-blocking)
    if (!dialogue.isError && currentArticleData) {
      logger.log('🔍 Preparing to fetch suggested questions');
      // Use setTimeout to ensure execution after dialogue rendering completes
      setTimeout(() => {
        fetchAndDisplaySuggestions(dialogue, currentArticleData).catch(error => {
          logger.warn('⚠️ Suggested questions fetch failed (silent handling):', error);
        });
      }, 100);
    }

  } catch (error) {
    logger.error('❌ Display dialogue failed:', error);
    showError();
  }
}

// Render message group (async version with Wikipedia avatar support)
async function renderMessageGroup(messages) {
  const speaker = messages[0].speaker;
  const displaySpeaker = isUserSpeaker(speaker) ? getUserDisplayName() : speaker;
  const isNarrator = isUserSpeaker(speaker);
  const avatarColor = isNarrator ? '#FF8C00' : getAvatarColorForSpeaker(speaker);

  // If character, preload avatar
  let avatarPromise = null;
  if (!isNarrator) {
    avatarPromise = getAvatarHtmlForSpeaker(speaker, avatarColor);
  }

  const dialogueList = document.getElementById('dialogueList');

  for (let index = 0; index < messages.length; index++) {
    const message = messages[index];
    const messageElement = document.createElement('div');
    messageElement.className = `dialogue-message ${isNarrator ? 'narrator' : 'character'}`;

    if (index === messages.length - 1) {
      messageElement.classList.add('group-spacing');
    }

    let bubbleClass = 'single-message';
    if (messages.length > 1) {
      if (index === 0) bubbleClass = 'first-in-group';
      else if (index === messages.length - 1) bubbleClass = 'last-in-group';
      else bubbleClass = 'middle-in-group';
    }

    if (isNarrator) {
      messageElement.innerHTML = `
        <div class="message-bubble ${bubbleClass}">${message.content}</div>
      `;
    } else {
      // Show loading avatar
      let avatar;
      if (index === 0) {
        // First show emoji avatar, then replace asynchronously
        avatar = `<div class="avatar avatar-loading clickable" data-speaker="${speaker}" style="background-color: ${avatarColor}; cursor: pointer;" title="${formatMessage('clickToViewInfo', {name: speaker})}">${getEmojiAvatarForSpeaker(speaker)}</div>`;
      } else {
        avatar = '<div class="avatar-spacer"></div>';
      }
      const speakerName = index === 0 ? `<div class="speaker-name">${displaySpeaker}</div>` : '';

      messageElement.innerHTML = `
        ${avatar}
        <div class="message-wrapper">
          ${speakerName}
          <div class="message-bubble ${bubbleClass}">${message.content}</div>
        </div>
      `;

      // Add click event listener for initial avatar
      if (index === 0) {
        const initialAvatarElement = messageElement.querySelector('.avatar.clickable');
        if (initialAvatarElement) {
          addAvatarClickListener(initialAvatarElement);
        }
      }

      // Asynchronously load avatar
      if (index === 0 && avatarPromise) {
        avatarPromise.then(avatarHtml => {
          const avatarElement = messageElement.querySelector('.avatar');
          if (avatarElement) {
            avatarElement.outerHTML = avatarHtml;

            // Add click event listener
            const newAvatarElement = messageElement.querySelector('.avatar.clickable');
            if (newAvatarElement) {
              addAvatarClickListener(newAvatarElement);
            }
          }
        }).catch(error => {
          logger.warn('Avatar loading failed:', error);
        });
      }
    }

    dialogueList.appendChild(messageElement);
  }
}

// Get character avatar (keep original emoji system as fallback)
function getEmojiAvatarForSpeaker(speaker) {
  if (isUserSpeaker(speaker)) {
    return '😎';
  }

  return '👤';
}

// Get character avatar HTML (integrated with Wikipedia feature)
async function getAvatarHtmlForSpeaker(speaker, avatarColor) {
  if (isUserSpeaker(speaker)) {
    return `<div class="avatar" style="background-color: ${avatarColor};">${getEmojiAvatarForSpeaker(speaker)}</div>`;
  }

  // HotTea uses dedicated Logo
  if (speaker === 'HotTea') {
    return `<div class="avatar" style="background-color: ${avatarColor}; background-image: url('icons/HTBlackLogo.png'); background-size: cover; background-position: center; color: transparent;">🍵</div>`;
  }

  try {
    // Attempt to get Wikipedia avatar
    const wikipediaUrl = await wikipediaAvatarService.getAvatarUrl(speaker);

    if (wikipediaUrl) {
      return `<div class="avatar clickable" data-speaker="${speaker}" style="background-color: ${avatarColor}; background-image: url('${wikipediaUrl}'); background-size: cover; background-position: center top; color: transparent; cursor: pointer;" title="${formatMessage('clickToViewInfo', {name: speaker})}">${getEmojiAvatarForSpeaker(speaker)}</div>`;
    }
  } catch (error) {
    logger.warn(`Avatar loading failed, using default: ${speaker}`, error);
  }

  // Fallback to emoji (still clickable to view info)
  return `<div class="avatar clickable" data-speaker="${speaker}" style="background-color: ${avatarColor}; cursor: pointer;" title="${formatMessage('clickToViewInfo', {name: speaker})}">${getEmojiAvatarForSpeaker(speaker)}</div>`;
}

// Add avatar click event listener
function addAvatarClickListener(avatarElement) {
  avatarElement.addEventListener('click', async (event) => {
    event.preventDefault();
    event.stopPropagation();

    const speaker = avatarElement.dataset.speaker;
    if (speaker && !isUserSpeaker(speaker)) {
      await showPersonPopup(speaker);
    }
  });
}

// Show person info popup
async function showPersonPopup(speaker) {
  try {
    // Show loading state
    showLoadingPopup(speaker);

    // Get person complete info
    const personInfo = await wikipediaAvatarService.getPersonInfo(speaker);

    if (!personInfo) {
      showErrorPopup(speaker);
      return;
    }

    // Display person info popup
    displayPersonInfoPopup(personInfo);

  } catch (error) {
    logger.error('Failed to show person popup:', error);
    showErrorPopup(speaker);
  }
}

// Show loading popup
function showLoadingPopup(speaker) {
  removeExistingPopup();

  const popup = document.createElement('div');
  popup.className = 'person-popup';
  popup.innerHTML = `
    <div class="popup-overlay"></div>
    <div class="popup-content loading">
      <div class="popup-loading">
        <div class="loading-spinner"></div>
        <p>${formatMessage('loadingPersonInfo', {name: speaker})}</p>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  // Add event listener
  const overlay = popup.querySelector('.popup-overlay');
  if (overlay) {
    overlay.addEventListener('click', closePersonPopup);
  }
}

// Show error popup
function showErrorPopup(speaker) {
  removeExistingPopup();

  const popup = document.createElement('div');
  popup.className = 'person-popup';
  popup.innerHTML = `
    <div class="popup-overlay"></div>
    <div class="popup-content">
      <button class="popup-close">✕</button>
      <div class="popup-error">
        <h3>${speaker}</h3>
        <p>${getMessage('personInfoUnavailable')}</p>
        <p>${getMessage('possibleReasons')}</p>
        <ul>
          <li>${getMessage('reasonNoWikipedia')}</li>
          <li>${getMessage('reasonNetworkIssue')}</li>
          <li>${getMessage('reasonNameMismatch')}</li>
        </ul>
      </div>
    </div>
  `;

  document.body.appendChild(popup);

  // Add event listeners
  const overlay = popup.querySelector('.popup-overlay');
  if (overlay) {
    overlay.addEventListener('click', closePersonPopup);
  }

  const closeBtn = popup.querySelector('.popup-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closePersonPopup);
  }
}

// Display person info popup
function displayPersonInfoPopup(personInfo) {
  removeExistingPopup();

  // Generate attribution info text
  let attributionText = '';
  if (personInfo.attribution.artist || personInfo.attribution.license) {
    const parts = [];
    if (personInfo.attribution.artist) {
      parts.push(`Author: ${personInfo.attribution.artist}`);
    }
    if (personInfo.attribution.license) {
      parts.push(`License: ${personInfo.attribution.license}`);
    }
    attributionText = parts.join(' / ');

    if (personInfo.attribution.credit) {
      attributionText = personInfo.attribution.credit;
    }
  } else {
    attributionText = getMessage('imageSource');
  }

  const popup = document.createElement('div');
  popup.className = 'person-popup';
  popup.innerHTML = `
    <div class="popup-overlay"></div>
    <div class="popup-content">
      <button class="popup-close">✕</button>

      <div class="popup-header">
        ${personInfo.imageUrl
          ? `<img class="popup-avatar" src="${personInfo.imageUrl}" alt="${personInfo.name}">`
          : `<div class="popup-avatar-fallback">${getEmojiAvatarForSpeaker(personInfo.name)}</div>`
        }
        <h3 class="popup-name">${personInfo.name}</h3>
      </div>

      <div class="popup-body">
        ${personInfo.extract
          ? `<p class="popup-description">${personInfo.extract}</p>`
          : `<p class="popup-no-info">${getMessage('personInfoNoDetails')}</p>`
        }
      </div>

      ${personInfo.imageUrl ? `
        <div class="popup-attribution">
          <small>${attributionText}</small>
        </div>
      ` : ''}
    </div>
  `;

  document.body.appendChild(popup);

  // Add event listeners
  const overlay = popup.querySelector('.popup-overlay');
  if (overlay) {
    overlay.addEventListener('click', closePersonPopup);
  }

  const closeBtn = popup.querySelector('.popup-close');
  if (closeBtn) {
    closeBtn.addEventListener('click', closePersonPopup);
  }

  // Add ESC key close function
  document.addEventListener('keydown', handlePopupKeydown);
}

// Close person popup
function closePersonPopup() {
  removeExistingPopup();
  document.removeEventListener('keydown', handlePopupKeydown);
}

// Remove existing popup
function removeExistingPopup() {
  const existingPopup = document.querySelector('.person-popup');
  if (existingPopup) {
    existingPopup.remove();
  }
}

// Handle popup keydown event
function handlePopupKeydown(event) {
  if (event.key === 'Escape') {
    closePersonPopup();
  }
}

// Get character avatar background color
function getAvatarColorForSpeaker(speaker) {
  if (isUserSpeaker(speaker)) {
    return '#FF8C00'; // Keep original orange
  }

  // Predefined color palette, ensuring good appearance and sufficient contrast
  const colors = [
    '#6366f1', // Indigo
    '#8b5cf6', // Purple
    '#06b6d4', // Cyan
    '#10b981', // Green
    '#f59e0b', // Amber
    '#ef4444', // Red
    '#ec4899', // Pink
    '#84cc16', // Lime
    '#f97316', // Orange
    '#3b82f6'  // Blue
  ];

  // Use simple hash function to generate consistent color based on name
  let hash = 0;
  for (let i = 0; i < speaker.length; i++) {
    const char = speaker.charCodeAt(i);
    hash = ((hash << 5) - hash) + char;
    hash = hash & hash; // Convert to 32-bit integer
  }

  return colors[Math.abs(hash) % colors.length];
}

// Set current article data
export function setCurrentArticleData(articleData) {
  currentArticleData = articleData;
}

// Get current dialogue data
export function getCurrentDialogueData() {
  // Return dialogue data from currentArticleData (chrome-ai branch structure)
  if (currentArticleData?.dialogueData) {
    return {
      dialogue: currentArticleData.dialogueData.dialogue,
      newsContent: currentArticleData.content,
      newsTitle: currentArticleData.title,
      newsUrl: currentArticleData.url
    };
  }
  return null;
}

// Add Q&A message to dialogue list
export async function addQAMessageToDialogue(speaker, content) {
  try {
    logger.log('💬 Adding Q&A message:', {
      speaker,
      contentPreview: typeof content === 'string' && content.length > 50
        ? content.substring(0, 50) + '...'
        : content
    });

    const dialogueList = document.getElementById('dialogueList');
    if (!dialogueList) return;

    // Create message element
    const messageElement = document.createElement('div');
    const isNarrator = isUserSpeaker(speaker);
    messageElement.className = `dialogue-message ${isNarrator ? 'narrator' : 'character'} qa-message group-spacing`;

    if (isNarrator) {
      // User message (right-aligned)
      messageElement.innerHTML = `
        <div class="message-bubble single-message">${content}</div>
      `;
    } else {
      // AI response (left-aligned)
      const avatarColor = getAvatarColorForSpeaker(speaker);
      const avatarHtml = await getAvatarHtmlForSpeaker(speaker, avatarColor);

      messageElement.innerHTML = `
        ${avatarHtml}
        <div class="message-wrapper">
          <div class="speaker-name">${speaker}</div>
          <div class="message-bubble single-message">${content}</div>
        </div>
      `;

      // Add click event listener
      const avatarElement = messageElement.querySelector('.avatar.clickable');
      if (avatarElement) {
        addAvatarClickListener(avatarElement);
      }
    }

    // Add to dialogue list
    dialogueList.appendChild(messageElement);

    // Scroll to bottom
    const resultView = document.getElementById('result');
    if (resultView) {
      resultView.scrollTop = resultView.scrollHeight;
    }

  } catch (error) {
    logger.error('❌ Failed to add Q&A message:', error);
  }
}

// Helper function: stop loading text rotation
function stopLoadingTextRotation() {
  // This function is handled by UI module, empty implementation here
}

// Helper function: show error
function showError(message = null) {
  // If no message provided, use i18n default error message
  const errorMessage = message || getMessage('unknownError');
  const errorView = document.getElementById('error');
  const errorText = document.getElementById('errorText');

  if (errorText) {
    errorText.textContent = errorMessage;
  }

  // Hide all other views
  const views = ['welcome', 'loading', 'result'];
  views.forEach(viewName => {
    const element = document.getElementById(viewName);
    if (element) {
      element.style.display = 'none';
    }
  });

  // Show error view
  if (errorView) {
    errorView.style.display = 'flex';
  }

  // Switch header state
  const headerDefault = document.getElementById('headerDefault');
  const headerResult = document.getElementById('headerResult');

  if (headerDefault && headerResult) {
    headerDefault.style.display = 'flex';
    headerResult.style.display = 'none';
  }
}