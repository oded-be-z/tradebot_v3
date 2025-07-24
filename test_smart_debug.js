// Debug SmartInsights integration
const axios = require('axios');
const ConversationContext = require('./services/conversationContext');

async function debugSmartInsights() {
  console.log('🔍 Debugging SmartInsights Integration\n');
  
  const sessionId = 'debug-smart-' + Date.now();
  
  // Query 1
  console.log('1️⃣ First query to establish context...');
  await axios.post('http://localhost:3000/api/chat', {
    message: 'AAPL price',
    sessionId: sessionId
  });
  
  // Check context directly
  const context1 = ConversationContext.getContext(sessionId);
  console.log('\n📋 Context after first query:');
  console.log(`   Symbols tracked: ${context1.recentSymbols.size}`);
  if (context1.recentSymbols.has('AAPL')) {
    const aapl = context1.recentSymbols.get('AAPL');
    console.log(`   AAPL data:`, {
      frequency: aapl.frequency,
      lastAskedTime: aapl.lastAskedTime ? new Date(aapl.lastAskedTime).toISOString() : 'none',
      lastPrice: aapl.lastPrice
    });
  }
  
  // Wait 3 seconds
  console.log('\n⏰ Waiting 3 seconds...\n');
  await new Promise(resolve => setTimeout(resolve, 3000));
  
  // Query 2
  console.log('2️⃣ Second query - should trigger temporal insight...');
  const response = await axios.post('http://localhost:3000/api/chat', {
    message: 'AAPL price again please',
    sessionId: sessionId
  });
  
  // Check context after second query
  const context2 = ConversationContext.getContext(sessionId);
  console.log('\n📋 Context after second query:');
  if (context2.recentSymbols.has('AAPL')) {
    const aapl = context2.recentSymbols.get('AAPL');
    console.log(`   AAPL data:`, {
      frequency: aapl.frequency,
      lastAskedTime: aapl.lastAskedTime ? new Date(aapl.lastAskedTime).toISOString() : 'none',
      lastPrice: aapl.lastPrice
    });
  }
  
  console.log('\n📝 Response preview:', response.data.response.substring(0, 150) + '...');
  
  // Check server logs for SmartInsights
  console.log('\n💡 Check server logs for:');
  console.log('   - [SmartInsights] messages');
  console.log('   - [FORMAT] messages showing Smart Insight integration');
}

debugSmartInsights().catch(console.error);