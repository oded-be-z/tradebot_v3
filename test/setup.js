// test/setup.js
// Jest setup file for test environment configuration

// Set test environment
process.env.NODE_ENV = 'test';

// Mock console methods to reduce noise during tests
if (process.env.SILENT_TESTS === 'true') {
  global.console = {
    ...console,
    log: jest.fn(),
    error: jest.fn(),
    warn: jest.fn(),
    info: jest.fn(),
    debug: jest.fn()
  };
}

// Global test helpers
global.testHelpers = {
  // Wait for condition with timeout
  waitFor: async (condition, timeout = 5000, interval = 100) => {
    const startTime = Date.now();
    while (Date.now() - startTime < timeout) {
      if (await condition()) {
        return true;
      }
      await new Promise(resolve => setTimeout(resolve, interval));
    }
    throw new Error('Timeout waiting for condition');
  },

  // Retry helper for flaky operations
  retry: async (fn, maxAttempts = 3, delay = 1000) => {
    let lastError;
    for (let attempt = 1; attempt <= maxAttempts; attempt++) {
      try {
        return await fn();
      } catch (error) {
        lastError = error;
        if (attempt < maxAttempts) {
          await new Promise(resolve => setTimeout(resolve, delay * attempt));
        }
      }
    }
    throw lastError;
  },

  // Extract numeric values from text
  extractNumbers: (text) => {
    const numbers = text.match(/\d+\.?\d*/g);
    return numbers ? numbers.map(n => parseFloat(n)) : [];
  },

  // Check if response contains valid financial data
  hasFinancialData: (text) => {
    const hasPrice = /\$?\d+\.?\d*/.test(text);
    const hasPercentage = /[+-]?\d+\.?\d*%/.test(text);
    const hasVolume = /volume|vol\.?:/i.test(text);
    return hasPrice || hasPercentage || hasVolume;
  }
};

// Mock external services for unit tests
jest.mock('axios', () => ({
  get: jest.fn(),
  post: jest.fn(),
  create: jest.fn(() => ({
    get: jest.fn(),
    post: jest.fn()
  }))
}));

jest.mock('yahoo-finance2', () => ({
  default: jest.fn(() => ({
    quote: jest.fn(),
    search: jest.fn(),
    historical: jest.fn()
  }))
}));

// Cleanup after tests
afterAll(async () => {
  // Close any open handles
  await new Promise(resolve => setTimeout(resolve, 1000));
});