const axios = require('axios');

async function testSimpleContext() {
    const sessionId = `simple_test_${Date.now()}`;
    const baseURL = 'http://localhost:3000';
    
    console.log('🧪 SIMPLE CONTEXT TEST');
    console.log('Session:', sessionId);
    console.log('='*50 + '\n');
    
    async function query(message) {
        try {
            const response = await axios.post(`${baseURL}/api/chat`, {
                message: message,
                sessionId: sessionId
            });
            console.log(`Q: "${message}"`);
            console.log(`A: "${response.data.response}"`);
            console.log(`Symbol: ${response.data.symbol || 'none'}`);
            console.log('-'*30);
            return response.data;
        } catch (error) {
            console.error('Error:', error.message);
            return null;
        }
    }
    
    // Test 1: Set AMD context
    console.log('\n1️⃣ SET AMD CONTEXT');
    await query('tell me about AMD');
    
    // Test 2: Vague query should use AMD
    console.log('\n2️⃣ VAGUE QUERY (should be AMD)');
    const amdResult = await query("what's the trend?");
    
    // Test 3: Switch to NVDA
    console.log('\n3️⃣ SWITCH TO NVDA');
    await query('now tell me about NVDA');
    
    // Test 4: Vague query should now use NVDA
    console.log('\n4️⃣ VAGUE QUERY (should be NVDA)');
    const nvdaResult = await query("what's the trend?");
    
    // Results
    console.log('\n📊 RESULTS:');
    console.log('First vague query mentioned AMD:', amdResult?.response?.includes('AMD') ? '✅' : '❌');
    console.log('Second vague query mentioned NVDA:', nvdaResult?.response?.includes('NVDA') ? '✅' : '❌');
    
    if (amdResult?.response?.includes('AMD') && nvdaResult?.response?.includes('NVDA')) {
        console.log('\n✅ CONTEXT SWITCHING WORKS!');
    } else {
        console.log('\n❌ CONTEXT SWITCHING BROKEN');
    }
}

testSimpleContext().catch(console.error);