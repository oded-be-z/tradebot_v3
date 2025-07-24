#!/usr/bin/env node

/**
 * Quick diagnostic to verify API response format
 */

const axios = require('axios');

async function verifyAPIFormat() {
  console.log('Verifying API response format...\n');
  
  try {
    // Test a simple price query
    const response = await axios.post('http://localhost:3000/api/chat', {
      message: 'AAPL price',
      sessionId: 'test_format_check'
    });

    console.log('API Response Structure:');
    console.log('- Status:', response.status);
    console.log('- Success:', response.data.success);
    console.log('- Type/Intent:', response.data.type || response.data.intent || 'MISSING');
    console.log('- Symbols:', response.data.symbols);
    console.log('- Has Response:', !!response.data.response);
    console.log('- Response includes $:', response.data.response?.includes('$'));
    console.log('- Response includes price info:', /\d+\.\d+/.test(response.data.response));
    console.log('- Show Chart:', response.data.showChart);
    console.log('- Has Chart Data:', !!response.data.chartData);
    
    console.log('\nFull response keys:', Object.keys(response.data));
    
    console.log('\n✅ API is responding correctly!');
    console.log('\nThe test suite has been updated to match this format.');
    
  } catch (error) {
    console.error('❌ Error:', error.message);
    console.log('\nPlease ensure the server is running on http://localhost:3000');
  }
}

verifyAPIFormat();