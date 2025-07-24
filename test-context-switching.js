const intelligentResponse = require('./services/intelligentResponse');
const { SessionManager } = require('./server');

// Initialize SessionManager and inject it
const sessionManager = new SessionManager();
intelligentResponse.setSessionManager(sessionManager);

async function testContextSwitching() {
  const sessionId = 'test-session-' + Date.now();
  
  // Create session first
  sessionManager.create(sessionId);
  
  console.log('\n=== Testing Context Switching ===\n');
  
  // Test 1: Ask about AMD
  console.log('Test 1: Asking about AMD...');
  const context1 = { sessionId };
  const response1 = await intelligentResponse.generateResponse('What is the price of AMD?', context1);
  console.log('Response type:', response1.type);
  console.log('Discussed symbol:', response1.conversationState?.conversationFlow?.lastDiscussedSymbol);
  console.log('---\n');
  
  // Test 2: Ask a general question (should not retain AMD)
  console.log('Test 2: Asking general question...');
  const context2 = { sessionId };
  const response2 = await intelligentResponse.generateResponse('What can you help me with?', context2);
  console.log('Response type:', response2.type);
  console.log('Last discussed symbol:', response2.conversationState?.conversationFlow?.lastDiscussedSymbol);
  console.log('Should still be AMD:', response2.conversationState?.conversationFlow?.lastDiscussedSymbol === 'AMD');
  console.log('---\n');
  
  // Test 3: Ask about NVDA (should switch context)
  console.log('Test 3: Asking about NVDA...');
  const context3 = { sessionId };
  const response3 = await intelligentResponse.generateResponse('Show me NVDA price', context3);
  console.log('Response type:', response3.type);
  console.log('Discussed symbol:', response3.conversationState?.conversationFlow?.lastDiscussedSymbol);
  console.log('Should be NVDA:', response3.conversationState?.conversationFlow?.lastDiscussedSymbol === 'NVDA');
  console.log('---\n');
  
  // Test 4: Ask "what's the trend?" (should use last discussed symbol)
  console.log('Test 4: Asking vague trend question...');
  const context4 = { sessionId };
  const response4 = await intelligentResponse.generateResponse("what's the trend?", context4);
  console.log('Response type:', response4.type);
  console.log('Symbol used:', response4.symbol);
  console.log('Should use NVDA:', response4.symbol === 'NVDA');
  console.log('---\n');
  
  // Test 5: New session - should not have any context
  console.log('Test 5: New session test...');
  const newSessionId = 'test-session-new-' + Date.now();
  sessionManager.create(newSessionId); // Create the new session
  const context5 = { sessionId: newSessionId };
  const response5 = await intelligentResponse.generateResponse("what's the trend?", context5);
  console.log('Response type:', response5.type);
  console.log('Last discussed symbol:', response5.conversationState?.conversationFlow?.lastDiscussedSymbol);
  console.log('Should be null:', response5.conversationState?.conversationFlow?.lastDiscussedSymbol === null);
  console.log('---\n');
  
  console.log('=== Context Switching Tests Complete ===\n');
  
  // Cleanup
  sessionManager.shutdown();
  
  process.exit(0);
}

testContextSwitching().catch(error => {
  console.error('Test failed:', error);
  sessionManager.shutdown();
  process.exit(1);
});