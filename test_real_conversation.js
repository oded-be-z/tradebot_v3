const axios = require('axios');
const fs = require('fs');

class RealWorldTester {
    constructor() {
        this.sessionId = `real_test_${Date.now()}`;
        this.baseURL = 'http://localhost:3000';
        this.results = [];
    }

    async makeRequest(message) {
        console.log(`\n👤 USER: "${message}"`);
        
        try {
            const response = await axios.post(`${this.baseURL}/api/chat`, {
                message: message,
                sessionId: this.sessionId
            });
            
            const responseText = response.data.response || 'No response';
            const hasChart = response.data.showChart || false;
            const chartSymbol = response.data.chartData?.symbol || 'NO CHART';
            
            console.log(`🤖 BOT: ${responseText}`);
            if (hasChart) {
                console.log(`📊 CHART: ${chartSymbol}`);
            }
            
            // Log full response for analysis
            this.results.push({
                query: message,
                response: responseText,
                hasChart: hasChart,
                chartSymbol: chartSymbol,
                fullData: response.data
            });
            
            return response.data;
        } catch (error) {
            console.error(`❌ ERROR: ${error.message}`);
            return null;
        }
    }

    async testExactFailureScenario() {
        console.log('\n🔴 TESTING EXACT FAILURE SCENARIO FROM SCREENSHOTS\n');
        
        // Test 1: The AMD → AAPL chart bug
        console.log('=== TEST 1: AMD Context → Chart Display ===');
        await this.makeRequest('show me AMD trend');
        const amdChart = await this.makeRequest("what's the trend?");
        
        // CRITICAL CHECK
        if (amdChart?.chartData?.symbol !== 'AMD') {
            console.error(`\n❌ CRITICAL BUG STILL EXISTS: Expected AMD chart, got ${amdChart?.chartData?.symbol}`);
        } else {
            console.log(`\n✅ AMD context retained correctly`);
        }
        
        // Test 2: Multiple context switches (from screenshots)
        console.log('\n=== TEST 2: Multiple Context Switches ===');
        await this.makeRequest('tell me about NVDA');
        await this.makeRequest('should I buy?');  // Should be about NVDA
        await this.makeRequest('show me TSLA');
        const tslaContext = await this.makeRequest("what's the trend?"); // Should show TSLA
        
        if (tslaContext?.chartData?.symbol !== 'TSLA') {
            console.error(`\n❌ Context switch failed: Expected TSLA, got ${tslaContext?.chartData?.symbol}`);
        }
        
        // Test 3: Portfolio repetition check
        console.log('\n=== TEST 3: Portfolio Analysis Variety ===');
        // Upload test portfolio first
        const portfolio1 = await this.makeRequest('analyze my portfolio');
        await new Promise(resolve => setTimeout(resolve, 2000));
        const portfolio2 = await this.makeRequest('portfolio analysis');
        
        // Check if responses are identical (bad)
        if (portfolio1?.response === portfolio2?.response) {
            console.error('\n❌ Portfolio responses are IDENTICAL - templated responses!');
        } else {
            console.log('\n✅ Portfolio responses show variety');
        }
        
        // Test 4: The repeated "what's the trend?" from screenshots
        console.log('\n=== TEST 4: Repeated Context Queries ===');
        await this.makeRequest('tell me about apple');
        const apple1 = await this.makeRequest("what's the trend?");
        const apple2 = await this.makeRequest("what's the trend?");
        const apple3 = await this.makeRequest("what's the trend?");
        
        // All should show AAPL
        const allApple = [apple1, apple2, apple3].every(r => r?.chartData?.symbol === 'AAPL');
        if (!allApple) {
            console.error('\n❌ Context lost during repeated queries');
        }
        
        // Save detailed results
        this.saveResults();
    }
    
    async testChartAccuracy() {
        console.log('\n\n🔴 TESTING CHART GENERATION ACCURACY\n');
        
        const symbols = ['AAPL', 'AMD', 'NVDA', 'TSLA', 'MSFT'];
        const failures = [];
        
        for (const symbol of symbols) {
            const response = await this.makeRequest(`show me ${symbol} trend`);
            
            if (response?.showChart && response?.chartData?.symbol !== symbol) {
                failures.push({
                    requested: symbol,
                    received: response.chartData?.symbol
                });
                console.error(`❌ Chart mismatch: Requested ${symbol}, got ${response.chartData?.symbol}`);
            }
        }
        
        if (failures.length > 0) {
            console.error(`\n🚨 CHART BUG STILL EXISTS: ${failures.length}/${symbols.length} charts showed wrong symbol`);
        }
    }
    
    async testResponseVariety() {
        console.log('\n\n🔴 TESTING RESPONSE VARIETY (NOT TEMPLATED)\n');
        
        const queries = [
            'AAPL price',
            'what is apple stock price?',
            'apple price now',
            'AAPL'
        ];
        
        const responses = [];
        for (const query of queries) {
            const response = await this.makeRequest(query);
            responses.push(response?.response || '');
            await new Promise(resolve => setTimeout(resolve, 1000));
        }
        
        // Check for identical responses
        const uniqueResponses = new Set(responses);
        if (uniqueResponses.size < responses.length * 0.8) {
            console.error(`\n❌ TEMPLATED RESPONSES: Only ${uniqueResponses.size} unique out of ${responses.length}`);
            console.log('Responses:', responses);
        } else {
            console.log(`\n✅ Good variety: ${uniqueResponses.size} unique responses`);
        }
    }
    
    saveResults() {
        const report = {
            sessionId: this.sessionId,
            timestamp: new Date().toISOString(),
            totalQueries: this.results.length,
            results: this.results,
            analysis: this.analyzeResults()
        };
        
        fs.writeFileSync('real_test_results.json', JSON.stringify(report, null, 2));
        console.log('\n📄 Full results saved to real_test_results.json');
    }
    
    analyzeResults() {
        const analysis = {
            contextFailures: 0,
            chartMismatches: 0,
            templateResponses: 0,
            averageResponseLength: 0
        };
        
        // Analyze each result
        this.results.forEach((result, index) => {
            if (result.query.includes('trend') && !result.hasChart) {
                analysis.contextFailures++;
            }
        });
        
        return analysis;
    }
}

// Run all tests
async function runComprehensiveTests() {
    const tester = new RealWorldTester();
    
    console.log('🚀 STARTING COMPREHENSIVE REAL-WORLD TESTS\n');
    console.log('This will test the EXACT scenarios that failed in the screenshots\n');
    
    await tester.testExactFailureScenario();
    await tester.testChartAccuracy();
    await tester.testResponseVariety();
    
    console.log('\n\n📊 TEST COMPLETE - Check real_test_results.json for full details');
}

runComprehensiveTests().catch(console.error);