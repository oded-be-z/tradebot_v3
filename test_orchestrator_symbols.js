// Direct test of orchestrator to trace symbols
const dualLLMOrchestrator = require('./services/dualLLMOrchestrator');
const perplexityService = require('./services/perplexity');

// Initialize orchestrator with perplexity
dualLLMOrchestrator.setPerplexityClient(perplexityService);

async function testComparison() {
    console.log('Testing comparison query directly with orchestrator...\n');
    
    const query = "Compare AAPL and MSFT";
    const context = {
        sessionId: 'test_direct',
        conversationHistory: []
    };
    
    try {
        console.log(`Query: "${query}"`);
        const result = await dualLLMOrchestrator.processQuery(query, context);
        
        console.log('\n--- Orchestrator Result ---');
        console.log(`Response: ${result.response?.substring(0, 100)}...`);
        console.log(`Symbol: ${result.symbol}`);
        console.log(`Symbols: ${JSON.stringify(result.symbols)}`);
        console.log(`Understanding symbols: ${JSON.stringify(result.understanding?.symbols)}`);
        console.log(`Type: ${result.understanding?.intent}`);
        
        if (result.symbols && result.symbols.includes('AAPL') && result.symbols.includes('MSFT')) {
            console.log('\n✅ SUCCESS: Both symbols present in orchestrator result');
        } else {
            console.log('\n❌ FAIL: Symbols missing from orchestrator result');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
    
    process.exit(0);
}

// Run test
testComparison();