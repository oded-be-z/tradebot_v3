#!/usr/bin/env node

/**
 * Test Visual Response Builder
 * Tests sparklines, price cards, comparison tables, and portfolio summaries
 */

const fetch = require('node-fetch');
const dotenv = require('dotenv');
dotenv.config();

const BASE_URL = 'http://localhost:3000';

// Test data
const TEST_QUERIES = [
  {
    name: "Single Stock Price Card",
    query: "AAPL",
    expectedFeatures: ["price card", "sparkline", "risk gauge"]
  },
  {
    name: "Stock Comparison Table",
    query: "Compare AAPL, MSFT, and GOOGL",
    expectedFeatures: ["comparison table", "best/worst performer", "colored changes"]
  },
  {
    name: "Portfolio Summary",
    query: "How is my portfolio doing?",
    expectedFeatures: ["portfolio value card", "performance gauge", "top holdings"],
    needsPortfolio: true
  },
  {
    name: "Expert Level Response",
    query: "Tell me about TSLA P/E ratio and RSI",
    expectedFeatures: ["technical indicators", "risk gauge", "volume data"]
  },
  {
    name: "Beginner Level Response", 
    query: "What is MSFT?",
    expectedFeatures: ["simple price card", "no technical jargon"]
  }
];

// Visual feature detection
function detectVisualFeatures(response) {
  const features = [];
  
  // Box drawing characters indicate visual elements
  if (response.includes('┌') && response.includes('┐') && response.includes('└') && response.includes('┘')) {
    features.push('price card');
  }
  
  // Sparkline characters
  if (response.match(/[▁▂▃▄▅▆▇█]/)) {
    features.push('sparkline');
  }
  
  // Risk gauge
  if (response.includes('░') || response.includes('█')) {
    features.push('risk gauge');
  }
  
  // Comparison table
  if (response.includes('Symbol') && response.includes('Price') && response.includes('Change %')) {
    features.push('comparison table');
  }
  
  // Performance indicators
  if (response.includes('🏆') || response.includes('📉')) {
    features.push('best/worst performer');
  }
  
  // Color codes (ANSI escape sequences)
  if (response.includes('\x1b[') || response.includes('↑') || response.includes('↓')) {
    features.push('colored changes');
  }
  
  // Portfolio elements
  if (response.includes('PORTFOLIO SUMMARY')) {
    features.push('portfolio value card');
  }
  
  if (response.includes('Performance:') && (response.includes('[') || response.includes(']'))) {
    features.push('performance gauge');
  }
  
  if (response.includes('Top Holdings')) {
    features.push('top holdings');
  }
  
  // Technical indicators
  if (response.match(/P\/E|RSI|MACD|Volume:/i)) {
    features.push('technical indicators');
  }
  
  // Volume data
  if (response.match(/Volume:.*[KMB]/)) {
    features.push('volume data');
  }
  
  return features;
}

// Mock portfolio upload
async function uploadTestPortfolio(sessionId) {
  const portfolioData = [
    { symbol: 'AAPL', shares: '100', purchase_price: '150' },
    { symbol: 'MSFT', shares: '50', purchase_price: '300' },
    { symbol: 'GOOGL', shares: '25', purchase_price: '2500' }
  ];
  
  const formData = require('form-data');
  const form = new formData();
  
  // Create CSV content
  const csv = 'symbol,shares,purchase_price\n' + 
    portfolioData.map(row => `${row.symbol},${row.shares},${row.purchase_price}`).join('\n');
  
  form.append('portfolio', Buffer.from(csv), 'portfolio.csv');
  
  try {
    const response = await fetch(`${BASE_URL}/api/portfolio/upload`, {
      method: 'POST',
      headers: {
        'x-session-id': sessionId
      },
      body: form
    });
    
    return response.ok;
  } catch (error) {
    console.error('Portfolio upload failed:', error);
    return false;
  }
}

// Test function
async function testVisualBuilder() {
  console.log('🎨 Testing Visual Response Builder Integration...\n');
  
  const sessionId = `test-visual-${Date.now()}`;
  let allPassed = true;
  
  // Upload portfolio for portfolio tests
  console.log('📁 Uploading test portfolio...');
  await uploadTestPortfolio(sessionId);
  
  for (const test of TEST_QUERIES) {
    console.log(`\n📊 Test: ${test.name}`);
    console.log(`Query: "${test.query}"`);
    
    try {
      const response = await fetch(`${BASE_URL}/api/chat`, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json'
        },
        body: JSON.stringify({ 
          message: test.query,
          sessionId: sessionId 
        })
      });
      
      const data = await response.json();
      
      if (!response.ok) {
        console.error(`❌ API Error: ${data.error || 'Unknown error'}`);
        allPassed = false;
        continue;
      }
      
      // Detect visual features
      const detectedFeatures = detectVisualFeatures(data.response);
      console.log(`Detected features: ${detectedFeatures.join(', ')}`);
      
      // Check expected features
      let testPassed = true;
      for (const expected of test.expectedFeatures) {
        if (!detectedFeatures.includes(expected)) {
          console.error(`❌ Missing expected feature: ${expected}`);
          testPassed = false;
          allPassed = false;
        } else {
          console.log(`✅ Found: ${expected}`);
        }
      }
      
      if (testPassed) {
        console.log(`✅ All expected features detected`);
      }
      
      // Show sample of visual output
      console.log('\n📋 Visual Output Sample:');
      const lines = data.response.split('\n').slice(0, 10);
      lines.forEach(line => {
        if (line.includes('┌') || line.includes('│') || line.includes('└')) {
          console.log(line);
        }
      });
      
    } catch (error) {
      console.error(`❌ Test failed: ${error.message}`);
      allPassed = false;
    }
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ All visual builder tests passed!');
    console.log('🎨 Visual Response Builder is working correctly');
  } else {
    console.log('❌ Some visual builder tests failed');
    console.log('Please check the implementation');
  }
  
  return allPassed;
}

// Run tests
if (require.main === module) {
  testVisualBuilder()
    .then(success => process.exit(success ? 0 : 1))
    .catch(error => {
      console.error('Test error:', error);
      process.exit(1);
    });
}