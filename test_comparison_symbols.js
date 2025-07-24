// Test to verify comparison queries return BOTH symbols
const axios = require('axios');

const PORT = 3000;
const sessionId = `test_comparison_${Date.now()}`;

async function testComparison(query) {
    try {
        console.log(`\n📊 Testing: "${query}"`);
        
        const response = await axios.post(`http://localhost:${PORT}/api/chat`, {
            message: query,
            sessionId: sessionId
        });
        
        const data = response.data;
        console.log(`✅ Type: ${data.type}`);
        console.log(`✅ Symbol: ${data.symbol}`);
        console.log(`✅ Symbols array: ${JSON.stringify(data.symbols)}`);
        console.log(`✅ Response preview: ${data.response ? data.response.substring(0, 100) + '...' : 'No response'}`);
        
        return data;
    } catch (error) {
        console.error('❌ Request failed:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
        return null;
    }
}

async function runTests() {
    console.log('🔍 Testing comparison query symbol handling...\n');
    
    // Test 1: Direct comparison
    const result1 = await testComparison("Compare AAPL and MSFT");
    if (result1) {
        if (result1.symbols && result1.symbols.includes('AAPL') && result1.symbols.includes('MSFT')) {
            console.log('✅ PASS: Both symbols returned in symbols array');
        } else {
            console.log('❌ FAIL: Missing symbols in response');
            console.log('Expected: ["AAPL", "MSFT"]');
            console.log('Got:', result1.symbols);
        }
    }
    
    // Test 2: vs query
    const result2 = await testComparison("NVDA vs AMD performance");
    if (result2) {
        if (result2.symbols && result2.symbols.includes('NVDA') && result2.symbols.includes('AMD')) {
            console.log('✅ PASS: Both symbols returned for vs query');
        } else {
            console.log('❌ FAIL: Missing symbols in vs query');
            console.log('Expected: ["NVDA", "AMD"]');
            console.log('Got:', result2.symbols);
        }
    }
    
    // Test 3: Question comparison
    const result3 = await testComparison("How does TSLA compare to F?");
    if (result3) {
        if (result3.symbols && result3.symbols.includes('TSLA') && result3.symbols.includes('F')) {
            console.log('✅ PASS: Both symbols returned for question comparison');
        } else {
            console.log('❌ FAIL: Missing symbols in question comparison');
            console.log('Expected: ["TSLA", "F"]');
            console.log('Got:', result3.symbols);
        }
    }
    
    console.log('\n✅ Test complete!');
}

// Run tests
runTests();