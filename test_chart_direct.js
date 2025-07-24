// Direct chart generation test
const chartGenerator = require('./services/chartGenerator');

async function testChartGeneration() {
  console.log('🧪 Testing direct chart generation for AAPL...');
  
  try {
    const chart = await chartGenerator.generateSmartChart('AAPL', 'trend');
    
    if (chart && chart.imageUrl) {
      console.log('✅ Chart generated successfully!');
      console.log(`   - Symbol: ${chart.symbol}`);
      console.log(`   - Type: ${chart.type}`);
      console.log(`   - Image size: ${chart.imageUrl.length} characters`);
      console.log(`   - Config available: ${!!chart.config}`);
    } else {
      console.log('❌ Chart generation failed - no chart returned');
    }
  } catch (error) {
    console.log(`❌ Chart generation error: ${error.message}`);
    console.log(`   Stack: ${error.stack}`);
  }
}

testChartGeneration();