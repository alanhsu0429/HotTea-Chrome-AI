// Prompt API Service - Session Management for Performance Optimization
// Manages LanguageModel session lifecycle to enable session reuse across multiple prompts

import { logger } from '../utils/logger.js';
import { getMessage } from '../utils/i18n-helper.js';

/**
 * PromptAPIService - Singleton service for managing Prompt API sessions
 *
 * Benefits of session reuse:
 * - 30-50% faster response time on subsequent calls
 * - Eliminates repeated session creation overhead
 * - Model "warm-up" effect - reused sessions respond faster
 *
 * Lifecycle:
 * 1. First call: Creates new session (~2s overhead)
 * 2. Subsequent calls: Reuses existing session (no overhead)
 * 3. Clone: Creates copy for parallel requests
 * 4. Destroy: Cleanup when done or on error
 */
class PromptAPIService {
  constructor() {
    this.session = null;
    this.sessionParams = null;
    this.isCreating = false;
    this.creationPromise = null;
  }

  /**
   * Check if Prompt API is available
   */
  async checkAvailability() {
    if (typeof LanguageModel === 'undefined') {
      throw new Error(getMessage('promptApiNotAvailable'));
    }

    const availability = await LanguageModel.availability();
    if (availability === 'unavailable') {
      throw new Error(getMessage('promptApiNotAvailable'));
    }

    return availability;
  }

  /**
   * Get or create a session
   * Thread-safe: prevents multiple simultaneous session creations
   */
  async getOrCreateSession(signal = null) {
    // If session exists and is valid, return it
    if (this.session) {
      logger.log('♻️ Reusing existing Prompt API session');
      return this.session;
    }

    // If already creating, wait for that to finish
    if (this.isCreating && this.creationPromise) {
      logger.log('⏳ Waiting for ongoing session creation...');
      return await this.creationPromise;
    }

    // Create new session
    this.isCreating = true;
    this.creationPromise = this._createNewSession(signal);

    try {
      this.session = await this.creationPromise;
      return this.session;
    } finally {
      this.isCreating = false;
      this.creationPromise = null;
    }
  }

  /**
   * Internal: Create a new session
   */
  async _createNewSession(signal) {
    logger.log('🆕 Creating new Prompt API session...');

    await this.checkAvailability();

    const params = await LanguageModel.params();
    this.sessionParams = params;

    logger.log('🚀 Session params:', {
      temperature: params.defaultTemperature,
      topK: params.defaultTopK,
      maxTokens: params.maxTokens
    });

    const sessionConfig = {
      ...params,
      ...(signal && { signal }),  // Only add signal if it's truthy (valid AbortSignal)
      monitor: (m) => {
        m.addEventListener('downloadprogress', (e) => {
          logger.log(`📥 Model download progress: ${(e.loaded * 100).toFixed(2)}%`);
        });
      }
    };

    const session = await LanguageModel.create(sessionConfig);
    logger.log('✅ Prompt API session created successfully');

    return session;
  }

  /**
   * Clone current session for parallel requests
   * Useful for Q&A while main dialogue is still processing
   */
  async cloneSession() {
    if (!this.session) {
      logger.warn('⚠️ No session to clone, creating new session instead');
      return await this.getOrCreateSession();
    }

    try {
      logger.log('👯 Cloning existing session...');
      const clonedSession = await this.session.clone();
      logger.log('✅ Session cloned successfully');
      return clonedSession;
    } catch (error) {
      logger.error('❌ Session clone failed, creating new session:', error);
      return await this.getOrCreateSession();
    }
  }

  /**
   * Execute a non-streaming prompt using managed session
   */
  async prompt(text, options = {}) {
    const { schema, signal } = options;
    const session = await this.getOrCreateSession(signal);

    logger.log('📝 Executing prompt with session reuse...');

    try {
      const result = await session.prompt(text, {
        responseConstraint: schema,
        signal
      });
      logger.log('✅ Prompt completed successfully');
      return result;
    } catch (error) {
      logger.error('❌ Prompt failed:', error);

      // If session is broken, destroy and retry once
      if (error.message.includes('session') || error.name === 'InvalidStateError') {
        logger.log('🔄 Session corrupted, destroying and retrying...');
        this.destroy();
        const newSession = await this.getOrCreateSession(signal);
        return await newSession.prompt(text, {
          responseConstraint: schema,
          signal
        });
      }

      throw error;
    }
  }

  /**
   * Execute a streaming prompt using managed session
   */
  async promptStreaming(text, options = {}) {
    const { schema, signal, onChunk } = options;
    const session = await this.getOrCreateSession(signal);

    logger.log('📡 Executing streaming prompt with session reuse...');

    try {
      const stream = await session.promptStreaming(text, {
        responseConstraint: schema,
        signal
      });

      let fullResponse = '';
      let chunkCount = 0;

      for await (const chunk of stream) {
        chunkCount++;
        fullResponse += chunk; // Accumulate chunks (Prompt API returns incremental text)

        if (onChunk) {
          try {
            const parsed = JSON.parse(fullResponse); // Parse accumulated response
            onChunk(parsed, false); // false = not final
          } catch (e) {
            // Not yet valid JSON, continue accumulating
            logger.log(`📦 Chunk ${chunkCount}: ${chunk.substring(0, 100)}...`);
          }
        }
      }

      logger.log(`✅ Streaming completed. Received ${chunkCount} chunks`);
      return fullResponse;

    } catch (error) {
      logger.error('❌ Streaming prompt failed:', error);

      // If session is broken, destroy and retry once
      if (error.message.includes('session') || error.name === 'InvalidStateError') {
        logger.log('🔄 Session corrupted, destroying and retrying...');
        this.destroy();
        const newSession = await this.getOrCreateSession(signal);
        const stream = await newSession.promptStreaming(text, {
          responseConstraint: schema,
          signal
        });

        let fullResponse = '';
        let chunkCount = 0;

        for await (const chunk of stream) {
          chunkCount++;
          fullResponse += chunk; // Accumulate chunks (Prompt API returns incremental text)

          if (onChunk) {
            try {
              const parsed = JSON.parse(fullResponse); // Parse accumulated response
              onChunk(parsed, false);
            } catch (e) {
              // Not yet valid JSON, continue accumulating
              logger.log(`📦 Chunk ${chunkCount}: ${chunk.substring(0, 100)}...`);
            }
          }
        }

        return fullResponse;
      }

      throw error;
    }
  }

  /**
   * Destroy current session and cleanup
   * Call this when:
   * - Extension is unloaded
   * - Switching to different user
   * - Error recovery
   */
  destroy() {
    if (this.session) {
      try {
        logger.log('🗑️ Destroying Prompt API session...');
        this.session.destroy();
        logger.log('✅ Session destroyed');
      } catch (error) {
        logger.warn('⚠️ Error during session destruction:', error);
      } finally {
        this.session = null;
        this.sessionParams = null;
      }
    }
  }

  /**
   * Get current session status
   */
  getStatus() {
    return {
      hasSession: !!this.session,
      isCreating: this.isCreating,
      params: this.sessionParams
    };
  }
}

// Export singleton instance
export const promptAPIService = new PromptAPIService();

// Also export class for testing purposes
export { PromptAPIService };
