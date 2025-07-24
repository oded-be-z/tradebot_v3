const generator = require('./services/intelligentResponse');

async function testSymbolExtraction() {
  console.log('=== Testing Symbol Extraction ===\n');
  
  const sessionId = 'test-' + Date.now();
  
  // Test 1: Extract symbol from explicit query
  console.log('Test 1: Explicit symbol query');
  const symbol1 = await generator.extractSymbol('Show me NVDA', { sessionId });
  console.log('Query: "Show me NVDA"');
  console.log('Extracted symbol:', symbol1);
  console.log('Expected: NVDA\n');
  
  // Simulate updating conversation flow after discussing NVDA
  generator.updateConversationFlow(sessionId, {
    lastDiscussedSymbol: 'NVDA',
    lastDiscussedTopic: 'price_check'
  });
  
  // Test 2: Vague query should return last discussed symbol
  console.log('Test 2: Vague query (what\'s the trend?)');
  const symbol2 = await generator.extractSymbol("what's the trend?", { 
    sessionId,
    topic: 'AMD'  // This simulates stale context.topic
  });
  console.log('Query: "what\'s the trend?"');
  console.log('Context topic (stale): AMD');
  console.log('Extracted symbol:', symbol2);
  console.log('Expected: NVDA (from lastDiscussedSymbol)\n');
  
  // Test 3: Another vague query pattern
  console.log('Test 3: Vague query (trend?)');
  const symbol3 = await generator.extractSymbol("trend?", { 
    sessionId,
    topic: 'TSLA'  // Different stale topic
  });
  console.log('Query: "trend?"');
  console.log('Context topic (stale): TSLA');
  console.log('Extracted symbol:', symbol3);
  console.log('Expected: NVDA (from lastDiscussedSymbol)\n');
  
  // Check conversation state
  const state = generator.getConversationState(sessionId);
  console.log('Final conversation state:');
  console.log('- lastDiscussedSymbol:', state.conversationFlow.lastDiscussedSymbol);
  console.log('- discussedSymbols:', Object.keys(state.discussedSymbols));
  
  console.log('\n=== Test Summary ===');
  console.log('Test 1 passed:', symbol1 === 'NVDA' ? 'YES' : 'NO');
  console.log('Test 2 passed:', symbol2 === 'NVDA' ? 'YES' : 'NO'); 
  console.log('Test 3 passed:', symbol3 === 'NVDA' ? 'YES' : 'NO');
}

testSymbolExtraction().catch(console.error);