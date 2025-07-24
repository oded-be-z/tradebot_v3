const dualLLMOrchestrator = require('./services/dualLLMOrchestrator');

async function testOrchestratorDebug() {
  console.log('🔍 Testing dualLLMOrchestrator directly\n');
  
  const context = {
    sessionId: 'test-direct',
    portfolio: null,
    conversationHistory: [],
    timestamp: Date.now()
  };
  
  try {
    console.log('Testing: "what\'s the market like"');
    const result = await dualLLMOrchestrator.processQuery("what's the market like", context);
    
    console.log('Direct orchestrator result:');
    console.log(JSON.stringify({
      showChart: result.showChart,
      intent: result.understanding?.intent,
      symbols: result.understanding?.symbols,
      response: result.response.substring(0, 100) + '...'
    }, null, 2));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

testOrchestratorDebug();