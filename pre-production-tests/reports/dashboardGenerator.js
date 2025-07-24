/**
 * Visual Dashboard Generator for Test Results
 * Creates an interactive HTML dashboard with charts and visualizations
 */

const ResultAnalyzer = require('../framework/resultAnalyzer');

class DashboardGenerator {
  constructor() {
    this.analyzer = new ResultAnalyzer();
  }

  /**
   * Generate complete HTML dashboard
   */
  generateHTML(results) {
    const analysis = this.analyzer.analyzeResults(results);
    
    return `
<!DOCTYPE html>
<html lang="en">
<head>
    <meta charset="UTF-8">
    <meta name="viewport" content="width=device-width, initial-scale=1.0">
    <title>FinanceBot Pro - Pre-Production Test Dashboard</title>
    <script src="https://cdn.jsdelivr.net/npm/chart.js"></script>
    <style>
        ${this.generateCSS()}
    </style>
</head>
<body>
    <div class="container">
        ${this.generateHeader(results.summary)}
        ${this.generateExecutiveSummary(results.summary, analysis)}
        ${this.generateQuickStats(results)}
        ${this.generateFunctionalTestResults(results.functional)}
        ${this.generateSecurityReport(results.security)}
        ${this.generatePerformanceReport(results.performance)}
        ${this.generateBugHeatmap(analysis.bugAnalysis)}
        ${this.generateCriticalIssues(results.criticalIssues)}
        ${this.generateRecommendations(results.recommendations)}
        ${this.generateFooter()}
    </div>
    <script>
        ${this.generateJavaScript(results, analysis)}
    </script>
</body>
</html>
    `;
  }

  /**
   * Generate CSS styles
   */
  generateCSS() {
    return `
        * {
            margin: 0;
            padding: 0;
            box-sizing: border-box;
        }

        body {
            font-family: -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif;
            background: #0a0a0a;
            color: #e0e0e0;
            line-height: 1.6;
        }

        .container {
            max-width: 1400px;
            margin: 0 auto;
            padding: 20px;
        }

        .header {
            text-align: center;
            padding: 40px 0;
            background: linear-gradient(135deg, #1a1a2e, #16213e);
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 8px 32px rgba(0, 0, 0, 0.3);
        }

        .header h1 {
            font-size: 2.5em;
            margin-bottom: 10px;
            background: linear-gradient(45deg, #00d4ff, #0099ff);
            -webkit-background-clip: text;
            -webkit-text-fill-color: transparent;
        }

        .timestamp {
            color: #888;
            font-size: 0.9em;
        }

        .executive-summary {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(300px, 1fr));
            gap: 20px;
            margin-bottom: 40px;
        }

        .summary-card {
            background: #1a1a2e;
            padding: 25px;
            border-radius: 12px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
            transition: transform 0.3s ease;
        }

        .summary-card:hover {
            transform: translateY(-5px);
        }

        .summary-card h3 {
            font-size: 1.2em;
            margin-bottom: 15px;
            color: #00d4ff;
        }

        .big-number {
            font-size: 3em;
            font-weight: bold;
            margin: 10px 0;
        }

        .status-badge {
            display: inline-block;
            padding: 5px 15px;
            border-radius: 20px;
            font-size: 0.9em;
            font-weight: bold;
            text-transform: uppercase;
        }

        .status-ready {
            background: #10b981;
            color: white;
        }

        .status-not-ready {
            background: #ef4444;
            color: white;
        }

        .status-warning {
            background: #f59e0b;
            color: white;
        }

        .quick-stats {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(200px, 1fr));
            gap: 15px;
            margin-bottom: 40px;
        }

        .stat-card {
            background: linear-gradient(135deg, #1e293b, #334155);
            padding: 20px;
            border-radius: 8px;
            text-align: center;
            border: 1px solid #334155;
        }

        .stat-card .value {
            font-size: 2em;
            font-weight: bold;
            margin: 5px 0;
        }

        .stat-card .label {
            color: #94a3b8;
            font-size: 0.9em;
        }

        .section {
            background: #1a1a2e;
            padding: 30px;
            border-radius: 12px;
            margin-bottom: 30px;
            box-shadow: 0 4px 20px rgba(0, 0, 0, 0.3);
        }

        .section h2 {
            font-size: 1.8em;
            margin-bottom: 20px;
            color: #00d4ff;
            border-bottom: 2px solid #334155;
            padding-bottom: 10px;
        }

        .test-results {
            display: grid;
            gap: 20px;
        }

        .test-category {
            background: #0f172a;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #00d4ff;
        }

        .test-category h3 {
            margin-bottom: 15px;
            color: #e2e8f0;
        }

        .progress-bar {
            width: 100%;
            height: 30px;
            background: #334155;
            border-radius: 15px;
            overflow: hidden;
            margin: 10px 0;
        }

        .progress-fill {
            height: 100%;
            background: linear-gradient(90deg, #10b981, #00d4ff);
            display: flex;
            align-items: center;
            justify-content: center;
            color: white;
            font-weight: bold;
            transition: width 0.5s ease;
        }

        .chart-container {
            position: relative;
            height: 300px;
            margin: 20px 0;
        }

        .bug-heatmap {
            display: grid;
            grid-template-columns: repeat(auto-fit, minmax(150px, 1fr));
            gap: 10px;
            margin: 20px 0;
        }

        .heatmap-cell {
            padding: 20px;
            text-align: center;
            border-radius: 8px;
            color: white;
            font-weight: bold;
        }

        .severity-low { background: #10b981; }
        .severity-medium { background: #f59e0b; }
        .severity-high { background: #ef4444; }
        .severity-critical { background: #dc2626; }

        .issues-list {
            list-style: none;
            padding: 0;
        }

        .issue-item {
            background: #0f172a;
            padding: 15px;
            margin: 10px 0;
            border-radius: 8px;
            border-left: 4px solid #ef4444;
        }

        .issue-item h4 {
            color: #f87171;
            margin-bottom: 5px;
        }

        .recommendations {
            display: grid;
            gap: 15px;
        }

        .recommendation {
            background: #0f172a;
            padding: 20px;
            border-radius: 8px;
            border-left: 4px solid #f59e0b;
        }

        .priority-critical {
            border-left-color: #ef4444;
        }

        .priority-high {
            border-left-color: #f59e0b;
        }

        .priority-medium {
            border-left-color: #3b82f6;
        }

        .footer {
            text-align: center;
            padding: 40px 0;
            color: #64748b;
            border-top: 1px solid #334155;
            margin-top: 50px;
        }

        table {
            width: 100%;
            border-collapse: collapse;
            margin: 20px 0;
        }

        th, td {
            padding: 12px;
            text-align: left;
            border-bottom: 1px solid #334155;
        }

        th {
            background: #0f172a;
            color: #00d4ff;
            font-weight: bold;
        }

        tr:hover {
            background: #1e293b;
        }

        .grade-a { color: #10b981; }
        .grade-b { color: #3b82f6; }
        .grade-c { color: #f59e0b; }
        .grade-d { color: #ef4444; }
        .grade-f { color: #dc2626; }

        @keyframes pulse {
            0% { opacity: 1; }
            50% { opacity: 0.5; }
            100% { opacity: 1; }
        }

        .critical {
            animation: pulse 2s infinite;
        }

        .tooltip {
            position: relative;
            display: inline-block;
            cursor: help;
        }

        .tooltip .tooltiptext {
            visibility: hidden;
            width: 200px;
            background-color: #334155;
            color: #fff;
            text-align: center;
            border-radius: 6px;
            padding: 10px;
            position: absolute;
            z-index: 1;
            bottom: 125%;
            left: 50%;
            margin-left: -100px;
            opacity: 0;
            transition: opacity 0.3s;
        }

        .tooltip:hover .tooltiptext {
            visibility: visible;
            opacity: 1;
        }
    `;
  }

  /**
   * Generate header section
   */
  generateHeader(summary) {
    return `
        <div class="header">
            <h1>🚀 FinanceBot Pro - Pre-Production Test Results</h1>
            <div class="timestamp">Generated: ${new Date(summary.timestamp).toLocaleString()}</div>
            <div class="timestamp">Duration: ${summary.duration} | Total Tests: ${summary.totalTests}</div>
        </div>
    `;
  }

  /**
   * Generate executive summary
   */
  generateExecutiveSummary(summary, analysis) {
    const readyClass = summary.productionReady ? 'status-ready' : 'status-not-ready';
    const readyText = summary.productionReady ? 'PRODUCTION READY' : 'NOT READY';

    return `
        <div class="executive-summary">
            <div class="summary-card">
                <h3>Overall Status</h3>
                <div class="big-number ${summary.productionReady ? 'grade-a' : 'grade-f'}">${summary.passRate}</div>
                <div>Pass Rate</div>
                <div class="status-badge ${readyClass}">${readyText}</div>
            </div>
            
            <div class="summary-card">
                <h3>System Health</h3>
                <div class="big-number ${this.getHealthColor(analysis.summary.overallHealth)}">${analysis.summary.overallHealth}</div>
                <div>Overall Health Score</div>
                <div style="margin-top: 10px;">
                    <small>Security: ${analysis.summary.securityPosture}</small><br>
                    <small>Performance: ${analysis.summary.performanceGrade}</small>
                </div>
            </div>
            
            <div class="summary-card">
                <h3>Critical Metrics</h3>
                <div style="display: grid; grid-template-columns: 1fr 1fr; gap: 15px; margin-top: 15px;">
                    <div>
                        <div class="big-number grade-f">${summary.criticalIssues}</div>
                        <div>Critical Issues</div>
                    </div>
                    <div>
                        <div class="big-number grade-c">${summary.bugs}</div>
                        <div>Bugs Found</div>
                    </div>
                </div>
            </div>
        </div>
    `;
  }

  /**
   * Generate quick stats grid
   */
  generateQuickStats(results) {
    const stats = [
      { label: 'Tests Passed', value: results.summary.passed, color: 'grade-a' },
      { label: 'Tests Failed', value: results.summary.failed, color: 'grade-f' },
      { label: 'Security Grade', value: results.security?.grade || 'N/A', color: this.getGradeColor(results.security?.grade) },
      { label: 'P95 Response', value: results.performance?.responseTime?.p95 ? `${results.performance.responseTime.p95}ms` : 'N/A', color: 'grade-b' },
      { label: 'Throughput', value: results.performance?.summary?.throughput || 'N/A', color: 'grade-b' },
      { label: 'Error Rate', value: results.performance?.summary?.errorRate || '0%', color: 'grade-c' }
    ];

    return `
        <div class="quick-stats">
            ${stats.map(stat => `
                <div class="stat-card">
                    <div class="label">${stat.label}</div>
                    <div class="value ${stat.color}">${stat.value}</div>
                </div>
            `).join('')}
        </div>
    `;
  }

  /**
   * Generate functional test results section
   */
  generateFunctionalTestResults(functional) {
    if (!functional) return '';

    const categories = Object.entries(functional).filter(([_, data]) => data.total);

    return `
        <div class="section">
            <h2>📋 Functional Test Results</h2>
            <div class="test-results">
                ${categories.map(([category, data]) => this.generateTestCategory(category, data)).join('')}
            </div>
            <div class="chart-container">
                <canvas id="functionalChart"></canvas>
            </div>
        </div>
    `;
  }

  /**
   * Generate individual test category
   */
  generateTestCategory(name, data) {
    const passRate = data.total > 0 ? (data.passed / data.total * 100).toFixed(1) : 0;
    
    return `
        <div class="test-category">
            <h3>${this.formatCategoryName(name)}</h3>
            <div class="progress-bar">
                <div class="progress-fill" style="width: ${passRate}%">
                    ${passRate}% (${data.passed}/${data.total})
                </div>
            </div>
            ${data.bugs && data.bugs.length > 0 ? `
                <details style="margin-top: 10px;">
                    <summary style="cursor: pointer; color: #f87171;">
                        ${data.bugs.length} issues found
                    </summary>
                    <ul style="margin-top: 10px; padding-left: 20px;">
                        ${data.bugs.slice(0, 3).map(bug => `
                            <li style="margin: 5px 0; color: #94a3b8;">
                                ${bug.test}: ${bug.error}
                            </li>
                        `).join('')}
                        ${data.bugs.length > 3 ? `<li style="color: #64748b;">... and ${data.bugs.length - 3} more</li>` : ''}
                    </ul>
                </details>
            ` : ''}
        </div>
    `;
  }

  /**
   * Generate security report section
   */
  generateSecurityReport(security) {
    if (!security) return '';

    return `
        <div class="section">
            <h2>🔒 Security Assessment</h2>
            <div class="executive-summary">
                <div class="summary-card">
                    <h3>Security Grade</h3>
                    <div class="big-number ${this.getGradeColor(security.grade)}">${security.grade}</div>
                    <div>${security.summary.passed}/${security.summary.totalTests} tests passed</div>
                </div>
                
                <div class="summary-card">
                    <h3>Attack Results</h3>
                    <div style="margin-top: 15px;">
                        <div>🛡️ Blocked: ${security.summary.blockedAttempts}</div>
                        <div>⚠️ Bypassed: ${security.summary.successfulBypasses}</div>
                    </div>
                </div>
                
                <div class="summary-card">
                    <h3>Vulnerabilities</h3>
                    <div style="display: grid; grid-template-columns: repeat(3, 1fr); gap: 10px; margin-top: 15px;">
                        <div>
                            <div class="big-number grade-f">${security.vulnerabilities.bySeverity.critical}</div>
                            <div>Critical</div>
                        </div>
                        <div>
                            <div class="big-number grade-c">${security.vulnerabilities.bySeverity.high}</div>
                            <div>High</div>
                        </div>
                        <div>
                            <div class="big-number grade-b">${security.vulnerabilities.bySeverity.medium}</div>
                            <div>Medium</div>
                        </div>
                    </div>
                </div>
            </div>
            
            ${security.vulnerabilities.details.length > 0 ? `
                <h3 style="margin-top: 30px; color: #f87171;">Security Issues Found</h3>
                <ul class="issues-list">
                    ${security.vulnerabilities.details.slice(0, 5).map(vuln => `
                        <li class="issue-item">
                            <h4>${vuln.test} (${vuln.severity})</h4>
                            <div>${vuln.issues.join(', ')}</div>
                        </li>
                    `).join('')}
                </ul>
            ` : ''}
        </div>
    `;
  }

  /**
   * Generate performance report section
   */
  generatePerformanceReport(performance) {
    if (!performance) return '';

    return `
        <div class="section">
            <h2>⚡ Performance Metrics</h2>
            <div class="executive-summary">
                <div class="summary-card">
                    <h3>Response Time</h3>
                    <table style="width: 100%; margin-top: 10px;">
                        <tr>
                            <td>P50</td>
                            <td class="grade-a">${performance.responseTime.p50}ms</td>
                        </tr>
                        <tr>
                            <td>P95</td>
                            <td class="${performance.responseTime.p95 < 3000 ? 'grade-b' : 'grade-c'}">${performance.responseTime.p95}ms</td>
                        </tr>
                        <tr>
                            <td>P99</td>
                            <td class="${performance.responseTime.p99 < 5000 ? 'grade-c' : 'grade-f'}">${performance.responseTime.p99}ms</td>
                        </tr>
                    </table>
                </div>
                
                <div class="summary-card">
                    <h3>Throughput & Errors</h3>
                    <div style="margin-top: 15px;">
                        <div>📊 Throughput: ${performance.summary.throughput}</div>
                        <div>❌ Error Rate: ${performance.summary.errorRate}</div>
                        <div>⏱️ Timeouts: ${performance.errors.timeouts}</div>
                        <div>🚫 Rate Limits: ${performance.errors.rateLimits}</div>
                    </div>
                </div>
                
                <div class="summary-card">
                    <h3>Performance Grade</h3>
                    <div class="big-number ${this.getGradeColor(performance.grade)}">${performance.grade}</div>
                    <div>Overall Performance</div>
                </div>
            </div>
            
            <div class="chart-container" style="margin-top: 30px;">
                <canvas id="performanceChart"></canvas>
            </div>
        </div>
    `;
  }

  /**
   * Generate bug heatmap
   */
  generateBugHeatmap(bugAnalysis) {
    if (!bugAnalysis || !bugAnalysis.byCategory) return '';

    const categories = Object.entries(bugAnalysis.byCategory)
      .sort((a, b) => b[1].length - a[1].length)
      .slice(0, 6);

    return `
        <div class="section">
            <h2>🐛 Bug Distribution Heatmap</h2>
            <div class="bug-heatmap">
                ${categories.map(([category, bugs]) => {
                    const severity = bugs.length > 10 ? 'critical' : bugs.length > 5 ? 'high' : bugs.length > 2 ? 'medium' : 'low';
                    return `
                        <div class="heatmap-cell severity-${severity}">
                            <div>${this.formatCategoryName(category)}</div>
                            <div style="font-size: 2em;">${bugs.length}</div>
                        </div>
                    `;
                }).join('')}
            </div>
            
            ${bugAnalysis.patterns.length > 0 ? `
                <h3 style="margin-top: 30px;">Bug Patterns Detected</h3>
                <ul style="margin-top: 15px;">
                    ${bugAnalysis.patterns.map(pattern => `
                        <li style="margin: 10px 0;">
                            <strong>${this.formatCategoryName(pattern.type)}</strong>: 
                            ${pattern.count} occurrences (${pattern.severity} severity)
                        </li>
                    `).join('')}
                </ul>
            ` : ''}
        </div>
    `;
  }

  /**
   * Generate critical issues section
   */
  generateCriticalIssues(issues) {
    if (!issues || issues.length === 0) {
      return `
        <div class="section">
            <h2>🚨 Critical Issues</h2>
            <div style="text-align: center; padding: 40px; color: #10b981;">
                ✅ No critical issues found!
            </div>
        </div>
      `;
    }

    return `
        <div class="section critical">
            <h2>🚨 Critical Issues Blocking Production</h2>
            <ul class="issues-list">
                ${issues.map(issue => `
                    <li class="issue-item">
                        <h4>${issue.type.toUpperCase()}</h4>
                        <div>${issue.error || issue.issue || issue.details}</div>
                        ${issue.value ? `<div style="margin-top: 5px; color: #64748b;">Value: ${issue.value}</div>` : ''}
                    </li>
                `).join('')}
            </ul>
        </div>
    `;
  }

  /**
   * Generate recommendations section
   */
  generateRecommendations(recommendations) {
    if (!recommendations || recommendations.length === 0) return '';

    return `
        <div class="section">
            <h2>💡 Recommendations</h2>
            <div class="recommendations">
                ${recommendations.map(rec => `
                    <div class="recommendation priority-${rec.priority.toLowerCase()}">
                        <h4>${rec.priority}: ${rec.message}</h4>
                        ${rec.issues ? `
                            <ul style="margin-top: 10px; padding-left: 20px;">
                                ${rec.issues.slice(0, 3).map(issue => `
                                    <li>${issue.type}: ${issue.error || issue.details}</li>
                                `).join('')}
                            </ul>
                        ` : ''}
                        ${rec.categories ? `
                            <div style="margin-top: 10px;">Focus areas: ${rec.categories.join(', ')}</div>
                        ` : ''}
                    </div>
                `).join('')}
            </div>
        </div>
    `;
  }

  /**
   * Generate footer
   */
  generateFooter() {
    return `
        <div class="footer">
            <p>FinanceBot Pro Test Dashboard - Generated by Pre-Production Test Suite</p>
            <p>© ${new Date().getFullYear()} - All test data is confidential</p>
        </div>
    `;
  }

  /**
   * Generate JavaScript for charts
   */
  generateJavaScript(results, analysis) {
    return `
        // Functional test results chart
        const functionalCtx = document.getElementById('functionalChart');
        if (functionalCtx) {
            const functionalData = ${JSON.stringify(this.prepareFunctionalChartData(results.functional))};
            new Chart(functionalCtx.getContext('2d'), {
                type: 'bar',
                data: functionalData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Test Results by Category',
                            color: '#e0e0e0'
                        },
                        legend: {
                            display: true,
                            labels: { color: '#e0e0e0' }
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            stacked: true,
                            ticks: { color: '#e0e0e0' },
                            grid: { color: '#334155' }
                        },
                        x: {
                            stacked: true,
                            ticks: { color: '#e0e0e0' },
                            grid: { color: '#334155' }
                        }
                    }
                }
            });
        }

        // Performance chart
        const perfCtx = document.getElementById('performanceChart');
        if (perfCtx && ${!!results.performance}) {
            const perfData = ${JSON.stringify(this.preparePerformanceChartData(results.performance))};
            new Chart(perfCtx.getContext('2d'), {
                type: 'line',
                data: perfData,
                options: {
                    responsive: true,
                    maintainAspectRatio: false,
                    plugins: {
                        title: {
                            display: true,
                            text: 'Response Time Distribution',
                            color: '#e0e0e0'
                        }
                    },
                    scales: {
                        y: {
                            beginAtZero: true,
                            ticks: { 
                                color: '#e0e0e0',
                                callback: function(value) {
                                    return value + 'ms';
                                }
                            },
                            grid: { color: '#334155' }
                        },
                        x: {
                            ticks: { color: '#e0e0e0' },
                            grid: { color: '#334155' }
                        }
                    }
                }
            });
        }

        // Animate numbers
        document.querySelectorAll('.big-number').forEach(el => {
            const finalValue = el.textContent;
            const isPercentage = finalValue.includes('%');
            const numericValue = parseFloat(finalValue);
            
            if (!isNaN(numericValue)) {
                let current = 0;
                const increment = numericValue / 50;
                const timer = setInterval(() => {
                    current += increment;
                    if (current >= numericValue) {
                        current = numericValue;
                        clearInterval(timer);
                    }
                    el.textContent = current.toFixed(1) + (isPercentage ? '%' : '');
                }, 20);
            }
        });

        // Progress bars animation
        document.querySelectorAll('.progress-fill').forEach(el => {
            const width = el.style.width;
            el.style.width = '0%';
            setTimeout(() => {
                el.style.width = width;
            }, 100);
        });
    `;
  }

  /**
   * Helper methods
   */
  formatCategoryName(name) {
    return name
      .replace(/([A-Z])/g, ' $1')
      .replace(/^./, str => str.toUpperCase())
      .trim();
  }

  getHealthColor(health) {
    const colorMap = {
      'EXCELLENT': 'grade-a',
      'GOOD': 'grade-b',
      'FAIR': 'grade-c',
      'POOR': 'grade-d',
      'CRITICAL': 'grade-f'
    };
    return colorMap[health] || 'grade-c';
  }

  getGradeColor(grade) {
    if (!grade) return '';
    const gradeClass = `grade-${grade.toLowerCase().charAt(0)}`;
    return gradeClass;
  }

  prepareFunctionalChartData(functional) {
    if (!functional) return { labels: [], datasets: [] };

    const categories = Object.entries(functional)
      .filter(([_, data]) => data.total)
      .map(([name, data]) => ({
        name: this.formatCategoryName(name),
        passed: data.passed,
        failed: data.failed
      }));

    return {
      labels: categories.map(c => c.name),
      datasets: [
        {
          label: 'Passed',
          data: categories.map(c => c.passed),
          backgroundColor: '#10b981',
          borderColor: '#10b981',
          borderWidth: 1
        },
        {
          label: 'Failed',
          data: categories.map(c => c.failed),
          backgroundColor: '#ef4444',
          borderColor: '#ef4444',
          borderWidth: 1
        }
      ]
    };
  }

  preparePerformanceChartData(performance) {
    if (!performance?.responseTime) return { labels: [], datasets: [] };

    return {
      labels: ['Min', 'Average', 'P50', 'P95', 'P99', 'Max'],
      datasets: [{
        label: 'Response Time',
        data: [
          performance.responseTime.min,
          performance.responseTime.avg,
          performance.responseTime.p50,
          performance.responseTime.p95,
          performance.responseTime.p99,
          performance.responseTime.max
        ],
        borderColor: '#00d4ff',
        backgroundColor: 'rgba(0, 212, 255, 0.1)',
        tension: 0.4,
        fill: true
      }]
    };
  }
}

module.exports = DashboardGenerator;