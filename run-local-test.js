#!/usr/bin/env node

const axios = require('axios');
const { spawn } = require('child_process');
const fs = require('fs');

class LocalTestRunner {
    constructor() {
        this.baseURL = 'http://localhost:3000';
        this.serverProcess = null;
        this.sessionId = null;
    }

    async startServer() {
        console.log('🚀 Starting TradeBot server...\n');
        
        return new Promise((resolve, reject) => {
            this.serverProcess = spawn('node', ['server.js'], {
                stdio: 'pipe',
                cwd: process.cwd()
            });

            let output = '';
            
            this.serverProcess.stdout.on('data', (data) => {
                const message = data.toString();
                output += message;
                
                if (message.includes('Ready to serve')) {
                    console.log('✅ Server started successfully!\n');
                    resolve();
                }
            });

            this.serverProcess.stderr.on('data', (data) => {
                console.error('Server error:', data.toString());
            });

            this.serverProcess.on('error', (error) => {
                reject(new Error(`Failed to start server: ${error.message}`));
            });

            // Timeout after 10 seconds
            setTimeout(() => {
                if (!output.includes('Ready to serve')) {
                    reject(new Error('Server startup timeout'));
                }
            }, 10000);
        });
    }

    async stopServer() {
        if (this.serverProcess) {
            console.log('\n🛑 Stopping server...');
            this.serverProcess.kill('SIGTERM');
            
            return new Promise((resolve) => {
                this.serverProcess.on('exit', () => {
                    console.log('✅ Server stopped');
                    resolve();
                });
                
                setTimeout(() => {
                    this.serverProcess.kill('SIGKILL');
                    resolve();
                }, 5000);
            });
        }
    }

    async initSession() {
        try {
            const response = await axios.post(`${this.baseURL}/api/session/init`);
            this.sessionId = response.data.sessionId;
            console.log(`📱 Session initialized: ${this.sessionId}\n`);
            return this.sessionId;
        } catch (error) {
            throw new Error(`Failed to initialize session: ${error.message}`);
        }
    }

    async sendChatMessage(message, description = '') {
        try {
            console.log(`💬 ${description || 'Testing'}: "${message}"`);
            
            const response = await axios.post(`${this.baseURL}/api/chat`, {
                message: message,
                sessionId: this.sessionId
            });

            if (response.data.success) {
                console.log('✅ Response:', response.data.data.content);
                
                if (response.data.chart) {
                    console.log('📊 Chart generated:', response.data.chart.title);
                }
                
                if (response.data.metadata) {
                    console.log('📋 Query type:', response.data.metadata.queryType);
                }
            } else {
                console.log('❌ Error:', response.data.error);
            }
            
            console.log('');
            return response.data;
            
        } catch (error) {
            console.error('❌ Request failed:', error.response?.data?.error || error.message);
            console.log('');
            return { success: false, error: error.message };
        }
    }

    async testHealthEndpoint() {
        try {
            console.log('🏥 Testing health endpoint...');
            const response = await axios.get(`${this.baseURL}/api/health`);
            
            if (response.data.status === 'OK') {
                console.log('✅ Health check passed');
                console.log('   - Perplexity configured:', response.data.security.perplexityConfigured);
                console.log('   - Polygon configured:', response.data.security.polygonConfigured);
                console.log('   - Alpha Vantage configured:', response.data.security.alphaVantageConfigured);
            } else {
                console.log('❌ Health check failed');
            }
            
            console.log('');
            return response.data;
        } catch (error) {
            console.error('❌ Health check failed:', error.message);
            console.log('');
            return { success: false };
        }
    }

    async runAllTests() {
        console.log('🧪 Running Real API Integration Tests\n');
        console.log('=' .repeat(50) + '\n');

        const results = [];

        // Test 1: Intel stock price query
        const test1 = await this.sendChatMessage(
            "What's Intel stock price?", 
            "Test 1: Intel Stock Price Query"
        );
        results.push({ test: 'Intel stock price', success: test1.success });

        // Test 2: INTC price shorthand
        const test2 = await this.sendChatMessage(
            "INTC price", 
            "Test 2: INTC Price Shorthand"
        );
        results.push({ test: 'INTC shorthand', success: test2.success });

        // Test 3: Non-financial query (should be handled gracefully)
        const test3 = await this.sendChatMessage(
            "What should I eat?", 
            "Test 3: Non-Financial Query"
        );
        results.push({ test: 'Non-financial query', success: test3.success });

        // Test 4: Bitcoin price
        const test4 = await this.sendChatMessage(
            "Bitcoin price", 
            "Test 4: Bitcoin Price"
        );
        results.push({ test: 'Bitcoin price', success: test4.success });

        // Test 5: Multiple stock query
        const test5 = await this.sendChatMessage(
            "Show me AAPL and MSFT prices", 
            "Test 5: Multiple Stock Query"
        );
        results.push({ test: 'Multiple stocks', success: test5.success });

        // Test 6: Ethereum price
        const test6 = await this.sendChatMessage(
            "ETH price today", 
            "Test 6: Ethereum Price"
        );
        results.push({ test: 'Ethereum price', success: test6.success });

        // Test 7: Chart request
        const test7 = await this.sendChatMessage(
            "Show TSLA chart", 
            "Test 7: Chart Request"
        );
        results.push({ test: 'Chart request', success: test7.success });

        // Test 8: Greeting
        const test8 = await this.sendChatMessage(
            "Hello", 
            "Test 8: Greeting"
        );
        results.push({ test: 'Greeting', success: test8.success });

        return results;
    }

    printResults(results) {
        console.log('=' .repeat(50));
        console.log('📊 TEST RESULTS SUMMARY');
        console.log('=' .repeat(50));

        const passed = results.filter(r => r.success).length;
        const total = results.length;

        results.forEach((result, index) => {
            const status = result.success ? '✅' : '❌';
            console.log(`${status} Test ${index + 1}: ${result.test}`);
        });

        console.log('');
        console.log(`🎯 Overall Results: ${passed}/${total} tests passed`);
        
        if (passed === total) {
            console.log('🎉 All tests passed! Your TradeBot is working with real APIs.');
        } else {
            console.log(`⚠️  ${total - passed} tests failed. Check the output above for details.`);
        }
        
        console.log('');
    }

    async run() {
        try {
            // Check if server is already running
            try {
                await axios.get(`${this.baseURL}/api/health`);
                console.log('🔗 Server already running, using existing instance\n');
            } catch (error) {
                // Server not running, start it
                await this.startServer();
            }

            // Test health endpoint
            await this.testHealthEndpoint();

            // Initialize session
            await this.initSession();

            // Run all tests
            const results = await this.runAllTests();

            // Print results
            this.printResults(results);

            // Instructions for manual testing
            console.log('🔧 Manual Testing Instructions:');
            console.log('');
            console.log('1. Server is running at http://localhost:3000');
            console.log('2. Open your browser and go to http://localhost:3000');
            console.log('3. Test these queries in the chat:');
            console.log('   - "AAPL price"');
            console.log('   - "Bitcoin today"');
            console.log('   - "Show me TSLA chart"');
            console.log('   - "What should I eat?" (should be handled gracefully)');
            console.log('');
            console.log('4. Watch for real API responses (no mocked data)');
            console.log('5. Verify guardrails reject non-financial queries politely');
            console.log('');

        } catch (error) {
            console.error('💥 Test runner failed:', error.message);
            process.exit(1);
        }
    }
}

// Run the tests if this file is executed directly
if (require.main === module) {
    const runner = new LocalTestRunner();
    
    // Handle cleanup
    process.on('SIGINT', async () => {
        console.log('\n🛑 Stopping tests...');
        await runner.stopServer();
        process.exit(0);
    });

    process.on('SIGTERM', async () => {
        await runner.stopServer();
        process.exit(0);
    });

    // Run tests
    runner.run().catch(console.error);
}

module.exports = LocalTestRunner;