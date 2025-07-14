const axios = require('axios');

async function testQuery(query, expectedType) {
  try {
    const response = await axios.post('http://localhost:3000/api/chat', {
      message: query
    });
    const content = response.data.data.content;
    const bullets = (content.match(/•/g) || []).length;
    
    if (expectedType === 'financial' && bullets \!= 4) {
      console.log('FAIL: "' + query + '" - Expected 4 bullets, got ' + bullets);
      return false;
    } else if (expectedType === 'chart' && \!response.data.data.chartData && \!content.includes('chart') && \!content.includes('Chart')) {
      console.log('FAIL: "' + query + '" - No chart data found');
      return false;
    }
    return true;
  } catch (error) {
    console.log('ERROR: "' + query + '" - ' + error.message);
    return false;
  }
}

async function runTests() {
  console.log('Testing StockCrypto queries...');
  
  await testQuery('Tesla earnings outlook', 'financial');
  await testQuery('AMD stock performance', 'financial'); 
  await testQuery('Intel stock analysis', 'financial');
  
  console.log('\nTesting Chart queries...');
  
  await testQuery('show me Apple stock chart', 'chart');
  await testQuery('Tesla stock chart trends', 'chart');
  
  console.log('\nTesting Portfolio queries...');
  
  await testQuery('portfolio stress testing', 'financial');
  
  console.log('\nTesting Commodity queries...');
  
  await testQuery('livestock futures analysis', 'financial');
}

runTests();
