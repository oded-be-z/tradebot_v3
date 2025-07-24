const http = require('http');

const data = JSON.stringify({
  message: 'bitcoin vs gold',
  sessionId: 'test-server-symbols'
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
  
  let body = '';
  res.on('data', (chunk) => {
    body += chunk;
  });
  
  res.on('end', () => {
    try {
      const parsed = JSON.parse(body);
      console.log('\n🔍 Key Check:');
      console.log('Has "symbols" field:', 'symbols' in parsed);
      console.log('Symbols value:', parsed.symbols);
      
      // Also check metadata for symbols
      if (parsed.metadata) {
        console.log('\nMetadata symbols:', parsed.metadata.symbols);
      }
      
      // Check if symbols might be in a different location
      console.log('\n📋 All top-level keys:', Object.keys(parsed));
      
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