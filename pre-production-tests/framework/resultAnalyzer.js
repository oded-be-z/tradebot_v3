/**
 * Result Analyzer for Pre-Production Tests
 * Analyzes test results and identifies patterns, trends, and root causes
 */

class ResultAnalyzer {
  constructor() {
    this.patterns = {
      commonFailures: new Map(),
      performanceBottlenecks: [],
      securityWeaknesses: [],
      contextIssues: []
    };
  }

  /**
   * Analyze all test results and identify patterns
   */
  analyzeResults(results) {
    const analysis = {
      summary: this.generateSummary(results),
      bugAnalysis: this.analyzeBugs(results.bugs),
      performanceAnalysis: this.analyzePerformance(results.performance),
      securityAnalysis: this.analyzeSecurity(results.security),
      failurePatterns: this.identifyFailurePatterns(results),
      rootCauses: this.identifyRootCauses(results),
      riskAssessment: this.assessRisks(results),
      prioritizedFixes: this.prioritizeFixes(results)
    };

    return analysis;
  }

  /**
   * Generate executive summary
   */
  generateSummary(results) {
    const functionalHealth = this.calculateFunctionalHealth(results.functional);
    const securityScore = results.security?.grade || 'N/A';
    const performanceScore = results.performance?.grade || 'N/A';
    
    return {
      overallHealth: this.calculateOverallHealth(functionalHealth, securityScore, performanceScore),
      functionalCoverage: functionalHealth,
      securityPosture: securityScore,
      performanceGrade: performanceScore,
      criticalCount: results.criticalIssues?.length || 0,
      bugCount: results.bugs?.length || 0,
      productionReadiness: this.assessProductionReadiness(results)
    };
  }

  /**
   * Analyze bug patterns
   */
  analyzeBugs(bugs) {
    if (!bugs || bugs.length === 0) {
      return { patterns: [], recommendations: ['No bugs found - excellent!'] };
    }

    // Group bugs by category
    const bugsByCategory = {};
    bugs.forEach(bug => {
      const category = bug.category || 'uncategorized';
      if (!bugsByCategory[category]) {
        bugsByCategory[category] = [];
      }
      bugsByCategory[category].push(bug);
    });

    // Identify patterns
    const patterns = [];
    
    // Check for symbol extraction issues
    const symbolBugs = bugs.filter(b => 
      b.error?.includes('symbol') || 
      b.error?.includes('Missing symbols')
    );
    if (symbolBugs.length > 3) {
      patterns.push({
        type: 'symbol_extraction',
        count: symbolBugs.length,
        severity: 'high',
        examples: symbolBugs.slice(0, 3)
      });
    }

    // Check for intent classification issues
    const intentBugs = bugs.filter(b => 
      b.error?.includes('intent') ||
      b.error?.includes('Expected intent')
    );
    if (intentBugs.length > 3) {
      patterns.push({
        type: 'intent_classification',
        count: intentBugs.length,
        severity: 'medium',
        examples: intentBugs.slice(0, 3)
      });
    }

    // Check for response format issues
    const formatBugs = bugs.filter(b => 
      b.error?.includes('format') ||
      b.error?.includes('No price found')
    );
    if (formatBugs.length > 3) {
      patterns.push({
        type: 'response_formatting',
        count: formatBugs.length,
        severity: 'medium',
        examples: formatBugs.slice(0, 3)
      });
    }

    return {
      totalBugs: bugs.length,
      byCategory: bugsByCategory,
      patterns: patterns,
      recommendations: this.generateBugFixRecommendations(patterns)
    };
  }

  /**
   * Analyze performance metrics
   */
  analyzePerformance(performance) {
    if (!performance) {
      return { status: 'no_data' };
    }

    const analysis = {
      responseTime: {
        status: this.evaluateResponseTime(performance.responseTime),
        bottlenecks: []
      },
      throughput: {
        actual: performance.summary?.throughput,
        status: this.evaluateThroughput(performance.summary?.throughput)
      },
      scalability: this.evaluateScalability(performance),
      recommendations: []
    };

    // Identify bottlenecks
    if (performance.responseTime?.p95 > 3000) {
      analysis.responseTime.bottlenecks.push('High P95 latency indicates slow queries');
    }
    if (performance.errors?.rateLimits > 10) {
      analysis.responseTime.bottlenecks.push('Frequent rate limiting suggests capacity issues');
    }

    // Generate recommendations
    if (analysis.responseTime.status === 'poor') {
      analysis.recommendations.push('Optimize slow queries and implement caching');
    }
    if (performance.errors?.timeouts > 5) {
      analysis.recommendations.push('Review timeout settings and query complexity');
    }

    return analysis;
  }

  /**
   * Analyze security test results
   */
  analyzeSecurity(security) {
    if (!security) {
      return { status: 'no_data' };
    }

    const analysis = {
      overallScore: security.grade,
      vulnerabilities: {
        critical: security.vulnerabilities?.bySeverity?.critical || 0,
        high: security.vulnerabilities?.bySeverity?.high || 0,
        medium: security.vulnerabilities?.bySeverity?.medium || 0
      },
      weakAreas: [],
      strengths: [],
      recommendations: security.recommendations || []
    };

    // Identify weak areas
    if (analysis.vulnerabilities.critical > 0) {
      analysis.weakAreas.push('Critical vulnerabilities found - immediate action required');
    }
    if (security.summary?.successfulBypasses > 0) {
      analysis.weakAreas.push(`${security.summary.successfulBypasses} security bypasses detected`);
    }

    // Identify strengths
    if (security.summary?.blockedAttempts > security.summary?.successfulBypasses) {
      analysis.strengths.push('Good security filtering in place');
    }
    if (analysis.vulnerabilities.critical === 0) {
      analysis.strengths.push('No critical vulnerabilities');
    }

    return analysis;
  }

  /**
   * Identify failure patterns across all tests
   */
  identifyFailurePatterns(results) {
    const patterns = [];
    
    // Check for consistent failures in specific areas
    const failuresByType = {};
    
    // Analyze functional test failures
    Object.entries(results.functional || {}).forEach(([category, data]) => {
      if (data.failed > 0) {
        failuresByType[category] = {
          failures: data.failed,
          total: data.total,
          rate: (data.failed / data.total * 100).toFixed(1)
        };
      }
    });

    // Sort by failure rate
    const sortedFailures = Object.entries(failuresByType)
      .sort((a, b) => parseFloat(b[1].rate) - parseFloat(a[1].rate));

    if (sortedFailures.length > 0) {
      patterns.push({
        type: 'high_failure_categories',
        data: sortedFailures.slice(0, 5),
        severity: sortedFailures[0][1].rate > 20 ? 'high' : 'medium'
      });
    }

    // Check for timeout patterns
    if (results.performance?.errors?.timeouts > 10) {
      patterns.push({
        type: 'frequent_timeouts',
        count: results.performance.errors.timeouts,
        severity: 'high'
      });
    }

    // Check for rate limit patterns
    if (results.performance?.errors?.rateLimits > 20) {
      patterns.push({
        type: 'rate_limit_issues',
        count: results.performance.errors.rateLimits,
        severity: 'medium'
      });
    }

    return patterns;
  }

  /**
   * Identify root causes of failures
   */
  identifyRootCauses(results) {
    const rootCauses = [];

    // Analyze bug patterns for root causes
    if (results.bugs && results.bugs.length > 10) {
      const errorMessages = results.bugs.map(b => b.error).filter(Boolean);
      
      // Look for common error patterns
      const errorPatterns = this.findCommonPatterns(errorMessages);
      errorPatterns.forEach(pattern => {
        rootCauses.push({
          issue: pattern.pattern,
          frequency: pattern.count,
          likelyCause: this.inferCause(pattern.pattern),
          examples: pattern.examples.slice(0, 3)
        });
      });
    }

    // Performance root causes
    if (results.performance?.responseTime?.p99 > 5000) {
      rootCauses.push({
        issue: 'Extreme latency spikes',
        likelyCause: 'Complex queries or resource contention',
        recommendation: 'Profile slow queries and optimize'
      });
    }

    // Security root causes
    if (results.security?.vulnerabilities?.total > 5) {
      rootCauses.push({
        issue: 'Multiple security vulnerabilities',
        likelyCause: 'Insufficient input validation',
        recommendation: 'Implement comprehensive input sanitization'
      });
    }

    return rootCauses;
  }

  /**
   * Assess production risks
   */
  assessRisks(results) {
    const risks = [];

    // Critical issues are high risk
    if (results.criticalIssues && results.criticalIssues.length > 0) {
      risks.push({
        level: 'CRITICAL',
        category: 'functionality',
        description: `${results.criticalIssues.length} critical issues blocking production`,
        mitigation: 'Must fix all critical issues before deployment'
      });
    }

    // Security vulnerabilities
    if (results.security?.vulnerabilities?.critical > 0) {
      risks.push({
        level: 'CRITICAL',
        category: 'security',
        description: 'Critical security vulnerabilities present',
        mitigation: 'Patch all security holes immediately'
      });
    }

    // Performance risks
    if (results.performance?.grade === 'D' || results.performance?.grade === 'F') {
      risks.push({
        level: 'HIGH',
        category: 'performance',
        description: 'Poor performance under load',
        mitigation: 'Optimize before expecting production traffic'
      });
    }

    // Stability risks
    const errorRate = this.calculateErrorRate(results);
    if (errorRate > 5) {
      risks.push({
        level: 'HIGH',
        category: 'stability',
        description: `${errorRate.toFixed(1)}% error rate is too high`,
        mitigation: 'Improve error handling and stability'
      });
    }

    return {
      risks: risks,
      overallRiskLevel: this.calculateOverallRisk(risks),
      goNoGo: risks.filter(r => r.level === 'CRITICAL').length === 0 ? 'CONDITIONAL_GO' : 'NO_GO'
    };
  }

  /**
   * Prioritize fixes based on impact and severity
   */
  prioritizeFixes(results) {
    const fixes = [];

    // Critical issues first
    results.criticalIssues?.forEach(issue => {
      fixes.push({
        priority: 1,
        severity: 'CRITICAL',
        category: issue.type,
        description: issue.error || issue.issue,
        estimatedImpact: 'Blocks production deployment'
      });
    });

    // High-impact bugs
    const bugAnalysis = this.analyzeBugs(results.bugs);
    bugAnalysis.patterns?.forEach(pattern => {
      if (pattern.severity === 'high') {
        fixes.push({
          priority: 2,
          severity: 'HIGH',
          category: pattern.type,
          description: `Fix ${pattern.count} ${pattern.type} issues`,
          estimatedImpact: `Affects ${pattern.count} test cases`
        });
      }
    });

    // Security vulnerabilities
    if (results.security?.vulnerabilities?.details) {
      results.security.vulnerabilities.details.forEach(vuln => {
        fixes.push({
          priority: vuln.severity === 'critical' ? 1 : 3,
          severity: vuln.severity.toUpperCase(),
          category: 'security',
          description: vuln.test,
          estimatedImpact: 'Security risk'
        });
      });
    }

    // Performance issues
    if (results.performance?.responseTime?.p95 > 3000) {
      fixes.push({
        priority: 3,
        severity: 'MEDIUM',
        category: 'performance',
        description: 'Optimize queries with >3s P95 latency',
        estimatedImpact: 'Poor user experience'
      });
    }

    // Sort by priority
    return fixes.sort((a, b) => a.priority - b.priority);
  }

  /**
   * Helper methods
   */
  calculateFunctionalHealth(functional) {
    if (!functional) return 0;

    let totalTests = 0;
    let totalPassed = 0;

    Object.values(functional).forEach(category => {
      if (category.total) {
        totalTests += category.total;
        totalPassed += category.passed;
      }
    });

    return totalTests > 0 ? (totalPassed / totalTests * 100).toFixed(1) : 0;
  }

  calculateOverallHealth(functional, security, performance) {
    const scores = {
      functional: parseFloat(functional) || 0,
      security: this.gradeToScore(security),
      performance: this.gradeToScore(performance)
    };

    const avg = (scores.functional + scores.security + scores.performance) / 3;
    
    if (avg >= 90) return 'EXCELLENT';
    if (avg >= 80) return 'GOOD';
    if (avg >= 70) return 'FAIR';
    if (avg >= 60) return 'POOR';
    return 'CRITICAL';
  }

  gradeToScore(grade) {
    const gradeMap = {
      'A+': 100, 'A': 95, 'B+': 85, 'B': 80,
      'C+': 75, 'C': 70, 'D': 60, 'F': 40
    };
    return gradeMap[grade] || 0;
  }

  assessProductionReadiness(results) {
    const factors = {
      noCriticalIssues: !results.criticalIssues || results.criticalIssues.length === 0,
      goodFunctionalCoverage: this.calculateFunctionalHealth(results.functional) >= 95,
      acceptableSecurity: !results.security || results.security.grade !== 'F',
      acceptablePerformance: !results.performance || results.performance.grade !== 'F',
      lowErrorRate: this.calculateErrorRate(results) < 5
    };

    const readyFactors = Object.values(factors).filter(f => f).length;
    const totalFactors = Object.values(factors).length;

    return {
      ready: readyFactors === totalFactors,
      score: `${readyFactors}/${totalFactors}`,
      factors: factors
    };
  }

  evaluateResponseTime(responseTime) {
    if (!responseTime) return 'no_data';
    if (responseTime.p95 < 1000) return 'excellent';
    if (responseTime.p95 < 2000) return 'good';
    if (responseTime.p95 < 3000) return 'acceptable';
    return 'poor';
  }

  evaluateThroughput(throughput) {
    if (!throughput) return 'no_data';
    const tps = parseFloat(throughput);
    if (tps > 50) return 'excellent';
    if (tps > 20) return 'good';
    if (tps > 10) return 'acceptable';
    return 'poor';
  }

  evaluateScalability(performance) {
    if (!performance.load) return 'unknown';
    
    const factors = {
      handlesConcurrency: performance.load.peakConcurrency >= 10,
      maintainsThroughput: performance.load.sustainedThroughput > 10,
      lowErrorUnderLoad: performance.errors?.total < performance.summary?.totalRequests * 0.05
    };

    const score = Object.values(factors).filter(f => f).length;
    if (score === 3) return 'excellent';
    if (score === 2) return 'good';
    if (score === 1) return 'poor';
    return 'critical';
  }

  generateBugFixRecommendations(patterns) {
    const recommendations = [];

    patterns.forEach(pattern => {
      switch (pattern.type) {
        case 'symbol_extraction':
          recommendations.push('Review and improve symbol extraction logic');
          recommendations.push('Add more test cases for edge case symbols');
          break;
        case 'intent_classification':
          recommendations.push('Enhance intent classification model or rules');
          recommendations.push('Add training data for misclassified intents');
          break;
        case 'response_formatting':
          recommendations.push('Standardize response format across all endpoints');
          recommendations.push('Add validation for required response fields');
          break;
      }
    });

    return [...new Set(recommendations)]; // Remove duplicates
  }

  findCommonPatterns(messages) {
    const patterns = {};
    
    messages.forEach(msg => {
      // Extract key phrases
      const keyPhrases = [
        'Missing symbols',
        'Expected intent',
        'No price found',
        'Status 4',
        'timeout',
        'rate limit'
      ];

      keyPhrases.forEach(phrase => {
        if (msg.includes(phrase)) {
          if (!patterns[phrase]) {
            patterns[phrase] = { pattern: phrase, count: 0, examples: [] };
          }
          patterns[phrase].count++;
          if (patterns[phrase].examples.length < 5) {
            patterns[phrase].examples.push(msg);
          }
        }
      });
    });

    return Object.values(patterns).sort((a, b) => b.count - a.count);
  }

  inferCause(pattern) {
    const causeMap = {
      'Missing symbols': 'Symbol extraction failing for certain query formats',
      'Expected intent': 'Intent classification model needs improvement',
      'No price found': 'Response formatting inconsistent',
      'Status 4': 'Client errors - likely validation issues',
      'timeout': 'Queries taking too long - optimization needed',
      'rate limit': 'Too many requests - need better rate limiting'
    };

    return causeMap[pattern] || 'Unknown cause - requires investigation';
  }

  calculateErrorRate(results) {
    if (!results.performance?.summary) return 0;
    
    const total = results.performance.summary.totalRequests || 1;
    const errors = results.performance.errors?.total || 0;
    
    return (errors / total) * 100;
  }

  calculateOverallRisk(risks) {
    if (risks.some(r => r.level === 'CRITICAL')) return 'CRITICAL';
    if (risks.filter(r => r.level === 'HIGH').length >= 2) return 'HIGH';
    if (risks.some(r => r.level === 'HIGH')) return 'MEDIUM';
    if (risks.length > 0) return 'LOW';
    return 'MINIMAL';
  }
}

module.exports = ResultAnalyzer;