const http = require('http');

const data = JSON.stringify({
  message: 'bitcoin vs gold',
  sessionId: 'test-raw-http'
});

const options = {
  hostname: 'localhost',
  port: 3000,
  path: '/api/chat',
  method: 'POST',
  headers: {
    'Content-Type': 'application/json',
    'Content-Length': data.length
  }
};

const req = http.request(options, (res) => {
  console.log('📥 Status:', res.statusCode);
  console.log('📋 Headers:', res.headers);
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    console.log('\n📄 Raw Response Body:');
    console.log(body);
    
    try {
      const parsed = JSON.parse(body);
      console.log('\n🔑 Parsed Keys:', Object.keys(parsed));
      console.log('Has symbols:', 'symbols' in parsed);
      console.log('Symbols value:', parsed.symbols);
    } catch (e) {
      console.error('Parse error:', e);
    }
  });
});

req.on('error', (e) => {
  console.error('Request error:', e);
});

req.write(data);
req.end();