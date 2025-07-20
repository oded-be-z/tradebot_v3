const axios = require('axios');
const logger = require('./utils/logger');

const BASE_URL = 'http://localhost:3000';

// Test scenarios for root cause fixes
const testScenarios = {
  contextTracking: [
    {
      name: "Context tracking - compare them",
      steps: [
        {
          message: "bitcoin",
          expectedType: "standard_analysis",
          expectedSymbol: "BTC"
        },
        {
          message: "what about ethereum?", 
          expectedType: "standard_analysis",
          expectedSymbol: "ETH"
        },
        {
          message: "compare them",
          expectedType: "comparison_table",
          expectedSymbols: ["BTC", "ETH"]
        }
      ]
    },
    {
      name: "Context tracking - analyze those",
      steps: [
        {
          message: "tell me about AAPL",
          expectedType: "standard_analysis",
          expectedSymbol: "AAPL"
        },
        {
          message: "and MSFT", 
          expectedType: "standard_analysis",
          expectedSymbol: "MSFT"
        },
        {
          message: "analyze those together",
          expectedType: "comparison_table",
          expectedSymbols: ["AAPL", "MSFT"]
        }
      ]
    }
  ],
  
  dateTimeQueries: [
    {
      name: "Date/time - what date is it now",
      message: "what date is it now?",
      expectedType: "date_time",
      shouldNotContain: ["DATE", "stock", "trading"]
    },
    {
      name: "Date/time - current time",
      message: "what time is it?",
      expectedType: "date_time",
      shouldNotContain: ["stock", "market"]
    },
    {
      name: "Date/time - today's date",
      message: "tell me today's date",
      expectedType: "date_time",
      shouldNotContain: ["DATE", "stock"]
    }
  ],
  
  groupAnalysis: [
    {
      name: "Group analysis - FAANG stocks",
      message: "analyze FAANG stocks",
      expectedType: "group_analysis",
      expectedSymbols: ["META", "AAPL", "AMZN", "NFLX", "GOOGL"],
      shouldContain: ["FAANG", "META", "AAPL", "AMZN", "NFLX", "GOOGL"]
    },
    {
      name: "Group analysis - tech stocks",
      message: "show me tech stocks performance",
      expectedType: "group_analysis",
      expectedSymbols: ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA"],
      shouldContain: ["Tech Stocks", "AAPL", "MSFT"]
    },
    {
      name: "Group analysis - crypto market",
      message: "analyze crypto market",
      expectedType: "group_analysis",
      expectedSymbols: ["BTC", "ETH", "BNB", "SOL", "ADA"],
      shouldContain: ["Crypto Market", "BTC", "ETH"]
    }
  ]
};

// Helper function to create a session
async function createSession() {
  const sessionId = `test_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  return sessionId;
}

// Helper function to send a chat message
async function sendMessage(sessionId, message) {
  try {
    const response = await axios.post(`${BASE_URL}/api/chat`, {
      sessionId,
      message
    });
    return response.data;
  } catch (error) {
    logger.error(`Failed to send message: ${error.message}`);
    throw error;
  }
}

// Test context tracking
async function testContextTracking() {
  logger.info('\n=== Testing Context Tracking ===');
  
  for (const scenario of testScenarios.contextTracking) {
    logger.info(`\nRunning: ${scenario.name}`);
    const sessionId = await createSession();
    
    for (const step of scenario.steps) {
      logger.info(`  Sending: "${step.message}"`);
      const response = await sendMessage(sessionId, step.message);
      
      // Verify response type
      if (response.type !== step.expectedType) {
        logger.error(`  ❌ Expected type ${step.expectedType}, got ${response.type}`);
      } else {
        logger.info(`  ✅ Correct response type: ${response.type}`);
      }
      
      // Verify symbols
      if (step.expectedSymbol && response.metadata?.symbol !== step.expectedSymbol) {
        logger.error(`  ❌ Expected symbol ${step.expectedSymbol}, got ${response.metadata?.symbol}`);
      } else if (step.expectedSymbol) {
        logger.info(`  ✅ Correct symbol: ${step.expectedSymbol}`);
      }
      
      if (step.expectedSymbols) {
        const responseText = response.response.toLowerCase();
        const containsAll = step.expectedSymbols.every(sym => 
          responseText.includes(sym.toLowerCase())
        );
        if (!containsAll) {
          logger.error(`  ❌ Response should contain all symbols: ${step.expectedSymbols.join(', ')}`);
        } else {
          logger.info(`  ✅ Response contains all expected symbols`);
        }
      }
      
      // Small delay between messages
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
}

// Test date/time queries
async function testDateTimeQueries() {
  logger.info('\n=== Testing Date/Time Queries ===');
  
  for (const scenario of testScenarios.dateTimeQueries) {
    logger.info(`\nRunning: ${scenario.name}`);
    const sessionId = await createSession();
    
    logger.info(`  Sending: "${scenario.message}"`);
    const response = await sendMessage(sessionId, scenario.message);
    
    // Verify response type
    if (response.type !== scenario.expectedType) {
      logger.error(`  ❌ Expected type ${scenario.expectedType}, got ${response.type}`);
    } else {
      logger.info(`  ✅ Correct response type: ${response.type}`);
    }
    
    // Verify it doesn't contain stock-related content
    const responseText = response.response.toLowerCase();
    for (const forbidden of scenario.shouldNotContain) {
      if (responseText.includes(forbidden.toLowerCase())) {
        logger.error(`  ❌ Response should NOT contain "${forbidden}"`);
      }
    }
    
    // Verify it contains date/time
    if (!responseText.includes('date') && !responseText.includes('time')) {
      logger.error(`  ❌ Response should contain date or time information`);
    } else {
      logger.info(`  ✅ Response contains date/time information`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Test group analysis
async function testGroupAnalysis() {
  logger.info('\n=== Testing Group Analysis ===');
  
  for (const scenario of testScenarios.groupAnalysis) {
    logger.info(`\nRunning: ${scenario.name}`);
    const sessionId = await createSession();
    
    logger.info(`  Sending: "${scenario.message}"`);
    const response = await sendMessage(sessionId, scenario.message);
    
    // Verify response type
    if (response.type !== scenario.expectedType) {
      logger.error(`  ❌ Expected type ${scenario.expectedType}, got ${response.type}`);
    } else {
      logger.info(`  ✅ Correct response type: ${response.type}`);
    }
    
    // Verify response contains all expected content
    const responseText = response.response;
    for (const expected of scenario.shouldContain) {
      if (!responseText.includes(expected)) {
        logger.error(`  ❌ Response should contain "${expected}"`);
      } else {
        logger.info(`  ✅ Response contains "${expected}"`);
      }
    }
    
    // Count how many symbols are mentioned
    const symbolCount = scenario.expectedSymbols.filter(sym => 
      responseText.includes(sym)
    ).length;
    
    if (symbolCount < scenario.expectedSymbols.length) {
      logger.error(`  ❌ Only ${symbolCount}/${scenario.expectedSymbols.length} symbols displayed`);
    } else {
      logger.info(`  ✅ All ${scenario.expectedSymbols.length} symbols displayed`);
    }
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
}

// Test debug endpoints
async function testDebugEndpoints() {
  logger.info('\n=== Testing Debug Endpoints ===');
  
  // Test context extraction
  logger.info('\nTesting /api/debug/extract-context');
  try {
    const contextTest = await axios.post(`${BASE_URL}/api/debug/extract-context`, {
      query: "compare them",
      history: [
        { query: "bitcoin", response: "Bitcoin is trading at $45,000..." },
        { query: "what about ethereum?", response: "Ethereum is at $2,500..." }
      ]
    });
    
    logger.info('  Context extraction result:', JSON.stringify(contextTest.data, null, 2));
    
    if (contextTest.data.extractedSymbols.includes('BTC') && 
        contextTest.data.extractedSymbols.includes('ETH')) {
      logger.info('  ✅ Context extraction working correctly');
    } else {
      logger.error('  ❌ Context extraction failed to identify BTC and ETH');
    }
  } catch (error) {
    logger.error('  ❌ Debug endpoint error:', error.message);
  }
  
  // Test intent classification
  logger.info('\nTesting /api/debug/classify-intent');
  try {
    const intentTest = await axios.post(`${BASE_URL}/api/debug/classify-intent`, {
      query: "what date is it now?",
      history: []
    });
    
    logger.info('  Intent classification result:', JSON.stringify(intentTest.data, null, 2));
    
    if (intentTest.data.localClassification.classification === 'non-financial') {
      logger.info('  ✅ Date/time query correctly classified as non-financial');
    } else {
      logger.error('  ❌ Date/time query incorrectly classified');
    }
  } catch (error) {
    logger.error('  ❌ Debug endpoint error:', error.message);
  }
}

// Main test runner
async function runAllTests() {
  logger.info('Starting Root Cause Fix Tests...');
  logger.info(`Testing against: ${BASE_URL}`);
  logger.info('Make sure the server is running on port 3000\n');
  
  try {
    // Check server is running
    await axios.get(`${BASE_URL}/api/health`);
    
    await testContextTracking();
    await testDateTimeQueries();
    await testGroupAnalysis();
    await testDebugEndpoints();
    
    logger.info('\n=== Test Suite Complete ===');
  } catch (error) {
    logger.error('Test suite failed:', error.message);
    if (error.code === 'ECONNREFUSED') {
      logger.error('Server is not running. Please start the server first.');
    }
  }
}

// Run tests
runAllTests();