// Debug test for comparison query
const dualLLMOrchestrator = require('./services/dualLLMOrchestrator');

// Create a mock perplexity client
const mockPerplexityClient = {
    getFinancialAnalysis: async (prompt, options) => {
        console.log('[Mock Perplexity] Called with prompt:', prompt.substring(0, 50) + '...');
        return {
            answer: "Mock data for testing",
            sources: []
        };
    }
};

// Set the mock client
dualLLMOrchestrator.setPerplexityClient(mockPerplexityClient);

async function test() {
    console.log('Testing orchestrator directly...\n');
    
    const result = await dualLLMOrchestrator.processQuery('Compare AAPL and MSFT', {
        sessionId: 'debug_test',
        conversationHistory: []
    });
    
    console.log('\nOrchestrator result:');
    console.log('- response preview:', result.response?.substring(0, 80) + '...');
    console.log('- symbol:', result.symbol);
    console.log('- symbols:', JSON.stringify(result.symbols));
    console.log('- understanding.symbols:', JSON.stringify(result.understanding?.symbols));
    
    process.exit(0);
}

test().catch(console.error);