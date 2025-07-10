#!/usr/bin/env node

const MarketDataService = require('./src/knowledge/market-data-service');
const IntentClassifier = require('./src/guardrails/intent-classifier');

async function runManualTests() {
    console.log('🚀 Starting Manual Real API Tests\n');
    
    const marketService = new MarketDataService();
    const intentClassifier = new IntentClassifier();

    // Test 1: Intel stock price query
    console.log('📊 Test 1: Intel Stock Price');
    try {
        const intent1 = intentClassifier.classifyIntent("What's Intel stock price?");
        console.log('Intent Classification:', intent1);
        
        if (intent1.isFinancial) {
            const result1 = await marketService.fetchStockPrice('INTC');
            console.log('Intel (INTC) Real Price:', result1);
        }
    } catch (error) {
        console.error('Error in Test 1:', error.message);
    }
    console.log('');

    // Test 2: INTC price shorthand
    console.log('📊 Test 2: INTC Price Shorthand');
    try {
        const intent2 = intentClassifier.classifyIntent("INTC price");
        console.log('Intent Classification:', intent2);
        
        if (intent2.isFinancial) {
            const result2 = await marketService.fetchStockPrice('INTC');
            console.log('Intel (INTC) Real Price:', result2);
        }
    } catch (error) {
        console.error('Error in Test 2:', error.message);
    }
    console.log('');

    // Test 3: Non-financial query (should be rejected)
    console.log('🚫 Test 3: Non-Financial Query (Should Refuse)');
    try {
        const intent3 = intentClassifier.classifyIntent("What should I eat?");
        console.log('Intent Classification:', intent3);
        
        if (intent3.isFinancial) {
            console.log('❌ ERROR: Non-financial query was classified as financial!');
        } else {
            console.log('✅ SUCCESS: Non-financial query correctly rejected');
            console.log('Reason:', intent3.reason);
        }
    } catch (error) {
        console.error('Error in Test 3:', error.message);
    }
    console.log('');

    // Test 4: Bitcoin price
    console.log('₿ Test 4: Bitcoin Price');
    try {
        const intent4 = intentClassifier.classifyIntent("Bitcoin price");
        console.log('Intent Classification:', intent4);
        
        if (intent4.isFinancial) {
            const result4 = await marketService.fetchCryptoPrice('BTC');
            console.log('Bitcoin Real Price:', result4);
        }
    } catch (error) {
        console.error('Error in Test 4:', error.message);
    }
    console.log('');

    // Test 5: Multiple stock prices
    console.log('📈 Test 5: Multiple Stock Prices');
    try {
        const intent5 = intentClassifier.classifyIntent("Show me AAPL and MSFT prices");
        console.log('Intent Classification:', intent5);
        
        if (intent5.isFinancial) {
            const result5 = await marketService.fetchMultiplePrices(['AAPL', 'MSFT'], 'stock');
            console.log('Multiple Stock Prices:', result5);
        }
    } catch (error) {
        console.error('Error in Test 5:', error.message);
    }
    console.log('');

    // Test 6: Ethereum price
    console.log('⟠ Test 6: Ethereum Price');
    try {
        const intent6 = intentClassifier.classifyIntent("ETH price today");
        console.log('Intent Classification:', intent6);
        
        if (intent6.isFinancial) {
            const result6 = await marketService.fetchCryptoPrice('ETH');
            console.log('Ethereum Real Price:', result6);
        }
    } catch (error) {
        console.error('Error in Test 6:', error.message);
    }
    console.log('');

    // Test 7: Invalid stock symbol
    console.log('❌ Test 7: Invalid Stock Symbol');
    try {
        const intent7 = intentClassifier.classifyIntent("INVALIDXXX stock price");
        console.log('Intent Classification:', intent7);
        
        if (intent7.isFinancial) {
            const result7 = await marketService.fetchStockPrice('INVALIDXXX');
            console.log('Invalid Symbol Response:', result7);
        }
    } catch (error) {
        console.error('Error in Test 7:', error.message);
    }
    console.log('');

    console.log('✅ Manual testing completed!');
    console.log('Cache size:', marketService.getCacheSize());
}

// Run the tests
if (require.main === module) {
    runManualTests().catch(console.error);
}

module.exports = { runManualTests };