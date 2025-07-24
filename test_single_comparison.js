// Test single comparison query
const axios = require('axios');

async function test() {
    console.log('Testing single comparison...\n');
    
    try {
        const response = await axios.post('http://localhost:3000/api/chat', {
            message: 'Compare AAPL and MSFT',
            sessionId: 'test_single_' + Date.now()
        });
        
        const data = response.data;
        console.log('Response received:');
        console.log('- success:', data.success);
        console.log('- type:', data.type);
        console.log('- symbol:', data.symbol);
        console.log('- symbols:', JSON.stringify(data.symbols));
        console.log('- response preview:', data.response?.substring(0, 80) + '...');
        
        // Check all fields
        console.log('\nAll response fields:');
        Object.keys(data).forEach(key => {
            if (key !== 'response' && key !== 'chartData') {
                console.log(`- ${key}:`, data[key]);
            }
        });
        
    } catch (error) {
        console.error('Error:', error.message);
        if (error.response) {
            console.error('Response data:', error.response.data);
        }
    }
}

test();