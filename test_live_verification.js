/**
 * Live Verification Test - Real API calls to verify format enforcement
 * This test makes actual API calls and shows raw responses with detailed analysis
 */

const axios = require('axios');
const { FormatMonitor } = require('./monitoring/FormatMonitor');

async function runLiveVerification() {
  console.log('🔍 LIVE VERIFICATION TEST - Real API Calls\n');
  console.log('=' .repeat(80));
  
  const sessionId = 'live-verify-' + Date.now();
  const testQueries = [
    { query: "AAPL price", description: "Basic price query" },
    { query: "AAPL price", description: "2nd time - should trigger time insight" },
    { query: "AAPL price", description: "3rd time - should suggest alerts" },
    { query: "Tell me about AAPL RSI", description: "Expert detection" },
    { query: "compare it to MSFT", description: "Context test" },
    { query: "analyze my portfolio", description: "Portfolio format" },
    { query: "Bitcoin analysis", description: "Crypto handling" },
    { query: "what about GOOGL?", description: "Context continuation" }
  ];
  
  let totalScore = 0;
  let passCount = 0;
  const results = [];
  
  for (let i = 0; i < testQueries.length; i++) {
    const test = testQueries[i];
    console.log(`\nTest ${i + 1}: ${test.description}`);
    console.log('-'.repeat(60));
    console.log(`Query: "${test.query}"`);
    
    const startTime = Date.now();
    
    try {
      const response = await axios.post('http://localhost:3000/api/chat', {
        message: test.query,
        sessionId
      });
      
      const responseTime = Date.now() - startTime;
      const rawResponse = response.data.response;
      
      // Calculate format score
      const formatScore = FormatMonitor.calculateFormatScore(rawResponse);
      totalScore += formatScore;
      
      // Detailed format checks
      const hasEmoji = /[📊📈📉💰🎯⚠️🔍🔥⚔️]/.test(rawResponse);
      const hasBold = /\*\*[A-Z]{1,5}\*\*/.test(rawResponse);
      const hasAction = /want me to/i.test(rawResponse);
      const hasStructure = rawResponse.includes('•') || (rawResponse.includes('\n') && rawResponse.length > 50);
      
      // Smart Insight detection
      const hasSmartInsight = /checked|ago|times|alert|update|pattern|detected/i.test(rawResponse) ||
                             /💡|🔍|⏰|⚡/.test(rawResponse);
      
      // Display raw response
      console.log('\nRaw Response:');
      console.log('```');
      console.log(rawResponse);
      console.log('```');
      
      // Display analysis
      console.log(`\nFormat Score: ${formatScore}/100`);
      console.log(`${hasEmoji ? '✅' : '❌'} Has Emoji: ${hasEmoji ? 'Yes' : 'No'}`);
      console.log(`${hasBold ? '✅' : '❌'} Has Bold: ${hasBold ? 'Yes' : 'No'}`);
      console.log(`${hasAction ? '✅' : '❌'} Has Action: ${hasAction ? 'Yes' : 'No'}`);
      console.log(`${hasStructure ? '✅' : '❌'} Has Structure: ${hasStructure ? 'Yes' : 'No'}`);
      console.log(`${hasSmartInsight ? '✅' : '❌'} Smart Insight: ${hasSmartInsight ? 'Yes' : 'No'}`);
      console.log(`Response Time: ${responseTime}ms`);
      
      // Track results
      const testResult = {
        query: test.query,
        formatScore,
        hasEmoji,
        hasBold,
        hasAction,
        hasStructure,
        hasSmartInsight,
        responseTime,
        passed: formatScore === 100
      };
      
      results.push(testResult);
      if (formatScore === 100) passCount++;
      
      // Special checks for specific tests
      if (i === 2 && !hasSmartInsight) {
        console.log('\n⚠️ WARNING: Smart Insight expected on 3rd AAPL query but not found!');
      }
      
      if (i === 4 && !rawResponse.includes('AAPL')) {
        console.log('\n⚠️ WARNING: Context not maintained - AAPL not mentioned in comparison!');
      }
      
    } catch (error) {
      console.log('\n❌ ERROR:', error.response?.data?.error || error.message);
      results.push({
        query: test.query,
        formatScore: 0,
        error: error.message,
        passed: false
      });
    }
    
    // Small delay between requests
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Summary Report
  console.log('\n' + '=' .repeat(80));
  console.log('📊 VERIFICATION SUMMARY');
  console.log('=' .repeat(80));
  
  const avgScore = totalScore / testQueries.length;
  const complianceRate = (passCount / testQueries.length * 100).toFixed(1);
  
  console.log(`\nTotal Tests: ${testQueries.length}`);
  console.log(`Perfect Scores (100/100): ${passCount}`);
  console.log(`Average Format Score: ${avgScore.toFixed(1)}/100`);
  console.log(`Format Compliance Rate: ${complianceRate}%`);
  
  // Failure Analysis
  const failures = results.filter(r => !r.passed);
  if (failures.length > 0) {
    console.log('\n❌ FAILED TESTS:');
    failures.forEach(fail => {
      console.log(`\nQuery: "${fail.query}"`);
      console.log(`Score: ${fail.formatScore}/100`);
      console.log('Missing:', [
        !fail.hasEmoji && 'Emoji',
        !fail.hasBold && 'Bold',
        !fail.hasAction && 'Action',
        !fail.hasStructure && 'Structure'
      ].filter(Boolean).join(', '));
    });
    
    console.log('\n🔧 IMMEDIATE FIX SUGGESTIONS:');
    
    // Analyze common failure patterns
    const emojiFailures = failures.filter(f => !f.hasEmoji).length;
    const boldFailures = failures.filter(f => !f.hasBold).length;
    const actionFailures = failures.filter(f => !f.hasAction).length;
    
    if (emojiFailures > 0) {
      console.log('- Emergency formatter not adding emojis - check emoji selection logic');
    }
    if (boldFailures > 0) {
      console.log('- Symbol detection failing - verify understanding.symbols is populated');
    }
    if (actionFailures > 0) {
      console.log('- Actionable endings missing - force addition in emergency formatter');
    }
  }
  
  // Success Criteria
  console.log('\n🎯 VERIFICATION RESULT:');
  if (avgScore >= 90) {
    console.log('✅ SUCCESS: Format enforcement is working! Average score:', avgScore.toFixed(1));
  } else if (avgScore >= 70) {
    console.log('⚠️ PARTIAL SUCCESS: Format enforcement needs improvement. Score:', avgScore.toFixed(1));
  } else {
    console.log('❌ FAILURE: Format enforcement not working properly. Score:', avgScore.toFixed(1));
    console.log('\n🚨 CRITICAL: Implementation is not effective. Immediate debugging required!');
  }
  
  // Smart Insights Analysis
  const insightTests = results.slice(0, 4); // First 4 are AAPL queries
  const insightsWorking = insightTests.filter(r => r.hasSmartInsight).length;
  console.log(`\n💡 Smart Insights: ${insightsWorking}/${insightTests.length} triggers detected`);
  
  // Context Maintenance
  const contextTest = results[4]; // "compare it to MSFT"
  console.log(`🔗 Context Maintenance: ${contextTest && !contextTest.error ? 'Working' : 'Failed'}`);
  
  return {
    avgScore,
    complianceRate,
    results
  };
}

// Run the verification
runLiveVerification().then(summary => {
  console.log('\n✅ Live verification complete!');
  
  // Save results
  const fs = require('fs');
  fs.writeFileSync('live_verification_results.json', JSON.stringify(summary, null, 2));
  console.log('📁 Results saved to live_verification_results.json');
  
}).catch(error => {
  console.error('\n❌ Verification failed:', error);
  process.exit(1);
});