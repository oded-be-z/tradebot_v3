const axios = require('axios');
const logger = require('./utils/logger');

const API_URL = 'http://localhost:3000/api/chat';

async function testQuery(query, testName, expectedFeatures) {
  try {
    console.log(`\n🧪 ${testName}`);
    console.log(`Query: "${query}"`);
    console.log('Expected features:', expectedFeatures);
    
    const response = await axios.post(API_URL, {
      message: query,
      sessionId: `test-style-${Date.now()}`
    });
    
    const data = response.data;
    const responseText = data.response;
    
    // Check features
    const results = {
      warmGreeting: false,
      acknowledgment: false,
      noBullets: false,
      flowingText: false,
      cleanComparison: false,
      engagement: false
    };
    
    // Check for warm greeting
    if (responseText.includes('Hey there! I\'m Max')) {
      results.warmGreeting = true;
    }
    
    // Check for acknowledgment phrases
    const acknowledgmentPhrases = [
      'Let me check',
      'Great question',
      'Looking at',
      'I\'m on it',
      'Here\'s what I\'m seeing'
    ];
    if (acknowledgmentPhrases.some(phrase => responseText.includes(phrase))) {
      results.acknowledgment = true;
    }
    
    // Check for minimal bullets (count bullet points)
    const bulletCount = (responseText.match(/•/g) || []).length;
    results.noBullets = bulletCount <= 2; // Allow max 2 bullets
    
    // Check for flowing text (paragraphs vs lists)
    const lines = responseText.split('\n').filter(line => line.trim());
    const paragraphCount = lines.filter(line => line.length > 50 && !line.includes('•')).length;
    results.flowingText = paragraphCount >= 2;
    
    // Check for clean comparison format
    if (query.toLowerCase().includes('compare') || query.toLowerCase().includes(' vs ')) {
      results.cleanComparison = responseText.includes('Performance:') && 
                                responseText.includes('Price:') &&
                                responseText.includes('The story:');
    }
    
    // Check for engagement ending
    const engagementPhrases = [
      'Want me to',
      'Would you like',
      'Curious about',
      'Interested in',
      'Shall we'
    ];
    if (engagementPhrases.some(phrase => responseText.includes(phrase))) {
      results.engagement = true;
    }
    
    // Display results
    console.log('\nResults:');
    Object.entries(results).forEach(([feature, passed]) => {
      if (expectedFeatures.includes(feature)) {
        console.log(`${passed ? '✅' : '❌'} ${feature}`);
      }
    });
    
    // Show response preview
    console.log('\nResponse preview:');
    console.log(responseText.substring(0, 200) + '...');
    
    // Show bullet count
    console.log(`\nBullet count: ${bulletCount}`);
    
    return results;
  } catch (error) {
    console.log(`❌ ERROR: ${error.message}`);
    return null;
  }
}

async function runTests() {
  console.log('🚀 Testing Conversational Style Improvements\n');
  
  const testCases = [
    {
      query: 'hi',
      name: 'Test 1: Greeting Response',
      expected: ['warmGreeting']
    },
    {
      query: 'hello',
      name: 'Test 2: Alternative Greeting',
      expected: ['warmGreeting']
    },
    {
      query: 'what\'s the price of AAPL?',
      name: 'Test 3: Simple Market Query',
      expected: ['acknowledgment', 'noBullets', 'flowingText', 'engagement']
    },
    {
      query: 'analyze TSLA stock',
      name: 'Test 4: Stock Analysis',
      expected: ['acknowledgment', 'noBullets', 'flowingText', 'engagement']
    },
    {
      query: 'compare MSFT vs GOOGL',
      name: 'Test 5: Comparison Query',
      expected: ['acknowledgment', 'cleanComparison', 'engagement']
    },
    {
      query: 'AAPL vs AMZN',
      name: 'Test 6: Short Comparison',
      expected: ['acknowledgment', 'cleanComparison', 'engagement']
    },
    {
      query: 'show me Bitcoin price',
      name: 'Test 7: Crypto Query',
      expected: ['acknowledgment', 'noBullets', 'flowingText', 'engagement']
    },
    {
      query: 'what can you do?',
      name: 'Test 8: Capability Question',
      expected: ['engagement']
    }
  ];
  
  const results = [];
  
  for (const testCase of testCases) {
    const result = await testQuery(testCase.query, testCase.name, testCase.expected);
    results.push({ ...testCase, result });
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 1500));
  }
  
  // Summary
  console.log('\n\n📊 Test Summary:');
  console.log('================');
  
  let totalPassed = 0;
  let totalFailed = 0;
  
  results.forEach(({ name, expected, result }) => {
    if (!result) {
      console.log(`❌ ${name} - Failed to execute`);
      totalFailed++;
      return;
    }
    
    const passed = expected.every(feature => result[feature]);
    if (passed) {
      console.log(`✅ ${name}`);
      totalPassed++;
    } else {
      console.log(`❌ ${name}`);
      const failedFeatures = expected.filter(feature => !result[feature]);
      console.log(`   Failed features: ${failedFeatures.join(', ')}`);
      totalFailed++;
    }
  });
  
  console.log(`\nTotal: ${totalPassed} passed, ${totalFailed} failed`);
  
  // Instructions
  console.log('\n📝 Manual Testing Instructions:');
  console.log('1. Start the server: npm start');
  console.log('2. Run this test: node test-conversational-style.js');
  console.log('3. Check that greetings are warm and short');
  console.log('4. Verify market responses start with acknowledgment');
  console.log('5. Ensure minimal bullet points (max 2)');
  console.log('6. Confirm clean comparison format');
  console.log('7. Look for engaging questions at the end');
}

// Run tests if server is running
runTests().catch(console.error);