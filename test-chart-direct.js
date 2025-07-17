// Direct test of chart generation functionality
const chartGenerator = require('./services/chartGenerator');

async function testChartGenerationDirect() {
  console.log('🧪 Testing Chart Generation Direct...\n');
  
  try {
    // Test 1: Single asset chart
    console.log('📊 Test 1: Bitcoin chart generation');
    const btcChart = await chartGenerator.generateSmartChart('BTC', 'price');
    
    if (btcChart) {
      console.log('✅ BTC chart generated successfully');
      console.log(`   Type: ${btcChart.type}`);
      console.log(`   Symbol: ${btcChart.symbol}`);
      console.log(`   Chart Type: ${btcChart.chartType}`);
      console.log(`   Image URL length: ${btcChart.imageUrl ? btcChart.imageUrl.length : 0}`);
      console.log(`   Image format: ${btcChart.imageUrl ? btcChart.imageUrl.substring(0, 30) : 'None'}`);
    } else {
      console.log('❌ BTC chart generation failed');
    }
    
    console.log('');
    
    // Test 2: Comparison chart
    console.log('📊 Test 2: Gold vs Silver comparison chart');
    const mockData1 = chartGenerator.generateMockChartData('GC', 'price');
    const mockData2 = chartGenerator.generateMockChartData('SI', 'price');
    
    const comparisonChart = await chartGenerator.generateComparisonChart(['GC', 'SI'], [mockData1, mockData2]);
    
    if (comparisonChart) {
      console.log('✅ Comparison chart generated successfully');
      console.log(`   Type: ${comparisonChart.type}`);
      console.log(`   Symbols: ${comparisonChart.symbols ? comparisonChart.symbols.join(', ') : 'None'}`);
      console.log(`   Chart Type: ${comparisonChart.chartType}`);
      console.log(`   Image URL length: ${comparisonChart.imageUrl ? comparisonChart.imageUrl.length : 0}`);
      console.log(`   Title: ${comparisonChart.title}`);
    } else {
      console.log('❌ Comparison chart generation failed');
    }
    
    console.log('');
    
    // Test 3: Portfolio chart
    console.log('📊 Test 3: Portfolio allocation chart');
    const portfolioData = {
      allocation: [
        { symbol: 'AAPL', percent: 30 },
        { symbol: 'MSFT', percent: 25 },
        { symbol: 'GOOGL', percent: 20 },
        { symbol: 'BTC', percent: 15 },
        { symbol: 'GC', percent: 10 }
      ]
    };
    
    const portfolioChart = await chartGenerator.generatePortfolioChart(portfolioData);
    
    if (portfolioChart) {
      console.log('✅ Portfolio chart generated successfully');
      console.log(`   Type: ${portfolioChart.type}`);
      console.log(`   Chart Type: ${portfolioChart.chartType}`);
      console.log(`   Image URL length: ${portfolioChart.imageUrl ? portfolioChart.imageUrl.length : 0}`);
      console.log(`   Title: ${portfolioChart.title}`);
    } else {
      console.log('❌ Portfolio chart generation failed');
    }
    
    console.log('');
    
    // Test 4: Mock data generation
    console.log('📊 Test 4: Mock data generation');
    const mockData = chartGenerator.generateMockChartData('AAPL', 'price');
    
    if (mockData && mockData.prices && mockData.dates) {
      console.log('✅ Mock data generated successfully');
      console.log(`   Symbol: ${mockData.symbol}`);
      console.log(`   Data points: ${mockData.prices.length}`);
      console.log(`   Date range: ${mockData.dates[0]} to ${mockData.dates[mockData.dates.length - 1]}`);
      console.log(`   Price range: $${Math.min(...mockData.prices).toFixed(2)} - $${Math.max(...mockData.prices).toFixed(2)}`);
    } else {
      console.log('❌ Mock data generation failed');
    }
    
    console.log('\n🎯 Direct chart generation testing completed!');
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
    console.error('Stack:', error.stack);
  }
}

// Run the test
testChartGenerationDirect();