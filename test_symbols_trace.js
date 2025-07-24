// Comprehensive test to trace symbols field issue
const axios = require('axios');
const fs = require('fs');

async function test() {
    console.log('Testing symbols field in comparison queries...\n');
    
    const sessionId = 'test_trace_' + Date.now();
    
    // Test 1: Direct comparison
    console.log('Test 1: Direct comparison');
    try {
        const response = await axios.post('http://localhost:3000/api/chat', {
            message: 'Compare AAPL and MSFT',
            sessionId: sessionId
        });
        
        console.log('Response status:', response.status);
        console.log('Response keys:', Object.keys(response.data));
        console.log('symbols field:', response.data.symbols);
        console.log('symbol field:', response.data.symbol);
        console.log('type field:', response.data.type);
        
        // Write response to file for inspection
        fs.writeFileSync('test_response.json', JSON.stringify(response.data, null, 2));
        console.log('\nFull response written to test_response.json');
        
        if (!response.data.symbols) {
            console.log('\n❌ FAIL: symbols field is missing from response');
        } else if (response.data.symbols.includes('AAPL') && response.data.symbols.includes('MSFT')) {
            console.log('\n✅ SUCCESS: Both symbols present');
        } else {
            console.log('\n❌ FAIL: symbols array missing expected values');
        }
        
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response error:', error.response.data);
        }
    }
}

test();