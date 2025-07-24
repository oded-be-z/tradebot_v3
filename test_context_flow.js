const axios = require('axios');
const colors = require('colors');

async function testContextFlow() {
    const sessionId = `test_context_${Date.now()}`;
    const baseURL = 'http://localhost:3000';
    console.log('\n🧪 CONTEXT FLOW TEST'.cyan.bold);
    console.log('Session ID:', sessionId.yellow);
    console.log('='*50);
    
    let allTestsPassed = true;
    
    try {
        // Test 1: Set initial context with AMD
        console.log('\n1️⃣  Setting AMD context...'.bold);
        let response = await makeRequest('tell me about AMD stock', sessionId, baseURL);
        console.log('Response:', response.response?.substring(0, 100) + '...');
        const test1Pass = response.response?.includes('AMD') || response.symbol === 'AMD';
        console.log(`Response mentions AMD: ${test1Pass ? '✅ PASS'.green : '❌ FAIL'.red}`);
        if (!test1Pass) allTestsPassed = false;
        
        // Small delay between requests
        await sleep(1000);
        
        // Test 2: Context should persist - vague query should refer to AMD
        console.log('\n2️⃣  Testing context persistence with vague query...'.bold);
        response = await makeRequest("what's the trend?", sessionId, baseURL);
        console.log('Response:', response.response?.substring(0, 100) + '...');
        console.log('Chart data symbol:', response.chartData?.symbol || 'No chart data');
        const test2Pass = response.response?.includes('AMD') || 
                          response.chartData?.symbol === 'AMD' ||
                          response.symbol === 'AMD';
        console.log(`Context retained AMD: ${test2Pass ? '✅ PASS'.green : '❌ FAIL - Chart/response should show AMD!'.red}`);
        if (!test2Pass) {
            console.log('Debug info:', {
                responseSymbol: response.symbol,
                chartSymbol: response.chartData?.symbol,
                responseContainsAMD: response.response?.includes('AMD'),
                responseContainsAAPL: response.response?.includes('AAPL')
            });
            allTestsPassed = false;
        }
        
        await sleep(1000);
        
        // Test 3: Switch context to NVDA
        console.log('\n3️⃣  Switching context to NVDA...'.bold);
        response = await makeRequest('show me NVDA analysis', sessionId, baseURL);
        console.log('Response:', response.response?.substring(0, 100) + '...');
        const test3Pass = response.response?.includes('NVDA') || response.symbol === 'NVDA';
        console.log(`Response mentions NVDA: ${test3Pass ? '✅ PASS'.green : '❌ FAIL'.red}`);
        if (!test3Pass) allTestsPassed = false;
        
        await sleep(1000);
        
        // Test 4: New context should persist - vague query should refer to NVDA
        console.log('\n4️⃣  Testing new context persistence...'.bold);
        response = await makeRequest("show me the chart", sessionId, baseURL);
        console.log('Response:', response.response?.substring(0, 100) + '...');
        console.log('Chart data symbol:', response.chartData?.symbol || 'No chart data');
        const test4Pass = response.response?.includes('NVDA') || 
                          response.chartData?.symbol === 'NVDA' ||
                          response.symbol === 'NVDA';
        console.log(`Context retained NVDA: ${test4Pass ? '✅ PASS'.green : '❌ FAIL - Chart/response should show NVDA!'.red}`);
        if (!test4Pass) {
            console.log('Debug info:', {
                responseSymbol: response.symbol,
                chartSymbol: response.chartData?.symbol,
                responseContainsNVDA: response.response?.includes('NVDA'),
                responseContainsAAPL: response.response?.includes('AAPL'),
                responseContainsAMD: response.response?.includes('AMD')
            });
            allTestsPassed = false;
        }
        
        await sleep(1000);
        
        // Test 5: Multiple symbol discussion then vague reference
        console.log('\n5️⃣  Testing multiple symbol discussion...'.bold);
        await makeRequest('compare TSLA and MSFT', sessionId, baseURL);
        await sleep(1000);
        response = await makeRequest("what's the trend for the first one?", sessionId, baseURL);
        console.log('Response:', response.response?.substring(0, 100) + '...');
        const test5Pass = response.response?.includes('TSLA');
        console.log(`Context understood "first one" as TSLA: ${test5Pass ? '✅ PASS'.green : '❌ FAIL'.red}`);
        if (!test5Pass) allTestsPassed = false;
        
        await sleep(1000);
        
        // Test 6: Pronoun reference
        console.log('\n6️⃣  Testing pronoun reference...'.bold);
        await makeRequest('tell me about Bitcoin', sessionId, baseURL);
        await sleep(1000);
        response = await makeRequest("how's it doing today?", sessionId, baseURL);
        console.log('Response:', response.response?.substring(0, 100) + '...');
        const test6Pass = response.response?.includes('BTC') || response.response?.includes('Bitcoin');
        console.log(`Context understood "it" as Bitcoin: ${test6Pass ? '✅ PASS'.green : '❌ FAIL'.red}`);
        if (!test6Pass) allTestsPassed = false;
        
    } catch (error) {
        console.error('\n❌ Test failed with error:'.red, error.message);
        if (error.response?.data) {
            console.error('Server response:', error.response.data);
        }
        allTestsPassed = false;
    }
    
    // Summary
    console.log('\n' + '='*50);
    console.log('📊 TEST SUMMARY'.bold);
    console.log(allTestsPassed ? 
        '✅ ALL TESTS PASSED!'.green.bold : 
        '❌ SOME TESTS FAILED - Context retention is broken!'.red.bold
    );
    
    if (!allTestsPassed) {
        console.log('\n⚠️  CRITICAL ISSUE DETECTED:'.yellow.bold);
        console.log('The system is not properly maintaining conversation context.');
        console.log('When users ask vague questions like "what\'s the trend?",');
        console.log('the system should refer to the last discussed symbol.');
        console.log('\nThis is a fundamental conversational AI requirement!');
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
console.log('Starting FinanceBot Pro Context Flow Test...');
console.log('Make sure the server is running on http://localhost:3000');
console.log('');

testContextFlow().catch(console.error);