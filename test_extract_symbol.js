const intelligentResponse = require('./services/intelligentResponse');
const logger = require('./utils/logger');

// Mock SessionManager
const mockSessionManager = {
    get: (sessionId) => ({
        conversationState: {
            conversationFlow: {
                lastDiscussedSymbol: 'NVDA',
                lastIntent: null,
                lastDiscussedTopic: null
            }
        }
    })
};

// Inject the mock
intelligentResponse.setSessionManager(mockSessionManager);

// Test cases
async function runTests() {
    const testCases = [
        { query: "what's the trend?", expected: null },
        { query: "what is the trend?", expected: null },
        { query: "trend?", expected: null },
        { query: "show me the trend", expected: null },
        { query: "AMD price", expected: "AMD" },
        { query: "show me TSLA", expected: "TSLA" }
    ];
    
    console.log('Testing extractSymbol method...\n');
    
    for (const test of testCases) {
        const context = {
            sessionId: 'test_session',
            conversationHistory: []
        };
        
        try {
            const result = await intelligentResponse.extractSymbol(test.query, context);
            const passed = result === test.expected;
            
            console.log(`Query: "${test.query}"`);
            console.log(`Expected: ${test.expected}`);
            console.log(`Got: ${result}`);
            console.log(`Result: ${passed ? '✅ PASS' : '❌ FAIL'}\n`);
        } catch (error) {
            console.log(`Query: "${test.query}"`);
            console.log(`Error: ${error.message}`);
            console.log(`Result: ❌ ERROR\n`);
        }
    }
}

runTests().catch(console.error);