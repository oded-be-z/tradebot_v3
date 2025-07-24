const axios = require('axios');
const fs = require('fs');

const BASE_URL = 'http://localhost:3000';

// Comprehensive test suite with challenging variations
const comprehensiveTests = {
  // TYPO VARIATIONS - Test every possible misspelling
  typoVariations: [
    // Apple variations
    { query: "aple price", expect: "AAPL", category: "typo" },
    { query: "appple stock", expect: "AAPL", category: "typo" },
    { query: "appl pric", expect: "AAPL", category: "typo" },
    { query: "aapl prce", expect: "AAPL", category: "typo" },
    { query: "apple sotck", expect: "AAPL", category: "typo" },
    { query: "whts apple price", expect: "AAPL", category: "typo" },
    { query: "wat is aple at", expect: "AAPL", category: "typo" },
    { query: "hw much is apple", expect: "AAPL", category: "typo" },
    
    // Microsoft variations
    { query: "microsft", expect: "MSFT", category: "typo" },
    { query: "microsofy", expect: "MSFT", category: "typo" },
    { query: "mircosoft stock", expect: "MSFT", category: "typo" },
    { query: "msft prcie", expect: "MSFT", category: "typo" },
    { query: "micorsoft price", expect: "MSFT", category: "typo" },
    
    // Tesla variations
    { query: "telsa", expect: "TSLA", category: "typo" },
    { query: "tessla price", expect: "TSLA", category: "typo" },
    { query: "tsla sotck", expect: "TSLA", category: "typo" },
    { query: "tesler shares", expect: "TSLA", category: "typo" },
    
    // Bitcoin variations
    { query: "bitcon", expect: "BTC", category: "typo" },
    { query: "btc prise", expect: "BTC", category: "typo" },
    { query: "bitconi value", expect: "BTC", category: "typo" },
    { query: "bitocin now", expect: "BTC", category: "typo" },
    
    // Complex typos
    { query: "show me mircosoft vs aple", expect: ["MSFT", "AAPL"], category: "typo" },
    { query: "compare telsa and nvdia", expect: ["TSLA", "NVDA"], category: "typo" },
    { query: "wats the diference between amazn and gogle", expect: ["AMZN", "GOOGL"], category: "typo" }
  ],

  // MEANING VARIATIONS - Different ways to ask the same thing
  meaningVariations: [
    // Price queries
    { query: "apple cost", expect: "$", category: "meaning" },
    { query: "AAPL value", expect: "$", category: "meaning" },
    { query: "price of apple", expect: "$", category: "meaning" },
    { query: "apple trading at", expect: "$", category: "meaning" },
    { query: "where's apple", expect: "$", category: "meaning" },
    { query: "apple quote", expect: "$", category: "meaning" },
    { query: "AAPL $?", expect: "$", category: "meaning" },
    { query: "apple share price", expect: "$", category: "meaning" },
    { query: "current apple", expect: "$", category: "meaning" },
    { query: "apple right now", expect: "$", category: "meaning" },
    { query: "apple today", expect: "$", category: "meaning" },
    { query: "latest on apple", expect: "$", category: "meaning" },
    
    // Trend queries
    { query: "apple direction", expect: "trend", category: "meaning" },
    { query: "AAPL movement", expect: "trend", category: "meaning" },
    { query: "how's apple doing", expect: "analysis", category: "meaning" },
    { query: "apple performance", expect: "analysis", category: "meaning" },
    { query: "AAPL outlook", expect: "trend", category: "meaning" },
    { query: "apple momentum", expect: "trend", category: "meaning" },
    
    // Comparison queries
    { query: "AAPL or MSFT", expect: "comparison", category: "meaning" },
    { query: "apple versus microsoft", expect: "comparison", category: "meaning" },
    { query: "better: AAPL MSFT", expect: "comparison", category: "meaning" },
    { query: "AAPL/MSFT", expect: "comparison", category: "meaning" },
    { query: "apple > microsoft?", expect: "comparison", category: "meaning" },
    { query: "AAPL v MSFT", expect: "comparison", category: "meaning" }
  ],

  // CONVERSATIONAL VARIATIONS - Natural speech patterns
  conversationalVariations: [
    // Casual queries
    { query: "yo what's tesla at", expect: "TSLA", category: "casual" },
    { query: "hey how's bitcoin doing", expect: "BTC", category: "casual" },
    { query: "sup with nvidia", expect: "NVDA", category: "casual" },
    { query: "apple?", expect: "AAPL", category: "casual" },
    { query: "msft??", expect: "MSFT", category: "casual" },
    { query: "tesla!!!", expect: "TSLA", category: "casual" },
    
    // Verbose queries
    { query: "could you please tell me what the current price of apple stock is", expect: "$", category: "verbose" },
    { query: "i was wondering if you could show me how microsoft is doing today", expect: "MSFT", category: "verbose" },
    { query: "would it be possible to get information about tesla's stock price", expect: "TSLA", category: "verbose" },
    
    // Context-dependent
    { query: "what about microsoft", expect: "MSFT", category: "context" },
    { query: "and tesla?", expect: "TSLA", category: "context" },
    { query: "how about nvidia", expect: "NVDA", category: "context" },
    { query: "show me that one", expect: "context", category: "context" },
    { query: "the other one", expect: "context", category: "context" },
    { query: "same for amazon", expect: "AMZN", category: "context" }
  ],

  // EDGE CASES - Challenging inputs
  edgeCases: [
    // Mixed case and spacing
    { query: "WhAtS aPpLe PrIcE", expect: "AAPL", category: "edge" },
    { query: "A P P L", expect: "AAPL", category: "edge" },
    { query: "microsoft$price", expect: "MSFT", category: "edge" },
    { query: "tesla()stock", expect: "TSLA", category: "edge" },
    { query: "!!!NVDA!!!", expect: "NVDA", category: "edge" },
    
    // Numbers and symbols
    { query: "apple 2024 price", expect: "AAPL", category: "edge" },
    { query: "msft q4", expect: "MSFT", category: "edge" },
    { query: "$AAPL", expect: "AAPL", category: "edge" },
    { query: "#tesla", expect: "TSLA", category: "edge" },
    { query: "@bitcoin", expect: "BTC", category: "edge" },
    
    // Multiple symbols rapid fire
    { query: "AAPL MSFT GOOGL AMZN TSLA NVDA", expect: "multiple", category: "edge" },
    { query: "show AAPL then MSFT then GOOGL", expect: "multiple", category: "edge" },
    { query: "aapl,msft,googl,amzn", expect: "multiple", category: "edge" },
    
    // Ambiguous queries
    { query: "apple fruit or stock", expect: "AAPL", category: "edge" },
    { query: "amazon company", expect: "AMZN", category: "edge" },
    { query: "meta facebook", expect: "META", category: "edge" }
  ],

  // RESPONSE QUALITY CHECKS
  qualityChecks: [
    // Must be concise
    { query: "AAPL", maxLength: 100, mustInclude: "$", category: "quality" },
    { query: "tell me everything about apple", maxLength: 150, category: "quality" },
    { query: "analyze microsoft in detail", maxLength: 150, category: "quality" },
    
    // No questions at end
    { query: "hi", bannedEndings: ["?", "like to", "want me to"], category: "quality" },
    { query: "hello there", bannedEndings: ["?", "help you", "interested in"], category: "quality" },
    { query: "hey", bannedEndings: ["?", "else", "more"], category: "quality" },
    
    // Specific format requirements
    { query: "AAPL price", mustMatch: /\$\d+\.\d+/, category: "format" },
    { query: "bitcoin value", mustMatch: /\$[\d,]+/, category: "format" },
    { query: "compare AAPL MSFT", mustInclude: ["AAPL", "MSFT", "vs"], category: "format" }
  ],

  // STRESS TESTS - Rapid sequences
  stressSequences: [
    {
      name: "Rapid symbol switching",
      sequence: [
        { query: "AAPL", delay: 100 },
        { query: "MSFT", delay: 100 },
        { query: "GOOGL", delay: 100 },
        { query: "AMZN", delay: 100 },
        { query: "TSLA", delay: 100 },
        { query: "NVDA", delay: 100 },
        { query: "META", delay: 100 },
        { query: "BTC", delay: 100 }
      ]
    },
    {
      name: "Context switching",
      sequence: [
        { query: "apple price", expect: "AAPL" },
        { query: "compare to microsoft", expect: ["AAPL", "MSFT"] },
        { query: "add google", expect: ["GOOGL"] },
        { query: "which is best", expect: "comparison" },
        { query: "buy the winner", expect: "advice" }
      ]
    }
  ]
};

// Test execution functions
async function createSession() {
  const response = await axios.post(`${BASE_URL}/api/session/init`);
  return response.data.sessionId;
}

async function sendQuery(sessionId, query) {
  const startTime = Date.now();
  try {
    const response = await axios.post(`${BASE_URL}/api/chat`, {
      message: query,
      sessionId: sessionId
    });
    return {
      success: true,
      data: response.data,
      responseTime: Date.now() - startTime,
      responseLength: response.data.response.length
    };
  } catch (error) {
    return {
      success: false,
      error: error.message,
      responseTime: Date.now() - startTime
    };
  }
}

function checkResponse(response, test) {
  const issues = [];
  const responseText = response.data.response;
  
  // Check for banned phrases
  const bannedPhrases = [
    'let me know', 'feel free', "i'm here to", 'want me to',
    'curious about', 'should i', 'would you like', 'interested in',
    'anything else', 'what can i', 'how can i help'
  ];
  
  const foundBanned = bannedPhrases.filter(phrase => 
    responseText.toLowerCase().includes(phrase)
  );
  if (foundBanned.length > 0) {
    issues.push(`Banned phrases: ${foundBanned.join(', ')}`);
  }
  
  // Check length
  if (test.maxLength && responseText.length > test.maxLength) {
    issues.push(`Too long: ${responseText.length} chars (max: ${test.maxLength})`);
  }
  
  // Check expectations
  if (test.expect) {
    const expectArray = Array.isArray(test.expect) ? test.expect : [test.expect];
    for (const expected of expectArray) {
      if (expected === "$" && !responseText.includes('$')) {
        issues.push('Missing price ($)');
      } else if (expected === "context" && responseText.length < 20) {
        issues.push('No context understanding');
      } else if (expected !== "$" && expected !== "context" && 
                 !responseText.toUpperCase().includes(expected)) {
        issues.push(`Missing expected: ${expected}`);
      }
    }
  }
  
  // Check must include
  if (test.mustInclude) {
    const includes = Array.isArray(test.mustInclude) ? test.mustInclude : [test.mustInclude];
    for (const must of includes) {
      if (!responseText.includes(must)) {
        issues.push(`Missing required: ${must}`);
      }
    }
  }
  
  // Check patterns
  if (test.mustMatch && !test.mustMatch.test(responseText)) {
    issues.push(`Pattern not matched: ${test.mustMatch}`);
  }
  
  // Check banned endings
  if (test.bannedEndings) {
    for (const ending of test.bannedEndings) {
      if (responseText.trim().endsWith(ending)) {
        issues.push(`Banned ending: ${ending}`);
      }
      if (ending !== "?" && responseText.toLowerCase().includes(ending)) {
        issues.push(`Contains banned: "${ending}"`);
      }
    }
  }
  
  return {
    passed: issues.length === 0,
    issues: issues,
    responsePreview: responseText.substring(0, 100)
  };
}

// Main test runner
async function runComprehensiveTests() {
  console.log("🚀 COMPREHENSIVE VALIDATION TEST SUITE");
  console.log("=" + "=".repeat(50));
  
  const results = {
    timestamp: new Date().toISOString(),
    categories: {},
    totalTests: 0,
    passed: 0,
    failed: 0,
    responseMetrics: {
      avgLength: 0,
      minLength: Infinity,
      maxLength: 0,
      avgResponseTime: 0
    },
    failures: [],
    criticalIssues: []
  };
  
  try {
    const sessionId = await createSession();
    console.log(`✅ Session created: ${sessionId}\n`);
    
    // Test each category
    const testCategories = [
      { name: 'Typo Variations', tests: comprehensiveTests.typoVariations },
      { name: 'Meaning Variations', tests: comprehensiveTests.meaningVariations },
      { name: 'Conversational Variations', tests: comprehensiveTests.conversationalVariations },
      { name: 'Edge Cases', tests: comprehensiveTests.edgeCases },
      { name: 'Quality Checks', tests: comprehensiveTests.qualityChecks }
    ];
    
    for (const category of testCategories) {
      console.log(`\n📋 Testing: ${category.name}`);
      console.log("-".repeat(40));
      
      results.categories[category.name] = {
        total: 0,
        passed: 0,
        failed: 0,
        details: []
      };
      
      for (const test of category.tests) {
        results.totalTests++;
        results.categories[category.name].total++;
        
        process.stdout.write(`Testing: "${test.query}" ... `);
        
        const response = await sendQuery(sessionId, test.query);
        
        if (!response.success) {
          results.failed++;
          results.categories[category.name].failed++;
          console.log(`❌ ERROR: ${response.error}`);
          results.failures.push({
            query: test.query,
            error: response.error,
            category: test.category
          });
          continue;
        }
        
        const check = checkResponse(response, test);
        
        // Update metrics
        results.responseMetrics.avgLength = 
          (results.responseMetrics.avgLength * (results.totalTests - 1) + response.responseLength) / results.totalTests;
        results.responseMetrics.minLength = Math.min(results.responseMetrics.minLength, response.responseLength);
        results.responseMetrics.maxLength = Math.max(results.responseMetrics.maxLength, response.responseLength);
        results.responseMetrics.avgResponseTime = 
          (results.responseMetrics.avgResponseTime * (results.totalTests - 1) + response.responseTime) / results.totalTests;
        
        if (check.passed) {
          results.passed++;
          results.categories[category.name].passed++;
          console.log(`✅ PASS (${response.responseTime}ms, ${response.responseLength} chars)`);
        } else {
          results.failed++;
          results.categories[category.name].failed++;
          console.log(`❌ FAIL: ${check.issues.join(', ')}`);
          console.log(`   Response: "${check.responsePreview}..."`);
          
          results.failures.push({
            query: test.query,
            issues: check.issues,
            response: check.responsePreview,
            category: test.category,
            responseTime: response.responseTime,
            responseLength: response.responseLength
          });
          
          // Mark critical issues
          if (check.issues.some(issue => issue.includes('Banned phrases'))) {
            results.criticalIssues.push({
              type: 'Banned Phrase',
              query: test.query,
              issue: check.issues.find(i => i.includes('Banned phrases'))
            });
          }
        }
        
        // Small delay to avoid rate limiting
        await new Promise(resolve => setTimeout(resolve, 200));
      }
      
      const cat = results.categories[category.name];
      console.log(`\n${category.name} Summary: ${cat.passed}/${cat.total} passed (${((cat.passed/cat.total)*100).toFixed(1)}%)`);
    }
    
    // Run stress sequences
    console.log("\n\n📋 Testing: Stress Sequences");
    console.log("-".repeat(40));
    
    for (const stressTest of comprehensiveTests.stressSequences) {
      console.log(`\nRunning: ${stressTest.name}`);
      let sequencePassed = true;
      
      for (const step of stressTest.sequence) {
        process.stdout.write(`  "${step.query}" ... `);
        const response = await sendQuery(sessionId, step.query);
        
        if (!response.success) {
          console.log(`❌ ERROR`);
          sequencePassed = false;
        } else {
          console.log(`✅ OK (${response.responseTime}ms)`);
        }
        
        if (step.delay) {
          await new Promise(resolve => setTimeout(resolve, step.delay));
        }
      }
      
      if (sequencePassed) {
        results.passed++;
      } else {
        results.failed++;
      }
      results.totalTests++;
    }
    
  } catch (error) {
    console.error("\n❌ Fatal error:", error.message);
    results.fatalError = error.message;
  }
  
  // Generate report
  generateComprehensiveReport(results);
}

function generateComprehensiveReport(results) {
  const passRate = ((results.passed / results.totalTests) * 100).toFixed(2);
  
  const report = `
# COMPREHENSIVE VALIDATION REPORT
Generated: ${results.timestamp}

## EXECUTIVE SUMMARY
- Total Tests: ${results.totalTests}
- Passed: ${results.passed} (${passRate}%)
- Failed: ${results.failed}
- Critical Issues: ${results.criticalIssues.length}

## RESPONSE METRICS
- Average Length: ${results.responseMetrics.avgLength.toFixed(1)} chars
- Min Length: ${results.responseMetrics.minLength} chars
- Max Length: ${results.responseMetrics.maxLength} chars
- Average Response Time: ${results.responseMetrics.avgResponseTime.toFixed(0)}ms

## CATEGORY BREAKDOWN
${Object.entries(results.categories).map(([name, cat]) => 
  `### ${name}: ${cat.passed}/${cat.total} (${((cat.passed/cat.total)*100).toFixed(1)}%)`
).join('\n')}

## CRITICAL ISSUES
${results.criticalIssues.length > 0 ? 
  results.criticalIssues.map(issue => 
    `- ${issue.type}: "${issue.query}" - ${issue.issue}`
  ).join('\n') : 
  'None found ✅'}

## TOP FAILURES
${results.failures.slice(0, 10).map(f => 
  `- "${f.query}": ${f.issues.join(', ')}`
).join('\n')}

## PRODUCTION READINESS
${passRate >= 95 ? '✅ EXCELLENT - Ready for production' :
  passRate >= 90 ? '⚠️ GOOD - Minor improvements needed' :
  passRate >= 80 ? '⚠️ FAIR - Significant improvements needed' :
  '❌ POOR - Major issues to address'}
`;

  console.log("\n\n" + report);
  
  // Save detailed results
  fs.writeFileSync('comprehensive_test_results.json', JSON.stringify(results, null, 2));
  fs.writeFileSync('comprehensive_test_report.md', report);
  
  console.log("\n📝 Full results saved to:");
  console.log("   - comprehensive_test_results.json");
  console.log("   - comprehensive_test_report.md");
}

// Run tests
if (require.main === module) {
  runComprehensiveTests().catch(console.error);
}

module.exports = { comprehensiveTests, runComprehensiveTests };