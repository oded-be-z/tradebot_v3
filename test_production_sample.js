const axios = require('axios');
const fs = require('fs');

// Import main test module
const { coreFunctionalityTests, checkForBannedPhrases } = require('./test_production_suite');

const BASE_URL = 'http://localhost:3000';

// Simplified test runner for a sample of tests
async function runSampleTests() {
  console.log("🧪 Running Sample Production Tests...\n");
  
  const results = {
    total: 0,
    passed: 0,
    failed: 0,
    bannedPhrases: 0,
    lengthViolations: 0,
    failures: []
  };
  
  try {
    // Create session
    const sessionResponse = await axios.post(`${BASE_URL}/api/session/init`);
    const sessionId = sessionResponse.data.sessionId;
    console.log(`✅ Session created: ${sessionId}\n`);
    
    // Run first 10 core tests
    const sampleTests = coreFunctionalityTests.slice(0, 10);
    
    for (const test of sampleTests) {
      results.total++;
      console.log(`Running: "${test.query}"`);
      
      try {
        const startTime = Date.now();
        const response = await axios.post(`${BASE_URL}/api/chat`, {
          message: test.query,
          sessionId: sessionId
        });
        const responseTime = Date.now() - startTime;
        
        const responseText = response.data.response;
        let passed = true;
        const issues = [];
        
        // Check for banned phrases
        const bannedPhrases = [
          'let me know',
          'feel free',
          "i'm here to",
          'want me to',
          'curious about',
          'should i',
          'would you like',
          'interested in'
        ];
        
        const found = bannedPhrases.filter(phrase => 
          responseText.toLowerCase().includes(phrase)
        );
        
        if (found.length > 0) {
          passed = false;
          issues.push(`Banned phrases: ${found.join(', ')}`);
          results.bannedPhrases++;
        }
        
        // Check length
        if (responseText.length > test.maxLength) {
          passed = false;
          issues.push(`Too long: ${responseText.length} chars (max: ${test.maxLength})`);
          results.lengthViolations++;
        }
        
        // Check expected pattern
        if (test.expectedPattern && !test.expectedPattern.test(responseText)) {
          passed = false;
          issues.push('Expected pattern not found');
        }
        
        if (passed) {
          console.log(`✅ PASSED (${responseTime}ms, ${responseText.length} chars)`);
          results.passed++;
        } else {
          console.log(`❌ FAILED: ${issues.join(', ')}`);
          console.log(`   Response: "${responseText.substring(0, 100)}..."`);
          results.failed++;
          results.failures.push({
            query: test.query,
            issues: issues,
            response: responseText.substring(0, 100)
          });
        }
        
      } catch (error) {
        console.log(`❌ ERROR: ${error.message}`);
        results.failed++;
        results.failures.push({
          query: test.query,
          error: error.message
        });
      }
      
      console.log('');
    }
    
    // Summary
    console.log("📊 SAMPLE TEST SUMMARY");
    console.log("=" + "=".repeat(40));
    console.log(`Total Tests: ${results.total}`);
    console.log(`Passed: ${results.passed} (${((results.passed/results.total)*100).toFixed(1)}%)`);
    console.log(`Failed: ${results.failed}`);
    console.log(`Banned Phrases Found: ${results.bannedPhrases}`);
    console.log(`Length Violations: ${results.lengthViolations}`);
    
    if (results.failures.length > 0) {
      console.log("\n❌ FAILURES:");
      results.failures.forEach(f => {
        console.log(`- "${f.query}": ${f.issues?.join(', ') || f.error}`);
      });
    }
    
    // Save results
    fs.writeFileSync('test_sample_results.json', JSON.stringify(results, null, 2));
    console.log("\n📝 Results saved to test_sample_results.json");
    
  } catch (error) {
    console.error("Fatal error:", error.message);
  }
}

runSampleTests();