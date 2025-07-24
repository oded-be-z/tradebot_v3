const intelligentResponse = require('./services/intelligentResponse');

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

// Disable LLM to avoid timeout
intelligentResponse.useLLM = false;

// Simple test
async function test() {
    const context = {
        sessionId: 'test_session',
        conversationHistory: []
    };
    
    try {
        console.log("Testing: what's the trend?");
        const result = await intelligentResponse.extractSymbol("what's the trend?", context);
        console.log("Result:", result);
        console.log("Expected: null");
        console.log(result === null ? "✅ PASS" : "❌ FAIL");
    } catch (error) {
        console.log("Error:", error.message);
    }
    
    process.exit(0);
}

test();