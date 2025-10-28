// HotTea Q&A Feature Module
// Handles user Q&A interactions

import { logger } from '../utils/logger.js';
import { askWithSearch } from '../api-client.js';
import { getMessage, getCurrentLanguage } from '../utils/i18n-helper.js';
import { currentUser, getUserDisplayName } from './sidepanel-auth.js';
import { getCurrentDialogueData, addQAMessageToDialogue } from './sidepanel-dialogue.js';
import { promptAPIService } from '../services/prompt-api-service.js';

// Q&A history record
export let qaHistory = []; // Store Q&A history context

// Setup Q&A feature event listeners
export function setupQAEventListeners() {
  const qaInputField = document.getElementById('qaInputField');
  const qaSubmitBtn = document.getElementById('qaSubmitBtn');

  if (!qaInputField || !qaSubmitBtn) {
    logger.warn('⚠️ Q&A feature DOM elements not found');
    return;
  }

  // Q&A submit button
  qaSubmitBtn.addEventListener('click', handleQASubmit);

  // Enter key submit
  qaInputField.addEventListener('keydown', (event) => {
    if (event.key === 'Enter' && !event.shiftKey) {
      event.preventDefault();
      handleQASubmit();
    }
  });

  // Dynamically control submit button state
  qaInputField.addEventListener('input', () => {
    const hasText = qaInputField.value.trim().length > 0;
    qaSubmitBtn.disabled = !hasText;
  });

  logger.log('✅ Q&A feature event listeners setup complete');
}

// Handle Q&A submission
export async function handleQASubmit() {
  logger.log('🔄 handleQASubmit called');

  const qaInputField = document.getElementById('qaInputField');
  const qaSubmitBtn = document.getElementById('qaSubmitBtn');
  const currentDialogueData = getCurrentDialogueData();

  // Detailed diagnostic log
  logger.log('📋 Element check:', {
    hasQaInputField: !!qaInputField,
    hasQaSubmitBtn: !!qaSubmitBtn,
    hasDialogueData: !!currentDialogueData,
    questionLength: qaInputField?.value?.trim()?.length || 0
  });

  const question = qaInputField?.value?.trim();

  if (!question) {
    logger.warn('⚠️ Question is empty, aborting');
    return;
  }

  if (!currentDialogueData) {
    logger.error('❌ No dialogue data available! Cannot process Q&A.');
    alert('Please generate a dialogue first before asking questions.');
    return;
  }

  try {
    logger.log('🤔 Submitting Q&A question:', question);

    // Disable input and button
    qaInputField.disabled = true;
    qaSubmitBtn.disabled = true;
    qaSubmitBtn.innerHTML = '<span class="spinner-small"></span>';

    // Generate Q&A history context
    const qaContext = generateQAContext();

    // Log parameters before calling askWithSearch
    logger.log('📤 Calling askWithSearch with params:', {
      questionLength: question.length,
      newsContentLength: (currentDialogueData.newsContent || '').length,
      newsTitle: currentDialogueData.newsTitle,
      qaContextLength: qaContext.length,
      language: getCurrentLanguage()
    });

    // Call Q&A API, passing news content and Q&A history
    const response = await askWithSearch(
      question,
      currentDialogueData.newsContent || '',
      currentDialogueData.newsTitle || 'News',
      qaContext,
      getCurrentLanguage(),
      undefined  // signal parameter (must be AbortSignal or undefined, not null)
    );

    logger.log('✅ Q&A response:', response);

    // Add user question to dialogue list
    const userDisplayName = getUserDisplayName();
    await addQAMessageToDialogue(userDisplayName, question);

    // Record to Q&A history
    qaHistory.push({
      speaker: userDisplayName,
      content: question,
      timestamp: new Date().toISOString()
    });

    // Add AI response to dialogue list (without displaying sources)
    await addQAMessageToDialogue(response.speaker, response.response);

    // Record to Q&A history
    qaHistory.push({
      speaker: response.speaker || 'HotTea',
      content: response.response,
      timestamp: new Date().toISOString()
    });

    // Clear input field
    qaInputField.value = '';

  } catch (error) {
    logger.error('❌ Q&A processing failed:', {
      errorName: error.name,
      errorMessage: error.message,
      errorStack: error.stack,
      question: question
    });

    // Display detailed error message
    const errorMsg = `Failed to process question: ${error.message}`;
    await addQAMessageToDialogue('HotTea', errorMsg);
  } finally {
    // Restore input state
    qaInputField.disabled = false;
    qaSubmitBtn.disabled = false;
    qaSubmitBtn.innerHTML = '<span class="qa-submit-icon">➤</span>';
    qaInputField.focus();
  }
}

// Generate Q&A history context
function generateQAContext() {
  if (!qaHistory || qaHistory.length === 0) {
    return '';
  }

  // Take last 10 Q&A pairs as context
  const recentQA = qaHistory.slice(-10);
  return recentQA
    .map(item => `${item.speaker}: ${item.content}`)
    .join('\n');
}

// Note: generateContextFromDialogue function removed (unused, deprecated)

// Reset Q&A history
export function resetQAHistory() {
  qaHistory = [];

  // Note: We do NOT destroy the Prompt API session here for performance reasons
  // - The session is stateless (doesn't remember context automatically)
  // - Q&A context is controlled manually via qaHistory array
  // - Clearing qaHistory is sufficient to prevent context leakage
  // - Keeping the session alive enables instant Q&A responses (~1s vs ~3s)

  logger.log('🗑️ Q&A history reset (session kept alive for performance)');
}

// Note: getQAHistory function removed (not imported or used)