// Test Azure OpenAI synthesis directly
const azureOpenAI = require('./services/azureOpenAI');

async function testSynthesis() {
    console.log('Testing Azure OpenAI synthesis for comparison query...\n');
    
    const understanding = {
        intent: 'comparison_query',
        symbols: ['AAPL', 'MSFT']
    };
    
    const synthesisPrompt = `
Given a comparison query, create a response.

Current query intent: comparison_query
Symbols mentioned: AAPL, MSFT

CRITICAL FOR COMPARISON QUERIES:
- If intent is "comparison_query", you MUST include ALL symbols being compared in the "symbols" array
- For "Compare AAPL and MSFT", symbols should be ["AAPL", "MSFT"]
- The "symbol" field should contain the primary/first symbol
- The "symbols" array should contain ALL symbols in the comparison

User Query: "Compare AAPL and MSFT"

Required JSON format:
{
  "response": "Your natural language response here",
  "symbol": "PRIMARY_SYMBOL or null",
  "symbols": ["SYMBOL1", "SYMBOL2"] or empty array for comparison queries,
  "showChart": true/false,
  "suggestions": ["relevant", "follow-up", "questions"]
}`;

    try {
        const messages = [
            { role: "system", content: "You are Max, a financial analyst. Return valid JSON." },
            { role: "user", content: synthesisPrompt }
        ];
        
        const response = await azureOpenAI.makeRequest(messages, 0.7, 300);
        console.log('Azure raw response:', response);
        
        // Clean up response if needed
        let cleanResponse = response;
        if (response.startsWith('```json')) {
            cleanResponse = response.replace(/^```json\s*\n?/, '').replace(/\n?```\s*$/, '');
        }
        
        try {
            const parsed = JSON.parse(cleanResponse);
            console.log('\nParsed response:');
            console.log('- symbol:', parsed.symbol);
            console.log('- symbols:', JSON.stringify(parsed.symbols));
            console.log('- response preview:', parsed.response?.substring(0, 80) + '...');
            
            if (parsed.symbols && parsed.symbols.includes('AAPL') && parsed.symbols.includes('MSFT')) {
                console.log('\n✅ SUCCESS: Azure returned both symbols');
            } else {
                console.log('\n❌ FAIL: Azure did not return both symbols');
            }
        } catch (parseError) {
            console.error('Failed to parse response:', parseError.message);
        }
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

// Run test
testSynthesis();