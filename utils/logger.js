/**
 * Environment-aware logger utility
 */

const DEBUG = process.env.NODE_ENV === 'development' || process.env.DEBUG === 'true';

const logger = {
  // Debug logs only in development
  debug: (...args) => {
    if (DEBUG) {
      console.log(...args);
    }
  },
  
  // Info logs for important non-error information
  info: (...args) => {
    console.log(...args);
  },
  
  // Warning logs always shown
  warn: (...args) => {
    console.warn(...args);
  },
  
  // Error logs always shown
  error: (...args) => {
    console.error(...args);
  },
  
  // Group related logs (development only)
  group: (label) => {
    if (DEBUG && console.group) {
      console.group(label);
    }
  },
  
  groupEnd: () => {
    if (DEBUG && console.groupEnd) {
      console.groupEnd();
    }
  },
  
  // Table output (development only)
  table: (data) => {
    if (DEBUG && console.table) {
      console.table(data);
    }
  },
  
  // Check if debug mode is enabled
  isDebug: () => DEBUG
};

module.exports = logger;