// Simple test to trace symbol flow
const axios = require('axios');

const PORT = 3000;
const sessionId = `test_${Date.now()}`;

async function makeRequest(query) {
    try {
        const response = await axios.post(`http://localhost:${PORT}/api/chat`, {
            message: query,
            sessionId: sessionId
        });
        
        console.log(`\nQuery: "${query}"`);
        console.log(`Response mentions AMD: ${response.data.message.includes('AMD')}`);
        console.log(`Response mentions NVDA: ${response.data.message.includes('NVDA')}`);
        
        // Extract title if present
        const titleMatch = response.data.message.match(/"title":\s*"([^"]+)"/);
        if (titleMatch) {
            console.log(`Chart title: ${titleMatch[1]}`);
        }
        
        return response.data;
    } catch (error) {
        console.error('Request failed:', error.message);
        return null;
    }
}

async function test() {
    console.log('Testing symbol flow...\n');
    
    // Step 1: Ask about AMD
    await makeRequest("AMD price");
    
    // Step 2: Vague query - should still be AMD
    await makeRequest("what's the trend?");
    
    // Step 3: Ask about NVDA
    await makeRequest("NVDA stock");
    
    // Step 4: Vague query - should now be NVDA
    const result = await makeRequest("what's the trend?");
    
    if (result && result.message.includes('AMD') && !result.message.includes('NVDA')) {
        console.log('\n❌ FAIL: Still showing AMD data after NVDA was discussed');
    } else if (result && result.message.includes('NVDA')) {
        console.log('\n✅ PASS: Correctly showing NVDA data');
    } else {
        console.log('\n❓ UNCLEAR: Could not determine which symbol was used');
    }
}

// Start test directly
console.log('Starting test...\n');
test();