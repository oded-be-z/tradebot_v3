const orchestrator = require('./services/dualLLMOrchestrator');

async function testOrchestratorDirectly() {
  console.log('🧪 Testing Orchestrator Directly\n');
  
  try {
    const result = await orchestrator.processQuery('bitcoin vs gold', {
      conversationHistory: []
    });
    
    console.log('📊 Orchestrator Result:');
    console.log('Response type:', typeof result.response);
    console.log('Understanding intent:', result.understanding?.intent);
    console.log('Understanding symbols:', result.understanding?.symbols);
    console.log('Result symbols:', result.symbols);
    console.log('Result symbolsUsed:', result.symbolsUsed);
    console.log('All keys:', Object.keys(result));
    
  } catch (error) {
    console.error('❌ Error:', error.message);
  }
}

testOrchestratorDirectly();