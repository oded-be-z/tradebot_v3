// Raw test to check response
const http = require('http');

const data = JSON.stringify({
    message: 'Compare AAPL and MSFT',
    sessionId: 'raw_symbols_test'
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
    let responseData = '';
    
    res.on('data', (chunk) => {
        responseData += chunk;
    });
    
    res.on('end', () => {
        try {
            const parsed = JSON.parse(responseData);
            console.log('Response has symbols field:', 'symbols' in parsed);
            console.log('symbols value:', parsed.symbols);
            console.log('type value:', parsed.type);
            
            // Check if symbols appears in raw response
            const symbolsInRaw = responseData.includes('"symbols"');
            console.log('Raw response contains "symbols":', symbolsInRaw);
            
            if (symbolsInRaw) {
                // Extract the symbols part
                const match = responseData.match(/"symbols":\s*(\[[^\]]*\])/);
                if (match) {
                    console.log('Symbols in raw response:', match[1]);
                }
            }
            
        } catch (e) {
            console.error('Failed to parse response:', e.message);
            console.log('Raw response:', responseData.substring(0, 200));
        }
    });
});

req.on('error', (error) => {
    console.error('Request error:', error);
});

req.write(data);
req.end();