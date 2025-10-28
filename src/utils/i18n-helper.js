/**
 * i18n Helper Module
 * Handles HTML element internationalization and dynamic text replacement
 */

import { logger } from './logger.js';

/**
 * Initialize all i18n elements on the page
 * Call this function after DOM is loaded
 */
export function initializeI18n() {
  logger.log('🌍 Initializing i18n, current language:', chrome.i18n.getUILanguage());

  // Replace elements with data-i18n attribute
  document.querySelectorAll('[data-i18n]').forEach(element => {
    const messageKey = element.getAttribute('data-i18n');
    const message = chrome.i18n.getMessage(messageKey);
    if (message) {
      element.textContent = message;
      logger.log(`🔄 Replaced text: ${messageKey} -> ${message}`);
    } else {
      logger.warn(`⚠️ Translation not found: ${messageKey}`);
    }
  });

  // Replace input placeholders with data-i18n-placeholder attribute
  document.querySelectorAll('[data-i18n-placeholder]').forEach(element => {
    const messageKey = element.getAttribute('data-i18n-placeholder');
    const message = chrome.i18n.getMessage(messageKey);
    if (message) {
      element.placeholder = message;
      logger.log(`🔄 Replaced placeholder: ${messageKey} -> ${message}`);
    }
  });

  // Replace element titles (tooltips) with data-i18n-title attribute
  document.querySelectorAll('[data-i18n-title]').forEach(element => {
    const messageKey = element.getAttribute('data-i18n-title');
    const message = chrome.i18n.getMessage(messageKey);
    if (message) {
      element.title = message;
      logger.log(`🔄 Replaced title: ${messageKey} -> ${message}`);
    }
  });
}

/**
 * Get message wrapper function (with fallback)
 * @param {string} key - Message key
 * @param {string|Array} substitutions - Substitution parameters
 * @returns {string} Translated message, returns key if not found
 */
export function getMessage(key, substitutions) {
  const message = chrome.i18n.getMessage(key, substitutions);
  if (!message) {
    logger.warn(`⚠️ Translation missing: ${key}`);
    return key; // If translation not found, return key as fallback
  }
  return message;
}

/**
 * Get random loading message
 * @returns {string} Randomly selected loading message
 */
export function getRandomLoadingMessage() {
  const messageCount = 6; // We have 6 loading messages
  const randomIndex = Math.floor(Math.random() * messageCount) + 1;
  const messageKey = `loadingMessage${randomIndex}`;
  return getMessage(messageKey);
}

/**
 * Dynamically set element's i18n text
 * @param {Element} element - Element to set text for
 * @param {string} messageKey - Message key
 * @param {string|Array} substitutions - Substitution parameters
 */
export function setI18nText(element, messageKey, substitutions) {
  if (!element) {
    logger.warn('⚠️ setI18nText: Element is null');
    return;
  }
  const message = getMessage(messageKey, substitutions);
  element.textContent = message;
}

/**
 * Dynamically set element's i18n placeholder
 * @param {Element} element - Element to set placeholder for
 * @param {string} messageKey - Message key
 * @param {string|Array} substitutions - Substitution parameters
 */
export function setI18nPlaceholder(element, messageKey, substitutions) {
  if (!element) {
    logger.warn('⚠️ setI18nPlaceholder: Element is null');
    return;
  }
  const message = getMessage(messageKey, substitutions);
  element.placeholder = message;
}

/**
 * Dynamically set element's i18n title attribute
 * @param {Element} element - Element to set title for
 * @param {string} messageKey - Message key
 * @param {string|Array} substitutions - Substitution parameters
 */
export function setI18nTitle(element, messageKey, substitutions) {
  if (!element) {
    logger.warn('⚠️ setI18nTitle: Element is null');
    return;
  }
  const message = getMessage(messageKey, substitutions);
  element.title = message;
}

/**
 * Get current user's language
 * @returns {string} Language code, e.g., 'en-US'
 */
export function getCurrentLanguage() {
  return chrome.i18n.getUILanguage();
}

/**
 * Check if English environment
 * @returns {boolean} Whether it's English
 */
export function isEnglishLanguage() {
  const lang = getCurrentLanguage();
  return lang.startsWith('en');
}

/**
 * Format message with parameters
 * @param {string} messageKey - Message key
 * @param {Object} params - Parameter object, e.g., {name: 'John'}
 * @returns {string} Formatted message
 */
export function formatMessage(messageKey, params = {}) {
  const paramValues = Object.values(params);
  return getMessage(messageKey, paramValues);
}

/**
 * Batch set i18n text for multiple elements
 * @param {Array} configs - Configuration array, each element contains {element, messageKey, substitutions}
 */
export function setBatchI18nText(configs) {
  configs.forEach(config => {
    const { element, messageKey, substitutions } = config;
    if (element && messageKey) {
      setI18nText(element, messageKey, substitutions);
    }
  });
}

/**
 * Create HTML string with i18n text
 * @param {string} tag - HTML tag name
 * @param {string} messageKey - Message key
 * @param {string|Array} substitutions - Substitution parameters
 * @param {Object} attributes - Additional HTML attributes
 * @returns {string} HTML string
 */
export function createI18nHTML(tag, messageKey, substitutions, attributes = {}) {
  const message = getMessage(messageKey, substitutions);
  const attrs = Object.entries(attributes)
    .map(([key, value]) => `${key}="${value}"`)
    .join(' ');

  return `<${tag} ${attrs}>${message}</${tag}>`;
}

// Language change detection (if needed)
export function onLanguageChange(callback) {
  // Chrome Extension language follows browser settings, usually doesn't change at runtime
  // But can add related logic here
  logger.log('💡 Language change detector registered');
  if (typeof callback === 'function') {
    // Can add language change listening logic here
    // Currently Chrome Extension doesn't support runtime language changes
    logger.log('📝 Language change callback set');
  }
}