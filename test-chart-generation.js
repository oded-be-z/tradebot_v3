#!/usr/bin/env node

// Test script for chart generation
const http = require('http');

console.log('🧪 Testing Chart Generation System');

// Test configuration
const testCases = [
    {
        name: 'Bitcoin Trends Test',
        message: 'bitcoin trends?',
        expectedChart: true,
        description: 'Should show Bitcoin price chart'
    },
    {
        name: 'NVDA Chart Test',
        message: 'NVDA chart',
        expectedChart: true,
        description: 'Should show NVIDIA stock chart'
    },
    {
        name: 'Apple Stock Price',
        message: 'AAPL price',
        expectedChart: true,
        description: 'Should show Apple stock chart with current price'
    }
];

// Simple HTTP test function
function testChat(message) {
    return new Promise((resolve, reject) => {
        const postData = JSON.stringify({
            message: message,
            sessionId: 'test-session-' + Date.now()
        });

        const options = {
            hostname: 'localhost',
            port: 3000,
            path: '/api/chat',
            method: 'POST',
            headers: {
                'Content-Type': 'application/json',
                'Content-Length': Buffer.byteLength(postData)
            }
        };

        const req = http.request(options, (res) => {
            let data = '';
            res.on('data', (chunk) => {
                data += chunk;
            });
            res.on('end', () => {
                try {
                    const result = JSON.parse(data);
                    resolve(result);
                } catch (error) {
                    reject(new Error('Invalid JSON response: ' + error.message));
                }
            });
        });

        req.on('error', (error) => {
            reject(error);
        });

        req.write(postData);
        req.end();
    });
}

// Run tests
async function runTests() {
    console.log('📡 Starting server connection test...\n');
    
    // Test server health first
    try {
        const healthResponse = await new Promise((resolve, reject) => {
            const req = http.request({
                hostname: 'localhost',
                port: 3000,
                path: '/api/health',
                method: 'GET'
            }, (res) => {
                let data = '';
                res.on('data', (chunk) => data += chunk);
                res.on('end', () => resolve({ status: res.statusCode, data }));
            });
            req.on('error', reject);
            req.end();
        });
        
        console.log('✅ Server health check passed');
    } catch (error) {
        console.error('❌ Server health check failed:', error.message);
        console.log('💡 Make sure the server is running with: npm start');
        process.exit(1);
    }

    console.log('\n🧪 Running chart generation tests...\n');

    for (const testCase of testCases) {
        console.log(`📊 Testing: ${testCase.name}`);
        console.log(`   Message: "${testCase.message}"`);
        console.log(`   Expected: ${testCase.description}`);
        
        try {
            const response = await testChat(testCase.message);
            
            if (response.success) {
                const hasChart = !!(response.chart || response.data?.chart || response.data?.chartData);
                const chartType = response.chart?.type || response.data?.chart?.type || response.data?.chartData?.type;
                
                if (hasChart) {
                    console.log(`   ✅ PASS - Chart generated (type: ${chartType})`);
                    
                    // Check for base64 image
                    const imageUrl = response.chart?.imageUrl || response.data?.chart?.imageUrl || response.data?.chartData?.imageUrl;
                    if (imageUrl && imageUrl.startsWith('data:image/png;base64,')) {
                        console.log(`   🖼️  Base64 image detected (${imageUrl.length} chars)`);
                    } else if (response.chart?.content || response.data?.chart?.content) {
                        console.log(`   📝 ASCII fallback chart detected`);
                    } else {
                        console.log(`   ⚠️  Chart config only (no image rendering)`);
                    }
                } else {
                    console.log(`   ❌ FAIL - No chart generated`);
                }
                
                console.log(`   📄 Response content length: ${(response.data?.content || '').length} chars`);
            } else {
                console.log(`   ❌ FAIL - API error: ${response.error || 'Unknown error'}`);
            }
        } catch (error) {
            console.log(`   ❌ FAIL - Request error: ${error.message}`);
        }
        
        console.log('');
    }
    
    console.log('🏁 Chart generation tests completed!');
    console.log('\n💡 To fix chart issues:');
    console.log('   1. Check server logs for [ChartGenerator] messages');
    console.log('   2. Verify Canvas library installation');
    console.log('   3. Test with browser at http://localhost:3000');
}

// Handle process signals
process.on('SIGINT', () => {
    console.log('\n👋 Tests interrupted');
    process.exit(0);
});

// Run the tests
runTests().catch(error => {
    console.error('💥 Test runner failed:', error);
    process.exit(1);
});