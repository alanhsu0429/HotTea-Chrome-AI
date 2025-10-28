// HotTea Unified Logging System
// Provides conditional logging functionality, detailed logs in development, completely removed in production

// __DEV__ is injected at build time by webpack.DefinePlugin
// webpack.dev.js: __DEV__ = true
// webpack.prod.js: __DEV__ = false

// Unified logging interface
export const logger = {
  // General info log - development environment only
  log: (...args) => {
    if (__DEV__) {
      console.log(...args);
    }
  },

  // Warning log - development environment only
  warn: (...args) => {
    if (__DEV__) {
      console.warn(...args);
    }
  },

  // Error log - always shown (production environment needs it too)
  error: (...args) => {
    console.error(...args);
  },

  // Debug log - development environment only
  debug: (...args) => {
    if (__DEV__) {
      console.debug(...args);
    }
  },

  // Info log - development environment only
  info: (...args) => {
    if (__DEV__) {
      console.info(...args);
    }
  },

  // Group log - development environment only
  group: (...args) => {
    if (__DEV__) {
      console.group(...args);
    }
  },

  groupEnd: () => {
    if (__DEV__) {
      console.groupEnd();
    }
  },

  // Timer - development environment only
  time: (label) => {
    if (__DEV__) {
      console.time(label);
    }
  },

  timeEnd: (label) => {
    if (__DEV__) {
      console.timeEnd(label);
    }
  },

  // Get current environment info
  isDevelopment: () => __DEV__,

  // Conditional log - only log when condition is true
  logIf: (condition, ...args) => {
    if (__DEV__ && condition) {
      console.log(...args);
    }
  }
};

// For backward compatibility, also export individual functions
export const { log, warn, error, debug, info } = logger;
