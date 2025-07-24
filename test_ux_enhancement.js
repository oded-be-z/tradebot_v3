const axios = require('axios');

async function testUXEnhancements() {
  console.log('🎨 Testing UX Enhancement Pipeline\n');

  const tests = [
    {
      name: 'Price Query Enhancement',
      query: 'AAPL price',
      expectedElements: ['📊', '**AAPL**', '🎯', 'Your Move'],
      description: 'Should use price template with emojis and action'
    },
    {
      name: 'Comparison Query Enhancement', 
      query: 'AAPL vs MSFT',
      expectedElements: ['⚔️', 'vs', '🥇', 'The Winner', '🎯'],
      description: 'Should use comparison template with race format'
    },
    {
      name: 'Generic Response Detection',
      query: 'what is a stock',
      expectedElements: ['?', 'specific'],
      description: 'Should catch generic responses and add follow-up'
    },
    {
      name: 'Short Query Enhancement',
      query: 'bitcoin?',
      expectedElements: ['📊', '$', '%', '🎯'],
      description: 'Should enhance short queries with specific data'
    }
  ];

  let totalTests = 0;
  let passedTests = 0;

  for (const test of tests) {
    try {
      console.log(`\n📊 Testing: ${test.name}`);
      console.log(`   Query: "${test.query}"`);
      console.log(`   Expected: ${test.expectedElements.join(', ')}`);

      const response = await axios.post('http://localhost:3000/api/chat', {
        message: test.query,
        sessionId: 'ux-test-' + Date.now()
      });

      const responseText = response.data.response;
      const suggestions = response.data.suggestions || [];
      
      console.log(`   Response Preview: "${responseText.substring(0, 150)}..."`);
      console.log(`   Suggestions: [${suggestions.join(', ')}]`);

      // Check if response contains expected elements
      let elementsFound = 0;
      const foundElements = [];
      
      for (const element of test.expectedElements) {
        if (responseText.includes(element)) {
          elementsFound++;
          foundElements.push(element);
        }
      }

      const success = elementsFound >= Math.ceil(test.expectedElements.length * 0.6); // 60% match required
      
      if (success) {
        console.log(`   ✅ PASS: Found ${elementsFound}/${test.expectedElements.length} expected elements`);
        console.log(`   ✅ Elements: ${foundElements.join(', ')}`);
        passedTests++;
      } else {
        console.log(`   ❌ FAIL: Only found ${elementsFound}/${test.expectedElements.length} expected elements`);
        console.log(`   ❌ Missing: ${test.expectedElements.filter(e => !foundElements.includes(e)).join(', ')}`);
      }

      totalTests++;

      // Small delay between requests
      await new Promise(resolve => setTimeout(resolve, 1500));

    } catch (error) {
      console.error(`   ❌ Error testing "${test.query}":`, error.message);
      totalTests++;
    }
  }

  console.log(`\n📈 Results: ${passedTests}/${totalTests} tests passed (${Math.round(passedTests/totalTests*100)}%)`);
  
  if (passedTests === totalTests) {
    console.log('🎉 SUCCESS: All UX enhancements working correctly!');
    console.log('\n✅ Achievements:');
    console.log('  - Enhanced synthesis prompts with emoji rules');
    console.log('  - ResponseTemplates providing structured outputs');
    console.log('  - ResponseQualityPipeline catching generic responses');
    console.log('  - Better suggestions and follow-up actions');
  } else {
    console.log('⚠️  Some enhancements need adjustment');
    console.log('  - Check template application logic');
    console.log('  - Verify emoji usage in synthesis prompt');
    console.log('  - Review quality pipeline specificity checks');
  }
}

testUXEnhancements().catch(console.error);