const request = require('supertest');
const app = require('./server');

// Test script to verify chart generation functionality
async function testChartGeneration() {
  console.log('🧪 Testing Chart Generation System...\n');
  
  try {
    // Initialize session
    const sessionRes = await request(app)
      .post('/api/session/init')
      .expect(200);
    
    const sessionId = sessionRes.body.sessionId;
    console.log(`✅ Session initialized: ${sessionId}\n`);
    
    // Test cases as specified
    const testCases = [
      {
        name: 'Bitcoin Chart',
        message: 'show bitcoin chart',
        expectedSymbol: 'BTC',
        shouldHaveChart: true
      },
      {
        name: 'Gold vs Silver Chart',
        message: 'gold vs silver chart',
        expectedSymbols: ['GC', 'SI'],
        shouldHaveChart: true,
        isComparison: true
      },
      {
        name: 'Oil Trends with Chart',
        message: 'oil trends with chart',
        expectedSymbol: 'CL',
        shouldHaveChart: true
      },
      {
        name: 'AAPL Price Chart',
        message: 'AAPL price chart',
        expectedSymbol: 'AAPL',
        shouldHaveChart: true
      },
      {
        name: 'Bitcoin without Chart keyword',
        message: 'bitcoin analysis',
        expectedSymbol: 'BTC',
        shouldHaveChart: false
      }
    ];
    
    for (const testCase of testCases) {
      console.log(`📋 Testing: ${testCase.name}`);
      console.log(`   Query: "${testCase.message}"`);
      
      const response = await request(app)
        .post('/api/chat')
        .send({ message: testCase.message, sessionId })
        .expect(200);
      
      const { success, response: botResponse, chartData, type, metadata } = response.body;
      
      // Basic response validation
      console.log(`   ✅ Response received (type: ${type})`);
      console.log(`   ✅ Success: ${success}`);
      
      // Chart validation
      if (testCase.shouldHaveChart) {
        if (chartData) {
          console.log(`   ✅ Chart data present`);
          console.log(`   ✅ Chart type: ${chartData.type || 'unknown'}`);
          
          if (chartData.imageUrl) {
            console.log(`   ✅ Image URL present: ${chartData.imageUrl.substring(0, 50)}...`);
            
            // Verify it's a proper base64 PNG
            if (chartData.imageUrl.startsWith('data:image/png;base64,')) {
              console.log(`   ✅ Valid PNG base64 image`);
            } else {
              console.log(`   ❌ Invalid image format: ${chartData.imageUrl.substring(0, 30)}`);
            }
          } else {
            console.log(`   ❌ No image URL in chart data`);
          }
          
          if (testCase.isComparison && chartData.symbols) {
            console.log(`   ✅ Comparison symbols: ${chartData.symbols.join(', ')}`);
          } else if (!testCase.isComparison && chartData.symbol) {
            console.log(`   ✅ Chart symbol: ${chartData.symbol}`);
          }
        } else {
          console.log(`   ❌ Expected chart data but none received`);
        }
      } else {
        if (chartData) {
          console.log(`   ⚠️  Unexpected chart data received`);
        } else {
          console.log(`   ✅ No chart data (as expected)`);
        }
      }
      
      // Symbol validation
      if (testCase.expectedSymbol && metadata?.symbol) {
        if (metadata.symbol === testCase.expectedSymbol) {
          console.log(`   ✅ Correct symbol detected: ${metadata.symbol}`);
        } else {
          console.log(`   ❌ Wrong symbol: expected ${testCase.expectedSymbol}, got ${metadata.symbol}`);
        }
      }
      
      // Response content validation
      if (botResponse.includes('Chart rendering available in full implementation')) {
        console.log(`   ❌ Found placeholder text in response`);
      } else {
        console.log(`   ✅ No placeholder text found`);
      }
      
      console.log(''); // Empty line for readability
    }
    
    console.log('🎯 Chart generation testing completed!\n');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    if (error.response) {
      console.error('Response:', error.response.body);
    }
  }
}

// Run the test
if (require.main === module) {
  testChartGeneration();
}

module.exports = testChartGeneration;