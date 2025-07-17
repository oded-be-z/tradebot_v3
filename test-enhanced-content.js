const professionalAnalysis = require('./services/professionalAnalysis');

// Test the enhanced content functions directly
const testData = {
  price: 210.16,
  changePercent: 0.0
};

console.log('Testing enhanced stock insight for AAPL:');
const result = professionalAnalysis.getEnhancedStockInsight('AAPL', testData, 'AI catalyst', 'outperforming', 0.2);
console.log(result);
console.log('\nLength:', result.length);
console.log('Has data points:', /\d+%|\d+B|\d+M|\d+k|\d+\.[0-9]B|tons|bps|YoY|QoQ/.test(result));