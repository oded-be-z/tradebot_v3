const intelligentResponse = require('./services/intelligentResponse');
const chartGenerator = require('./services/chartGenerator');

async function testChartGeneration() {
    console.log('=== CHART GENERATION DEBUG TEST ===\n');
    
    const testCases = [
        { query: 'show bitcoin chart', expectedType: 'standard_analysis' },
        { query: 'bitcoin trends', expectedType: 'trend_analysis' },
        { query: 'compare bitcoin vs ethereum', expectedType: 'comparison_table' },
        { query: 'bitcoin price', expectedType: 'standard_analysis' },
        { query: 'chart for BTC', expectedType: 'standard_analysis' },
        { query: 'graph of gold prices', expectedType: 'standard_analysis' }
    ];
    
    for (const testCase of testCases) {
        console.log(`\n📊 Testing: "${testCase.query}"`);
        console.log('─'.repeat(50));
        
        try {
            // Generate response
            const response = await intelligentResponse.generateResponse(testCase.query, {});
            
            console.log(`✓ Response type: ${response.type}`);
            console.log(`✓ Expected type: ${testCase.expectedType}`);
            console.log(`✓ Type match: ${response.type === testCase.expectedType ? '✅' : '❌'}`);
            console.log(`✓ Symbol: ${response.symbol || 'N/A'}`);
            console.log(`✓ needsChart: ${response.needsChart}`);
            console.log(`✓ Has data: ${!!response.data}`);
            console.log(`✓ Has analysis: ${!!response.analysis}`);
            console.log(`✓ Has explanation: ${!!response.explanation}`);
            
            // Check if chart should be generated
            const shouldHaveChart = testCase.query.toLowerCase().includes('chart') || 
                                  testCase.query.toLowerCase().includes('graph') ||
                                  response.type === 'trend_analysis' ||
                                  response.type === 'comparison_table';
                                  
            console.log(`✓ Should have chart: ${shouldHaveChart}`);
            console.log(`✓ Chart flag correct: ${response.needsChart === shouldHaveChart ? '✅' : '❌'}`);
            
            // Try to generate chart if needed
            if (response.needsChart) {
                console.log('\n  Attempting chart generation...');
                
                let chartData = null;
                try {
                    switch (response.type) {
                        case 'standard_analysis':
                            if (response.symbol && response.data) {
                                chartData = await chartGenerator.generateSmartChart(
                                    response.symbol,
                                    'price',
                                    null,
                                    response.data.price
                                );
                            }
                            break;
                            
                        case 'trend_analysis':
                            if (response.symbol) {
                                chartData = await chartGenerator.generateSmartChart(
                                    response.symbol,
                                    'trend',
                                    null,
                                    response.currentPrice
                                );
                            }
                            break;
                            
                        case 'comparison_table':
                            if (response.symbols && response.comparisonData) {
                                const historicalDataArray = response.symbols.map((symbol, index) => {
                                    const currentPrice = response.comparisonData[index]?.price || null;
                                    return chartGenerator.generateMockChartData(symbol, 'comparison', currentPrice);
                                });
                                chartData = await chartGenerator.generateComparisonChart(
                                    response.symbols,
                                    historicalDataArray
                                );
                            }
                            break;
                    }
                    
                    if (chartData) {
                        console.log(`  ✓ Chart generated successfully`);
                        console.log(`  ✓ Chart URL length: ${chartData.imageUrl?.length || 0}`);
                    } else {
                        console.log(`  ❌ No chart data generated`);
                    }
                } catch (error) {
                    console.log(`  ❌ Chart generation error: ${error.message}`);
                }
            }
            
        } catch (error) {
            console.log(`❌ Error: ${error.message}`);
        }
    }
    
    console.log('\n=== TEST COMPLETE ===');
}

// Run the test
testChartGeneration().catch(console.error);