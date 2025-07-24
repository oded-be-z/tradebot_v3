// test-2-portfolio-intelligence.js
const http = require('http');
const fs = require('fs');
const path = require('path');

let sessionId = `test-portfolio-${Date.now()}`;

// Create test portfolio CSV
const portfolioCSV = `symbol,shares,purchase_price
AAPL,100,150.00
MSFT,50,300.00
TSLA,25,200.00
NVDA,30,400.00
SPY,40,380.00`;

fs.writeFileSync('test-portfolio.csv', portfolioCSV);

async function uploadPortfolio() {
  return new Promise((resolve, reject) => {
    const boundary = '----FormBoundary' + Math.random().toString(36);
    const fileContent = fs.readFileSync('test-portfolio.csv');
    
    const body = `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="portfolio"; filename="test-portfolio.csv"\r\n` +
      `Content-Type: text/csv\r\n\r\n` +
      `${fileContent}\r\n` +
      `--${boundary}\r\n` +
      `Content-Disposition: form-data; name="sessionId"\r\n\r\n` +
      `${sessionId}\r\n` +
      `--${boundary}--\r\n`;
    
    const options = {
      hostname: 'localhost',
      port: 3000,
      path: '/api/portfolio/upload',
      method: 'POST',
      headers: {
        'Content-Type': `multipart/form-data; boundary=${boundary}`,
        'Content-Length': Buffer.byteLength(body)
      }
    };
    
    const req = http.request(options, (res) => {
      let data = '';
      res.on('data', chunk => data += chunk);
      res.on('end', () => {
        try {
          resolve(JSON.parse(data));
        } catch (e) {
          reject(e);
        }
      });
    });
    
    req.on('error', reject);
    req.write(body);
    req.end();
  });
}

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

async function testPortfolioIntelligence() {
  console.log('\n🧪 TEST 2: PORTFOLIO INTELLIGENCE\n');
  
  console.log('Uploading test portfolio...');
  try {
    const uploadResult = await uploadPortfolio();
    console.log('✓ Portfolio uploaded successfully');
  } catch (error) {
    console.log('Failed to upload portfolio:', error.message);
    return false;
  }
  
  await new Promise(resolve => setTimeout(resolve, 2000));
  
  const tests = [
    {
      message: "analyze my portfolio",
      expect: "Should provide detailed analysis mentioning specific holdings and percentages",
      validate: (response) => {
        const mentionsHoldings = response.response.includes('AAPL') && response.response.includes('MSFT');
        const hasPercentages = response.response.includes('%');
        const hasInsights = response.response.length > 500;
        console.log(`  ✓ Mentions holdings: ${mentionsHoldings}`);
        console.log(`  ✓ Has percentages: ${hasPercentages}`);
        console.log(`  ✓ Detailed insights: ${hasInsights}`);
        return mentionsHoldings && hasPercentages && hasInsights;
      }
    },
    {
      message: "should I sell my Tesla position?",
      expect: "Should reference user's actual TSLA holdings (25 shares) and provide personalized advice",
      validate: (response) => {
        const mentions25Shares = response.response.includes('25');
        const mentionsTSLA = response.response.includes('TSLA') || response.response.includes('Tesla');
        const personalized = response.response.includes('your') || response.response.includes('portfolio');
        console.log(`  ✓ Mentions 25 shares: ${mentions25Shares}`);
        console.log(`  ✓ References TSLA: ${mentionsTSLA}`);
        console.log(`  ✓ Personalized advice: ${personalized}`);
        return mentions25Shares && mentionsTSLA && personalized;
      }
    }
  ];

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
  
  fs.unlinkSync('test-portfolio.csv');
  
  console.log(`\n📊 Results: ${passed}/${tests.length} tests passed`);
  return passed === tests.length;
}

testPortfolioIntelligence().then(success => {
  process.exit(success ? 0 : 1);
}).catch(err => {
  console.error('Test failed:', err);
  process.exit(1);
});
