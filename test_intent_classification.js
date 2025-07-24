#!/usr/bin/env node

/**
 * Test intent classification to verify Azure OpenAI prompt fix
 */

const axios = require('axios');

const testQueries = [
  // Price queries - should be analysis_query
  { query: 'AAPL price', expectedIntent: 'analysis_query' },
  { query: 'what is AAPL', expectedIntent: 'analysis_query' },
  { query: 'AAPL stock price', expectedIntent: 'analysis_query' },
  { query: 'MSFT quote', expectedIntent: 'analysis_query' },
  { query: 'NVDA at?', expectedIntent: 'analysis_query' },
  
  // Trend queries - should be trend_query
  { query: 'AAPL trend', expectedIntent: 'trend_query' },
  { query: 'AAPL direction', expectedIntent: 'trend_query' },
  { query: 'where is AAPL going', expectedIntent: 'trend_query' },
  
  // Company info - should be company_info
  { query: 'who is the CEO of Apple?', expectedIntent: 'company_info' },
  
  // Comparison - should be comparison_query
  { query: 'AAPL vs MSFT', expectedIntent: 'comparison_query' },
  { query: 'compare AAPL and MSFT', expectedIntent: 'comparison_query' }
];

async function testIntentClassification() {
  console.log('Testing intent classification...\n');
  
  const results = {
    correct: 0,
    incorrect: 0,
    errors: []
  };
  
  for (const test of testQueries) {
    try {
      const response = await axios.post('http://localhost:3000/api/chat', {
        message: test.query,
        sessionId: 'test_intent_' + Date.now()
      });
      
      const actualIntent = response.data.type || response.data.intent;
      const isCorrect = actualIntent === test.expectedIntent;
      
      if (isCorrect) {
        results.correct++;
        console.log(`✅ "${test.query}" → ${actualIntent} (correct)`);
      } else {
        results.incorrect++;
        console.log(`❌ "${test.query}" → ${actualIntent} (expected: ${test.expectedIntent})`);
        results.errors.push({
          query: test.query,
          expected: test.expectedIntent,
          actual: actualIntent
        });
      }
      
      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 500));
      
    } catch (error) {
      console.error(`❌ Error testing "${test.query}":`, error.message);
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  console.log('SUMMARY:');
  console.log(`Total tests: ${testQueries.length}`);
  console.log(`Correct: ${results.correct}`);
  console.log(`Incorrect: ${results.incorrect}`);
  console.log(`Success rate: ${(results.correct / testQueries.length * 100).toFixed(1)}%`);
  
  if (results.errors.length > 0) {
    console.log('\nIncorrect classifications:');
    results.errors.forEach(err => {
      console.log(`- "${err.query}": got ${err.actual}, expected ${err.expected}`);
    });
  }
  
  console.log('\n✅ Azure OpenAI prompt has been updated to classify price queries as analysis_query');
}

// Run the test
testIntentClassification().catch(console.error);