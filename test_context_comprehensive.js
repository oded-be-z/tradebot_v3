const axios = require('axios');
const colors = require('colors');

// Test configuration
const TEST_CONFIG = {
    baseURL: 'http://localhost:3000',
    timeout: 30000,
    delay: 1500 // delay between requests
};

// Helper function to make API requests
async function makeRequest(query, sessionId) {
    try {
        const response = await axios.post(`${TEST_CONFIG.baseURL}/api/chat`, {
            message: query,
            sessionId: sessionId
        }, {
            headers: { 'Content-Type': 'application/json' },
            timeout: TEST_CONFIG.timeout
        });
        return response.data;
    } catch (error) {
        console.error('Request failed:', error.message);
        throw error;
    }
}

// Sleep helper
function sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
}

// Test result formatter
function formatTestResult(passed, expected, actual) {
    if (passed) {
        return '✅ PASS'.green;
    } else {
        return `❌ FAIL - Expected: ${expected}, Got: ${actual}`.red;
    }
}

// Main test suite
async function runComprehensiveContextTests() {
    console.log('\n' + '='.repeat(60));
    console.log('🧪 COMPREHENSIVE CONTEXT RETENTION TEST SUITE'.cyan.bold);
    console.log('='.repeat(60) + '\n');
    
    let totalTests = 0;
    let passedTests = 0;
    
    // Test Suite 1: Basic Context Retention
    console.log('📋 Test Suite 1: Basic Context Retention'.yellow.bold);
    console.log('-'.repeat(50));
    
    const session1 = `test_basic_${Date.now()}`;
    
    // Test 1.1: Set context with AMD
    console.log('\n1.1 Setting AMD context...');
    let response = await makeRequest('What is AMD stock price?', session1);
    let pass = response.response?.includes('AMD') || response.symbol === 'AMD';
    console.log('Response:', response.response?.substring(0, 80) + '...');
    console.log('Result:', formatTestResult(pass, 'AMD mentioned', response.response?.includes('AMD')));
    totalTests++; if (pass) passedTests++;
    await sleep(TEST_CONFIG.delay);
    
    // Test 1.2: Vague query should refer to AMD
    console.log('\n1.2 Testing vague query "show me the trend"...');
    response = await makeRequest('show me the trend', session1);
    pass = response.response?.includes('AMD') || response.chartData?.symbol === 'AMD' || response.symbol === 'AMD';
    console.log('Response:', response.response?.substring(0, 80) + '...');
    console.log('Chart Symbol:', response.chartData?.symbol || 'No chart');
    console.log('Result:', formatTestResult(pass, 'AMD context', response.chartData?.symbol || response.symbol));
    totalTests++; if (pass) passedTests++;
    await sleep(TEST_CONFIG.delay);
    
    // Test 1.3: Another vague query
    console.log('\n1.3 Testing "what about the analysis?"...');
    response = await makeRequest('what about the analysis?', session1);
    pass = response.response?.includes('AMD') || response.symbol === 'AMD';
    console.log('Response:', response.response?.substring(0, 80) + '...');
    console.log('Result:', formatTestResult(pass, 'AMD context', response.response?.includes('AMD')));
    totalTests++; if (pass) passedTests++;
    await sleep(TEST_CONFIG.delay);
    
    // Test Suite 2: Context Switching
    console.log('\n\n📋 Test Suite 2: Context Switching'.yellow.bold);
    console.log('-'.repeat(50));
    
    const session2 = `test_switch_${Date.now()}`;
    
    // Test 2.1: Start with NVDA
    console.log('\n2.1 Setting NVDA context...');
    response = await makeRequest('Tell me about NVDA', session2);
    pass = response.response?.includes('NVDA') || response.symbol === 'NVDA';
    console.log('Response:', response.response?.substring(0, 80) + '...');
    console.log('Result:', formatTestResult(pass, 'NVDA mentioned', response.response?.includes('NVDA')));
    totalTests++; if (pass) passedTests++;
    await sleep(TEST_CONFIG.delay);
    
    // Test 2.2: Switch to TSLA
    console.log('\n2.2 Switching to TSLA...');
    response = await makeRequest('Now show me Tesla', session2);
    pass = response.response?.includes('TSLA') || response.response?.includes('Tesla') || response.symbol === 'TSLA';
    console.log('Response:', response.response?.substring(0, 80) + '...');
    console.log('Result:', formatTestResult(pass, 'TSLA mentioned', response.response?.includes('TSLA') || response.response?.includes('Tesla')));
    totalTests++; if (pass) passedTests++;
    await sleep(TEST_CONFIG.delay);
    
    // Test 2.3: Vague query should now refer to TSLA
    console.log('\n2.3 Testing "how is it performing?"...');
    response = await makeRequest('how is it performing?', session2);
    pass = response.response?.includes('TSLA') || response.response?.includes('Tesla') || response.symbol === 'TSLA';
    console.log('Response:', response.response?.substring(0, 80) + '...');
    console.log('Result:', formatTestResult(pass, 'TSLA context', response.response?.includes('TSLA') || response.response?.includes('Tesla')));
    totalTests++; if (pass) passedTests++;
    await sleep(TEST_CONFIG.delay);
    
    // Test Suite 3: Complex Queries
    console.log('\n\n📋 Test Suite 3: Complex Context Queries'.yellow.bold);
    console.log('-'.repeat(50));
    
    const session3 = `test_complex_${Date.now()}`;
    
    // Test 3.1: Compare two stocks
    console.log('\n3.1 Comparing AAPL and MSFT...');
    response = await makeRequest('Compare Apple and Microsoft', session3);
    pass = (response.response?.includes('AAPL') || response.response?.includes('Apple')) && 
           (response.response?.includes('MSFT') || response.response?.includes('Microsoft'));
    console.log('Response:', response.response?.substring(0, 80) + '...');
    console.log('Result:', formatTestResult(pass, 'Both stocks mentioned', pass));
    totalTests++; if (pass) passedTests++;
    await sleep(TEST_CONFIG.delay);
    
    // Test 3.2: Reference to "the first one"
    console.log('\n3.2 Testing "tell me more about the first one"...');
    response = await makeRequest('tell me more about the first one', session3);
    pass = response.response?.includes('AAPL') || response.response?.includes('Apple');
    console.log('Response:', response.response?.substring(0, 80) + '...');
    console.log('Result:', formatTestResult(pass, 'AAPL context', response.response?.includes('AAPL') || response.response?.includes('Apple')));
    totalTests++; if (pass) passedTests++;
    await sleep(TEST_CONFIG.delay);
    
    // Test 3.3: Reference to "the second one"
    console.log('\n3.3 Testing "what about the second?"...');
    response = await makeRequest('what about the second?', session3);
    pass = response.response?.includes('MSFT') || response.response?.includes('Microsoft');
    console.log('Response:', response.response?.substring(0, 80) + '...');
    console.log('Result:', formatTestResult(pass, 'MSFT context', response.response?.includes('MSFT') || response.response?.includes('Microsoft')));
    totalTests++; if (pass) passedTests++;
    await sleep(TEST_CONFIG.delay);
    
    // Test Suite 4: Crypto Context
    console.log('\n\n📋 Test Suite 4: Crypto Context'.yellow.bold);
    console.log('-'.repeat(50));
    
    const session4 = `test_crypto_${Date.now()}`;
    
    // Test 4.1: Bitcoin context
    console.log('\n4.1 Setting Bitcoin context...');
    response = await makeRequest('What is Bitcoin trading at?', session4);
    pass = response.response?.includes('BTC') || response.response?.includes('Bitcoin') || response.symbol === 'BTC';
    console.log('Response:', response.response?.substring(0, 80) + '...');
    console.log('Result:', formatTestResult(pass, 'BTC mentioned', response.response?.includes('BTC') || response.response?.includes('Bitcoin')));
    totalTests++; if (pass) passedTests++;
    await sleep(TEST_CONFIG.delay);
    
    // Test 4.2: Pronoun reference
    console.log('\n4.2 Testing "is it bullish?"...');
    response = await makeRequest('is it bullish?', session4);
    pass = response.response?.includes('BTC') || response.response?.includes('Bitcoin') || response.symbol === 'BTC';
    console.log('Response:', response.response?.substring(0, 80) + '...');
    console.log('Result:', formatTestResult(pass, 'BTC context', response.response?.includes('BTC') || response.response?.includes('Bitcoin')));
    totalTests++; if (pass) passedTests++;
    await sleep(TEST_CONFIG.delay);
    
    // Test Suite 5: Edge Cases
    console.log('\n\n📋 Test Suite 5: Edge Cases'.yellow.bold);
    console.log('-'.repeat(50));
    
    const session5 = `test_edge_${Date.now()}`;
    
    // Test 5.1: No context set yet
    console.log('\n5.1 Testing vague query with no context...');
    response = await makeRequest('show me the chart', session5);
    pass = response.response?.includes('Which') || response.response?.includes('which') || 
           response.response?.includes('specify') || response.response?.includes('What');
    console.log('Response:', response.response?.substring(0, 80) + '...');
    console.log('Result:', formatTestResult(pass, 'Asks for clarification', pass));
    totalTests++; if (pass) passedTests++;
    await sleep(TEST_CONFIG.delay);
    
    // Test 5.2: Multiple rapid context switches
    console.log('\n5.2 Testing rapid context switches...');
    await makeRequest('AAPL', session5);
    await sleep(500);
    await makeRequest('MSFT', session5);
    await sleep(500);
    await makeRequest('GOOGL', session5);
    await sleep(500);
    response = await makeRequest('current price?', session5);
    pass = response.response?.includes('GOOGL') || response.response?.includes('Google') || response.symbol === 'GOOGL';
    console.log('Response:', response.response?.substring(0, 80) + '...');
    console.log('Result:', formatTestResult(pass, 'GOOGL context (last mentioned)', response.response?.includes('GOOGL')));
    totalTests++; if (pass) passedTests++;
    
    // Summary
    console.log('\n' + '='.repeat(60));
    console.log('📊 TEST SUMMARY'.bold);
    console.log('='.repeat(60));
    console.log(`Total Tests: ${totalTests}`);
    console.log(`Passed: ${passedTests} (${((passedTests/totalTests)*100).toFixed(1)}%)`);
    console.log(`Failed: ${totalTests - passedTests}`);
    
    const overallPass = passedTests === totalTests;
    console.log('\nOverall Result:', overallPass ? 
        '✅ ALL TESTS PASSED!'.green.bold : 
        '❌ SOME TESTS FAILED'.red.bold
    );
    
    if (!overallPass) {
        console.log('\n⚠️  CONTEXT RETENTION ISSUES DETECTED'.yellow.bold);
        console.log('The system is not properly maintaining conversation context.');
        console.log('Users expect the bot to remember what they were just discussing.');
    }
    
    return { totalTests, passedTests };
}

// Run the tests
console.log('Starting Comprehensive Context Tests...');
console.log('Server URL:', TEST_CONFIG.baseURL);
console.log('');

runComprehensiveContextTests()
    .then(results => {
        console.log('\nTest execution completed.');
        process.exit(results.passedTests === results.totalTests ? 0 : 1);
    })
    .catch(error => {
        console.error('\nTest suite failed:', error);
        process.exit(1);
    });