const axios = require('axios');

async function testDetailedContext() {
    const sessionId = `test_detailed_${Date.now()}`;
    const baseURL = 'http://localhost:3000';
    
    console.log('\n🔍 DETAILED CONTEXT TEST');
    console.log('Session ID:', sessionId);
    console.log('='*50 + '\n');
    
    try {
        // Test 1: Bitcoin context
        console.log('1️⃣ Setting Bitcoin context...');
        let response = await makeRequest('tell me about Bitcoin', sessionId, baseURL);
        console.log('Full Response:', JSON.stringify(response, null, 2));
        console.log('\n');
        
        await sleep(2000);
        
        // Test 2: Pronoun reference
        console.log('2️⃣ Testing pronoun "it"...');
        response = await makeRequest("how's it doing today?", sessionId, baseURL);
        console.log('Full Response:', JSON.stringify(response, null, 2));
        console.log('\n');
        
        // Test 3: Try with explicit crypto reference
        console.log('3️⃣ Testing with "the crypto"...');
        response = await makeRequest("what's the trend for the crypto?", sessionId, baseURL);
        console.log('Full Response:', JSON.stringify(response, null, 2));
        console.log('\n');
        
        // Test 4: Direct BTC reference
        console.log('4️⃣ Testing direct BTC reference...');
        response = await makeRequest("BTC trend", sessionId, baseURL);
        console.log('Full Response:', JSON.stringify(response, null, 2));
        
    } catch (error) {
        console.error('Test failed:', error.message);
        if (error.response?.data) {
            console.error('Server response:', error.response.data);
        }
    }
}

async function makeRequest(query, sessionId, baseURL) {
    try {
        const response = await axios.post(`${baseURL}/api/chat`, {
            message: query,
            sessionId: sessionId
        }, {
            headers: {
                'Content-Type': 'application/json'
            },
            timeout: 30000
        });
        return response.data;
    } catch (error) {
        console.error('Request failed:', error.message);
        throw error;
    }
}

function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Run the test
console.log('Starting Detailed Context Test...');
testDetailedContext().catch(console.error);