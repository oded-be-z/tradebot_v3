// Test JSON cleaning logic
const testResponse = `{
  "response": "📊 **AAPL** currently trades at $[latest_price], reflecting its latest market valuation. Key indicators suggest potential price movements based on current volume and trends. 🚀",
  "symbol": "AAPL",
  "symbols": ["AAPL"],
  "showChart": true,
  "suggestions": ["📈 Analyze technical indicators", "📉 Check earnings reports for impact"]
} Want me to?`;

console.log('🧪 Testing JSON Cleaning Logic\n');
console.log('Original Response:');
console.log(testResponse);

// Apply the cleaning logic
let cleaned = testResponse;

// Remove any text after the JSON closing brace
const lastBraceIndex = cleaned.lastIndexOf('}');
if (lastBraceIndex > -1 && lastBraceIndex < cleaned.length - 1) {
  const afterBrace = cleaned.substring(lastBraceIndex + 1).trim();
  if (afterBrace) {
    console.log(`\n🧽 Removing text after JSON: "${afterBrace}"`);
    cleaned = cleaned.substring(0, lastBraceIndex + 1);
  }
}

console.log('\nCleaned Response:');
console.log(cleaned);

// Try to parse
try {
  const parsed = JSON.parse(cleaned);
  console.log('\n✅ JSON parsing successful!');
  console.log('Response field:', parsed.response);
} catch (error) {
  console.log('\n❌ JSON parsing still failed:', error.message);
}