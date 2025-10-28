// HotTea Content Validation Tool
// Provides content quality detection, identifies Cookie Notice and other non-article content

import { logger } from './logger.js';

/**
 * Detect if content is a Cookie Notice
 * @param {string} content - Article content
 * @returns {boolean} Whether it's a Cookie Notice
 */
export function isCookieNotice(content) {
  if (!content || typeof content !== 'string') {
    return false;
  }

  const lowerContent = content.toLowerCase();
  const contentStart = content.substring(0, 500); // Check first 500 characters

  // Strong features of Cookie Notice (usually at the beginning)
  const strongIndicators = [
    'this cookie notice',
    'cookie policy',
    'we use cookies',
    'this website uses cookies',
    'by continuing to use this site',
    'nbcuniversal and its affiliates'
  ];

  // Check if these keywords appear at the beginning of content
  const hasStrongIndicator = strongIndicators.some(indicator =>
    contentStart.toLowerCase().includes(indicator)
  );

  if (hasStrongIndicator) {
    // Further validation: Cookie Notice usually doesn't have normal news structure
    const hasNewsStructure = /published|updated|by [A-Z][a-z]+ [A-Z][a-z]+|reported/i.test(content);
    const cookieKeywordCount = (lowerContent.match(/cookie/g) || []).length;

    // If Cookie keyword appears more than 5 times and has no obvious news structure, determine it as Cookie Notice
    if (cookieKeywordCount >= 5 && !hasNewsStructure) {
      logger.log('🍪 Cookie Notice detected:', {
        cookieKeywordCount,
        hasNewsStructure,
        contentStartPreview: contentStart.substring(0, 100)
      });
      return true;
    }
  }

  return false;
}

/**
 * Detect content issues and return specific error type
 * @param {Object} articleData - Article data
 * @returns {Object|null} { type: string, details: string } or null (no issues)
 */
export function detectContentIssues(articleData) {
  if (!articleData || !articleData.content) {
    return {
      type: 'NO_CONTENT',
      details: 'Article data or content is missing'
    };
  }

  const { content, url, title } = articleData;

  // Check 1: Cookie Notice
  if (isCookieNotice(content)) {
    // Check if it's a specific site (e.g., CNBC)
    const hostname = url ? new URL(url).hostname : '';
    const isCNBC = hostname.includes('cnbc.com');

    return {
      type: 'COOKIE_NOTICE',
      details: isCNBC
        ? 'CNBC requires cookie consent before showing article content'
        : 'Page shows cookie consent instead of article content',
      site: hostname
    };
  }

  // Check 2: Privacy Policy page
  const lowerContent = content.toLowerCase();
  if (lowerContent.includes('privacy policy') &&
      lowerContent.includes('personal information') &&
      content.substring(0, 200).toLowerCase().includes('privacy')) {
    return {
      type: 'PRIVACY_POLICY',
      details: 'Content appears to be a privacy policy page'
    };
  }

  // Check 3: Paywall
  const paywallIndicators = [
    'subscribe to continue reading',
    'become a member to read',
    'this article is for subscribers only',
    'sign in to continue reading'
  ];

  if (paywallIndicators.some(indicator => lowerContent.includes(indicator))) {
    return {
      type: 'PAYWALL',
      details: 'Content is behind a paywall'
    };
  }

  // No issues
  return null;
}

/**
 * Get friendly error message for content issues (key for i18n)
 * @param {string} issueType - Issue type
 * @returns {string} i18n message key
 */
export function getContentIssueMessageKey(issueType) {
  const messageMap = {
    'COOKIE_NOTICE': 'cookieNoticeDetected',
    'PRIVACY_POLICY': 'privacyPolicyDetected',
    'PAYWALL': 'paywallDetected',
    'NO_CONTENT': 'insufficientContent'
  };

  return messageMap[issueType] || 'errorContentExtraction';
}
