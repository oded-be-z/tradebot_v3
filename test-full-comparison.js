// Complete test of comparison chart functionality
const intelligentResponse = require('./services/intelligentResponse');
const chartGenerator = require('./services/chartGenerator');

async function testFullComparison() {
  console.log('🧪 Testing Full Comparison Chart Flow...\n');
  
  try {
    // Test 1: Symbol extraction
    console.log('1. Testing symbol extraction...');
    const query = 'gold vs silver chart';
    const symbols = intelligentResponse.extractComparisonSymbols(query);
    console.log(`   Query: "${query}"`);
    console.log(`   Extracted symbols: [${symbols.join(', ')}]`);
    
    if (symbols.length !== 2) {
      console.log('   ❌ Failed to extract 2 symbols');
      return;
    }
    console.log('   ✅ Symbol extraction successful\n');
    
    // Test 2: Generate comparison response
    console.log('2. Testing comparison response generation...');
    const context = {}; // Empty context for testing
    const comparisonResponse = await intelligentResponse.generateComparison(query, context);
    
    console.log(`   Response type: ${comparisonResponse.type}`);
    console.log(`   Symbols: [${comparisonResponse.symbols?.join(', ')}]`);
    console.log(`   Needs chart: ${comparisonResponse.needsChart}`);
    console.log(`   Has comparison data: ${!!comparisonResponse.comparisonData}`);
    
    if (!comparisonResponse.needsChart) {
      console.log('   ❌ Chart not flagged as needed');
      return;
    }
    console.log('   ✅ Comparison response generation successful\n');
    
    // Test 3: Generate chart data
    console.log('3. Testing chart generation...');
    const mockData1 = chartGenerator.generateMockChartData(symbols[0], 'comparison');
    const mockData2 = chartGenerator.generateMockChartData(symbols[1], 'comparison');
    
    const chartData = await chartGenerator.generateComparisonChart(symbols, [mockData1, mockData2]);
    
    if (chartData) {
      console.log(`   Chart type: ${chartData.type}`);
      console.log(`   Chart symbols: [${chartData.symbols?.join(', ')}]`);
      console.log(`   Image URL length: ${chartData.imageUrl?.length || 0}`);
      console.log(`   Title: ${chartData.title}`);
      console.log('   ✅ Chart generation successful\n');
    } else {
      console.log('   ❌ Chart generation failed\n');
      return;
    }
    
    // Test 4: Complete flow simulation
    console.log('4. Testing complete server flow simulation...');
    
    // Simulate the server logic
    let formattedResponse = 'Comparison response here...';
    let serverChartData = null;
    
    if (comparisonResponse.needsChart && comparisonResponse.symbols && comparisonResponse.comparisonData) {
      console.log('   Conditions met for chart generation');
      
      // Generate historical data for comparison chart
      const historicalDataArray = comparisonResponse.symbols.map(symbol => 
        chartGenerator.generateMockChartData(symbol, "comparison")
      );
      
      serverChartData = await chartGenerator.generateComparisonChart(
        comparisonResponse.symbols,
        historicalDataArray
      );
      
      if (serverChartData) {
        console.log('   ✅ Server chart generation successful');
        console.log(`   Chart data type: ${serverChartData.type}`);
        console.log(`   Image available: ${!!serverChartData.imageUrl}`);
      } else {
        console.log('   ❌ Server chart generation failed');
      }
    } else {
      console.log('   ❌ Conditions not met for chart generation');
      console.log(`      needsChart: ${comparisonResponse.needsChart}`);
      console.log(`      symbols: ${!!comparisonResponse.symbols}`);
      console.log(`      comparisonData: ${!!comparisonResponse.comparisonData}`);
    }
    
    console.log('\n🎯 Full comparison test completed!');
    
    // Final response structure
    console.log('\n📊 Final Response Structure:');
    console.log({
      success: true,
      response: formattedResponse,
      chartData: serverChartData,
      type: comparisonResponse.type,
      metadata: {
        symbols: comparisonResponse.symbols
      }
    });
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

testFullComparison();