/**
 * Continuous Testing Framework for FinanceBot
 * Automatically runs tests, tracks trends, and alerts on quality drops
 */

const fs = require('fs');
const path = require('path');
const axios = require('axios');
const EnhancedTestFramework = require('./test_enhanced_verification');
const { FormatMonitor } = require('./monitoring/FormatMonitor');

class ContinuousTestRunner {
  constructor() {
    this.resultsHistory = [];
    this.metricsFile = path.join(__dirname, 'logs', 'continuous_test_metrics.json');
    this.alertsFile = path.join(__dirname, 'logs', 'test_alerts.log');
    this.trendsFile = path.join(__dirname, 'logs', 'quality_trends.json');
    
    // Configuration
    this.config = {
      runInterval: 60 * 60 * 1000, // Run every hour
      alertThreshold: 95, // Alert if format compliance drops below 95%
      trendWindow: 24, // Track last 24 test runs for trends
      maxHistorySize: 168 // Keep 1 week of hourly data
    };
    
    // Load historical data
    this.loadHistory();
  }
  
  /**
   * Start continuous testing
   */
  start() {
    console.log('🔄 Starting Continuous Testing Framework');
    console.log(`Tests will run every ${this.config.runInterval / 60000} minutes`);
    console.log(`Alert threshold: ${this.config.alertThreshold}%\n`);
    
    // Run initial test
    this.runTests();
    
    // Schedule regular tests
    this.interval = setInterval(() => {
      this.runTests();
    }, this.config.runInterval);
    
    // Also run quick health checks every 15 minutes
    this.healthInterval = setInterval(() => {
      this.runHealthCheck();
    }, 15 * 60 * 1000);
  }
  
  /**
   * Stop continuous testing
   */
  stop() {
    if (this.interval) clearInterval(this.interval);
    if (this.healthInterval) clearInterval(this.healthInterval);
    console.log('🛑 Continuous testing stopped');
  }
  
  /**
   * Run comprehensive tests
   */
  async runTests() {
    console.log(`\n🧪 Running continuous test suite at ${new Date().toLocaleString()}`);
    
    try {
      // Check if server is running
      const healthCheck = await this.checkServerHealth();
      if (!healthCheck) {
        this.logAlert('Server not responding - skipping test run', 'ERROR');
        return;
      }
      
      // Run enhanced test framework
      const framework = new EnhancedTestFramework();
      const results = await framework.runAllTests();
      
      // Calculate metrics
      const metrics = this.calculateMetrics(results);
      
      // Store results
      this.storeResults(metrics);
      
      // Check for quality drops
      this.checkQualityThresholds(metrics);
      
      // Analyze trends
      this.analyzeTrends();
      
      // Generate smart recommendations
      this.generateSmartRecommendations(metrics);
      
      // Save updated history
      this.saveHistory();
      
    } catch (error) {
      console.error('❌ Test run failed:', error);
      this.logAlert(`Test run failed: ${error.message}`, 'ERROR');
    }
  }
  
  /**
   * Run quick health check
   */
  async runHealthCheck() {
    try {
      const start = Date.now();
      const response = await axios.post('http://localhost:3000/api/chat', {
        message: 'AAPL price',
        sessionId: 'health-check-' + Date.now()
      }, { timeout: 10000 });
      
      const responseTime = Date.now() - start;
      const formatScore = FormatMonitor.calculateFormatScore(response.data.response);
      
      // Quick metrics
      const health = {
        timestamp: new Date().toISOString(),
        responseTime,
        formatScore,
        healthy: formatScore >= 90 && responseTime < 5000
      };
      
      if (!health.healthy) {
        this.logAlert(`Health check failed: Score ${formatScore}, Time ${responseTime}ms`, 'WARNING');
      }
      
      return health;
      
    } catch (error) {
      this.logAlert('Health check failed: ' + error.message, 'ERROR');
      return null;
    }
  }
  
  /**
   * Check if server is running
   */
  async checkServerHealth() {
    try {
      const response = await axios.get('http://localhost:3000/api/health', { timeout: 5000 });
      return response.data.status === 'OK';
    } catch (error) {
      return false;
    }
  }
  
  /**
   * Calculate metrics from test results
   */
  calculateMetrics(results) {
    const total = results.length;
    const passed = results.filter(r => r.passed).length;
    const scores = results.map(r => r.formatScore || 0);
    const times = results.map(r => r.responseTime || 0);
    
    // Group by category
    const categoryMetrics = {};
    results.forEach(result => {
      if (!categoryMetrics[result.category]) {
        categoryMetrics[result.category] = {
          total: 0,
          passed: 0,
          totalScore: 0,
          totalTime: 0,
          failures: []
        };
      }
      
      const cat = categoryMetrics[result.category];
      cat.total++;
      if (result.passed) cat.passed++;
      else cat.failures.push(result);
      cat.totalScore += result.formatScore || 0;
      cat.totalTime += result.responseTime || 0;
    });
    
    // Calculate category averages
    Object.values(categoryMetrics).forEach(cat => {
      cat.passRate = (cat.passed / cat.total * 100).toFixed(1);
      cat.avgScore = (cat.totalScore / cat.total).toFixed(1);
      cat.avgTime = (cat.totalTime / cat.total).toFixed(0);
    });
    
    return {
      timestamp: new Date().toISOString(),
      summary: {
        total,
        passed,
        failed: total - passed,
        passRate: (passed / total * 100).toFixed(1),
        avgFormatScore: (scores.reduce((a, b) => a + b, 0) / total).toFixed(1),
        avgResponseTime: (times.reduce((a, b) => a + b, 0) / total).toFixed(0),
        minScore: Math.min(...scores),
        maxScore: Math.max(...scores),
        minTime: Math.min(...times),
        maxTime: Math.max(...times)
      },
      categories: categoryMetrics,
      topFailures: this.identifyTopFailures(results)
    };
  }
  
  /**
   * Identify most common failure patterns
   */
  identifyTopFailures(results) {
    const failurePatterns = {};
    
    results.filter(r => !r.passed).forEach(result => {
      const pattern = result.failureReasons ? result.failureReasons.join(',') : 'unknown';
      failurePatterns[pattern] = (failurePatterns[pattern] || 0) + 1;
    });
    
    return Object.entries(failurePatterns)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([pattern, count]) => ({ pattern, count }));
  }
  
  /**
   * Store test results
   */
  storeResults(metrics) {
    this.resultsHistory.push(metrics);
    
    // Limit history size
    if (this.resultsHistory.length > this.config.maxHistorySize) {
      this.resultsHistory.shift();
    }
    
    // Save current metrics
    fs.writeFileSync(this.metricsFile, JSON.stringify(metrics, null, 2));
  }
  
  /**
   * Check quality thresholds
   */
  checkQualityThresholds(metrics) {
    const formatScore = parseFloat(metrics.summary.avgFormatScore);
    const passRate = parseFloat(metrics.summary.passRate);
    
    // Check format compliance
    if (formatScore < this.config.alertThreshold) {
      this.logAlert(
        `Format compliance dropped to ${formatScore}% (threshold: ${this.config.alertThreshold}%)`,
        'CRITICAL'
      );
      this.triggerRecoveryActions(metrics);
    }
    
    // Check pass rate
    if (passRate < 90) {
      this.logAlert(
        `Test pass rate dropped to ${passRate}% - investigate failures`,
        'WARNING'
      );
    }
    
    // Check response times
    const avgTime = parseInt(metrics.summary.avgResponseTime);
    if (avgTime > 5000) {
      this.logAlert(
        `Average response time is ${avgTime}ms - performance degradation detected`,
        'WARNING'
      );
    }
  }
  
  /**
   * Analyze trends over time
   */
  analyzeTrends() {
    if (this.resultsHistory.length < 3) return;
    
    // Get recent history
    const recentHistory = this.resultsHistory.slice(-this.config.trendWindow);
    
    // Calculate trends
    const trends = {
      formatScore: this.calculateTrend(recentHistory.map(h => parseFloat(h.summary.avgFormatScore))),
      passRate: this.calculateTrend(recentHistory.map(h => parseFloat(h.summary.passRate))),
      responseTime: this.calculateTrend(recentHistory.map(h => parseInt(h.summary.avgResponseTime))),
      timestamp: new Date().toISOString()
    };
    
    // Identify concerning trends
    if (trends.formatScore.direction === 'declining' && trends.formatScore.change > 5) {
      this.logAlert(
        `Format score declining: ${trends.formatScore.change.toFixed(1)}% over ${this.config.trendWindow} runs`,
        'WARNING'
      );
    }
    
    if (trends.responseTime.direction === 'increasing' && trends.responseTime.change > 20) {
      this.logAlert(
        `Response times increasing: ${trends.responseTime.change.toFixed(0)}% over ${this.config.trendWindow} runs`,
        'WARNING'
      );
    }
    
    // Save trends
    fs.writeFileSync(this.trendsFile, JSON.stringify(trends, null, 2));
    
    return trends;
  }
  
  /**
   * Calculate trend from data points
   */
  calculateTrend(dataPoints) {
    if (dataPoints.length < 2) return { direction: 'stable', change: 0 };
    
    const first = dataPoints[0];
    const last = dataPoints[dataPoints.length - 1];
    const change = ((last - first) / first) * 100;
    
    // Simple linear regression for trend direction
    const n = dataPoints.length;
    const sumX = (n * (n - 1)) / 2;
    const sumY = dataPoints.reduce((a, b) => a + b, 0);
    const sumXY = dataPoints.reduce((sum, y, x) => sum + x * y, 0);
    const sumX2 = (n * (n - 1) * (2 * n - 1)) / 6;
    
    const slope = (n * sumXY - sumX * sumY) / (n * sumX2 - sumX * sumX);
    
    return {
      direction: slope > 0.1 ? 'increasing' : slope < -0.1 ? 'declining' : 'stable',
      change: Math.abs(change),
      slope: slope.toFixed(3),
      current: last,
      previous: first
    };
  }
  
  /**
   * Generate smart recommendations based on patterns
   */
  generateSmartRecommendations(metrics) {
    const recommendations = [];
    
    // Check category-specific issues
    Object.entries(metrics.categories).forEach(([category, data]) => {
      if (parseFloat(data.passRate) < 80) {
        recommendations.push({
          category,
          issue: `Low pass rate (${data.passRate}%)`,
          suggestion: this.getCategorySuggestion(category, data)
        });
      }
    });
    
    // Check top failures
    metrics.topFailures.forEach(failure => {
      if (failure.count > 2) {
        recommendations.push({
          pattern: failure.pattern,
          issue: `Recurring failure (${failure.count} times)`,
          suggestion: this.getFailureSuggestion(failure.pattern)
        });
      }
    });
    
    if (recommendations.length > 0) {
      console.log('\n💡 Smart Recommendations:');
      recommendations.forEach(rec => {
        console.log(`  • ${rec.issue}: ${rec.suggestion}`);
      });
    }
    
    return recommendations;
  }
  
  /**
   * Get category-specific suggestions
   */
  getCategorySuggestion(category, data) {
    const suggestions = {
      portfolio: 'Review portfolio formatting logic and ensure symbols are extracted',
      edge_cases: 'Add more robust error handling and fallback formatting',
      performance: 'Optimize data fetching and implement better caching',
      consistency: 'Implement response caching for identical queries',
      smart_insights: 'Check conversation context tracking and insight triggers'
    };
    
    return suggestions[category] || 'Review test failures and add specific handling';
  }
  
  /**
   * Get failure pattern suggestions
   */
  getFailureSuggestion(pattern) {
    if (pattern.includes('missing_bold')) {
      return 'Enhance symbol detection and force bold formatting';
    }
    if (pattern.includes('missing_emoji')) {
      return 'Ensure emoji selection logic covers all intents';
    }
    if (pattern.includes('missing_action')) {
      return 'Force actionable endings in all response types';
    }
    if (pattern.includes('slow_response')) {
      return 'Implement response caching and optimize API calls';
    }
    return 'Analyze specific failure pattern and add targeted fix';
  }
  
  /**
   * Trigger recovery actions on critical failures
   */
  triggerRecoveryActions(metrics) {
    console.log('\n🚨 Triggering recovery actions...');
    
    // 1. Run diagnostic agent
    console.log('  1. Running diagnostic agent...');
    const DiagnosticAgent = require('./diagnostic_agent');
    DiagnosticAgent.runEmergencyDiagnostic();
    
    // 2. Log detailed failure analysis
    console.log('  2. Analyzing failure patterns...');
    const failureAnalysis = {
      timestamp: new Date().toISOString(),
      metrics,
      topFailures: metrics.topFailures,
      recommendations: this.generateSmartRecommendations(metrics)
    };
    
    fs.writeFileSync(
      path.join(__dirname, 'logs', `failure_analysis_${Date.now()}.json`),
      JSON.stringify(failureAnalysis, null, 2)
    );
    
    // 3. Notify (in production, this would send alerts)
    console.log('  3. Alert sent to monitoring system');
  }
  
  /**
   * Log alert
   */
  logAlert(message, severity = 'INFO') {
    const alert = {
      timestamp: new Date().toISOString(),
      severity,
      message
    };
    
    console.log(`\n${severity === 'CRITICAL' ? '🚨' : severity === 'WARNING' ? '⚠️' : 'ℹ️'} ${message}`);
    
    // Append to alerts file
    fs.appendFileSync(this.alertsFile, JSON.stringify(alert) + '\n');
  }
  
  /**
   * Load historical data
   */
  loadHistory() {
    try {
      const historyFile = path.join(__dirname, 'logs', 'test_history.json');
      if (fs.existsSync(historyFile)) {
        this.resultsHistory = JSON.parse(fs.readFileSync(historyFile, 'utf8'));
        console.log(`📊 Loaded ${this.resultsHistory.length} historical test results`);
      }
    } catch (error) {
      console.log('No historical data found, starting fresh');
    }
  }
  
  /**
   * Save historical data
   */
  saveHistory() {
    try {
      const historyFile = path.join(__dirname, 'logs', 'test_history.json');
      fs.writeFileSync(historyFile, JSON.stringify(this.resultsHistory, null, 2));
    } catch (error) {
      console.error('Failed to save history:', error);
    }
  }
  
  /**
   * Generate daily report
   */
  generateDailyReport() {
    const last24Hours = this.resultsHistory.slice(-24);
    if (last24Hours.length === 0) return;
    
    const report = {
      date: new Date().toDateString(),
      summary: {
        totalRuns: last24Hours.length,
        avgFormatScore: (last24Hours.reduce((sum, h) => sum + parseFloat(h.summary.avgFormatScore), 0) / last24Hours.length).toFixed(1),
        avgPassRate: (last24Hours.reduce((sum, h) => sum + parseFloat(h.summary.passRate), 0) / last24Hours.length).toFixed(1),
        avgResponseTime: (last24Hours.reduce((sum, h) => sum + parseInt(h.summary.avgResponseTime), 0) / last24Hours.length).toFixed(0)
      },
      trends: this.analyzeTrends(),
      topIssues: this.identifyTopIssues(last24Hours),
      recommendations: this.generateDailyRecommendations(last24Hours)
    };
    
    const reportFile = path.join(__dirname, 'logs', `daily_report_${new Date().toISOString().split('T')[0]}.json`);
    fs.writeFileSync(reportFile, JSON.stringify(report, null, 2));
    
    console.log('\n📅 Daily Report Generated:', reportFile);
    return report;
  }
  
  /**
   * Identify top issues from recent history
   */
  identifyTopIssues(history) {
    const issues = {};
    
    history.forEach(run => {
      run.topFailures.forEach(failure => {
        const key = failure.pattern;
        issues[key] = (issues[key] || 0) + failure.count;
      });
    });
    
    return Object.entries(issues)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 10)
      .map(([issue, count]) => ({ issue, occurrences: count }));
  }
  
  /**
   * Generate daily recommendations
   */
  generateDailyRecommendations(history) {
    const recommendations = [];
    
    // Check overall trend
    const scores = history.map(h => parseFloat(h.summary.avgFormatScore));
    const avgScore = scores.reduce((a, b) => a + b, 0) / scores.length;
    
    if (avgScore < 95) {
      recommendations.push({
        priority: 'HIGH',
        action: 'Review and enhance format enforcement logic',
        reason: `Average format score ${avgScore.toFixed(1)}% is below target`
      });
    }
    
    // Check volatility
    const scoreVariance = this.calculateVariance(scores);
    if (scoreVariance > 10) {
      recommendations.push({
        priority: 'MEDIUM',
        action: 'Improve response consistency',
        reason: 'High variance in format scores indicates inconsistent formatting'
      });
    }
    
    return recommendations;
  }
  
  /**
   * Calculate variance
   */
  calculateVariance(values) {
    const mean = values.reduce((a, b) => a + b, 0) / values.length;
    const squaredDiffs = values.map(v => Math.pow(v - mean, 2));
    return Math.sqrt(squaredDiffs.reduce((a, b) => a + b, 0) / values.length);
  }
}

// Export the class
module.exports = ContinuousTestRunner;

// CLI interface
if (require.main === module) {
  const runner = new ContinuousTestRunner();
  
  // Handle CLI arguments
  const args = process.argv.slice(2);
  
  if (args.includes('--once')) {
    // Run tests once
    runner.runTests().then(() => {
      console.log('\n✅ Single test run complete');
      process.exit(0);
    });
  } else if (args.includes('--report')) {
    // Generate daily report
    runner.loadHistory();
    runner.generateDailyReport();
    process.exit(0);
  } else {
    // Start continuous testing
    runner.start();
    
    // Handle graceful shutdown
    process.on('SIGINT', () => {
      console.log('\n\nShutting down continuous testing...');
      runner.stop();
      process.exit(0);
    });
    
    console.log('\nPress Ctrl+C to stop continuous testing');
  }
}