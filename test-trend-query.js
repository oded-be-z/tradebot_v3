const generator = require('./services/intelligentResponse');
const logger = require('./utils/logger');

async function testTrendQuery() {
  
  // Test scenario: First ask about NVDA, then ask "what's the trend?"
  const sessionId = 'test-session-' + Date.now();
  
  console.log('\n=== TEST 1: Ask about NVDA ===');
  const context1 = {
    sessionId: sessionId,
    conversationHistory: []
  };
  
  const response1 = await generator.generateResponse('Show me NVDA', context1);
  console.log('Response type:', response1.type);
  console.log('Symbol:', response1.symbol);
  
  // Add to conversation history
  context1.conversationHistory.push({
    role: 'user',
    content: 'Show me NVDA'
  });
  context1.conversationHistory.push({
    role: 'assistant', 
    content: JSON.stringify(response1)
  });
  
  console.log('\n=== TEST 2: Ask "what\'s the trend?" ===');
  const context2 = {
    sessionId: sessionId,
    conversationHistory: context1.conversationHistory,
    topic: 'AMD' // This simulates the issue where context.topic might be set to AMD
  };
  
  const response2 = await generator.generateResponse("what's the trend?", context2);
  console.log('Response type:', response2.type);
  console.log('Symbol:', response2.symbol);
  console.log('Expected symbol: NVDA');
  console.log('Test passed:', response2.symbol === 'NVDA' ? 'YES' : 'NO');
  
  // Check internal state
  const state = generator.getConversationState(sessionId);
  console.log('\nConversation state:', {
    lastDiscussedSymbol: state.conversationFlow.lastDiscussedSymbol,
    discussedSymbols: Object.keys(state.discussedSymbols)
  });
}

testTrendQuery().catch(console.error);