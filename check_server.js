const axios = require('axios');

async function checkServer() {
    try {
        const response = await axios.get('http://localhost:3000/api/health');
        console.log('✅ Server is running on port 3001');
        console.log('Response:', response.data);
        return true;
    } catch (error) {
        if (error.code === 'ECONNREFUSED') {
            console.log('❌ Server is not running on port 3001');
            console.log('\nTo start the server, run:');
            console.log('  npm start');
            console.log('\nThen in another terminal, run the tests:');
            console.log('  node test_comparison_charts.js');
            console.log('  node test_auto_charts.js');
        } else {
            console.log('❌ Error checking server:', error.message);
        }
        return false;
    }
}

checkServer();