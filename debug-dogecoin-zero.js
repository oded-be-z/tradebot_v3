// Debug script to find where $0.00 is appearing in Dogecoin response
const axios = require('axios');

const SERVER_URL = 'http://localhost:3000';

async function debugDogecoin() {
  try {
    const response = await axios.post(`${SERVER_URL}/api/chat`, {
      message: "what's happening with dogecoin",
      sessionId: `debug-${Date.now()}`
    });

    const text = response.data.response;
    console.log('Full response:\n');
    console.log(text);
    
    console.log('\n\nSearching for $0.00 occurrences:');
    const lines = text.split('\n');
    lines.forEach((line, index) => {
      if (line.includes('$0.00')) {
        console.log(`Line ${index + 1}: ${line}`);
      }
    });
    
    // Also check for any $0 patterns
    console.log('\n\nSearching for $0 patterns:');
    lines.forEach((line, index) => {
      if (line.includes('$0') && !line.includes('$0.00')) {
        console.log(`Line ${index + 1}: ${line}`);
      }
    });
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

debugDogecoin();