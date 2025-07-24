// Test Azure OpenAI response format directly
const azureOpenAI = require('./services/azureOpenAI');

async function testAzureDirect() {
  console.log('🧪 Testing Azure OpenAI Direct Response\n');
  
  const messages = [
    { 
      role: "system", 
      content: "You are FinanceBot Pro. MANDATORY: Use 📊 emojis, bold **text**, and bullet points •. End with 'Want me to'."
    },
    { 
      role: "user", 
      content: `Query: "AAPL price"
      
      Required JSON format:
      {
        "response": "📊 **AAPL** analysis here",
        "symbol": "AAPL",
        "symbols": ["AAPL"],
        "showChart": true,
        "suggestions": ["action1", "action2"]
      }`
    }
  ];
  
  try {
    const response = await azureOpenAI.makeRequest(messages, 0.9, 300);
    console.log('Raw Azure Response:');
    console.log(response);
    console.log('\n📊 Analysis:');
    
    // Try to parse as JSON
    try {
      const parsed = JSON.parse(response);
      console.log('✅ JSON parsing successful');
      console.log('Response field:', parsed.response);
      
      // Check if Azure followed instructions
      const hasEmojis = /[📊📈📉💰🎯⚠️🔍🔥]/.test(parsed.response || '');
      const hasBold = /\*\*.*\*\*/.test(parsed.response || '');
      const hasWantMeTo = /want me to/i.test(parsed.response || '');
      
      console.log(`- Azure used emojis: ${hasEmojis ? '✅' : '❌'}`);
      console.log(`- Azure used bold: ${hasBold ? '✅' : '❌'}`);
      console.log(`- Azure used "Want me to": ${hasWantMeTo ? '✅' : '❌'}`);
      
    } catch (parseError) {
      console.log('❌ JSON parsing failed:', parseError.message);
      console.log('Response is not valid JSON');
    }
    
  } catch (error) {
    console.error('❌ Azure request failed:', error.message);
  }
}

testAzureDirect();