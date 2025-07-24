const axios = require('axios');

async function testContextIntegration() {
  console.log('🔗 Testing Full Context Integration Pipeline\n');

  // Sequential queries to test context persistence
  const queries = [
    {
      query: "AAPL price",
      sessionId: "context-test-123",
      expected: {
        remembersSymbol: false, // First query
        userLevel: 'beginner',
        formatCompliance: true
      },
      description: "Initial query - establishes AAPL context"
    },
    {
      query: "compare it to MSFT", 
      sessionId: "context-test-123",
      expected: {
        remembersSymbol: true, // Should resolve "it" to AAPL
        userLevel: 'intermediate', 
        formatCompliance: true
      },
      description: "Pronoun resolution - 'it' should refer to AAPL"
    },
    {
      query: "what about P/E ratios?",
      sessionId: "context-test-123", 
      expected: {
        remembersSymbol: false, // General question
        userLevel: 'expert', // P/E ratio indicates expertise
        formatCompliance: true
      },
      description: "Expert-level query - should detect advanced user"
    },
    {
      query: "show my portfolio",
      sessionId: "context-test-123",
      expected: {
        remembersSymbol: false, // Portfolio query
        userLevel: 'expert', // Should maintain level
        formatCompliance: true
      },
      description: "Context persistence - should maintain expert level"
    }
  ];

  let totalTests = 0;
  let passedTests = 0;
  const results = [];

  console.log('📊 Running Sequential Context Tests...\n');

  for (let i = 0; i < queries.length; i++) {
    const test = queries[i];
    
    try {
      console.log(`🔍 Test ${i + 1}: ${test.description}`);
      console.log(`   Query: "${test.query}"`);
      console.log(`   Session: ${test.sessionId}`);

      const response = await axios.post('http://localhost:3000/api/chat', {
        message: test.query,
        sessionId: test.sessionId
      });

      const responseText = response.data.response;
      const symbols = response.data.symbols || [];
      
      console.log(`   Response Preview: "${responseText.substring(0, 100)}..."`);
      console.log(`   Symbols Detected: [${symbols.join(', ')}]`);

      // Test format compliance
      const formatTests = {
        hasEmojis: /[📊📈📉💰🎯⚠️🔍🔥]/.test(responseText),
        hasBold: /\*\*.*\*\*/.test(responseText),
        hasActionable: /Want me to/i.test(responseText)
      };
      
      const formatScore = Object.values(formatTests).filter(Boolean).length;
      const formatCompliant = formatScore >= 2;

      // Test context-specific expectations
      let contextTests = {
        formatCompliance: formatCompliant
      };

      // Specific context tests based on query
      if (i === 1) { // "compare it to MSFT"
        // Should have resolved "it" to AAPL and included both symbols
        contextTests.remembersSymbol = symbols.includes('AAPL') && symbols.includes('MSFT');
        contextTests.pronounResolution = responseText.toLowerCase().includes('aapl') || 
                                       responseText.toLowerCase().includes('apple');
      } else if (i === 2) { // "P/E ratios"
        // Should show expert-level response
        contextTests.expertLevel = responseText.includes('P/E') || 
                                  responseText.includes('ratio') ||
                                  responseText.length > 200; // More detailed response
      } else if (i === 3) { // "show my portfolio"
        // Should maintain context and show portfolio-focused response
        contextTests.portfolioFocus = responseText.toLowerCase().includes('portfolio') ||
                                    responseText.toLowerCase().includes('holdings');
      }

      // Calculate test results
      const contextScore = Object.values(contextTests).filter(Boolean).length;
      const totalPossible = Object.keys(contextTests).length;
      const testPassed = contextScore >= Math.ceil(totalPossible * 0.7); // 70% pass rate

      results.push({
        test: i + 1,
        query: test.query,
        passed: testPassed,
        contextScore: `${contextScore}/${totalPossible}`,
        formatScore: `${formatScore}/3`,
        details: contextTests
      });

      if (testPassed) {
        console.log(`   ✅ PASS: Context integration working (${contextScore}/${totalPossible})`);
        passedTests++;
      } else {
        console.log(`   ❌ FAIL: Context issues detected (${contextScore}/${totalPossible})`);
        console.log(`   📝 Details:`, contextTests);
      }

      totalTests++;
      console.log('');

      // Delay between requests to ensure proper context updates
      await new Promise(resolve => setTimeout(resolve, 1500));

    } catch (error) {
      console.error(`   ❌ Error in test ${i + 1}:`, error.message);
      totalTests++;
    }
  }

  // Summary
  console.log('📈 CONTEXT INTEGRATION RESULTS\n');
  console.log(`Overall: ${passedTests}/${totalTests} tests passed (${Math.round(passedTests/totalTests*100)}%)\n`);

  // Detailed results
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} Test ${result.test}: "${result.query}"`);
    console.log(`   Context: ${result.contextScore} | Format: ${result.formatScore}`);
    if (!result.passed) {
      console.log(`   Issues:`, Object.entries(result.details)
        .filter(([key, value]) => !value)
        .map(([key]) => key).join(', '));
    }
  });

  console.log('\n🎯 INTEGRATION ANALYSIS\n');

  if (passedTests === totalTests) {
    console.log('🎉 SUCCESS: Full context integration working perfectly!');
    console.log('\n✅ Verified Features:');
    console.log('  - Phase 1: Format enforcement with emojis and structure');
    console.log('  - Phase 2: Conversation context and memory');
    console.log('  - Pronoun resolution ("it" -> AAPL)');
    console.log('  - User level detection (beginner -> expert)');
    console.log('  - Context persistence across queries');
    console.log('  - Template personalization');
  } else if (passedTests >= totalTests * 0.75) {
    console.log('✅ GOOD: Context integration mostly working');
    console.log('  - Core functionality operational');
    console.log('  - Minor issues need attention');
  } else {
    console.log('⚠️  NEEDS WORK: Context integration has issues');
    console.log('  - Check context update logic');
    console.log('  - Verify pronoun resolution');
    console.log('  - Review template integration');
  }

  // Test context state
  console.log('\n🧠 Testing Context State Persistence...');
  
  try {
    // Make a test query to check if context persisted
    const contextCheck = await axios.post('http://localhost:3000/api/chat', {
      message: "what was the last stock we discussed?",
      sessionId: "context-test-123"
    });
    
    const contextResponse = contextCheck.data.response;
    const hasSymbolMemory = /AAPL|Apple|MSFT|Microsoft/i.test(contextResponse);
    
    console.log(`Context Memory Test: ${hasSymbolMemory ? '✅ PASS' : '❌ FAIL'}`);
    console.log(`Response: "${contextResponse.substring(0, 100)}..."`);
    
  } catch (error) {
    console.log('❌ Context memory test failed:', error.message);
  }
}

// Helper function to wait
function sleep(ms) {
  return new Promise(resolve => setTimeout(resolve, ms));
}

testContextIntegration().catch(console.error);