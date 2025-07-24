// test-3-nlp-variety.js
const http = require('http');

let sessionId = `test-nlp-${Date.now()}`;

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

async function testNLPVariety() {
  console.log('\n🧪 TEST 3: NATURAL LANGUAGE & RESPONSE VARIETY\n');
  
  const tests = [
    {
      message: "yo what's popping with apple stock",
      expect: "Should understand casual language and respond about AAPL",
      validate: (response) => {
        const understandsApple = response.response.includes('AAPL') || response.response.includes('Apple');
        const notConfused = !response.response.includes('fruit');
        console.log(`  ✓ Understands AAPL: ${understandsApple}`);
        console.log(`  ✓ Not confused: ${notConfused}`);
        return understandsApple && notConfused;
      }
    },
    {
      message: "tesla vs nio which is better",
      expect: "Should compare both without requiring perfect grammar",
      validate: (response) => {
        const mentionsTesla = response.response.includes('TSLA') || response.response.includes('Tesla');
        const mentionsNio = response.response.includes('NIO');
        const isComparison = response.response.includes('compar') || response.response.includes('versus');
        console.log(`  ✓ Mentions Tesla: ${mentionsTesla}`);
        console.log(`  ✓ Mentions NIO: ${mentionsNio}`);
        console.log(`  ✓ Is comparison: ${isComparison}`);
        return mentionsTesla && mentionsNio && isComparison;
      }
    },
    {
      message: "crypto",
      expect: "Should understand this means Bitcoin/cryptocurrency discussion",
      validate: (response) => {
        const mentionsCrypto = response.response.toLowerCase().includes('crypto') || 
                              response.response.includes('BTC') || 
                              response.response.includes('Bitcoin');
        const appropriate = !response.response.includes("I don't understand");
        console.log(`  ✓ Discusses crypto: ${mentionsCrypto}`);
        console.log(`  ✓ Appropriate response: ${appropriate}`);
        return mentionsCrypto && appropriate;
      }
    }
  ];

  console.log('Testing response variety - asking about gold 3 times:');
  const goldResponses = [];
  for (let i = 0; i < 3; i++) {
    try {
      const response = await sendMessage("how's gold doing?");
      goldResponses.push(response.response);
      console.log(`Response ${i + 1} length: ${response.response.length} chars`);
    } catch (error) {
      console.log(`Response ${i + 1} error:`, error.message);
    }
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  const uniqueResponses = new Set(goldResponses).size;
  const hasVariety = uniqueResponses === goldResponses.length;
  console.log(`  ${hasVariety ? '✅' : '❌'} Response variety: ${uniqueResponses}/${goldResponses.length} unique`);

  let passed = 0;
  for (let i = 0; i < tests.length; i++) {
    const test = tests[i];
    console.log(`\nTest ${i + 1}: "${test.message}"`);
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
    
    await new Promise(resolve => setTimeout(resolve, 1000));
  }
  
  if (hasVariety) passed++;
  
  console.log(`\n📊 Results: ${passed}/${tests.length + 1} tests passed`);
  return passed === tests.length + 1;
}

testNLPVariety().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
