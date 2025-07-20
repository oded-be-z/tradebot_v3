const axios = require('axios');
const os = require('os');

// Console colors
const colors = {
  blue: '\x1b[34m',
  yellow: '\x1b[33m',
  green: '\x1b[32m',
  red: '\x1b[31m',
  cyan: '\x1b[36m',
  reset: '\x1b[0m'
};

class LoadTester {
  constructor(config) {
    this.baseURL = config.baseURL || 'http://localhost:3000';
    this.users = config.users || 10;
    this.requestsPerUser = config.requestsPerUser || 20;
    this.rampUpTime = config.rampUpTime || 5000; // 5 seconds
    
    this.queries = [
      "AAPL",
      "MSFT", 
      "compare AAPL and MSFT",
      "FAANG stocks",
      "what is inflation?",
      "market hours?",
      "BTC trends",
      "show me NVDA chart",
      "tech stocks comparison",
      "who is the CEO of Apple?",
      "S&P 500 performance",
      "is Tesla overvalued?",
      "crypto market overview",
      "explain P/E ratio",
      "Amazon earnings"
    ];
    
    this.results = {
      totalRequests: 0,
      successfulRequests: 0,
      failedRequests: 0,
      responseTimes: [],
      errorTypes: {},
      startTime: null,
      endTime: null
    };
    
    this.systemStats = {
      initialMemory: null,
      peakMemory: null,
      initialCPU: null,
      peakCPU: null
    };
  }

  async runLoadTest() {
    console.log(colors.blue + '\n=== FINANCEBOT PRO LOAD TEST ===' + colors.reset);
    console.log(`Configuration:`);
    console.log(`- Concurrent Users: ${this.users}`);
    console.log(`- Requests per User: ${this.requestsPerUser}`);
    console.log(`- Total Requests: ${this.users * this.requestsPerUser}`);
    console.log(`- Ramp-up Time: ${this.rampUpTime}ms`);
    console.log(`- Query Pool Size: ${this.queries.length}\n`);
    
    // Record initial system stats
    this.systemStats.initialMemory = process.memoryUsage();
    this.systemStats.initialCPU = process.cpuUsage();
    
    this.results.startTime = Date.now();
    
    // Create user simulation promises
    const userPromises = [];
    const rampUpDelay = this.rampUpTime / this.users;
    
    for (let i = 0; i < this.users; i++) {
      userPromises.push(this.simulateUser(i, i * rampUpDelay));
    }
    
    // Monitor system stats during test
    const monitorInterval = setInterval(() => {
      const currentMemory = process.memoryUsage();
      if (!this.systemStats.peakMemory || currentMemory.heapUsed > this.systemStats.peakMemory.heapUsed) {
        this.systemStats.peakMemory = currentMemory;
      }
    }, 100);
    
    // Wait for all users to complete
    await Promise.all(userPromises);
    
    clearInterval(monitorInterval);
    this.results.endTime = Date.now();
    
    // Generate report
    await this.generateReport();
  }

  async simulateUser(userId, delay) {
    // Wait for ramp-up delay
    await new Promise(resolve => setTimeout(resolve, delay));
    
    console.log(colors.cyan + `User ${userId + 1} started` + colors.reset);
    
    for (let i = 0; i < this.requestsPerUser; i++) {
      // Random query from pool
      const query = this.queries[Math.floor(Math.random() * this.queries.length)];
      
      // Random delay between requests (100-500ms)
      const requestDelay = Math.floor(Math.random() * 400) + 100;
      await new Promise(resolve => setTimeout(resolve, requestDelay));
      
      await this.makeRequest(query, `user-${userId}-req-${i}`);
    }
    
    console.log(colors.cyan + `User ${userId + 1} completed` + colors.reset);
  }

  async makeRequest(query, requestId) {
    const startTime = Date.now();
    
    try {
      const response = await axios.post(`${this.baseURL}/api/chat`, {
        message: query,
        sessionId: `load-test-${requestId}`
      }, {
        timeout: 10000 // 10 second timeout
      });
      
      const responseTime = Date.now() - startTime;
      
      this.results.totalRequests++;
      this.results.successfulRequests++;
      this.results.responseTimes.push(responseTime);
      
      // Log slow requests
      if (responseTime > 3000) {
        console.log(colors.yellow + `⚠ Slow request: "${query}" took ${responseTime}ms` + colors.reset);
      }
      
    } catch (error) {
      const responseTime = Date.now() - startTime;
      
      this.results.totalRequests++;
      this.results.failedRequests++;
      
      // Categorize error
      const errorType = error.code || error.response?.status || 'Unknown';
      this.results.errorTypes[errorType] = (this.results.errorTypes[errorType] || 0) + 1;
      
      console.log(colors.red + `✗ Request failed: "${query}" - ${errorType}` + colors.reset);
    }
  }

  calculatePercentile(arr, percentile) {
    const sorted = arr.sort((a, b) => a - b);
    const index = Math.ceil((percentile / 100) * sorted.length) - 1;
    return sorted[index];
  }

  async generateReport() {
    const totalTime = this.results.endTime - this.results.startTime;
    const avgResponseTime = this.results.responseTimes.length > 0
      ? Math.round(this.results.responseTimes.reduce((sum, time) => sum + time, 0) / this.results.responseTimes.length)
      : 0;
    
    const minResponseTime = this.results.responseTimes.length > 0
      ? Math.min(...this.results.responseTimes)
      : 0;
      
    const maxResponseTime = this.results.responseTimes.length > 0
      ? Math.max(...this.results.responseTimes)
      : 0;
      
    const p50 = this.results.responseTimes.length > 0
      ? this.calculatePercentile(this.results.responseTimes, 50)
      : 0;
      
    const p95 = this.results.responseTimes.length > 0
      ? this.calculatePercentile(this.results.responseTimes, 95)
      : 0;
      
    const p99 = this.results.responseTimes.length > 0
      ? this.calculatePercentile(this.results.responseTimes, 99)
      : 0;
    
    const successRate = this.results.totalRequests > 0
      ? (this.results.successfulRequests / this.results.totalRequests * 100).toFixed(2)
      : 0;
      
    const requestsPerSecond = (this.results.totalRequests / (totalTime / 1000)).toFixed(2);
    
    // Memory stats
    const memoryIncrease = this.systemStats.peakMemory 
      ? ((this.systemStats.peakMemory.heapUsed - this.systemStats.initialMemory.heapUsed) / 1024 / 1024).toFixed(2)
      : 'N/A';
      
    const peakMemoryMB = this.systemStats.peakMemory
      ? (this.systemStats.peakMemory.heapUsed / 1024 / 1024).toFixed(2)
      : 'N/A';
    
    const report = `
${colors.blue}=== LOAD TEST REPORT ===${colors.reset}

${colors.yellow}Test Summary:${colors.reset}
- Duration: ${(totalTime / 1000).toFixed(2)} seconds
- Total Requests: ${this.results.totalRequests}
- Successful: ${this.results.successfulRequests} (${successRate}%)
- Failed: ${this.results.failedRequests}
- Requests/Second: ${requestsPerSecond}

${colors.yellow}Response Times:${colors.reset}
- Min: ${minResponseTime}ms
- Max: ${maxResponseTime}ms
- Average: ${avgResponseTime}ms
- Median (p50): ${p50}ms
- 95th percentile: ${p95}ms
- 99th percentile: ${p99}ms

${colors.yellow}Error Breakdown:${colors.reset}
${Object.entries(this.results.errorTypes).length > 0 
  ? Object.entries(this.results.errorTypes)
      .map(([type, count]) => `- ${type}: ${count}`)
      .join('\n')
  : '- No errors! 🎉'}

${colors.yellow}System Impact:${colors.reset}
- Memory Increase: ${memoryIncrease} MB
- Peak Memory: ${peakMemoryMB} MB

${colors.yellow}Performance Analysis:${colors.reset}
${this.getPerformanceAnalysis(avgResponseTime, p95, successRate)}
`;

    console.log(report);
    
    // Save detailed report
    const detailedReport = {
      summary: {
        duration: totalTime,
        totalRequests: this.results.totalRequests,
        successful: this.results.successfulRequests,
        failed: this.results.failedRequests,
        successRate: parseFloat(successRate),
        requestsPerSecond: parseFloat(requestsPerSecond)
      },
      responseTimes: {
        min: minResponseTime,
        max: maxResponseTime,
        average: avgResponseTime,
        median: p50,
        p95: p95,
        p99: p99,
        all: this.results.responseTimes
      },
      errors: this.results.errorTypes,
      systemImpact: {
        memoryIncreaseMB: parseFloat(memoryIncrease),
        peakMemoryMB: parseFloat(peakMemoryMB)
      },
      config: {
        users: this.users,
        requestsPerUser: this.requestsPerUser,
        totalRequests: this.users * this.requestsPerUser
      }
    };
    
    require('fs').writeFileSync('load-test-report.json', JSON.stringify(detailedReport, null, 2));
    console.log(colors.green + '\nDetailed report saved to load-test-report.json' + colors.reset);
  }

  getPerformanceAnalysis(avgResponseTime, p95, successRate) {
    const analysis = [];
    
    // Response time analysis
    if (avgResponseTime < 500) {
      analysis.push('✅ Excellent response times (<500ms average)');
    } else if (avgResponseTime < 1000) {
      analysis.push('✅ Good response times (<1s average)');
    } else if (avgResponseTime < 2000) {
      analysis.push('⚠️  Acceptable response times (1-2s average)');
    } else {
      analysis.push('❌ Poor response times (>2s average)');
    }
    
    // P95 analysis
    if (p95 < 2000) {
      analysis.push('✅ 95% of requests complete within 2 seconds');
    } else if (p95 < 3000) {
      analysis.push('⚠️  95% of requests complete within 3 seconds');
    } else {
      analysis.push('❌ 95th percentile exceeds 3 seconds');
    }
    
    // Success rate analysis
    if (successRate >= 99) {
      analysis.push('✅ Excellent reliability (>99% success rate)');
    } else if (successRate >= 95) {
      analysis.push('✅ Good reliability (>95% success rate)');
    } else if (successRate >= 90) {
      analysis.push('⚠️  Acceptable reliability (>90% success rate)');
    } else {
      analysis.push('❌ Poor reliability (<90% success rate)');
    }
    
    // Capacity analysis
    const rps = this.results.totalRequests / ((this.results.endTime - this.results.startTime) / 1000);
    if (rps > 50) {
      analysis.push(`✅ High throughput achieved (${rps.toFixed(1)} req/s)`);
    } else if (rps > 20) {
      analysis.push(`✅ Good throughput achieved (${rps.toFixed(1)} req/s)`);
    } else {
      analysis.push(`⚠️  Moderate throughput (${rps.toFixed(1)} req/s)`);
    }
    
    return analysis.join('\n');
  }
}

// CLI interface
async function main() {
  const args = process.argv.slice(2);
  
  let config = {
    baseURL: 'http://localhost:3000',
    users: 10,
    requestsPerUser: 20,
    rampUpTime: 5000
  };
  
  // Parse command line arguments
  for (let i = 0; i < args.length; i += 2) {
    const arg = args[i];
    const value = args[i + 1];
    
    switch (arg) {
      case '--users':
        config.users = parseInt(value);
        break;
      case '--requests':
        config.requestsPerUser = parseInt(value);
        break;
      case '--rampup':
        config.rampUpTime = parseInt(value);
        break;
      case '--url':
        config.baseURL = value;
        break;
    }
  }
  
  console.log(colors.yellow + 'Starting Load Test...' + colors.reset);
  console.log(colors.yellow + `Target: ${config.baseURL}` + colors.reset);
  
  const tester = new LoadTester(config);
  
  try {
    // Check if server is running
    await axios.get(`${config.baseURL}/api/health`).catch(() => {
      throw new Error('Server is not running! Please start the server first.');
    });
    
    await tester.runLoadTest();
  } catch (error) {
    console.error(colors.red + '\nLoad test failed: ' + error.message + colors.reset);
    process.exit(1);
  }
}

// Usage examples
console.log(`
${colors.cyan}Usage Examples:${colors.reset}
  node load-test.js                                    # Default: 10 users, 20 requests each
  node load-test.js --users 50 --requests 50          # Heavy load: 50 users, 50 requests each
  node load-test.js --users 100 --requests 10 --rampup 10000  # 100 users, 10 requests, 10s ramp-up
  node load-test.js --url http://production.com       # Test production server
`);

main();