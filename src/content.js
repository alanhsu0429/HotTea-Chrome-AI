/**
 * HotTea Content Script - Unified Version
 * Uses three-tier architecture unified extractor
 */

(function() {
  'use strict';

  // Simplified logging system (content script specific)
  // __DEV__ is injected at build time by webpack.DefinePlugin
  const logger = {
    log: (...args) => {
      if (__DEV__) {
        console.log(...args);
      }
    },
    error: (...args) => {
      console.error(...args);
    }
  };

  let extractorReady = false;

  // Simplified initialization function
  function initialize() {
    try {
      logger.log('🚀 HotTea Content Script initializing:', window.location.href);

      // Check if UnifiedExtractor is available
      if (typeof UnifiedExtractor !== 'undefined') {
        // Create unified extractor instance (internally handles Readability lazy loading)
        window.HotTeaExtractor = new UnifiedExtractor({ debug: true });
        extractorReady = true;
        logger.log('✅ HotTea Content Script loaded:', window.location.href);
        logger.log('🔧 UnifiedExtractor ready');
      } else {
        logger.log('⏳ UnifiedExtractor not yet loaded, retrying...');
        setTimeout(initialize, 200);
      }

    } catch (error) {
      logger.error('❌ Initialization failed:', error);
      // Simple retry once
      setTimeout(initialize, 500);
    }
  }

  // Message handler (register immediately to ensure response capability)
  chrome.runtime.onMessage.addListener((request, sender, sendResponse) => {
    // Ping check - always respond
    if (request.action === 'ping') {
      sendResponse({
        success: true,
        url: window.location.href,
        ready: extractorReady,
        extractor: extractorReady ? 'UnifiedExtractor Ready' : 'Initializing...'
      });
      return;
    }

    // Extract content
    if (request.action === 'extractArticle') {
      if (!extractorReady || !window.HotTeaExtractor) {
        logger.error('❌ UnifiedExtractor not ready');
        sendResponse({
          success: false,
          error: 'Unified extractor not ready, please refresh the page'
        });
        return;
      }

      logger.log('🔍 Starting unified content extraction...');
      logger.log('📊 Will execute three-tier analysis: Structured Data → Readability → Site Rules');

      // Execute unified extraction
      window.HotTeaExtractor.extract(document)
        .then(result => {
          if (result) {
            logger.log('✅ Unified extraction successful:', {
              title: result.title?.substring(0, 50) + '...',
              contentLength: result.content?.length,
              source: result.source,
              confidence: result.confidence,
              author: result.author || 'Unknown',
              publishedTime: result.publishedTime || 'Unknown'
            });

            // Development only: Log content preview to assist debugging
            if (__DEV__) {
              logger.log('📄 Content preview:', {
                titleFull: result.title,
                contentPreview: result.content?.substring(0, 300) + '...',
                contentEnd: result.content?.substring(result.content.length - 100),
                url: window.location.href,
                extractorUsed: result.source
              });
            }

            sendResponse({ success: true, data: result });
          } else {
            logger.log('⚠️ Unified extraction found no content');
            sendResponse({
              success: false,
              error: 'No extractable content found'
            });
          }
        })
        .catch(error => {
          logger.error('❌ Unified extraction failed:', error);
          sendResponse({
            success: false,
            error: `Extraction failed: ${error.message}`
          });
        });

      return true; // Support asynchronous response
    }

    // Unknown message type
    logger.log('⚠️ Unknown message:', request.action);
    sendResponse({
      success: false,
      error: 'Unknown message type: ' + request.action
    });
  });

  // Start immediately
  logger.log('🚀 HotTea Content Script starting at:', window.location.href);
  logger.log('📄 Document readyState:', document.readyState);
  logger.log('🏗️ Will use three-tier architecture unified extractor');

  // Attempt initialization immediately
  initialize();

})();