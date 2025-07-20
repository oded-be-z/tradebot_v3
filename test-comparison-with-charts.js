const axios = require('axios');

const API_URL = 'http://localhost:3000/api/chat';

async function testComparisonWithChart(query) {
  try {
    console.log(`\n🧪 Testing comparison with chart: "${query}"`);
    
    const response = await axios.post(API_URL, {
      message: query,
      sessionId: `test-chart-${Date.now()}`
    });
    
    const data = response.data;
    
    console.log('\n📊 Response Analysis:');
    console.log('Type:', data.type);
    console.log('Symbols:', data.symbols);
    console.log('Has response text:', !!data.response);
    console.log('Has chart:', !!data.chartData);
    console.log('Needs chart flag:', data.needsChart);
    console.log('Success:', data.success);
    
    // Check the response structure
    const checks = {
      hasSymbols: data.symbols && data.symbols.length >= 2,
      hasResponseText: !!data.response,
      hasChart: !!data.chartData,
      isComparisonType: data.type === 'comparison' || data.type === 'comparison_table',
      usesCorrectSymbols: data.symbols?.includes('GC') && data.symbols?.includes('SI')
    };
    
    console.log('\n✅ Structure checks:');
    Object.entries(checks).forEach(([check, passed]) => {
      console.log(`${passed ? '✓' : '✗'} ${check}`);
    });
    
    // Show formatted response preview
    if (data.response) {
      console.log('\n📄 Response preview:');
      console.log('─'.repeat(60));
      console.log(data.response.substring(0, 300) + '...');
      console.log('─'.repeat(60));
    }
    
    // Chart analysis
    if (data.chartData) {
      console.log('\n🎯 Chart Analysis:');
      console.log('Chart type:', typeof data.chartData);
      console.log('Chart size (bytes):', data.chartData.length);
      console.log('Is base64:', data.chartData.startsWith('data:image/'));
      console.log('✅ CHART GENERATED SUCCESSFULLY!');
    } else {
      console.log('\n❌ NO CHART GENERATED');
      if (data.metadata) {
        console.log('Metadata:', JSON.stringify(data.metadata, null, 2));
      }
    }
    
    // Overall assessment
    const allPassed = Object.values(checks).every(v => v) && data.chartData;
    if (allPassed) {
      console.log('\n🎉 SUCCESS: Complete comparison with chart!');
    } else {
      console.log('\n❌ FAIL: Missing components');
    }
    
    return allPassed;
  } catch (error) {
    console.log(`\n❌ ERROR: ${error.message}`);
    if (error.response?.data) {
      console.log('Error details:', error.response.data);
    }
    return false;
  }
}

async function runComparisonTests() {
  console.log('🚀 Testing Complete Comparison Flow with Charts\n');
  
  const testQueries = [
    'compare gold and silver',
    'gold vs silver', 
    'GC vs SI',
    'compare AAPL and MSFT'
  ];
  
  let passed = 0;
  let failed = 0;
  
  for (const query of testQueries) {
    const success = await testComparisonWithChart(query);
    if (success) passed++;
    else failed++;
    
    // Wait between requests
    await new Promise(resolve => setTimeout(resolve, 3000));
  }
  
  console.log('\n\n📊 Final Results:');
  console.log('================');
  console.log(`Total tests: ${testQueries.length}`);
  console.log(`Passed: ${passed}`);
  console.log(`Failed: ${failed}`);
  
  if (failed > 0) {
    console.log('\n🔧 Troubleshooting:');
    console.log('1. Check server logs for chart generation errors');
    console.log('2. Verify comparison case is handled in server.js');
    console.log('3. Ensure chartGenerator.generateComparisonChart works');
    console.log('4. Check historical data fetching for symbols');
    console.log('5. Verify response.needsChart is set to true');
  } else {
    console.log('\n🎉 All tests passed! Comparisons with charts working correctly.');
  }
}

// Run the tests
runComparisonTests().catch(console.error);