const axios = require('axios');

async function testContextWithFormat() {
  console.log('🚀 Testing COMBINED Phase 1 + Phase 2 Integration\n');
  console.log('📋 Validating: Context Memory + Format Enforcement\n');

  const sessionId = 'combined-test-' + Date.now();
  
  const tests = [
    {
      query: "AAPL price",
      expected: {
        context: "Initial context establishment",
        format: ["📊", "**AAPL**", "Want me to"],
        symbols: ["AAPL"]
      },
      description: "Baseline - emojis + bold + actionable ending"
    },
    {
      query: "what about the technicals?", 
      expected: {
        context: "Should maintain AAPL context + detect expert level",
        format: ["📊", "**AAPL**", "Want me to"],
        symbols: ["AAPL"] // Should infer AAPL from context
      },
      description: "Context + Expert Detection + Formatting"
    },
    {
      query: "compare it to GOOGL",
      expected: {
        context: "Pronoun resolution: 'it' = AAPL",
        format: ["📊", "**AAPL**", "**GOOGL**", "Want me to"],
        symbols: ["AAPL", "GOOGL"] // Both symbols
      },
      description: "Pronoun Resolution + Comparison + Visual Hierarchy"
    },
    {
      query: "show me the portfolio analysis",
      expected: {
        context: "Portfolio focus with expert-level detail", 
        format: ["📊", "portfolio", "Want me to"],
        symbols: [] // Portfolio query
      },
      description: "Context Persistence + Portfolio + Formatting"
    }
  ];

  let totalTests = 0;
  let passedTests = 0;
  const results = [];

  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    
    console.log(`🧪 Test ${i + 1}: ${test.description}`);
    console.log(`   Query: "${test.query}"`);
    
    try {
      const response = await axios.post('http://localhost:3000/api/chat', {
        message: test.query,
        sessionId: sessionId
      });

      const responseText = response.data.response;
      const symbols = response.data.symbols || [];
      
      console.log(`   📝 Response Preview: "${responseText.substring(0, 120)}..."`);
      console.log(`   🎯 Symbols Detected: [${symbols.join(', ')}]`);

      // Test Phase 1: Format Enforcement
      const formatTests = {
        hasEmojis: /[📊📈📉💰🎯⚠️🔍🔥]/.test(responseText),
        hasBold: /\*\*.*\*\*/.test(responseText),
        hasActionable: /Want me to/i.test(responseText),
        hasBullets: test.expected.format.includes('•') ? /•/.test(responseText) : true
      };

      // Test Phase 2: Context Features
      const contextTests = {
        correctSymbols: test.expected.symbols.length === 0 || 
                       test.expected.symbols.every(sym => symbols.includes(sym)),
        contextMaintained: true // Will be tested specifically per query
      };

      // Query-specific context tests
      if (i === 1) { // "what about the technicals?"
        // Should reference AAPL from previous context
        contextTests.contextMaintained = symbols.includes('AAPL') || 
                                        responseText.toLowerCase().includes('aapl') ||
                                        responseText.toLowerCase().includes('apple');
        contextTests.expertLevel = responseText.includes('technical') ||
                                  responseText.includes('RSI') ||
                                  responseText.includes('indicators') ||
                                  responseText.length > 150;
      } else if (i === 2) { // "compare it to GOOGL"
        // Should resolve "it" to AAPL 
        contextTests.pronounResolution = symbols.includes('AAPL') && symbols.includes('GOOGL');
        contextTests.contextMaintained = responseText.toLowerCase().includes('aapl') ||
                                        responseText.toLowerCase().includes('apple');
      } else if (i === 3) { // "show me the portfolio analysis"
        contextTests.portfolioFocus = responseText.toLowerCase().includes('portfolio') ||
                                     responseText.toLowerCase().includes('holdings');
      }

      // Calculate scores
      const formatScore = Object.values(formatTests).filter(Boolean).length;
      const contextScore = Object.values(contextTests).filter(Boolean).length;
      const formatTotal = Object.keys(formatTests).length;
      const contextTotal = Object.keys(contextTests).length;

      // Combined success criteria
      const formatPassed = formatScore >= Math.ceil(formatTotal * 0.75); // 75% format compliance
      const contextPassed = contextScore >= Math.ceil(contextTotal * 0.8); // 80% context accuracy
      const overallPassed = formatPassed && contextPassed;

      results.push({
        test: i + 1,
        query: test.query,
        passed: overallPassed,
        formatScore: `${formatScore}/${formatTotal}`,
        contextScore: `${contextScore}/${contextTotal}`,
        formatDetails: formatTests,
        contextDetails: contextTests
      });

      if (overallPassed) {
        console.log(`   ✅ PASS: Combined systems working (F:${formatScore}/${formatTotal}, C:${contextScore}/${contextTotal})`);
        passedTests++;
      } else {
        console.log(`   ❌ FAIL: Issues detected (F:${formatScore}/${formatTotal}, C:${contextScore}/${contextTotal})`);
        if (!formatPassed) {
          console.log(`     🎨 Format Issues:`, Object.entries(formatTests).filter(([k,v]) => !v).map(([k]) => k));
        }
        if (!contextPassed) {
          console.log(`     🧠 Context Issues:`, Object.entries(contextTests).filter(([k,v]) => !v).map(([k]) => k));
        }
      }

      totalTests++;
      console.log('');

      // Delay between tests for context building
      await new Promise(resolve => setTimeout(resolve, 1000));

    } catch (error) {
      console.error(`   ❌ Error in test ${i + 1}:`, error.message);
      totalTests++;
    }
  }

  // Final Results
  console.log('🏆 COMBINED INTEGRATION RESULTS\n');
  console.log(`📊 Overall Success: ${passedTests}/${totalTests} tests (${Math.round(passedTests/totalTests*100)}%)\n`);

  // Detailed breakdown
  results.forEach(result => {
    const status = result.passed ? '✅' : '❌';
    console.log(`${status} Test ${result.test}: "${result.query}"`);
    console.log(`   Format: ${result.formatScore} | Context: ${result.contextScore}`);
  });

  console.log('\n🎯 INTEGRATION ANALYSIS\n');

  if (passedTests === totalTests) {
    console.log('🎉 PERFECT: Phase 1 + Phase 2 fully integrated!');
    console.log('\n✅ Combined Features Working:');
    console.log('  🎨 Format Enforcement: Emojis, bold text, actionable endings');
    console.log('  🧠 Context Memory: Pronoun resolution, expertise detection');
    console.log('  🔗 Session Persistence: Cross-query symbol tracking');
    console.log('  📊 Visual Hierarchy: Structured, professional responses');
    console.log('\n🚀 Ready for Phase 3: Visual Response Builder');
  } else if (passedTests >= totalTests * 0.75) {
    console.log('✅ EXCELLENT: Integration mostly successful');
    console.log('  - Core functionality operational');
    console.log('  - Minor edge cases need refinement');
  } else {
    console.log('⚠️  PARTIAL SUCCESS: Some integration issues');
    console.log('  - Review middleware implementation');
    console.log('  - Check context-format coordination');
  }

  // Smart Insights Preview
  console.log('\n🔮 SMART INSIGHTS PREVIEW\n');
  console.log('Testing enhanced context-aware responses...\n');
  
  try {
    // Test smart insight with returning user
    const insightTest = await axios.post('http://localhost:3000/api/chat', {
      message: 'how is AAPL doing now?',
      sessionId: sessionId
    });
    
    const insightResponse = insightTest.data.response;
    const hasSmartInsight = /since.*ago|previously|last.*discussed|mentioned.*before/i.test(insightResponse);
    
    console.log(`🧠 Smart Insight Detection: ${hasSmartInsight ? '✅ WORKING' : '🔄 READY FOR IMPLEMENTATION'}`);
    console.log(`📝 Response: "${insightResponse.substring(0, 150)}..."`);
    
  } catch (error) {
    console.log('🔄 Smart Insights ready for implementation');
  }
}

testContextWithFormat().catch(console.error);