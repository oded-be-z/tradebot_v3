// Test how Express handles undefined values
const express = require('express');
const app = express();

app.get('/test', (req, res) => {
    const payload = {
        defined: 'value',
        undefinedField: undefined,
        nullField: null,
        emptyArray: [],
        falseField: false
    };
    
    console.log('Payload before res.json:', payload);
    console.log('Keys:', Object.keys(payload));
    
    res.json(payload);
});

const server = app.listen(4000, () => {
    console.log('Test server running on port 4000');
    
    // Make a request to test
    const http = require('http');
    
    http.get('http://localhost:4000/test', (res) => {
        let data = '';
        res.on('data', chunk => data += chunk);
        res.on('end', () => {
            console.log('\nResponse received:');
            console.log(data);
            const parsed = JSON.parse(data);
            console.log('\nParsed keys:', Object.keys(parsed));
            console.log('Has undefinedField:', 'undefinedField' in parsed);
            
            server.close();
        });
    });
});