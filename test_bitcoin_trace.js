const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

// Color codes for output
const colors = {
  reset: '\x1b[0m',
  bright: '\x1b[1m',
  red: '\x1b[31m',
  green: '\x1b[32m',
  yellow: '\x1b[33m',
  blue: '\x1b[34m',
  magenta: '\x1b[35m',
  cyan: '\x1b[36m'
};

async function traceBitcoinQuery() {
  console.log(`${colors.bright}${colors.blue}=== TRACING "bitcoin?" THROUGH THE PIPELINE ===${colors.reset}`);
  console.log(`Time: ${new Date().toISOString()}\n`);
  
  const sessionId = `trace-${Date.now()}`;
  const query = 'bitcoin?';
  
  console.log(`${colors.cyan}1. SENDING QUERY: "${query}"${colors.reset}`);
  console.log(`   Session ID: ${sessionId}\n`);
  
  try {
    const startTime = Date.now();
    const response = await axios.post(`${BASE_URL}/api/chat`, {
      message: query,
      sessionId: sessionId
    }, {
      timeout: 20000 // 20 second timeout
    });
    
    const responseTime = Date.now() - startTime;
    const data = response.data;
    
    console.log(`${colors.green}2. RESPONSE RECEIVED (${responseTime}ms)${colors.reset}`);
    console.log(`   Success: ${data.success}`);
    console.log(`   Type: ${data.type}`);
    console.log(`   Symbol: ${data.symbol || 'None'}`);
    console.log(`   Has Chart Data: ${!!data.chartData}`);
    console.log(`   Show Chart: ${data.showChart}`);
    console.log(`   Suggestions: ${data.suggestions ? data.suggestions.length : 0}\n`);
    
    console.log(`${colors.cyan}3. RESPONSE CONTENT ANALYSIS${colors.reset}`);
    console.log(`   Response Type: ${typeof data.response}`);
    console.log(`   Response Length: ${data.response ? data.response.length : 0}`);
    console.log(`   Is [object Object]: ${data.response === '[object Object]'}`);
    console.log(`   Contains "unavailable": ${data.response && data.response.includes('unavailable')}`);
    console.log(`   Contains "Bitcoin": ${data.response && data.response.toLowerCase().includes('bitcoin')}`);
    console.log(`   Contains "BTC": ${data.response && data.response.includes('BTC')}\n`);
    
    console.log(`${colors.cyan}4. RESPONSE TEXT${colors.reset}`);
    console.log(`   "${data.response || 'No response'}"\n`);
    
    // Check for issues
    const issues = [];
    if (data.response === '[object Object]') {
      issues.push('Response is [object Object]');
    }
    if (data.response && data.response.includes('temporarily unavailable')) {
      issues.push('Response contains technical error message');
    }
    if (data.response && data.response.includes('\\')) {
      issues.push('Response contains escaped characters (double stringification)');
    }
    if (!data.response || data.response.length === 0) {
      issues.push('Empty response');
    }
    
    const isConversational = data.response && (
      data.response.toLowerCase().includes('bitcoin is') ||
      data.response.toLowerCase().includes('btc is') ||
      data.response.toLowerCase().includes('currently trading') ||
      data.response.toLowerCase().includes('let me check')
    );
    
    console.log(`${colors.cyan}5. QUALITY ASSESSMENT${colors.reset}`);
    console.log(`   Is Conversational: ${isConversational ? 'Yes' : 'No'}`);
    console.log(`   Issues Found: ${issues.length}`);
    if (issues.length > 0) {
      issues.forEach(issue => console.log(`     - ${issue}`));
    }
    
    // Overall result
    console.log(`\n${colors.bright}FINAL RESULT:${colors.reset}`);
    if (issues.length === 0 && isConversational) {
      console.log(`${colors.green}✅ SUCCESS - Query processed correctly!${colors.reset}`);
      console.log(`   - "bitcoin" mapped to "BTC"`);
      console.log(`   - Natural language response generated`);
      console.log(`   - No technical errors`);
      console.log(`   - Response is conversational`);
    } else {
      console.log(`${colors.red}❌ FAILED - Issues detected:${colors.reset}`);
      issues.forEach(issue => console.log(`   - ${issue}`));
      if (!isConversational) {
        console.log(`   - Response is not conversational`);
      }
    }
    
    // Save trace data
    const traceData = {
      timestamp: new Date().toISOString(),
      query,
      responseTime,
      response: data,
      issues,
      isConversational,
      success: issues.length === 0 && isConversational
    };
    
    require('fs').writeFileSync(
      'bitcoin_trace_results.json',
      JSON.stringify(traceData, null, 2)
    );
    
    console.log(`\n${colors.cyan}Trace data saved to bitcoin_trace_results.json${colors.reset}`);
    
  } catch (error) {
    console.log(`${colors.red}ERROR: ${error.message}${colors.reset}`);
    
    if (error.response) {
      console.log(`Status: ${error.response.status}`);
      console.log(`Data: ${JSON.stringify(error.response.data)}`);
    }
    
    const traceData = {
      timestamp: new Date().toISOString(),
      query,
      error: error.message,
      success: false
    };
    
    require('fs').writeFileSync(
      'bitcoin_trace_results.json',
      JSON.stringify(traceData, null, 2)
    );
  }
}

// Run the trace
traceBitcoinQuery().catch(console.error);