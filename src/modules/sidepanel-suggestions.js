// HotTea Suggested Questions Module
// Handles fetching, rendering, and processing suggested questions

import { logger } from '../utils/logger.js';
import { getMessage } from '../utils/i18n-helper.js';
import { getSuggestedQuestions } from '../api-client.js';
import { currentUser } from './sidepanel-auth.js';
import { handleQASubmit } from './sidepanel-qa.js'; // Import the submit function

// Suggested questions container
let currentQuestions = [];

/**
 * Show suggested questions block (with loading state)
 */
export function showSuggestionsLoading() {
  const container = document.getElementById('suggestedQuestions');
  if (!container) {
    logger.warn('⚠️ Suggested questions container not found');
    return;
  }

  const listContainer = container.querySelector('.suggestions-list');
  if (!listContainer) return;

  // Show loading skeleton
  listContainer.innerHTML = `
    <div class="suggestion-skeleton"></div>
    <div class="suggestion-skeleton"></div>
    <div class="suggestion-skeleton"></div>
  `;

  container.style.display = 'block';
  logger.log('🔄 Showing suggested questions loading state');
}

/**
 * Render suggested questions list
 * @param {Array<string>} questions - Array of questions
 */
export function renderSuggestions(questions) {
  if (!questions || questions.length === 0) {
    hideSuggestions();
    return;
  }

  currentQuestions = questions;

  const container = document.getElementById('suggestedQuestions');
  if (!container) {
    logger.warn('⚠️ Suggested questions container not found');
    return;
  }

  const listContainer = container.querySelector('.suggestions-list');
  if (!listContainer) return;

  // Clear loading state, render questions
  listContainer.innerHTML = '';

  questions.forEach((question, index) => {
    const questionCard = document.createElement('div');
    questionCard.className = 'suggestion-card';
    questionCard.dataset.index = index.toString();
    questionCard.textContent = question;

    // Add click event
    questionCard.addEventListener('click', () => {
      handleQuestionClick(question);
    });

    listContainer.appendChild(questionCard);
  });

  // Bind header click event (expand/collapse)
  const header = container.querySelector('.suggestions-header');
  if (header) {
    header.onclick = toggleSuggestions;
  }

  // Ensure default expanded state
  container.setAttribute('data-collapsed', 'false');

  // Fade in animation
  container.style.display = 'block';
  setTimeout(() => {
    container.classList.add('fade-in');
  }, 50);

  logger.log('✅ Suggested questions rendering complete', { count: questions.length });
}

/**
 * Toggle suggested questions expand/collapse state
 */
function toggleSuggestions() {
  const container = document.getElementById('suggestedQuestions');
  if (!container) return;

  const isCollapsed = container.getAttribute('data-collapsed') === 'true';
  container.setAttribute('data-collapsed', isCollapsed ? 'false' : 'true');

  logger.log(isCollapsed ? '📖 Expand suggested questions' : '📕 Collapse suggested questions');
}

/**
 * Hide suggested questions block
 */
export function hideSuggestions() {
  const container = document.getElementById('suggestedQuestions');
  if (container) {
    container.style.display = 'none';
    container.classList.remove('fade-in');
  }
  currentQuestions = [];
}

/**
 * Handle question click event
 * @param {string} question - The clicked question
 */
function handleQuestionClick(question) {
  logger.log('🖱️ Clicked suggested question and auto-submit:', question);

  const qaInputField = document.getElementById('qaInputField');

  // Detailed diagnostic log
  logger.log('📋 QA Input Field check:', {
    exists: !!qaInputField,
    isVisible: qaInputField ? window.getComputedStyle(qaInputField).display !== 'none' : false,
    isDisabled: qaInputField?.disabled
  });

  if (!qaInputField) {
    logger.error('❌ Q&A input field not found! DOM structure may be incorrect.');
    alert('Q&A input field not found. Please refresh the page.');
    return;
  }

  // Fill question into input field
  qaInputField.value = question;

  logger.log('✅ Question filled into input field, calling handleQASubmit');

  // Directly trigger submit
  handleQASubmit();
}

/**
 * Fetch and display suggested questions
 * @param {Object} dialogueData - Dialogue data
 * @param {Object} articleData - Article data
 */
export async function fetchAndDisplaySuggestions(dialogueData, articleData) {
  try {
    logger.log('🔍 Starting to fetch suggested questions');

    // Check required data
    if (!dialogueData || !articleData) {
      logger.warn('⚠️ Missing dialogue or article data');
      return;
    }

    // Show loading state
    showSuggestionsLoading();

    // Prepare request parameters
    const dialogue = typeof dialogueData === 'string'
      ? dialogueData
      : JSON.stringify(dialogueData);

    const newsContent = articleData.content || '';
    const newsTitle = articleData.title || '';

    // Detect user language
    const userLanguage = chrome.i18n.getUILanguage();

    // Call API
    const result = await getSuggestedQuestions(
      dialogue,
      newsContent,
      newsTitle,
      userLanguage,
      undefined  // signal parameter (must be AbortSignal or undefined, not null)
    );

    if (result && result.questions && result.questions.length > 0) {
      logger.log('✅ Suggested questions fetch successful', { count: result.questions.length });
      renderSuggestions(result.questions);
    } else {
      logger.warn('⚠️ No suggested questions retrieved');
      hideSuggestions();
    }

  } catch (error) {
    logger.error('❌ Failed to fetch suggested questions:', error);
    // Silent failure, does not affect main flow
    hideSuggestions();
  }
}

/**
 * Reset suggested questions state
 */
export function resetSuggestions() {
  hideSuggestions();
  currentQuestions = [];
  logger.log('🗑️ Suggested questions reset');
}

// Export current questions list (for testing)
export function getCurrentQuestions() {
  return currentQuestions;
}
