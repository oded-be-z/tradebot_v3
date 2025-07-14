#!/usr/bin/env node

const EnhancedQueryAnalyzer = require('./server.js').EnhancedQueryAnalyzer || class EnhancedQueryAnalyzer {
    constructor() {
        console.log('Loading QueryAnalyzer from server...');
        // We'll test via server API calls instead
    }
};

/**
 * Test the enhanced NLP understanding improvements
 */
async function testNLPImprovements() {
    console.log('🧪 Testing FinanceBot Pro v4.0 NLP Improvements\n');
    
    const testQueries = [
        // Oil queries that were problematic
        'oil prices?',
        'what\'s up with oil?',
        'crude oil trends',
        'how is oil doing?',
        
        // Gold queries 
        'what\'s up with gold?',
        'gold prices today',
        'tell me about gold',
        
        // Bitcoin vs Ethereum
        'bitcoin vs ethereum',
        'teach me about bitcoin',
        'what about ethereum?',
        
        // Tesla stock
        'tesla stock',
        'what\'s up with tesla?',
        'nvidia trends',
        'apple performance',
        
        // Edge cases
        'brent crude',
        'wti oil',
        'btc analysis',
        'aapl trends'
    ];
    
    console.log('Testing via API calls to local server...\n');
    
    for (const query of testQueries) {
        try {
            console.log(`🔍 Testing: "${query}"`);
            
            // Make API call to test the actual implementation
            const response = await fetch('http://localhost:3000/api/chat', {
                method: 'POST',
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify({ 
                    message: query, 
                    sessionId: 'test_session_nlp',
                    testMode: true 
                })
            });
            
            if (response.ok) {
                const data = await response.json();
                if (data.success) {
                    console.log(`✅ Response received (${data.metadata?.queryType || 'unknown'} query)`);
                    console.log(`   Topic extracted: ${data.metadata?.topic || 'none'}`);
                    console.log(`   Intent: ${data.metadata?.intentClassification?.classification || 'unknown'}`);
                } else {
                    console.log(`❌ API Error: ${data.error}`);
                }
            } else {
                console.log(`❌ HTTP Error: ${response.status}`);
            }
            
        } catch (error) {
            console.log(`❌ Error testing "${query}": ${error.message}`);
        }
        
        console.log(''); // Empty line for readability
    }
    
    console.log('🎯 Test Summary:');
    console.log('- Oil queries should now map to CL (crude oil futures)');
    console.log('- Gold queries should map to GC (gold futures)');
    console.log('- Bitcoin/Ethereum should be properly detected as crypto');
    console.log('- Natural language variations should be understood');
    console.log('- Fuzzy matching should handle partial/misspelled symbols');
    console.log('\n📊 Check the console logs above for detailed symbol mappings');
}

// Manual testing without server dependency
function testSymbolMappingLogic() {
    console.log('🔧 Testing Symbol Mapping Logic Manually\n');
    
    // Simulate the symbol mappings from our enhanced QueryAnalyzer
    const symbolMappings = {
        // Commodities - Oil & Energy
        'oil': 'CL',
        'crude': 'CL', 
        'crude oil': 'CL',
        'wti': 'CL',
        'wti crude': 'CL',
        'west texas': 'CL',
        'brent': 'BZ',
        'brent crude': 'BZ',
        'gas': 'NG',
        'natural gas': 'NG',
        
        // Precious Metals
        'gold': 'GC',
        'silver': 'SI',
        'platinum': 'PL',
        'palladium': 'PA',
        'copper': 'HG',
        
        // Cryptocurrencies
        'bitcoin': 'BTC',
        'btc': 'BTC',
        'ethereum': 'ETH', 
        'eth': 'ETH',
        'dogecoin': 'DOGE',
        
        // Stocks
        'apple': 'AAPL',
        'tesla': 'TSLA',
        'nvidia': 'NVDA',
        'microsoft': 'MSFT'
    };
    
    const testCases = [
        { query: 'oil prices?', expected: 'CL' },
        { query: 'what\'s up with gold?', expected: 'GC' },
        { query: 'bitcoin vs ethereum', expected: 'BTC' }, // Should extract BTC first
        { query: 'tesla stock', expected: 'TSLA' },
        { query: 'crude oil trends', expected: 'CL' },
        { query: 'brent crude', expected: 'BZ' }
    ];
    
    console.log('Symbol Mapping Tests:');
    testCases.forEach(({ query, expected }) => {
        const lowerQuery = query.toLowerCase();
        let found = null;
        
        // Test our mapping logic
        const sortedMappings = Object.entries(symbolMappings)
            .sort((a, b) => b[0].length - a[0].length);
            
        for (const [phrase, symbol] of sortedMappings) {
            if (lowerQuery.includes(phrase)) {
                found = symbol;
                break;
            }
        }
        
        const result = found === expected ? '✅' : '❌';
        console.log(`${result} "${query}" → ${found || 'none'} (expected: ${expected})`);
    });
}

// Run tests
if (require.main === module) {
    console.log('🚀 Starting NLP Improvements Test Suite\n');
    
    // First test the logic manually
    testSymbolMappingLogic();
    console.log('\n' + '='.repeat(60) + '\n');
    
    // Then test via API if server is running
    testNLPImprovements().catch(error => {
        console.log('⚠️  Server API test failed. Make sure the server is running with: npm start');
        console.log('   Error:', error.message);
        console.log('\n✅ Manual symbol mapping tests completed above.');
    });
}

module.exports = { testNLPImprovements, testSymbolMappingLogic };