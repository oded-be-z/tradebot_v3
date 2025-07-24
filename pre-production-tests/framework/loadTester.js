/**
 * Load Testing Module for FinanceBot Pro
 * Tests performance under concurrent load, rapid queries, and stress conditions
 */

const axios = require('axios');
const { performance } = require('perf_hooks');

class LoadTester {
  constructor(baseUrl, logger) {
    this.baseUrl = baseUrl;
    this.logger = logger;
    this.metrics = {
      responseTime: [],
      throughput: 0,
      errorRate: 0,
      successCount: 0,
      errorCount: 0,
      timeouts: 0,
      rateLimit429s: 0,
      serverErrors: 0,
      concurrentPeak: 0,
      totalRequests: 0,
      startTime: null,
      endTime: null
    };
  }

  /**
   * Run all load tests
   */
  async runAllTests() {
    this.logger.info('🚀 Starting Load Tests...');
    this.metrics.startTime = Date.now();

    const tests = [
      this.rapidFireTest.bind(this),
      this.concurrentUsersTest.bind(this),
      this.sustainedLoadTest.bind(this),
      this.burstTrafficTest.bind(this),
      this.contextWindowStressTest.bind(this),
      this.largePayloadTest.bind(this),
      this.mixedWorkloadTest.bind(this)
    ];

    for (const test of tests) {
      await test();
      await this.cooldownPeriod(5000); // 5s between tests
    }

    this.metrics.endTime = Date.now();
    return this.generatePerformanceReport();
  }

  /**
   * Rapid Fire Test - Sequential high-speed queries
   */
  async rapidFireTest() {
    this.logger.info('Running Rapid Fire Test...');
    
    const config = {
      totalQueries: 100,
      delayBetweenQueries: 500, // 500ms
      timeout: 5000,
      queries: [
        'AAPL price',
        'MSFT analysis',
        'NVDA trend',
        'TSLA vs RIVN',
        'market overview'
      ]
    };

    const sessionId = `rapidfire_${Date.now()}`;
    const results = [];

    for (let i = 0; i < config.totalQueries; i++) {
      const query = config.queries[i % config.queries.length];
      const startTime = performance.now();
      
      try {
        const response = await this.executeQuery(sessionId, query, config.timeout);
        const endTime = performance.now();
        const responseTime = endTime - startTime;
        
        results.push({
          query: query,
          responseTime: responseTime,
          status: response.status,
          success: response.status === 200
        });

        this.recordMetrics(responseTime, response.status);
        
        if (i < config.totalQueries - 1) {
          await this.sleep(config.delayBetweenQueries);
        }
      } catch (error) {
        this.recordError(error);
      }
    }

    this.analyzeRapidFireResults(results, config);
  }

  /**
   * Concurrent Users Test - Multiple simultaneous sessions
   */
  async concurrentUsersTest() {
    this.logger.info('Running Concurrent Users Test...');
    
    const config = {
      concurrentUsers: 10,
      queriesPerUser: 5,
      queryDelay: 2000, // 2s between queries per user
      userScenarios: [
        ['AAPL price', 'AAPL analysis', 'AAPL trend', 'should I buy AAPL', 'AAPL vs MSFT'],
        ['portfolio review', 'top gainers', 'rebalance suggestions', 'risk analysis', 'performance'],
        ['BTC price', 'crypto trends', 'ETH analysis', 'BTC vs ETH', 'crypto forecast'],
        ['market overview', 'sector performance', 'VIX level', 'market sentiment', 'top movers'],
        ['TSLA analysis', 'TSLA chart', 'TSLA news', 'TSLA forecast', 'TSLA options']
      ]
    };

    const userPromises = [];
    this.metrics.concurrentPeak = config.concurrentUsers;

    for (let userId = 0; userId < config.concurrentUsers; userId++) {
      const scenario = config.userScenarios[userId % config.userScenarios.length];
      userPromises.push(this.simulateUser(userId, scenario, config.queryDelay));
    }

    const results = await Promise.all(userPromises);
    this.analyzeConcurrentResults(results, config);
  }

  /**
   * Sustained Load Test - Constant load over time
   */
  async sustainedLoadTest() {
    this.logger.info('Running Sustained Load Test...');
    
    const config = {
      duration: 60000, // 1 minute
      requestsPerSecond: 2,
      concurrentLimit: 5
    };

    const startTime = Date.now();
    const results = [];
    let requestCount = 0;

    while (Date.now() - startTime < config.duration) {
      const batchPromises = [];
      
      // Send batch of requests
      for (let i = 0; i < config.requestsPerSecond; i++) {
        if (batchPromises.length < config.concurrentLimit) {
          const sessionId = `sustained_${requestCount++}`;
          const query = this.getRandomQuery();
          batchPromises.push(this.executeTimedQuery(sessionId, query));
        }
      }

      const batchResults = await Promise.all(batchPromises);
      results.push(...batchResults);

      // Wait to maintain requests per second rate
      await this.sleep(1000);
    }

    this.analyzeSustainedLoadResults(results, config);
  }

  /**
   * Burst Traffic Test - Sudden spike simulation
   */
  async burstTrafficTest() {
    this.logger.info('Running Burst Traffic Test...');
    
    const config = {
      normalLoad: 1, // requests per second
      burstLoad: 20, // requests per burst
      burstDuration: 5000, // 5 seconds
      normalDuration: 10000 // 10 seconds
    };

    const results = [];

    // Normal load phase
    this.logger.info('Normal load phase...');
    const normalResults = await this.generateLoad(config.normalLoad, config.normalDuration);
    results.push(...normalResults);

    // Burst phase
    this.logger.info('BURST PHASE!');
    const burstResults = await this.generateLoad(config.burstLoad, config.burstDuration);
    results.push(...burstResults);

    // Recovery phase
    this.logger.info('Recovery phase...');
    const recoveryResults = await this.generateLoad(config.normalLoad, config.normalDuration);
    results.push(...recoveryResults);

    this.analyzeBurstResults(results, config);
  }

  /**
   * Context Window Stress Test - Long conversations
   */
  async contextWindowStressTest() {
    this.logger.info('Running Context Window Stress Test...');
    
    const sessionId = `context_stress_${Date.now()}`;
    const conversation = [];
    const maxMessages = 50;
    const results = [];

    // Build a long conversation
    for (let i = 0; i < maxMessages; i++) {
      const queries = [
        'AAPL price',
        'tell me more',
        'what about the technicals',
        'compare to MSFT',
        'which is better',
        'show me NVDA too',
        'rank all three',
        'portfolio recommendations',
        'what did I ask about first',
        'summarize our conversation'
      ];

      const query = queries[i % queries.length];
      const startTime = performance.now();

      try {
        const response = await this.executeQuery(sessionId, query, 10000);
        const endTime = performance.now();
        
        const result = {
          messageNumber: i + 1,
          query: query,
          responseTime: endTime - startTime,
          responseLength: JSON.stringify(response.data).length,
          contextMaintained: this.checkContextMaintained(response.data, conversation),
          status: response.status
        };

        results.push(result);
        conversation.push({ query, response: response.data });

        // Add delay to simulate real conversation
        await this.sleep(1000);
      } catch (error) {
        this.recordError(error);
        results.push({
          messageNumber: i + 1,
          query: query,
          error: error.message
        });
      }
    }

    this.analyzeContextStressResults(results);
  }

  /**
   * Large Payload Test - Complex queries
   */
  async largePayloadTest() {
    this.logger.info('Running Large Payload Test...');
    
    const largeQueries = [
      {
        name: '10 Symbol Comparison',
        query: 'compare AAPL MSFT GOOGL AMZN META NVDA TSLA BRK.B JPM V with detailed analysis'
      },
      {
        name: '100 Symbol Request',
        query: 'show me all S&P 100 stocks with prices and changes'
      },
      {
        name: 'Complex Multi-Intent',
        query: 'analyze AAPL MSFT GOOGL, show trends, compare performance, generate charts, provide recommendations, and explain market context'
      },
      {
        name: 'Full Portfolio Analysis',
        query: 'complete portfolio analysis with risk metrics, rebalancing suggestions, tax implications, and 5-year projections'
      },
      {
        name: 'Very Long Query',
        query: 'AAPL '.repeat(500) + 'price' // Test query length limits
      }
    ];

    const results = [];

    for (const test of largeQueries) {
      const sessionId = `large_payload_${Date.now()}`;
      const startTime = performance.now();

      try {
        const response = await this.executeQuery(sessionId, test.query, 30000); // 30s timeout
        const endTime = performance.now();

        results.push({
          testName: test.name,
          queryLength: test.query.length,
          responseTime: endTime - startTime,
          responseSize: JSON.stringify(response.data).length,
          status: response.status,
          success: response.status === 200
        });

        this.recordMetrics(endTime - startTime, response.status);
      } catch (error) {
        results.push({
          testName: test.name,
          error: error.message
        });
        this.recordError(error);
      }

      await this.sleep(2000); // 2s between large queries
    }

    this.analyzeLargePayloadResults(results);
  }

  /**
   * Mixed Workload Test - Realistic usage patterns
   */
  async mixedWorkloadTest() {
    this.logger.info('Running Mixed Workload Test...');
    
    const workloadDistribution = {
      priceQueries: 40,      // 40%
      analysis: 25,          // 25%
      comparisons: 15,       // 15%
      portfolio: 10,         // 10%
      marketOverview: 5,     // 5%
      complex: 5             // 5%
    };

    const duration = 30000; // 30 seconds
    const targetQPS = 5; // Queries per second
    const results = [];

    const startTime = Date.now();
    let queryCount = 0;

    while (Date.now() - startTime < duration) {
      const queryType = this.selectByDistribution(workloadDistribution);
      const query = this.getQueryForType(queryType);
      const sessionId = `mixed_${queryCount++}`;

      const promise = this.executeTimedQuery(sessionId, query).then(result => {
        result.queryType = queryType;
        results.push(result);
      });

      // Don't wait for completion to maintain QPS
      if (queryCount % targetQPS === 0) {
        await this.sleep(1000);
      }
    }

    // Wait for all queries to complete
    await this.sleep(5000);
    this.analyzeMixedWorkloadResults(results, workloadDistribution);
  }

  /**
   * Helper method to simulate a single user
   */
  async simulateUser(userId, queries, delayBetween) {
    const sessionId = `user_${userId}_${Date.now()}`;
    const results = [];

    for (const query of queries) {
      const startTime = performance.now();
      
      try {
        const response = await this.executeQuery(sessionId, query);
        const endTime = performance.now();
        
        results.push({
          userId: userId,
          query: query,
          responseTime: endTime - startTime,
          status: response.status,
          success: response.status === 200
        });

        this.recordMetrics(endTime - startTime, response.status);
      } catch (error) {
        results.push({
          userId: userId,
          query: query,
          error: error.message
        });
        this.recordError(error);
      }

      await this.sleep(delayBetween);
    }

    return results;
  }

  /**
   * Execute a query and return response
   */
  async executeQuery(sessionId, message, timeout = 10000) {
    try {
      const response = await axios.post(
        `${this.baseUrl}/api/chat`,
        {
          message: message,
          sessionId: sessionId
        },
        {
          timeout: timeout,
          validateStatus: () => true,
          headers: {
            'Content-Type': 'application/json'
          }
        }
      );

      return response;
    } catch (error) {
      if (error.code === 'ECONNABORTED') {
        this.metrics.timeouts++;
      }
      throw error;
    }
  }

  /**
   * Execute a timed query
   */
  async executeTimedQuery(sessionId, query) {
    const startTime = performance.now();
    
    try {
      const response = await this.executeQuery(sessionId, query);
      const endTime = performance.now();
      
      this.recordMetrics(endTime - startTime, response.status);
      
      return {
        query: query,
        responseTime: endTime - startTime,
        status: response.status,
        success: response.status === 200,
        timestamp: Date.now()
      };
    } catch (error) {
      this.recordError(error);
      return {
        query: query,
        error: error.message,
        timestamp: Date.now()
      };
    }
  }

  /**
   * Generate load at specified rate
   */
  async generateLoad(requestsPerSecond, duration) {
    const results = [];
    const startTime = Date.now();
    let requestCount = 0;

    while (Date.now() - startTime < duration) {
      const batchPromises = [];
      
      for (let i = 0; i < requestsPerSecond; i++) {
        const sessionId = `load_${requestCount++}`;
        const query = this.getRandomQuery();
        batchPromises.push(this.executeTimedQuery(sessionId, query));
      }

      results.push(...await Promise.all(batchPromises));
      
      const elapsed = Date.now() - startTime;
      const expectedTime = (requestCount / requestsPerSecond) * 1000;
      const sleepTime = Math.max(0, expectedTime - elapsed);
      
      if (sleepTime > 0) {
        await this.sleep(sleepTime);
      }
    }

    return results;
  }

  /**
   * Record metrics for a request
   */
  recordMetrics(responseTime, status) {
    this.metrics.responseTime.push(responseTime);
    this.metrics.totalRequests++;

    if (status === 200) {
      this.metrics.successCount++;
    } else {
      this.metrics.errorCount++;
      if (status === 429) {
        this.metrics.rateLimit429s++;
      } else if (status >= 500) {
        this.metrics.serverErrors++;
      }
    }
  }

  /**
   * Record error details
   */
  recordError(error) {
    this.metrics.errorCount++;
    if (error.code === 'ECONNABORTED') {
      this.metrics.timeouts++;
    }
  }

  /**
   * Analysis methods for different test types
   */
  analyzeRapidFireResults(results, config) {
    const successRate = results.filter(r => r.success).length / results.length;
    const avgResponseTime = results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length;
    
    this.logger.info(`Rapid Fire Results:
      - Total Queries: ${config.totalQueries}
      - Success Rate: ${(successRate * 100).toFixed(1)}%
      - Avg Response Time: ${avgResponseTime.toFixed(0)}ms
      - Rate Limit Hits: ${results.filter(r => r.status === 429).length}
    `);
  }

  analyzeConcurrentResults(userResults, config) {
    const allResults = userResults.flat();
    const successRate = allResults.filter(r => r.success).length / allResults.length;
    const avgResponseTime = allResults.reduce((sum, r) => sum + (r.responseTime || 0), 0) / allResults.length;
    
    this.logger.info(`Concurrent Users Results:
      - Concurrent Users: ${config.concurrentUsers}
      - Total Queries: ${allResults.length}
      - Success Rate: ${(successRate * 100).toFixed(1)}%
      - Avg Response Time: ${avgResponseTime.toFixed(0)}ms
    `);
  }

  analyzeSustainedLoadResults(results, config) {
    const successRate = results.filter(r => r.success).length / results.length;
    const throughput = results.length / (config.duration / 1000);
    
    this.logger.info(`Sustained Load Results:
      - Duration: ${config.duration / 1000}s
      - Total Requests: ${results.length}
      - Throughput: ${throughput.toFixed(1)} req/s
      - Success Rate: ${(successRate * 100).toFixed(1)}%
    `);
  }

  analyzeBurstResults(results, config) {
    // Split results into phases
    const normalBefore = results.slice(0, results.length / 3);
    const burst = results.slice(results.length / 3, 2 * results.length / 3);
    const normalAfter = results.slice(2 * results.length / 3);

    this.logger.info(`Burst Traffic Results:
      - Normal Load Avg Response: ${this.calculateAvgResponseTime(normalBefore).toFixed(0)}ms
      - Burst Load Avg Response: ${this.calculateAvgResponseTime(burst).toFixed(0)}ms
      - Recovery Avg Response: ${this.calculateAvgResponseTime(normalAfter).toFixed(0)}ms
      - Errors During Burst: ${burst.filter(r => !r.success).length}
    `);
  }

  analyzeContextStressResults(results) {
    const contextMaintained = results.filter(r => r.contextMaintained).length;
    const avgResponseTime = results.reduce((sum, r) => sum + (r.responseTime || 0), 0) / results.length;
    const responseTimeGrowth = results[results.length - 1].responseTime / results[0].responseTime;
    
    this.logger.info(`Context Stress Results:
      - Messages: ${results.length}
      - Context Maintained: ${(contextMaintained / results.length * 100).toFixed(1)}%
      - Avg Response Time: ${avgResponseTime.toFixed(0)}ms
      - Response Time Growth: ${responseTimeGrowth.toFixed(2)}x
    `);
  }

  analyzeLargePayloadResults(results) {
    this.logger.info('Large Payload Results:');
    results.forEach(result => {
      if (result.success) {
        this.logger.info(`  - ${result.testName}: ${result.responseTime.toFixed(0)}ms (${result.responseSize} bytes)`);
      } else {
        this.logger.error(`  - ${result.testName}: FAILED - ${result.error}`);
      }
    });
  }

  analyzeMixedWorkloadResults(results, distribution) {
    const typeResults = {};
    Object.keys(distribution).forEach(type => {
      const typeData = results.filter(r => r.queryType === type);
      typeResults[type] = {
        count: typeData.length,
        avgResponseTime: this.calculateAvgResponseTime(typeData),
        successRate: typeData.filter(r => r.success).length / typeData.length
      };
    });

    this.logger.info('Mixed Workload Results:');
    Object.entries(typeResults).forEach(([type, data]) => {
      this.logger.info(`  - ${type}: ${data.count} queries, ${data.avgResponseTime.toFixed(0)}ms avg, ${(data.successRate * 100).toFixed(1)}% success`);
    });
  }

  /**
   * Helper methods
   */
  sleep(ms) {
    return new Promise(resolve => setTimeout(resolve, ms));
  }

  cooldownPeriod(ms) {
    this.logger.info(`Cooling down for ${ms / 1000}s...`);
    return this.sleep(ms);
  }

  getRandomQuery() {
    const queries = [
      'AAPL price',
      'MSFT analysis',
      'NVDA trend',
      'TSLA forecast',
      'market overview',
      'BTC price',
      'portfolio review',
      'AAPL vs MSFT',
      'tech sector performance',
      'should I buy GOOGL'
    ];
    return queries[Math.floor(Math.random() * queries.length)];
  }

  selectByDistribution(distribution) {
    const total = Object.values(distribution).reduce((a, b) => a + b, 0);
    let random = Math.random() * total;
    
    for (const [type, weight] of Object.entries(distribution)) {
      random -= weight;
      if (random <= 0) return type;
    }
    
    return Object.keys(distribution)[0];
  }

  getQueryForType(type) {
    const queries = {
      priceQueries: ['AAPL price', 'MSFT stock', 'NVDA quote', 'TSLA at?'],
      analysis: ['AAPL analysis', 'MSFT forecast', 'NVDA outlook', 'TSLA trend'],
      comparisons: ['AAPL vs MSFT', 'NVDA or AMD', 'compare FAANG stocks'],
      portfolio: ['portfolio review', 'rebalance suggestions', 'risk analysis'],
      marketOverview: ['market sentiment', 'sector performance', 'top movers'],
      complex: ['analyze AAPL MSFT GOOGL with charts and recommendations']
    };
    
    const typeQueries = queries[type] || queries.priceQueries;
    return typeQueries[Math.floor(Math.random() * typeQueries.length)];
  }

  calculateAvgResponseTime(results) {
    const validResults = results.filter(r => r.responseTime);
    if (validResults.length === 0) return 0;
    return validResults.reduce((sum, r) => sum + r.responseTime, 0) / validResults.length;
  }

  checkContextMaintained(response, conversation) {
    // Simple check - does response reference previous queries?
    if (conversation.length === 0) return true;
    
    const lastQuery = conversation[conversation.length - 1];
    const responseText = JSON.stringify(response).toLowerCase();
    const queryText = lastQuery.query.toLowerCase();
    
    // Check if response acknowledges context
    return responseText.includes('previous') || 
           responseText.includes('earlier') || 
           responseText.includes('you asked') ||
           responseText.includes(queryText.split(' ')[0]); // First word of last query
  }

  /**
   * Generate comprehensive performance report
   */
  generatePerformanceReport() {
    const duration = (this.metrics.endTime - this.metrics.startTime) / 1000;
    const throughput = this.metrics.totalRequests / duration;
    const errorRate = (this.metrics.errorCount / this.metrics.totalRequests * 100);
    
    // Calculate percentiles
    const sortedResponseTimes = this.metrics.responseTime.sort((a, b) => a - b);
    const p50 = this.calculatePercentile(sortedResponseTimes, 50);
    const p95 = this.calculatePercentile(sortedResponseTimes, 95);
    const p99 = this.calculatePercentile(sortedResponseTimes, 99);
    
    const report = {
      summary: {
        totalRequests: this.metrics.totalRequests,
        duration: `${duration.toFixed(1)}s`,
        throughput: `${throughput.toFixed(1)} req/s`,
        successRate: `${((this.metrics.successCount / this.metrics.totalRequests) * 100).toFixed(1)}%`,
        errorRate: `${errorRate.toFixed(1)}%`
      },
      responseTime: {
        min: Math.min(...sortedResponseTimes),
        max: Math.max(...sortedResponseTimes),
        avg: sortedResponseTimes.reduce((a, b) => a + b, 0) / sortedResponseTimes.length,
        p50: p50,
        p95: p95,
        p99: p99
      },
      errors: {
        total: this.metrics.errorCount,
        timeouts: this.metrics.timeouts,
        rateLimits: this.metrics.rateLimit429s,
        serverErrors: this.metrics.serverErrors
      },
      load: {
        peakConcurrency: this.metrics.concurrentPeak,
        sustainedThroughput: throughput
      },
      grade: this.calculatePerformanceGrade(p95, errorRate),
      recommendations: this.generatePerformanceRecommendations(p95, errorRate, this.metrics)
    };

    return report;
  }

  calculatePercentile(sortedArray, percentile) {
    if (sortedArray.length === 0) return 0;
    const index = Math.ceil(sortedArray.length * (percentile / 100)) - 1;
    return sortedArray[Math.min(index, sortedArray.length - 1)];
  }

  calculatePerformanceGrade(p95, errorRate) {
    if (p95 < 1000 && errorRate < 1) return 'A+';
    if (p95 < 2000 && errorRate < 2) return 'A';
    if (p95 < 3000 && errorRate < 5) return 'B+';
    if (p95 < 4000 && errorRate < 10) return 'B';
    if (p95 < 5000 && errorRate < 15) return 'C+';
    if (p95 < 6000 && errorRate < 20) return 'C';
    return 'D';
  }

  generatePerformanceRecommendations(p95, errorRate, metrics) {
    const recommendations = [];

    if (p95 > 3000) {
      recommendations.push('Response times exceed 3s at p95 - consider optimizing slow queries');
    }
    if (errorRate > 5) {
      recommendations.push('High error rate detected - investigate error patterns');
    }
    if (metrics.rateLimit429s > 10) {
      recommendations.push('Frequent rate limiting - consider increasing limits or implementing backoff');
    }
    if (metrics.timeouts > 5) {
      recommendations.push('Multiple timeouts observed - review timeout settings and query complexity');
    }
    if (metrics.concurrentPeak > 20 && errorRate > 10) {
      recommendations.push('Performance degrades under high concurrency - consider scaling');
    }

    if (recommendations.length === 0) {
      recommendations.push('Excellent performance! System handles load well.');
    }

    return recommendations;
  }
}

module.exports = LoadTester;