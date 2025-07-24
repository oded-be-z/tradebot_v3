// Debug test to trace the full flow
const axios = require('axios');

async function test() {
    console.log('Starting debug test...\n');
    
    try {
        // Make request with axios interceptor to log
        const instance = axios.create();
        
        // Log the request
        instance.interceptors.request.use(request => {
            console.log('REQUEST:', {
                url: request.url,
                data: request.data
            });
            return request;
        });
        
        // Log the response
        instance.interceptors.response.use(response => {
            console.log('\nRESPONSE STATUS:', response.status);
            console.log('RESPONSE DATA KEYS:', Object.keys(response.data));
            if (response.data.symbols !== undefined) {
                console.log('SYMBOLS FIELD:', response.data.symbols);
            } else {
                console.log('SYMBOLS FIELD: undefined');
            }
            return response;
        });
        
        const result = await instance.post('http://localhost:3000/api/chat', {
            message: 'Compare AAPL and MSFT',
            sessionId: 'debug_' + Date.now()
        });
        
        console.log('\nFinal check:');
        console.log('symbols in response:', result.data.symbols);
        console.log('All keys:', Object.keys(result.data));
        
    } catch (error) {
        console.error('Error:', error.message);
    }
}

test();