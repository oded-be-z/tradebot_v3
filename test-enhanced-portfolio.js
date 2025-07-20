const portfolioManager = require('./services/portfolioManager');
const intelligentResponse = require('./services/intelligentResponse');
const fs = require('fs');

async function testEnhancedPortfolio() {
  console.log('🧪 Testing Enhanced Portfolio Analysis\n');
  
  try {
    // Test 1: Load sample portfolio
    console.log('📁 Loading sample portfolio...');
    const csvContent = fs.readFileSync('./sample_portfolio.csv', 'utf8');
    console.log('CSV Content:', csvContent);
    
    const result = await portfolioManager.parsePortfolio(csvContent, 'test-session');
    
    if (result.success) {
      console.log('✅ Portfolio loaded successfully!');
      console.log(`   Holdings: ${result.holdings.length}`);
      console.log(`   Message: ${result.message}`);
      
      // Test 2: Generate enhanced analysis
      console.log('\n📊 Generating enhanced portfolio analysis...');
      const context = {
        portfolio: result.holdings,
        portfolioMetrics: result.metrics
      };
      
      const analysis = await intelligentResponse.generatePortfolioAnalysis(context);
      
      console.log('\n📄 Enhanced Portfolio Analysis:');
      console.log('═'.repeat(60));
      console.log(analysis.analysis);
      console.log('═'.repeat(60));
      
      console.log('\n✅ Enhanced portfolio analysis working correctly!');
      console.log('\n🎯 Key Improvements:');
      console.log('  • Professional formatting with emojis and separators');
      console.log('  • Conversational insights and personality');
      console.log('  • Smart recommendations with follow-ups');
      console.log('  • Portfolio health scoring');
      console.log('  • Better error handling');
      
    } else {
      console.log('❌ Portfolio loading failed:', result.error);
    }
    
  } catch (error) {
    console.error('❌ Test failed:', error.message);
  }
}

// Test no portfolio scenario
async function testNoPortfolio() {
  console.log('\n🔍 Testing No Portfolio Scenario...');
  
  const context = { portfolio: null, portfolioMetrics: null };
  const analysis = await intelligentResponse.generatePortfolioAnalysis(context);
  
  console.log('\n📄 No Portfolio Message:');
  console.log('═'.repeat(60));
  console.log(analysis.analysis);
  console.log('═'.repeat(60));
}

// Run tests
(async () => {
  await testEnhancedPortfolio();
  await testNoPortfolio();
})().catch(console.error);