const axios = require('axios');
const logger = require('./utils/logger');

const PORT = 3000;
const API_URL = `http://localhost:${PORT}/api/chat`;

class OrchestratorIntegrationTest {
  constructor() {
    this.sessionId = `test_orch_${Date.now()}`;
    this.results = {
      contextSwitching: { passed: false, details: [] },
      responseVariety: { passed: false, responses: [] },
      performance: { passed: false, timings: [] },
      dataFreshness: { passed: false, evidence: [] }
    };
  }

  async makeRequest(message) {
    const startTime = Date.now();
    try {
      const response = await axios.post(API_URL, {
        message,
        sessionId: this.sessionId
      });
      
      const duration = Date.now() - startTime;
      return {
        message: response.data.response || response.data.message || '',
        duration,
        timestamp: new Date().toISOString(),
        rawData: response.data
      };
    } catch (error) {
      console.error('Request failed:', error.message);
      if (error.response) {
        console.error('Response data:', error.response.data);
      }
      return null;
    }
  }

  // Test 1: Context Switching
  async testContextSwitching() {
    console.log('\n📋 TEST 1: Context Switching\n');
    
    // Step 1: AMD
    const amd1 = await this.makeRequest("Tell me about AMD");
    if (!amd1) {
      console.error('Failed to get response for AMD query');
      return;
    }
    console.log(`AMD Query 1: ${amd1.message.substring(0, 100)}...`);
    this.results.contextSwitching.details.push({
      query: "Tell me about AMD",
      mentions: { AMD: amd1.message.includes('AMD'), NVDA: amd1.message.includes('NVDA') }
    });
    
    // Step 2: Vague query (should use AMD context)
    await new Promise(resolve => setTimeout(resolve, 1000));
    const vague1 = await this.makeRequest("What's the trend?");
    if (!vague1) {
      console.error('Failed to get response for vague query 1');
      return;
    }
    console.log(`Vague Query 1: ${vague1.message.substring(0, 100)}...`);
    this.results.contextSwitching.details.push({
      query: "What's the trend?",
      mentions: { AMD: vague1.message.includes('AMD'), NVDA: vague1.message.includes('NVDA') }
    });
    
    // Step 3: NVDA
    await new Promise(resolve => setTimeout(resolve, 1000));
    const nvda1 = await this.makeRequest("How about NVDA?");
    if (!nvda1) {
      console.error('Failed to get response for NVDA query');
      return;
    }
    console.log(`NVDA Query: ${nvda1.message.substring(0, 100)}...`);
    this.results.contextSwitching.details.push({
      query: "How about NVDA?",
      mentions: { AMD: nvda1.message.includes('AMD'), NVDA: nvda1.message.includes('NVDA') }
    });
    
    // Step 4: Vague query (should use NVDA context)
    await new Promise(resolve => setTimeout(resolve, 1000));
    const vague2 = await this.makeRequest("What's the trend?");
    if (!vague2) {
      console.error('Failed to get response for vague query 2');
      return;
    }
    console.log(`Vague Query 2: ${vague2.message.substring(0, 100)}...`);
    this.results.contextSwitching.details.push({
      query: "What's the trend?",
      mentions: { AMD: vague2.message.includes('AMD'), NVDA: vague2.message.includes('NVDA') }
    });
    
    // Evaluate
    const firstVagueCorrect = vague1.message.includes('AMD') && !vague1.message.includes('NVDA');
    const secondVagueCorrect = vague2.message.includes('NVDA') && !vague2.message.includes('AMD');
    
    this.results.contextSwitching.passed = firstVagueCorrect && secondVagueCorrect;
    console.log(`\n✅ Context Switching: ${this.results.contextSwitching.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`  First vague query mentions AMD: ${vague1.message.includes('AMD')}`);
    console.log(`  Second vague query mentions NVDA: ${vague2.message.includes('NVDA')}`);
  }

  // Test 2: Response Variety
  async testResponseVariety() {
    console.log('\n📋 TEST 2: Response Variety\n');
    
    const responses = [];
    for (let i = 0; i < 5; i++) {
      await new Promise(resolve => setTimeout(resolve, 1500)); // Avoid rate limiting
      const response = await this.makeRequest("AAPL price");
      responses.push(response.message);
      console.log(`Response ${i + 1}: ${response.message}`);
    }
    
    this.results.responseVariety.responses = responses;
    
    // Check for uniqueness
    const uniqueResponses = new Set(responses);
    this.results.responseVariety.passed = uniqueResponses.size === 5;
    
    // Check for banned phrases
    const bannedPhrases = ["let me know", "feel free", "I'm here to help", "Want me to", "Curious about"];
    const hasBannedPhrases = responses.some(r => 
      bannedPhrases.some(phrase => r.toLowerCase().includes(phrase.toLowerCase()))
    );
    
    console.log(`\n✅ Response Variety: ${this.results.responseVariety.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`  Unique responses: ${uniqueResponses.size}/5`);
    console.log(`  Contains banned phrases: ${hasBannedPhrases ? 'YES (FAIL)' : 'NO (PASS)'}`);
    
    if (!this.results.responseVariety.passed || hasBannedPhrases) {
      this.results.responseVariety.passed = false;
    }
  }

  // Test 3: Performance
  async testPerformance() {
    console.log('\n📋 TEST 3: Performance\n');
    
    const timings = [];
    for (let i = 0; i < 3; i++) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const start = Date.now();
      const response = await this.makeRequest(`Tell me about ${['TSLA', 'GOOGL', 'MSFT'][i]}`);
      const duration = Date.now() - start;
      timings.push(duration);
      console.log(`Query ${i + 1} (${['TSLA', 'GOOGL', 'MSFT'][i]}): ${duration}ms`);
    }
    
    const avgTime = timings.reduce((a, b) => a + b, 0) / timings.length;
    this.results.performance.timings = timings;
    this.results.performance.average = avgTime;
    this.results.performance.passed = avgTime < 3000;
    
    console.log(`\n✅ Performance: ${this.results.performance.passed ? 'PASSED' : 'FAILED'}`);
    console.log(`  Average response time: ${avgTime.toFixed(0)}ms (target: <3000ms)`);
  }

  // Test 4: Data Freshness
  async testDataFreshness() {
    console.log('\n📋 TEST 4: Data Freshness (Perplexity Usage)\n');
    
    const symbols = ['AMZN', 'META', 'NFLX'];
    for (const symbol of symbols) {
      await new Promise(resolve => setTimeout(resolve, 1000));
      const response = await this.makeRequest(`${symbol} current price and volume`);
      
      // Check for specific data points that indicate real-time data
      const hasPrice = /\$\d+\.?\d*/.test(response.message);
      const hasPercentage = /[+-]?\d+\.?\d*%/.test(response.message);
      const hasVolume = /volume|vol\.?|M\s*shares|B\s*shares/i.test(response.message);
      const hasSpecificNumbers = /\d{2,}/.test(response.message); // At least 2-digit numbers
      
      this.results.dataFreshness.evidence.push({
        symbol,
        hasPrice,
        hasPercentage,
        hasVolume,
        hasSpecificNumbers,
        snippet: response.message.substring(0, 150)
      });
      
      console.log(`${symbol}: Price=${hasPrice}, %=${hasPercentage}, Vol=${hasVolume}, Numbers=${hasSpecificNumbers}`);
    }
    
    // All responses should have real-time data indicators
    this.results.dataFreshness.passed = this.results.dataFreshness.evidence.every(
      e => e.hasPrice && (e.hasPercentage || e.hasVolume) && e.hasSpecificNumbers
    );
    
    console.log(`\n✅ Data Freshness: ${this.results.dataFreshness.passed ? 'PASSED' : 'FAILED'}`);
  }

  async runAllTests() {
    console.log('🧪 Starting DualLLMOrchestrator Integration Tests\n');
    console.log(`Session ID: ${this.sessionId}`);
    console.log('=' .repeat(60));
    
    await this.testContextSwitching();
    await this.testResponseVariety();
    await this.testPerformance();
    await this.testDataFreshness();
    
    this.generateReport();
  }

  generateReport() {
    console.log('\n' + '='.repeat(60));
    console.log('📊 FINAL REPORT\n');
    
    console.log('1. Context Switching:', this.results.contextSwitching.passed ? '✅ PASSED' : '❌ FAILED');
    if (!this.results.contextSwitching.passed) {
      this.results.contextSwitching.details.forEach(d => {
        console.log(`   - "${d.query}": AMD=${d.mentions.AMD}, NVDA=${d.mentions.NVDA}`);
      });
    }
    
    console.log('\n2. Response Variety:', this.results.responseVariety.passed ? '✅ PASSED' : '❌ FAILED');
    if (!this.results.responseVariety.passed) {
      console.log('   Responses were not unique enough or contained banned phrases');
    }
    
    console.log('\n3. Performance:', this.results.performance.passed ? '✅ PASSED' : '❌ FAILED');
    console.log(`   Average: ${this.results.performance.average?.toFixed(0)}ms (target: <3000ms)`);
    console.log(`   Min: ${Math.min(...this.results.performance.timings)}ms`);
    console.log(`   Max: ${Math.max(...this.results.performance.timings)}ms`);
    
    console.log('\n4. Data Freshness:', this.results.dataFreshness.passed ? '✅ PASSED' : '❌ FAILED');
    this.results.dataFreshness.evidence.forEach(e => {
      console.log(`   - ${e.symbol}: Price=${e.hasPrice}, %=${e.hasPercentage}, Vol=${e.hasVolume}, Numbers=${e.hasSpecificNumbers}`);
    });
    
    const allPassed = Object.values(this.results).every(r => r.passed);
    console.log('\n' + '='.repeat(60));
    console.log(`OVERALL: ${allPassed ? '✅ ALL TESTS PASSED' : '❌ SOME TESTS FAILED'}`);
    console.log('='.repeat(60));
    
    // Show sample logs pattern
    console.log('\n📝 Expected Server Log Pattern:');
    console.log('[DualLLMOrchestrator] Processing query: "Tell me about AMD" | RequestID: req_xxx');
    console.log('[DualLLMOrchestrator] Azure Understanding (245ms): {"intent":"stock_query","symbols":["AMD"],...}');
    console.log('[DualLLMOrchestrator] Perplexity Data Fetch (892ms): AMD_market, AMD_news');
    console.log('[DualLLMOrchestrator] Response synthesized (312ms) | Total: 1449ms');
  }
}

// Run tests
const tester = new OrchestratorIntegrationTest();
tester.runAllTests().catch(console.error);