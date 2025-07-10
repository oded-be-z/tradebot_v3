#!/usr/bin/env node

/**
 * Quick Chat Test - FinanceBot Pro
 * Usage: node test-chat.js "Your question here"
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';
const question = process.argv[2] || 'What is Bitcoin?';

console.log(`🤖 Testing: "${question}"`);

(async () => {
    try {
        const response = await axios.post(`${BASE_URL}/api/chat`, {
            message: question
        });

        if (response.data.success) {
            console.log('\n✅ Response received:');
            console.log(response.data.data.content);
        } else {
            console.log('\n❌ Error:', response.data.error);
        }
    } catch (error) {
        console.log('\n❌ Failed to connect:', error.message);
        console.log('Make sure the server is running with: npm start');
    }
})(); 