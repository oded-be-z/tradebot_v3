// Test the format enforcement method directly
const DualLLMOrchestrator = require('./services/dualLLMOrchestrator');

// Test format enforcement
const testResponse = "Looking at Apple (AAPL), it seems market data is currently unavailable. Would you like to explore broader trends?";

const testUnderstanding = {
  intent: 'price_query',
  symbols: ['AAPL']
};

console.log('🧪 Testing Format Enforcement\n');
console.log('Original:', testResponse);

const formatted = DualLLMOrchestrator.enforceResponseFormat(testResponse, testUnderstanding);

console.log('\nFormatted:', formatted);

// Check if formatting worked
const hasEmojis = /[📊📈📉💰🎯⚠️🔍🔥]/.test(formatted);
const hasBold = /\*\*.*\*\*/.test(formatted);
const hasWantMeTo = /want me to/i.test(formatted);

console.log('\n📊 Analysis:');
console.log(`- Contains emojis: ${hasEmojis ? '✅' : '❌'}`);
console.log(`- Contains bold formatting: ${hasBold ? '✅' : '❌'}`);
console.log(`- Contains "Want me to": ${hasWantMeTo ? '✅' : '❌'}`);

const score = [hasEmojis, hasBold, hasWantMeTo].filter(Boolean).length;
console.log(`\n🏆 Enhancement Score: ${score}/3`);

if (score >= 2) {
  console.log('✅ Format enforcement is working!');
} else {
  console.log('❌ Format enforcement needs fixing');
}