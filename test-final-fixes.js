#!/usr/bin/env node

/**
 * Final Production Readiness Test
 * Tests all critical fixes for date/time, FAANG analysis, and sector comparisons
 */

const axios = require('axios');
const logger = require('./utils/logger');

// Test configuration
const API_URL = 'http://localhost:3000/api/chat';
const sessionId = `test_${Date.now()}`;

// Test queries
const testQueries = [
  // Date/Time queries - MUST return actual date/time
  { query: "what date is it now?", expectedType: "date_time", description: "Date query" },
  { query: "what time is it?", expectedType: "date_time", description: "Time query" },
  { query: "what's today's date?", expectedType: "date_time", description: "Today's date query" },
  { query: "current time please", expectedType: "date_time", description: "Current time query" },
  
  // FAANG analysis - MUST show formatted comparison table
  { query: "analyze FAANG stocks", expectedType: "group_analysis", description: "FAANG analysis" },
  { query: "show me FAANG performance", expectedType: "group_analysis", description: "FAANG performance" },
  
  // Tech stocks comparison - MUST show 6+ stocks
  { query: "tech stocks comparison", expectedType: "group_analysis", description: "Tech sector comparison" },
  { query: "compare technology stocks", expectedType: "group_analysis", description: "Technology stocks" },
  
  // Other sector tests
  { query: "bank stocks analysis", expectedType: "group_analysis", description: "Banking sector" },
  { query: "analyze semiconductor stocks", expectedType: "group_analysis", description: "Chip stocks" },
  
  // Context-aware queries
  { query: "compare AAPL and MSFT", expectedType: "comparison", description: "Two stock comparison" },
  { query: "compare them", expectedType: "comparison", description: "Context-based comparison" }
];

async function sendMessage(query, expectation) {
  try {
    console.log(`\n${'='.repeat(60)}`);
    console.log(`📝 Testing: ${expectation.description}`);
    console.log(`Query: "${query}"`);
    console.log(`Expected: ${expectation.expectedType}`);
    console.log('-'.repeat(60));
    
    const response = await axios.post(API_URL, {
      message: query,
      sessionId: sessionId
    }, {
      timeout: 10000
    });
    
    const data = response.data;
    
    // Check success
    if (!data.success) {
      console.error(`❌ FAILED: Response indicates failure`);
      return false;
    }
    
    // Check for refusal (non-financial)
    if (data.type === 'refusal') {
      console.error(`❌ FAILED: Query was refused as non-financial`);
      return false;
    }
    
    // Validate response based on expected type
    let success = false;
    
    switch (expectation.expectedType) {
      case 'date_time':
        // Check if response contains actual date/time
        const hasDate = data.response && (
          data.response.includes(new Date().getFullYear()) ||
          data.response.includes('Date:') ||
          data.response.includes('Time:') ||
          data.response.match(/\d{1,2}:\d{2}/)
        );
        success = hasDate;
        if (success) {
          console.log(`✅ SUCCESS: Date/time response received`);
          console.log(`Response excerpt: ${data.response.substring(0, 200)}...`);
        } else {
          console.error(`❌ FAILED: No date/time information in response`);
          console.error(`Response: ${data.response}`);
        }
        break;
        
      case 'group_analysis':
        // Check for formatted table with multiple stocks
        const hasTable = data.response && (
          data.response.includes('|') &&
          data.response.includes('Symbol') &&
          data.response.includes('Price')
        );
        const symbolMatches = data.response ? (data.response.match(/\*\*[A-Z]+\*\*/g) || []) : [];
        const stockCount = symbolMatches.length;
        
        if (query.includes('FAANG')) {
          success = hasTable && stockCount >= 5;
          console.log(`Stock count: ${stockCount} (expected: 5)`);
        } else if (query.includes('tech')) {
          success = hasTable && stockCount >= 6;
          console.log(`Stock count: ${stockCount} (expected: 6+)`);
        } else {
          success = hasTable && stockCount >= 4;
          console.log(`Stock count: ${stockCount} (expected: 4+)`);
        }
        
        if (success) {
          console.log(`✅ SUCCESS: Group analysis with ${stockCount} stocks`);
          console.log(`Stocks found: ${symbolMatches.join(', ')}`);
        } else {
          console.error(`❌ FAILED: ${hasTable ? 'Insufficient stocks' : 'No formatted table'}`);
        }
        break;
        
      case 'comparison':
        // Check for comparison format
        const hasComparison = data.response && (
          data.response.includes('vs') ||
          data.response.includes('compared to') ||
          data.response.includes('comparison')
        );
        success = hasComparison;
        if (success) {
          console.log(`✅ SUCCESS: Comparison analysis received`);
        } else {
          console.error(`❌ FAILED: No comparison format found`);
        }
        break;
    }
    
    return success;
    
  } catch (error) {
    console.error(`❌ ERROR: ${error.message}`);
    if (error.response) {
      console.error(`Response status: ${error.response.status}`);
      console.error(`Response data:`, error.response.data);
    }
    return false;
  }
}

async function runTests() {
  console.log(`🚀 Final Production Readiness Test`);
  console.log(`Testing ${testQueries.length} critical queries...`);
  
  let passed = 0;
  let failed = 0;
  
  for (const test of testQueries) {
    const result = await sendMessage(test.query, test);
    if (result) {
      passed++;
    } else {
      failed++;
    }
    
    // Small delay between tests
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 Test Results Summary`);
  console.log(`${'='.repeat(60)}`);
  console.log(`Total tests: ${testQueries.length}`);
  console.log(`✅ Passed: ${passed}`);
  console.log(`❌ Failed: ${failed}`);
  console.log(`Success rate: ${(passed / testQueries.length * 100).toFixed(1)}%`);
  
  if (failed === 0) {
    console.log(`\n🎉 All tests passed! System is production ready.`);
  } else {
    console.log(`\n⚠️  ${failed} tests failed. Please review the errors above.`);
  }
}

// Run tests
runTests().catch(error => {
  console.error('Test runner failed:', error);
  process.exit(1);
});