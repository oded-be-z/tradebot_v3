// test-1-conversation-memory-fixed.js
const http = require('http');

const API_URL = 'http://localhost:3000/api/chat';
let sessionId = `test-memory-${Date.now()}`;

async function sendMessage(message) {
  return new Promise((resolve, reject) => {
    const data = JSON.stringify({ message, sessionId });
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/chat',
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
        'Content-Length': data.length
      }
    };
    
    const req = http.request(options, (res) => {
      let body = '';
      res.on('data', chunk => body += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(body));
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(data);
    req.end();
  });
}

async function testConversationMemory() {
  console.log('\n🧪 TEST 1: CONVERSATION MEMORY & CONTEXT (FIXED)\n');
  
  const tests = [
    {
      message: "hi what's happening with bitcoin?",
      expect: "Should give BTC analysis with current price and show chart automatically",
      validate: (response) => {
        const hasPrice = response.response.includes('$');
        const hasChart = response.needsChart === true || (response.chartData && Object.keys(response.chartData).length > 0);
        console.log(`  ✓ Has price: ${hasPrice}`);
        console.log(`  ✓ Shows chart: ${hasChart}`);
        console.log(`  ✓ Response length: ${response.response.length} chars`);
        return hasPrice && hasChart;
      }
    },
    {
      message: "show me the chart",
      expect: "Should acknowledge chart was already shown OR show it briefly without full analysis",
      validate: (response) => {
        const responseText = response.response.toLowerCase();
        const fullResponse = JSON.stringify(response).toLowerCase();
        
        // Check if it acknowledges the chart was shown
        const acknowledges = 
          responseText.includes('already') || 
          responseText.includes('above') ||
          responseText.includes('just') ||
          responseText.includes('here\'s the chart') ||
          responseText.includes('sure');
          
        // Check if response is significantly shorter than first response (not repeating everything)
        const isShort = response.response.length < 1000;
        
        // Check if it's NOT repeating the exact same analysis
        const notRepeating = !responseText.includes('testing psychological');
        
        console.log(`  ✓ Acknowledges or brief: ${acknowledges}`);
        console.log(`  ✓ Short response (<1000 chars): ${isShort} (${response.response.length} chars)`);
        console.log(`  ✓ Not repeating analysis: ${notRepeating}`);
        
        // Pass if it either acknowledges OR gives a short response without repeating
        return (acknowledges || isShort) && notRepeating;
      }
    },
    {
      message: "what about compared to gold?",
      expect: "Should reference the BTC price already discussed and compare to gold",
      validate: (response) => {
        const responseText = response.response.toLowerCase();
        const referencesBTC = responseText.includes('btc') || responseText.includes('bitcoin');
        const mentionsGold = responseText.includes('gold') || responseText.includes('gc');
        // Don't repeat the exact same BTC price analysis
        const contextual = !responseText.includes('testing psychological');
        console.log(`  ✓ References BTC: ${referencesBTC}`);
        console.log(`  ✓ Mentions gold: ${mentionsGold}`);
        console.log(`  ✓ Contextual (not repeating): ${contextual}`);
        return referencesBTC && mentionsGold && contextual;
      }
    },
    {
      message: "how has oil performed this month?",
      expect: "Should switch context smoothly to oil without mentioning BTC",
      validate: (response) => {
        const responseText = response.response.toLowerCase();
        const talksOil = responseText.includes('oil') || responseText.includes('crude') || responseText.includes('cl') || responseText.includes('wti');
        const noBTC = !responseText.includes('bitcoin') && !responseText.includes('btc');
        console.log(`  ✓ Discusses oil: ${talksOil}`);
        console.log(`  ✓ No BTC mention: ${noBTC}`);
        return talksOil && noBTC;
      }
    },
    {
      message: "longer term trend?",
      expect: "Should understand this refers to oil (last topic) and be honest about data limitations",
      validate: (response) => {
        const responseText = response.response.toLowerCase();
        // Should reference oil/crude/CL/WTI since that was the last topic
        const contextual = 
          responseText.includes('oil') || 
          responseText.includes('crude') || 
          responseText.includes('cl') || 
          responseText.includes('wti') ||
          responseText.includes('energy'); // Sometimes refers to energy sector
          
        // Should mention data limitations
        const honest = 
          responseText.includes('30 day') || 
          responseText.includes('month') || 
          responseText.includes('available data') ||
          responseText.includes('historical data') ||
          responseText.includes('limited');
          
        console.log(`  ✓ Contextual to oil: ${contextual}`);
        console.log(`  ✓ Honest about limits: ${honest}`);
        
        // Show what it's actually talking about if not oil
        if (!contextual) {
          console.log(`  ⚠️  Response seems to be about: ${responseText.substring(0, 100)}...`);
        }
        
        return contextual && honest;
      }
    }
  ];

  let passed = 0;
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`\n${'='.repeat(60)}`);
    console.log(`Test ${i + 1}: "${test.message}"`);
    console.log(`Expect: ${test.expect}`);
    
    try {
      const response = await sendMessage(test.message);
      console.log('Response preview:', response.response.substring(0, 150) + '...');
      
      if (test.validate(response)) {
        console.log('  ✅ PASSED');
        passed++;
      } else {
        console.log('  ❌ FAILED');
      }
    } catch (error) {
      console.log('  ❌ ERROR:', error.message);
    }
    
    // Wait between messages to simulate real conversation
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  console.log(`\n${'='.repeat(60)}`);
  console.log(`📊 FINAL RESULTS: ${passed}/${tests.length} tests passed`);
  
  // Provide analysis
  console.log('\n📋 ANALYSIS:');
  if (passed < 2) {
    console.log('❌ CRITICAL: Bot has no conversation memory - repeating same responses');
  } else if (passed < 4) {
    console.log('⚠️  WARNING: Bot has partial memory but context switching needs work');
  } else {
    console.log('✅ GOOD: Bot maintains conversation context well');
  }
  
  return passed === tests.length;
}

testConversationMemory().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
