#!/usr/bin/env node

/**
 * Test script to verify Priority 1 fixes
 * Tests previously failed queries after implementation
 */

const intelligentResponse = require('./services/intelligentResponse');
const safeSymbol = require('./src/utils/safeSymbol');
const logger = require('./utils/logger');

// Test cases that previously failed
const failedTestCases = [
  { query: "S&P 500", expected: "SPY", description: "Index mapping" },
  { query: "nasdaq", expected: "QQQ", description: "Index name mapping" },
  { query: "dow jones", expected: "DIA", description: "Dow Jones mapping" },
  { query: "TSLS", expected: "TSLA", description: "Typo correction" },
  { query: "analyze FAANG stocks", expectedCount: 5, description: "Stock group" },
  { query: "tech stocks comparison", expectedType: "comparison_table", description: "Group comparison" },
  { query: "natural gas", expected: "NG", description: "Natural gas mapping" },
  { query: "berkshire hathaway", expected: "BRK", description: "Company name" },
  { query: "S&P 500 price", expected: "SPY", description: "Index with context" },
  { query: "AAPLE", expected: "AAPL", description: "Common typo" },
  { query: "crypto market overview", expectedCount: 5, description: "Crypto group" }
];

// Test results storage
const results = {
  passed: 0,
  failed: 0,
  details: []
};

async function testSingleCase(testCase) {
  console.log(`\nTesting: "${testCase.query}" (${testCase.description})`);
  
  try {
    // Test symbol extraction first
    const extractedSymbols = safeSymbol.extractSafeSymbols(testCase.query);
    console.log(`  SafeSymbol extracted: ${extractedSymbols.join(', ') || 'none'}`);
    
    // Test full response generation
    const context = { conversationHistory: [] };
    const response = await intelligentResponse.generateResponse(testCase.query, context);
    
    let passed = false;
    let actualResult = '';
    
    if (testCase.expected) {
      // Check if expected symbol is in response
      if (response.symbol) {
        actualResult = response.symbol;
        passed = response.symbol === testCase.expected || response.symbol.startsWith(testCase.expected);
      } else if (response.symbols) {
        actualResult = response.symbols.join(', ');
        passed = response.symbols.includes(testCase.expected);
      } else if (extractedSymbols.length > 0) {
        actualResult = extractedSymbols[0];
        passed = extractedSymbols[0] === testCase.expected || extractedSymbols[0].startsWith(testCase.expected);
      }
    } else if (testCase.expectedCount) {
      // Check for multiple symbols (groups)
      if (response.symbols) {
        actualResult = `${response.symbols.length} symbols: ${response.symbols.join(', ')}`;
        passed = response.symbols.length >= testCase.expectedCount;
      } else if (extractedSymbols.length > 0) {
        actualResult = `${extractedSymbols.length} symbols: ${extractedSymbols.join(', ')}`;
        passed = extractedSymbols.length >= testCase.expectedCount;
      }
    } else if (testCase.expectedType) {
      // Check response type
      actualResult = response.type;
      passed = response.type === testCase.expectedType;
    }
    
    console.log(`  Response type: ${response.type}`);
    console.log(`  Result: ${actualResult}`);
    console.log(`  Status: ${passed ? '✅ PASSED' : '❌ FAILED'}`);
    
    results.details.push({
      query: testCase.query,
      expected: testCase.expected || testCase.expectedType || `${testCase.expectedCount} symbols`,
      actual: actualResult,
      passed,
      description: testCase.description
    });
    
    if (passed) {
      results.passed++;
    } else {
      results.failed++;
    }
    
  } catch (error) {
    console.log(`  ❌ ERROR: ${error.message}`);
    results.failed++;
    results.details.push({
      query: testCase.query,
      expected: testCase.expected,
      actual: `Error: ${error.message}`,
      passed: false,
      description: testCase.description
    });
  }
}

async function runAllTests() {
  console.log('🔧 Testing Priority 1 Fixes');
  console.log('===========================\n');
  console.log('Running tests on previously failed queries...');
  
  const startTime = Date.now();
  
  // Run all tests
  for (const testCase of failedTestCases) {
    await testSingleCase(testCase);
  }
  
  const totalTime = Date.now() - startTime;
  
  // Generate summary report
  console.log('\n\n📊 TEST SUMMARY');
  console.log('================\n');
  console.log(`Total Tests: ${failedTestCases.length}`);
  console.log(`Passed: ${results.passed} (${(results.passed / failedTestCases.length * 100).toFixed(1)}%)`);
  console.log(`Failed: ${results.failed}`);
  console.log(`Total Time: ${totalTime}ms`);
  console.log(`Average Time: ${Math.round(totalTime / failedTestCases.length)}ms per test`);
  
  // Detailed results table
  console.log('\n📋 DETAILED RESULTS');
  console.log('===================\n');
  console.log('| Query | Expected | Actual | Status | Description |');
  console.log('|-------|----------|--------|--------|-------------|');
  
  results.details.forEach(r => {
    const status = r.passed ? '✅' : '❌';
    console.log(`| "${r.query}" | ${r.expected} | ${r.actual} | ${status} | ${r.description} |`);
  });
  
  // Recommendations
  console.log('\n💡 ANALYSIS');
  console.log('============\n');
  
  if (results.passed === failedTestCases.length) {
    console.log('🎉 ALL TESTS PASSED! The system is now production-ready.');
  } else {
    console.log('Issues remaining:');
    results.details.filter(r => !r.passed).forEach(r => {
      console.log(`- ${r.description}: "${r.query}" expected ${r.expected}, got ${r.actual}`);
    });
  }
  
  // Test specific improvements
  console.log('\n🔍 SPECIFIC IMPROVEMENTS VERIFIED:');
  console.log('==================================\n');
  
  const improvements = [
    { 
      name: 'Index/ETF Mapping', 
      tests: ['S&P 500', 'nasdaq', 'dow jones'],
      check: () => results.details.filter(r => r.description.includes('Index') && r.passed).length
    },
    {
      name: 'Typo Correction',
      tests: ['TSLS', 'AAPLE'],
      check: () => results.details.filter(r => r.description.includes('typo') && r.passed).length
    },
    {
      name: 'Stock Groups',
      tests: ['FAANG stocks', 'tech stocks', 'crypto market'],
      check: () => results.details.filter(r => r.description.includes('group') && r.passed).length
    },
    {
      name: 'Natural Gas',
      tests: ['natural gas'],
      check: () => results.details.filter(r => r.query === 'natural gas' && r.passed).length
    }
  ];
  
  improvements.forEach(imp => {
    const passed = imp.check();
    const total = imp.tests.length;
    console.log(`${imp.name}: ${passed}/${total} tests passed ${passed === total ? '✅' : '⚠️'}`);
  });
}

// Run the tests
runAllTests().catch(console.error);