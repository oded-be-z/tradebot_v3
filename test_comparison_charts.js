const axios = require('axios');
const fs = require('fs');

const API_URL = 'http://localhost:3000/api/chat';
const SESSION_URL = 'http://localhost:3000/api/session/init';

async function testComparisonChart(query, expectedSymbols, testName, sessionId) {
    console.log(`\n=== Testing: ${testName} ===`);
    console.log(`Query: "${query}"`);
    console.log(`Expected symbols: ${expectedSymbols.join(', ')}`);
    
    try {
        const response = await axios.post(API_URL, {
            message: query,
            sessionId: sessionId,
            conversationHistory: []
        });
        
        const data = response.data;
        console.log(`Response: ${data.response.substring(0, 100)}...`);
        console.log(`Intent: ${data.type}`);
        console.log(`Symbols detected: ${data.symbols?.join(', ') || 'none'}`);
        console.log(`Show chart: ${data.showChart}`);
        console.log(`Has chart data: ${!!data.chartUrl}`);
        
        // Validate comparison chart generation
        if (data.type === 'comparison_query') {
            if (data.symbols && data.symbols.length > 1) {
                console.log(`✅ SUCCESS: Comparison query detected with multiple symbols`);
            } else {
                console.log(`❌ FAIL: Comparison query but only ${data.symbols?.length || 0} symbols`);
            }
        } else {
            console.log(`❌ FAIL: Not detected as comparison query (type: ${data.type})`);
        }
        
        // Save response for debugging
        fs.writeFileSync(`test_comparison_${testName.replace(/\s+/g, '_')}.json`, JSON.stringify(data, null, 2));
        
        return data;
    } catch (error) {
        console.error(`❌ ERROR: ${error.message}`);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
        return null;
    }
}

async function runTests() {
    console.log('Starting comparison chart tests...');
    
    // Create session first
    const sessionResp = await axios.post(SESSION_URL);
    const sessionId = sessionResp.data.sessionId;
    console.log(`Session created: ${sessionId}`);
    
    // Test 1: Direct comparison query
    await testComparisonChart(
        "bitcoin vs gold",
        ["BTC", "GOLD"],
        "Direct Comparison",
        sessionId
    );
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 2: Compare command
    await testComparisonChart(
        "compare tesla to apple",
        ["TSLA", "AAPL"],
        "Compare Command",
        sessionId
    );
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 3: Question format comparison
    await testComparisonChart(
        "oil vs silver?",
        ["CL", "SI"],
        "Question Comparison",
        sessionId
    );
    
    // Wait between tests
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    // Test 4: Context-based comparison
    const contextTest = await axios.post(API_URL, {
        message: "show me bitcoin",
        sessionId: sessionId,
        conversationHistory: []
    });
    
    await new Promise(resolve => setTimeout(resolve, 2000));
    
    await axios.post(API_URL, {
        message: "compare it to gold",
        sessionId: sessionId,
        conversationHistory: [{
            role: 'user',
            content: 'show me bitcoin',
            symbols: ['BTC']
        }, {
            role: 'assistant',
            content: contextTest.data.response,
            symbols: ['BTC']
        }],
        conversationState: {
            lastDiscussedSymbol: 'BTC',
            conversationFlow: {
                lastDiscussedSymbol: 'BTC'
            }
        }
    }).then(response => {
        console.log(`\n=== Testing: Context-based Comparison ===`);
        console.log(`Query: "compare it to gold" (after Bitcoin discussion)`);
        console.log(`Response: ${response.data.response.substring(0, 100)}...`);
        console.log(`Intent: ${response.data.type}`);
        console.log(`Symbols: ${response.data.symbols?.join(', ') || 'none'}`);
        console.log(`Show chart: ${response.data.showChart}`);
        
        if (response.data.type === 'comparison_query' && response.data.symbols?.length > 1) {
            console.log(`✅ SUCCESS: Context-based comparison working`);
        } else {
            console.log(`❌ FAIL: Context not properly used for comparison`);
        }
        
        fs.writeFileSync('test_comparison_context.json', JSON.stringify(response.data, null, 2));
    });
    
    console.log('\n=== All tests completed ===');
}

// Run the tests
runTests().catch(console.error);