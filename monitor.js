const axios = require('axios');
const fs = require('fs');
const path = require('path');

class SystemMonitor {
  constructor() {
    this.monitorLog = 'monitor.log';
    this.baseUrl = 'http://localhost:3000';
    this.sessionId = `monitor-${Date.now()}`;
    this.healthCheckInterval = 5 * 60 * 1000; // 5 minutes
    this.testQueries = [
      {
        name: 'Common Word Rejection',
        query: 'who is the president?',
        shouldNotContain: ['WHO is currently trading', 'WHO:', '$'],
        shouldContain: ['focus exclusively on financial']
      },
      {
        name: 'Portfolio Intent Detection',
        query: 'help improve my portfolio',
        shouldContain: ['portfolio'],
        shouldNotContain: ['HELP is currently trading', 'HELP:', '$']
      },
      {
        name: 'No Markdown Formatting',
        query: 'analyze AAPL',
        shouldNotContain: ['**', '*'],
        shouldContain: ['AAPL', '$']
      },
      {
        name: 'Volume Formatting',
        query: 'NVDA volume',
        shouldNotContain: ['$1.2M shares', '$500K contracts'],
        shouldContain: ['shares', 'trading']
      },
      {
        name: 'Comparison Logic',
        query: 'compare AAPL vs MSFT',
        shouldContain: ['AAPL', 'MSFT'],
        shouldNotContain: ['**', '*']
      },
      {
        name: 'Non-Financial Guardrails',
        query: 'what is the weather today?',
        shouldContain: ['focus exclusively on financial'],
        shouldNotContain: ['weather', 'temperature', '$']
      }
    ];
  }

  async startMonitoring() {
    console.log('🔍 Starting system monitoring...');
    this.log('🔍 Starting system monitoring...');
    
    setInterval(() => {
      this.performHealthCheck();
    }, this.healthCheckInterval);
    
    // Run initial health check
    await this.performHealthCheck();
  }

  async performHealthCheck() {
    try {
      const timestamp = new Date().toISOString();
      console.log(`\n🔍 Health check started at ${timestamp}`);
      
      // 1. Check server health
      const healthStatus = await this.checkServerHealth();
      
      // 2. Test critical functionalities
      const testResults = await this.runCriticalTests();
      
      // 3. Check response times
      const performanceMetrics = await this.checkPerformance();
      
      // 4. Generate health report
      const healthReport = this.generateHealthReport(healthStatus, testResults, performanceMetrics);
      
      console.log(healthReport);
      this.log(healthReport);
      
      // 5. Alert if critical issues detected
      if (this.hasCriticalIssues(testResults)) {
        this.sendAlert(healthReport);
      }
      
    } catch (error) {
      const errorMsg = `[${new Date().toISOString()}] MONITOR ERROR: ${error.message}`;
      console.error(errorMsg);
      this.log(errorMsg);
    }
  }

  async checkServerHealth() {
    try {
      const response = await axios.get(`${this.baseUrl}/api/health`, {
        timeout: 10000
      });
      
      return {
        status: 'healthy',
        responseTime: response.headers['x-response-time'] || 'N/A',
        uptime: response.data.uptime || 'N/A',
        memory: response.data.memory || 'N/A'
      };
    } catch (error) {
      return {
        status: 'unhealthy',
        error: error.message,
        responseTime: 'N/A'
      };
    }
  }

  async runCriticalTests() {
    const results = [];
    
    for (const test of this.testQueries) {
      try {
        const startTime = Date.now();
        
        const response = await axios.post(`${this.baseUrl}/api/chat`, {
          message: test.query,
          sessionId: this.sessionId
        }, {
          timeout: 15000
        });
        
        const responseTime = Date.now() - startTime;
        const responseText = response.data.response;
        
        const result = {
          name: test.name,
          query: test.query,
          passed: this.validateResponse(responseText, test),
          responseTime,
          responseText,
          expectedContains: test.shouldContain,
          expectedNotContains: test.shouldNotContain,
          timestamp: new Date().toISOString()
        };
        
        results.push(result);
        
      } catch (error) {
        results.push({
          name: test.name,
          query: test.query,
          passed: false,
          error: error.message,
          responseTime: 'N/A',
          timestamp: new Date().toISOString()
        });
      }
    }
    
    return results;
  }

  validateResponse(responseText, test) {
    // Check shouldContain
    if (test.shouldContain) {
      for (const expected of test.shouldContain) {
        if (!responseText.toLowerCase().includes(expected.toLowerCase())) {
          return false;
        }
      }
    }
    
    // Check shouldNotContain
    if (test.shouldNotContain) {
      for (const unexpected of test.shouldNotContain) {
        if (responseText.includes(unexpected)) {
          return false;
        }
      }
    }
    
    return true;
  }

  async checkPerformance() {
    const metrics = {
      averageResponseTime: 0,
      slowestEndpoint: null,
      memoryUsage: 'N/A'
    };
    
    try {
      // Test response times for different endpoints
      const endpoints = [
        { name: 'Chat API', url: '/api/chat', method: 'POST', data: { message: 'hello', sessionId: this.sessionId } },
        { name: 'Health Check', url: '/api/health', method: 'GET' },
        { name: 'Session Init', url: '/api/session/init', method: 'POST' }
      ];
      
      const times = [];
      let slowestTime = 0;
      
      for (const endpoint of endpoints) {
        const startTime = Date.now();
        
        try {
          if (endpoint.method === 'POST') {
            await axios.post(`${this.baseUrl}${endpoint.url}`, endpoint.data, { timeout: 10000 });
          } else {
            await axios.get(`${this.baseUrl}${endpoint.url}`, { timeout: 10000 });
          }
          
          const responseTime = Date.now() - startTime;
          times.push(responseTime);
          
          if (responseTime > slowestTime) {
            slowestTime = responseTime;
            metrics.slowestEndpoint = `${endpoint.name} (${responseTime}ms)`;
          }
        } catch (error) {
          times.push(10000); // Treat errors as max time
        }
      }
      
      metrics.averageResponseTime = Math.round(times.reduce((a, b) => a + b, 0) / times.length);
      
    } catch (error) {
      console.error('Performance check error:', error.message);
    }
    
    return metrics;
  }

  generateHealthReport(healthStatus, testResults, performanceMetrics) {
    const timestamp = new Date().toISOString();
    const passedTests = testResults.filter(t => t.passed).length;
    const totalTests = testResults.length;
    const status = healthStatus.status === 'healthy' && passedTests === totalTests ? '✅ HEALTHY' : '❌ ISSUES DETECTED';
    
    let report = `
[${timestamp}] ${status}
========================================
Server Health: ${healthStatus.status}
Server Response Time: ${healthStatus.responseTime}
Tests Passed: ${passedTests}/${totalTests}
Average Response Time: ${performanceMetrics.averageResponseTime}ms
Slowest Endpoint: ${performanceMetrics.slowestEndpoint || 'N/A'}

Test Results:
`;
    
    testResults.forEach(test => {
      const icon = test.passed ? '✅' : '❌';
      report += `  ${icon} ${test.name} (${test.responseTime}ms)\n`;
      
      if (!test.passed) {
        report += `    Query: "${test.query}"\n`;
        if (test.error) {
          report += `    Error: ${test.error}\n`;
        } else {
          report += `    Response: "${test.responseText?.substring(0, 100)}..."\n`;
        }
      }
    });
    
    if (healthStatus.status !== 'healthy') {
      report += `\nServer Issues:\n  Error: ${healthStatus.error}\n`;
    }
    
    report += '\n---\n';
    
    return report;
  }

  hasCriticalIssues(testResults) {
    // Define critical tests that must pass
    const criticalTests = [
      'Common Word Rejection',
      'Portfolio Intent Detection',
      'No Markdown Formatting',
      'Non-Financial Guardrails'
    ];
    
    return testResults.some(test => 
      criticalTests.includes(test.name) && !test.passed
    );
  }

  sendAlert(healthReport) {
    console.error('🚨 CRITICAL ISSUE DETECTED!');
    console.error(healthReport);
    
    // In a production environment, this would send alerts via:
    // - Email
    // - Slack
    // - PagerDuty
    // - SMS
    
    this.log(`🚨 CRITICAL ALERT: ${healthReport}`);
  }

  log(message) {
    const timestamp = new Date().toISOString();
    const logEntry = `[${timestamp}] ${message}\n`;
    
    try {
      fs.appendFileSync(this.monitorLog, logEntry);
    } catch (error) {
      console.error('Failed to write to monitor log:', error);
    }
  }

  async cleanup() {
    console.log('🧹 Cleaning up monitoring session...');
    // Clean up test sessions, temporary data, etc.
  }
}

// Create and start monitor
const monitor = new SystemMonitor();

// Graceful shutdown
process.on('SIGINT', async () => {
  console.log('\n🛑 Shutting down monitor...');
  await monitor.cleanup();
  process.exit(0);
});

process.on('SIGTERM', async () => {
  console.log('\n🛑 Shutting down monitor...');
  await monitor.cleanup();
  process.exit(0);
});

// Start monitoring
if (require.main === module) {
  monitor.startMonitoring().catch(console.error);
}

module.exports = SystemMonitor;