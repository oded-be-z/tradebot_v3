/**
 * Test enhanced response quality and beginner-friendliness
 */

const chalk = require('chalk');
const professionalAnalysis = require('./services/professionalAnalysis');

async function testEnhancedResponses() {
  console.log(chalk.bold.blue('\n📝 TESTING ENHANCED RESPONSE QUALITY\n'));
  
  // Test data for different asset types
  const testCases = [
    {
      type: 'crypto',
      symbol: 'BTC',
      data: {
        price: 117500,
        changePercent: 3.5,
        change: 3950,
        volume: 28500000000
      }
    },
    {
      type: 'commodity',
      symbol: 'GC',
      data: {
        price: 3325.50,
        changePercent: -1.2,
        change: -40.50,
        volume: 125000,
        unit: 'oz'
      }
    },
    {
      type: 'stock',
      symbol: 'AAPL',
      data: {
        price: 210.25,
        changePercent: 2.1,
        change: 4.32,
        volume: 52000000
      }
    }
  ];
  
  for (const test of testCases) {
    console.log(chalk.bold(`\n${test.type.toUpperCase()}: ${test.symbol}\n`));
    console.log(chalk.gray('='). repeat(70));
    
    let analysis;
    switch (test.type) {
      case 'crypto':
        analysis = professionalAnalysis.generateCryptoAnalysis(test.symbol, test.data);
        break;
      case 'commodity':
        analysis = professionalAnalysis.generateCommodityAnalysis(test.symbol, test.data);
        break;
      case 'stock':
        analysis = professionalAnalysis.generateStockAnalysis(test.symbol, test.data);
        break;
    }
    
    console.log(analysis);
    console.log(chalk.gray('\n' + '='.repeat(70)));
    
    // Check response quality
    console.log(chalk.bold('\nQuality Metrics:'));
    const lines = analysis.split('\n');
    const charCount = analysis.length;
    const hasDirection = analysis.includes('Direction:');
    const hasExplanation = analysis.includes('What This Means:');
    const hasBeginnerTerms = analysis.includes('where buyers typically step in') || 
                             analysis.includes('where selling pressure');
    
    console.log(`✅ Character count: ${charCount} (was ~300, now ~${charCount})`);
    console.log(`✅ Line count: ${lines.length} (was ~10, now ~${lines.length})`);
    console.log(`${hasDirection ? '✅' : '❌'} Includes trend direction`);
    console.log(`${hasExplanation ? '✅' : '❌'} Includes "What This Means" section`);
    console.log(`${hasBeginnerTerms ? '✅' : '❌'} Uses beginner-friendly explanations`);
  }
  
  console.log(chalk.bold.blue('\n\n📊 COMPARISON: BEFORE vs AFTER\n'));
  
  console.log(chalk.bold('BEFORE (Brief):'));
  console.log(chalk.gray(`
📊 Current Price: $117,500
📈 24h Change: +3.5% ($3,950)
📍 Key Levels: Support $114,562, Resistance $120,437
`));
  
  console.log(chalk.bold('\nAFTER (Informative):'));
  console.log(chalk.gray(`
📊 Current Price: $117,500
📈 24h Change: +3.5% ($3,950)
📉 Direction: Moderate upward momentum

💡 Market Insight:
BTC is currently trading at $117,500, showing moderate upward momentum. 
This represents a significant move from yesterday's close. [Additional context...]

📍 Key Levels Explained:
• Support: $114,562 - This is the price floor where buyers typically step in
• Resistance: $120,437 - The ceiling where sellers often emerge to take profits

🎯 Trading Strategy:
[Specific actionable insights...]

💰 What This Means:
The bullish trend suggests potential for continued upside...

⚠️ Risk Factors:
[Relevant risks and disclaimers...]
`));
}

// Run the test
testEnhancedResponses().then(() => {
  console.log(chalk.gray('\n═══════════════════════════════════════════════════════════\n'));
  process.exit(0);
});