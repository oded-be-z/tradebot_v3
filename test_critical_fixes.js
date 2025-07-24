const axios = require('axios');

async function runCriticalTests() {
  console.log('🚨 CRITICAL FIXES VALIDATION');
  console.log('='.repeat(40));
  
  const criticalTests = [
    {
      name: 'Basic JSON Test',
      query: 'AAPL price',
      sessionId: 'json-test'
    },
    {
      name: 'Smart Insights Test 1',
      query: 'AAPL',
      sessionId: 'smart-test'
    },  
    {
      name: 'Smart Insights Test 2',
      query: 'Tell me more about AAPL',
      sessionId: 'smart-test'
    },
    {
      name: 'Smart Insights Test 3',
      query: 'AAPL analysis',
      sessionId: 'smart-test'
    }
  ];
  
  let results = { passed: 0, failed: 0, criticalIssues: [] };
  
  for (const test of criticalTests) {
    console.log(`\n📋 ${test.name}`);
    
    try {
      const response = await axios.post('http://localhost:3000/api/chat', {
        message: test.query,
        sessionId: test.sessionId
      });
      
      const responseText = response.data.response;
      
      // Check JSON artifacts
      const hasJSON = /("response"\s*:|\\n|\\"|\\\\)/.test(responseText);
      
      // Check formatting
      const hasProperBullets = /• /.test(responseText);
      const hasAsteriskBullets = /^\* /m.test(responseText);
      const hasEmojis = /[📊📈💰🎯💡]/.test(responseText);
      
      // Smart insights on 3rd test
      const hasSmartInsights = test.name.includes('Test 3') && 
        (/You've checked.*3|checked.*multiple/i.test(responseText));
      
      const passed = !hasJSON && !hasAsteriskBullets;
      
      if (passed) {
        results.passed++;
        console.log('✅ PASS');
      } else {
        results.failed++;
        console.log('❌ FAIL');
        
        if (hasJSON) {
          results.criticalIssues.push(`${test.name}: JSON artifacts found`);
          console.log('   - Found JSON artifacts!');
        }
        
        if (hasAsteriskBullets) {
          console.log('   - Found asterisk bullets instead of •');
        }
      }
      
      console.log(`📏 Length: ${responseText.length} chars`);
      console.log(`🔘 Bullets: ${hasProperBullets ? '• (good)' : hasAsteriskBullets ? '* (bad)' : 'none'}`);
      console.log(`😊 Emojis: ${hasEmojis ? 'Yes' : 'No'}`);
      
      if (test.name.includes('Test 3')) {
        console.log(`🧠 Smart Insights: ${hasSmartInsights ? 'Triggered ✅' : 'Not triggered ❌'}`);
      }
      
      // Show preview
      console.log(`\n💬 Preview: ${responseText.substring(0, 100)}...`);
      
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      results.failed++;
      results.criticalIssues.push(`${test.name}: API Error`);
    }
    
    // Delay to avoid rate limits
    await new Promise(resolve => setTimeout(resolve, 2000));
  }
  
  console.log('\n' + '='.repeat(40));
  console.log('📊 CRITICAL TESTS SUMMARY');
  console.log('='.repeat(40));
  console.log(`Total: ${results.passed + results.failed}`);
  console.log(`Passed: ${results.passed} ✅`);
  console.log(`Failed: ${results.failed} ❌`);
  console.log(`Critical Issues: ${results.criticalIssues.length}`);
  
  const isReady = results.criticalIssues.length === 0;
  console.log(`\n${isReady ? '✅ CRITICAL FIXES WORKING!' : '❌ CRITICAL ISSUES REMAIN'}`);
  
  if (!isReady) {
    console.log('\n🚨 Issues:');
    results.criticalIssues.forEach((issue, i) => {
      console.log(`${i + 1}. ${issue}`);
    });
  }
  
  return isReady;
}

runCriticalTests().catch(console.error);