/**
 * Test script to verify format compliance after implementing Quick Wins
 * This tests the emergency formatter, strict prompts, and monitoring
 */

const axios = require('axios');

async function testFormatCompliance() {
  console.log('🧪 Testing Format Compliance After Quick Wins\n');
  
  const sessionId = 'format-test-' + Date.now();
  const testQueries = [
    'AAPL price',
    'Show me MSFT',
    'Compare AAPL to GOOGL',
    'What about bitcoin?',
    'Portfolio analysis',
    'Market trends today',
    'AAPL',  // Single word query
    'How is NVDA doing?',
    'Tell me about TSLA performance',
    'BTC trend analysis'
  ];
  
  let passCount = 0;
  let totalScore = 0;
  
  console.log('Testing format compliance across 10 different queries...\n');
  
  for (let i = 0; i < testQueries.length; i++) {
    const query = testQueries[i];
    console.log(`Test ${i + 1}: "${query}"`);
    
    try {
      const response = await axios.post('http://localhost:3000/api/chat', {
        message: query,
        sessionId
      });
      
      const text = response.data.response;
      console.log('Response:', text.substring(0, 150) + '...\n');
      
      // Check format compliance
      const checks = {
        hasEmoji: /[📊📈📉💰🎯⚠️🔍🔥⚔️]/.test(text),
        hasBold: /\*\*[A-Z]{1,5}\*\*/.test(text),
        hasActionable: /want me to/i.test(text),
        hasStructure: text.includes('•') || (text.includes('\n') && text.length > 50)
      };
      
      const score = Object.values(checks).filter(Boolean).length * 25;
      totalScore += score;
      
      console.log('Format Checks:');
      console.log(`  ✓ Emoji: ${checks.hasEmoji ? '✅' : '❌'}`);
      console.log(`  ✓ Bold symbols: ${checks.hasBold ? '✅' : '❌'}`);
      console.log(`  ✓ Actionable ending: ${checks.hasActionable ? '✅' : '❌'}`);
      console.log(`  ✓ Structure: ${checks.hasStructure ? '✅' : '❌'}`);
      console.log(`  Score: ${score}/100\n`);
      
      if (score === 100) passCount++;
      
      // Test repeated queries for Smart Insights
      if (i === 0) {
        console.log('🔍 Testing Smart Insights with repeated AAPL queries...');
        
        // Wait 2 seconds and query again
        await new Promise(r => setTimeout(r, 2000));
        
        for (let j = 0; j < 2; j++) {
          const insightResponse = await axios.post('http://localhost:3000/api/chat', {
            message: 'AAPL price',
            sessionId
          });
          
          const insightText = insightResponse.data.response;
          console.log(`Repeated query ${j + 2}: ${insightText.substring(0, 100)}...`);
          
          // Check for Smart Insights indicators
          if (insightText.includes('checked') || insightText.includes('ago') || insightText.includes('times')) {
            console.log('✅ Smart Insight detected!\n');
          } else {
            console.log('⚠️ No Smart Insight detected\n');
          }
        }
      }
      
    } catch (error) {
      console.error('Error:', error.response?.data?.error || error.message);
      console.log('Score: 0/100\n');
    }
    
    // Add small delay between requests
    await new Promise(r => setTimeout(r, 500));
  }
  
  // Summary
  console.log('=' .repeat(50));
  console.log('📊 SUMMARY REPORT');
  console.log('=' .repeat(50));
  console.log(`Total queries tested: ${testQueries.length}`);
  console.log(`Perfect format (100%): ${passCount}/${testQueries.length}`);
  console.log(`Average format score: ${(totalScore / testQueries.length).toFixed(1)}%`);
  console.log(`Success rate: ${((passCount / testQueries.length) * 100).toFixed(1)}%`);
  
  // Check monitoring metrics
  try {
    console.log('\n📈 Checking Format Monitor Metrics...');
    const { FormatMonitor } = require('./monitoring/FormatMonitor');
    const dashboard = FormatMonitor.generateDashboard();
    console.log('Dashboard:', JSON.stringify(dashboard, null, 2));
  } catch (error) {
    console.log('Format Monitor not available yet');
  }
  
  console.log('\n✅ Test complete!');
  
  // Success criteria
  const avgScore = totalScore / testQueries.length;
  if (avgScore >= 90) {
    console.log('🎉 EXCELLENT: Format compliance is working well!');
  } else if (avgScore >= 70) {
    console.log('⚠️ GOOD: Format compliance is improving but needs more work');
  } else {
    console.log('❌ NEEDS WORK: Format compliance is still below target');
  }
}

// Run the test
testFormatCompliance().catch(console.error);