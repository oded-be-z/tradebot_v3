/**
 * FormatMonitor - Real-time monitoring and alerting for response format compliance
 * Tracks formatting failures and triggers automatic diagnostics when thresholds are breached
 */

const fs = require('fs');
const path = require('path');

class FormatMonitor {
  constructor() {
    this.failures = [];
    this.successes = 0;
    this.total = 0;
    this.successRate = 100;
    this.alertThreshold = 95;
    this.logFile = path.join(__dirname, '..', 'logs', 'format_failures.log');
    this.metricsFile = path.join(__dirname, '..', 'logs', 'format_metrics.json');
    
    // Ensure logs directory exists
    const logsDir = path.join(__dirname, '..', 'logs');
    if (!fs.existsSync(logsDir)) {
      fs.mkdirSync(logsDir, { recursive: true });
    }
    
    // Load existing metrics if available
    this.loadMetrics();
  }
  
  /**
   * Calculate format score for a response
   */
  static calculateFormatScore(response) {
    if (!response || typeof response !== 'string') return 0;
    
    let score = 0;
    
    // Check for emojis (25 points)
    if (/[📊📈📉💰🎯⚠️🔍🔥⚔️]/.test(response)) {
      score += 25;
    }
    
    // Check for bold formatting (25 points)
    if (/\*\*[A-Z]{1,5}\*\*/.test(response)) {
      score += 25;
    }
    
    // Check for actionable ending (25 points)
    if (/want me to/i.test(response)) {
      score += 25;
    }
    
    // Check for structure - bullets or proper formatting (25 points)
    if (response.includes('•') || (response.includes('\n') && response.length > 50)) {
      score += 25;
    }
    
    return score;
  }
  
  /**
   * Track a formatting attempt
   */
  trackFormatting(query, preFormatScore, postFormatScore) {
    this.total++;
    
    const improvement = postFormatScore - preFormatScore;
    const isSuccess = postFormatScore >= 100;
    
    if (isSuccess) {
      this.successes++;
    }
    
    const record = {
      timestamp: Date.now(),
      query: query.substring(0, 100),
      preScore: preFormatScore,
      postScore: postFormatScore,
      improvement,
      success: isSuccess
    };
    
    // Log if formatting improved
    if (improvement > 0) {
      console.log(`[FORMAT-MONITOR] Format improved: ${preFormatScore} → ${postFormatScore} (+${improvement})`);
    }
    
    this.updateSuccessRate();
    this.saveMetrics();
    
    return record;
  }
  
  /**
   * Track a formatting failure
   */
  trackFailure(query, response, failureType) {
    const formatScore = FormatMonitor.calculateFormatScore(response);
    
    const failure = {
      timestamp: Date.now(),
      query: query ? query.substring(0, 100) : 'unknown',
      response: response ? response.substring(0, 200) : 'empty',
      failureType,
      formatScore,
      missedRequirements: this.identifyMissedRequirements(response)
    };
    
    // Log to file
    try {
      fs.appendFileSync(this.logFile, JSON.stringify(failure) + '\n');
    } catch (error) {
      console.error('[FORMAT-MONITOR] Failed to write to log file:', error);
    }
    
    // Update metrics
    this.failures.push(failure);
    if (this.failures.length > 100) {
      this.failures.shift(); // Keep only last 100 failures
    }
    
    this.total++;
    this.updateSuccessRate();
    
    // Alert if threshold breached
    if (this.successRate < this.alertThreshold) {
      this.triggerAlert({
        message: `Format compliance dropped to ${this.successRate.toFixed(1)}%`,
        recentFailures: this.failures.slice(-5),
        action: 'AUTO_TRIGGERING_DIAGNOSTIC',
        severity: 'CRITICAL'
      });
      
      // LLM-FIRST FIX: Disabled auto-diagnostic to prevent 429 error cascade
      // Auto-trigger diagnostic if available
      try {
        // REMOVED: DiagnosticAgent.runEmergencyDiagnostic();
        console.log('[FORMAT-MONITOR] Low success rate but NOT triggering diagnostic loop to prevent 429 errors');
        console.log('[FORMAT-MONITOR] Manual diagnostics can still be run if needed');
      } catch (error) {
        console.error('[FORMAT-MONITOR] Diagnostic agent not available:', error.message);
      }
    }
    
    this.saveMetrics();
  }
  
  /**
   * Identify which formatting requirements were missed
   */
  identifyMissedRequirements(response) {
    const missed = [];
    
    if (!response || typeof response !== 'string') {
      return ['valid_response'];
    }
    
    if (!/[📊📈📉💰🎯⚠️🔍🔥⚔️]/.test(response)) {
      missed.push('emoji');
    }
    
    if (!/\*\*[A-Z]{1,5}\*\*/.test(response)) {
      missed.push('bold_symbols');
    }
    
    if (!/want me to/i.test(response)) {
      missed.push('actionable_ending');
    }
    
    if (!response.includes('•') && (!response.includes('\n') || response.length < 50)) {
      missed.push('structure');
    }
    
    return missed;
  }
  
  /**
   * Update the overall success rate
   */
  updateSuccessRate() {
    if (this.total === 0) {
      this.successRate = 100;
    } else {
      this.successRate = (this.successes / this.total) * 100;
    }
  }
  
  /**
   * Trigger an alert
   */
  triggerAlert(alert) {
    console.error('[FORMAT-MONITOR] 🚨 ALERT:', alert.message);
    console.error('[FORMAT-MONITOR] Recent failures:', alert.recentFailures);
    
    // Log alert to file
    const alertRecord = {
      timestamp: Date.now(),
      type: 'FORMAT_COMPLIANCE_ALERT',
      ...alert
    };
    
    try {
      fs.appendFileSync(
        path.join(__dirname, '..', 'logs', 'format_alerts.log'),
        JSON.stringify(alertRecord) + '\n'
      );
    } catch (error) {
      console.error('[FORMAT-MONITOR] Failed to log alert:', error);
    }
  }
  
  /**
   * Get current metrics
   */
  getMetrics() {
    return {
      successRate: this.successRate.toFixed(1),
      total: this.total,
      successes: this.successes,
      failures: this.total - this.successes,
      recentFailures: this.failures.slice(-10),
      last24Hours: this.getLast24HourMetrics(),
      topFailureTypes: this.getFailureTypeBreakdown()
    };
  }
  
  /**
   * Get metrics for last 24 hours
   */
  getLast24HourMetrics() {
    const oneDayAgo = Date.now() - (24 * 60 * 60 * 1000);
    const recentFailures = this.failures.filter(f => f.timestamp > oneDayAgo);
    
    return {
      failures: recentFailures.length,
      topMissedRequirements: this.aggregateMissedRequirements(recentFailures)
    };
  }
  
  /**
   * Get breakdown of failure types
   */
  getFailureTypeBreakdown() {
    const breakdown = {};
    
    this.failures.forEach(failure => {
      const type = failure.failureType || 'unknown';
      breakdown[type] = (breakdown[type] || 0) + 1;
    });
    
    return Object.entries(breakdown)
      .sort((a, b) => b[1] - a[1])
      .map(([type, count]) => ({ type, count, percentage: ((count / this.failures.length) * 100).toFixed(1) }));
  }
  
  /**
   * Aggregate missed requirements
   */
  aggregateMissedRequirements(failures) {
    const requirements = {};
    
    failures.forEach(failure => {
      if (failure.missedRequirements) {
        failure.missedRequirements.forEach(req => {
          requirements[req] = (requirements[req] || 0) + 1;
        });
      }
    });
    
    return Object.entries(requirements)
      .sort((a, b) => b[1] - a[1])
      .map(([requirement, count]) => ({ requirement, count }));
  }
  
  /**
   * Save metrics to file
   */
  saveMetrics() {
    try {
      const metrics = this.getMetrics();
      fs.writeFileSync(this.metricsFile, JSON.stringify(metrics, null, 2));
    } catch (error) {
      console.error('[FORMAT-MONITOR] Failed to save metrics:', error);
    }
  }
  
  /**
   * Load metrics from file
   */
  loadMetrics() {
    try {
      if (fs.existsSync(this.metricsFile)) {
        const data = JSON.parse(fs.readFileSync(this.metricsFile, 'utf8'));
        this.total = data.total || 0;
        this.successes = data.successes || 0;
        this.updateSuccessRate();
      }
    } catch (error) {
      console.error('[FORMAT-MONITOR] Failed to load metrics:', error);
    }
  }
  
  /**
   * Generate a dashboard report
   */
  static generateDashboard() {
    const monitor = new FormatMonitor();
    const metrics = monitor.getMetrics();
    
    return {
      title: 'Format Compliance Dashboard',
      timestamp: new Date().toISOString(),
      overall: {
        successRate: metrics.successRate + '%',
        totalResponses: metrics.total,
        failureCount: metrics.failures
      },
      last24Hours: metrics.last24Hours,
      topFailures: metrics.topFailureTypes,
      status: metrics.successRate >= 95 ? 'HEALTHY' : 'CRITICAL'
    };
  }
}

// Create singleton instance
const formatMonitor = new FormatMonitor();

module.exports = { FormatMonitor, formatMonitor };