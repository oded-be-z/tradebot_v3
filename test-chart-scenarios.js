const axios = require('axios');

const testScenarios = [
    // Standard analysis with chart keywords
    { query: 'show bitcoin chart', expectChart: true, description: 'Standard analysis with "chart"' },
    { query: 'bitcoin graph', expectChart: true, description: 'Standard analysis with "graph"' },
    { query: 'bitcoin price', expectChart: false, description: 'Standard analysis without chart keyword' },
    
    // Trend analysis (always has charts)
    { query: 'bitcoin trends', expectChart: true, description: 'Trend analysis' },
    { query: 'oil trend analysis', expectChart: true, description: 'Trend analysis for commodity' },
    
    // Comparisons
    { query: 'compare bitcoin vs ethereum', expectChart: false, description: 'Comparison without chart keyword' },
    { query: 'bitcoin vs ethereum chart', expectChart: true, description: 'Comparison with "chart"' },
    { query: 'show graph of bitcoin compared to gold', expectChart: true, description: 'Comparison with "graph"' },
    
    // Edge cases
    { query: 'BTC chart', expectChart: true, description: 'Symbol with chart' },
    { query: 'chart for ethereum', expectChart: true, description: 'Chart keyword at beginning' },
    { query: 'display bitcoin price chart', expectChart: true, description: 'Multiple keywords' }
];

async function testServer() {
    console.log('=== TESTING CHART GENERATION ON SERVER ===\n');
    
    const baseURL = 'http://localhost:3000';
    const sessionId = 'test-' + Date.now();
    
    try {
        for (const scenario of testScenarios) {
            console.log(`\n📊 Testing: "${scenario.query}"`);
            console.log(`   Description: ${scenario.description}`);
            console.log(`   Expected chart: ${scenario.expectChart}`);
            console.log('─'.repeat(60));
            
            try {
                const response = await axios.post(`${baseURL}/api/chat`, {
                    message: scenario.query,
                    sessionId: sessionId
                });
                
                const data = response.data;
                const hasChart = !!data.chartData;
                const chartCorrect = hasChart === scenario.expectChart;
                
                console.log(`   ✓ Response type: ${data.type || 'unknown'}`);
                console.log(`   ✓ Has chart data: ${hasChart}`);
                console.log(`   ✓ Chart expectation met: ${chartCorrect ? '✅' : '❌'}`);
                
                if (hasChart) {
                    console.log(`   ✓ Chart URL length: ${data.chartData.imageUrl?.length || 0}`);
                }
                
                if (!chartCorrect) {
                    console.log(`   ⚠️  ISSUE: Expected chart=${scenario.expectChart}, got chart=${hasChart}`);
                }
                
                // Small delay to avoid overwhelming server
                await new Promise(resolve => setTimeout(resolve, 500));
                
            } catch (error) {
                console.log(`   ❌ Error: ${error.message}`);
            }
        }
        
        console.log('\n=== SUMMARY ===');
        console.log('Check the results above for any ❌ marks indicating chart generation issues.');
        
    } catch (error) {
        console.error('Test failed:', error.message);
    }
}

// Check if server is running
axios.get('http://localhost:3000/health')
    .then(() => {
        console.log('Server is running, starting tests...\n');
        testServer();
    })
    .catch(() => {
        console.log('❌ Server is not running. Please start the server first:');
        console.log('   npm start');
    });