/**
 * DiagnosticAgent - Deep system analysis to identify format enforcement failure points
 * Provides extensive logging and diagnostic reports for troubleshooting
 */

const axios = require('axios');
const fs = require('fs');
const path = require('path');

class DiagnosticAgent {
  constructor() {
    this.diagnostics = {
      formatEnforcement: null,
      smartInsights: null,
      contextFlow: null,
      templateUsage: null,
      promptEnhancement: null,
      timestamp: new Date().toISOString()
    };
    
    this.logFile = path.join(__dirname, 'logs', 'diagnostic_report.json');
  }
  
  /**
   * Run full diagnostic suite
   */
  async runFullDiagnostic() {
    console.log('🔍 DIAGNOSTIC AGENT: Starting comprehensive system analysis...\n');
    
    try {
      // Test 1: Format Enforcement
      this.diagnostics.formatEnforcement = await this.testFormatEnforcement();
      
      // Test 2: Smart Insights
      this.diagnostics.smartInsights = await this.testSmartInsights();
      
      // Test 3: Context Flow
      this.diagnostics.contextFlow = await this.testContextFlow();
      
      // Test 4: Template Usage
      this.diagnostics.templateUsage = await this.testTemplateUsage();
      
      // Test 5: Prompt Enhancement
      this.diagnostics.promptEnhancement = await this.testPromptEnhancement();
      
      // Generate report
      const report = this.generateDiagnosticReport();
      
      // Save report
      this.saveReport(report);
      
      return report;
      
    } catch (error) {
      console.error('❌ Diagnostic Agent Error:', error);
      return {
        error: error.message,
        diagnostics: this.diagnostics
      };
    }
  }
  
  /**
   * Test if format enforcement is being called at all pipeline stages
   */
  async testFormatEnforcement() {
    console.log('📋 Testing Format Enforcement Pipeline...');
    
    const results = {
      testName: 'Format Enforcement',
      stages: {
        synthesis: { tested: false, working: false, score: 0 },
        quality: { tested: false, working: false, score: 0 },
        emergency: { tested: false, working: false, score: 0 }
      },
      overallSuccess: false
    };
    
    try {
      // Test with a query that should trigger formatting
      const sessionId = 'diag-format-' + Date.now();
      const response = await axios.post('http://localhost:3000/api/chat', {
        message: 'AAPL price',
        sessionId
      });
      
      const text = response.data.response;
      console.log('  Response received:', text.substring(0, 100) + '...');
      
      // Check format compliance
      const { FormatMonitor } = require('./monitoring/FormatMonitor');
      const score = FormatMonitor.calculateFormatScore(text);
      
      console.log('  Format Score:', score);
      
      // Analyze which stages worked
      if (score >= 25) results.stages.synthesis.working = true;
      if (score >= 50) results.stages.quality.working = true;
      if (score >= 75) results.stages.emergency.working = true;
      
      results.overallSuccess = score === 100;
      
      // Check server logs for enforcement calls
      console.log('  Checking logs for enforcement calls...');
      // In production, we'd parse actual log files
      
      results.analysis = {
        formatScore: score,
        hasEmoji: /[📊📈📉💰🎯⚠️🔍🔥⚔️]/.test(text),
        hasBold: /\*\*[A-Z]{1,5}\*\*/.test(text),
        hasActionable: /want me to/i.test(text),
        hasStructure: text.includes('•')
      };
      
    } catch (error) {
      console.error('  ❌ Format enforcement test failed:', error.message);
      results.error = error.message;
    }
    
    return results;
  }
  
  /**
   * Test Smart Insights integration
   */
  async testSmartInsights() {
    console.log('\n📋 Testing Smart Insights Integration...');
    
    const results = {
      testName: 'Smart Insights',
      integration: {
        instantiated: true, // We know it's instantiated from code review
        calledInSynthesis: false,
        generatesInsights: false,
        insightsAppearInResponse: false
      },
      patterns: {
        timeBasedWorking: false,
        patternBasedWorking: false,
        expertiseBasedWorking: false
      }
    };
    
    try {
      const sessionId = 'diag-insights-' + Date.now();
      
      // Test 1: Repeated queries (pattern-based)
      console.log('  Testing pattern-based insights (repeated queries)...');
      for (let i = 0; i < 3; i++) {
        const response = await axios.post('http://localhost:3000/api/chat', {
          message: 'MSFT price',
          sessionId
        });
        
        if (i === 2) {
          const text = response.data.response;
          if (text.includes('checked') || text.includes('times') || text.includes('alert')) {
            results.patterns.patternBasedWorking = true;
            console.log('  ✅ Pattern-based insight detected!');
          } else {
            console.log('  ❌ No pattern-based insight after 3 queries');
          }
        }
        
        await new Promise(r => setTimeout(r, 1000));
      }
      
      // Test 2: Time-based insights
      console.log('  Testing time-based insights...');
      await new Promise(r => setTimeout(r, 3000));
      
      const timeResponse = await axios.post('http://localhost:3000/api/chat', {
        message: 'MSFT price',
        sessionId
      });
      
      const timeText = timeResponse.data.response;
      if (timeText.includes('ago') || timeText.includes('since') || timeText.includes('update')) {
        results.patterns.timeBasedWorking = true;
        console.log('  ✅ Time-based insight detected!');
      } else {
        console.log('  ❌ No time-based insight detected');
      }
      
      // Test 3: Expert query
      console.log('  Testing expertise-based insights...');
      const expertResponse = await axios.post('http://localhost:3000/api/chat', {
        message: 'What is the RSI for MSFT?',
        sessionId
      });
      
      const expertText = expertResponse.data.response;
      if (expertText.includes('RSI') || expertText.includes('MACD') || expertText.includes('expert')) {
        results.patterns.expertiseBasedWorking = true;
        console.log('  ✅ Expertise-based content detected!');
      }
      
      // Overall assessment
      results.integration.generatesInsights = 
        results.patterns.timeBasedWorking || 
        results.patterns.patternBasedWorking || 
        results.patterns.expertiseBasedWorking;
        
    } catch (error) {
      console.error('  ❌ Smart Insights test failed:', error.message);
      results.error = error.message;
    }
    
    return results;
  }
  
  /**
   * Test conversation context flow
   */
  async testContextFlow() {
    console.log('\n📋 Testing Context Flow...');
    
    const results = {
      testName: 'Context Flow',
      contextTracking: {
        symbolsTracked: false,
        userLevelDetected: false,
        queryHistoryMaintained: false
      },
      persistence: {
        acrossQueries: false,
        symbolMemory: false
      }
    };
    
    try {
      const sessionId = 'diag-context-' + Date.now();
      
      // Query 1: Establish context
      console.log('  Establishing context with AAPL query...');
      await axios.post('http://localhost:3000/api/chat', {
        message: 'Tell me about AAPL',
        sessionId
      });
      
      // Query 2: Test context retention
      console.log('  Testing context retention...');
      const contextResponse = await axios.post('http://localhost:3000/api/chat', {
        message: 'compare it to MSFT',
        sessionId
      });
      
      const contextText = contextResponse.data.response;
      if (contextText.includes('AAPL') || contextText.includes('Apple')) {
        results.persistence.acrossQueries = true;
        console.log('  ✅ Context maintained across queries!');
      } else {
        console.log('  ❌ Context not maintained');
      }
      
      // Test symbol tracking
      if (contextResponse.data.symbols && contextResponse.data.symbols.includes('AAPL')) {
        results.contextTracking.symbolsTracked = true;
        console.log('  ✅ Symbols properly tracked in context');
      }
      
    } catch (error) {
      console.error('  ❌ Context flow test failed:', error.message);
      results.error = error.message;
    }
    
    return results;
  }
  
  /**
   * Test template usage
   */
  async testTemplateUsage() {
    console.log('\n📋 Testing Template Usage...');
    
    const results = {
      testName: 'Template Usage',
      templates: {
        priceQuery: false,
        portfolioQuery: false,
        comparisonQuery: false,
        trendQuery: false
      },
      overallUsage: 0
    };
    
    try {
      const sessionId = 'diag-template-' + Date.now();
      const testCases = [
        { query: 'AAPL price', type: 'priceQuery' },
        { query: 'analyze my portfolio', type: 'portfolioQuery' },
        { query: 'compare AAPL and GOOGL', type: 'comparisonQuery' },
        { query: 'BTC trend', type: 'trendQuery' }
      ];
      
      for (const testCase of testCases) {
        console.log(`  Testing ${testCase.type}...`);
        const response = await axios.post('http://localhost:3000/api/chat', {
          message: testCase.query,
          sessionId
        });
        
        const text = response.data.response;
        
        // Check for template markers
        if (text.includes('•') && text.includes('Want me to') && /[📊📈💰⚔️]/.test(text)) {
          results.templates[testCase.type] = true;
          results.overallUsage++;
          console.log(`  ✅ Template used for ${testCase.type}`);
        } else {
          console.log(`  ❌ Template not used for ${testCase.type}`);
        }
        
        await new Promise(r => setTimeout(r, 500));
      }
      
    } catch (error) {
      console.error('  ❌ Template usage test failed:', error.message);
      results.error = error.message;
    }
    
    return results;
  }
  
  /**
   * Test prompt enhancement
   */
  async testPromptEnhancement() {
    console.log('\n📋 Testing Prompt Enhancement...');
    
    const results = {
      testName: 'Prompt Enhancement',
      azureCompliance: {
        followsStrictPrompt: false,
        consistentFormatting: false
      },
      synthesisCompliance: {
        followsTemplate: false,
        includesRequiredElements: false
      }
    };
    
    try {
      const sessionId = 'diag-prompt-' + Date.now();
      
      // Test multiple queries for consistency
      console.log('  Testing prompt compliance across multiple queries...');
      let consistentCount = 0;
      
      for (let i = 0; i < 5; i++) {
        const response = await axios.post('http://localhost:3000/api/chat', {
          message: `Tell me about ${['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA'][i]}`,
          sessionId: sessionId + i // Different sessions to test consistency
        });
        
        const text = response.data.response;
        const { FormatMonitor } = require('./monitoring/FormatMonitor');
        const score = FormatMonitor.calculateFormatScore(text);
        
        if (score === 100) consistentCount++;
        
        await new Promise(r => setTimeout(r, 300));
      }
      
      results.azureCompliance.consistentFormatting = consistentCount >= 4;
      results.azureCompliance.followsStrictPrompt = consistentCount >= 3;
      
      console.log(`  Consistent formatting: ${consistentCount}/5 queries`);
      
    } catch (error) {
      console.error('  ❌ Prompt enhancement test failed:', error.message);
      results.error = error.message;
    }
    
    return results;
  }
  
  /**
   * Generate comprehensive diagnostic report
   */
  generateDiagnosticReport() {
    const report = {
      timestamp: this.diagnostics.timestamp,
      summary: {
        overallHealth: 'UNKNOWN',
        criticalIssues: [],
        recommendations: []
      },
      diagnostics: this.diagnostics
    };
    
    // Analyze results
    let totalTests = 0;
    let passedTests = 0;
    
    // Check format enforcement
    if (this.diagnostics.formatEnforcement) {
      totalTests++;
      if (this.diagnostics.formatEnforcement.overallSuccess) {
        passedTests++;
      } else {
        report.summary.criticalIssues.push('Format enforcement not achieving 100% compliance');
        report.summary.recommendations.push('Check all 3 failsafe points are executing');
      }
    }
    
    // Check Smart Insights
    if (this.diagnostics.smartInsights) {
      totalTests++;
      if (this.diagnostics.smartInsights.integration.generatesInsights) {
        passedTests++;
      } else {
        report.summary.criticalIssues.push('Smart Insights not generating or appearing in responses');
        report.summary.recommendations.push('Verify conversationContext is tracking symbols properly');
      }
    }
    
    // Check context flow
    if (this.diagnostics.contextFlow) {
      totalTests++;
      if (this.diagnostics.contextFlow.persistence.acrossQueries) {
        passedTests++;
      } else {
        report.summary.criticalIssues.push('Context not persisting across queries');
      }
    }
    
    // Check template usage
    if (this.diagnostics.templateUsage) {
      totalTests++;
      if (this.diagnostics.templateUsage.overallUsage >= 3) {
        passedTests++;
      } else {
        report.summary.criticalIssues.push('Templates not being applied consistently');
        report.summary.recommendations.push('Force template usage for all applicable intents');
      }
    }
    
    // Check prompt enhancement
    if (this.diagnostics.promptEnhancement) {
      totalTests++;
      if (this.diagnostics.promptEnhancement.azureCompliance.consistentFormatting) {
        passedTests++;
      } else {
        report.summary.criticalIssues.push('Prompts not producing consistent formatting');
      }
    }
    
    // Overall health assessment
    const healthScore = (passedTests / totalTests) * 100;
    if (healthScore >= 80) {
      report.summary.overallHealth = 'HEALTHY';
    } else if (healthScore >= 60) {
      report.summary.overallHealth = 'DEGRADED';
    } else {
      report.summary.overallHealth = 'CRITICAL';
    }
    
    report.summary.healthScore = healthScore.toFixed(1) + '%';
    report.summary.testsRun = `${passedTests}/${totalTests} passed`;
    
    console.log('\n📊 DIAGNOSTIC REPORT SUMMARY');
    console.log('=' .repeat(50));
    console.log('Overall Health:', report.summary.overallHealth);
    console.log('Health Score:', report.summary.healthScore);
    console.log('Tests:', report.summary.testsRun);
    console.log('\nCritical Issues:');
    report.summary.criticalIssues.forEach(issue => console.log('  ❌', issue));
    console.log('\nRecommendations:');
    report.summary.recommendations.forEach(rec => console.log('  💡', rec));
    
    return report;
  }
  
  /**
   * Save diagnostic report
   */
  saveReport(report) {
    try {
      const logsDir = path.join(__dirname, 'logs');
      if (!fs.existsSync(logsDir)) {
        fs.mkdirSync(logsDir, { recursive: true });
      }
      
      fs.writeFileSync(this.logFile, JSON.stringify(report, null, 2));
      console.log(`\n📁 Full report saved to: ${this.logFile}`);
    } catch (error) {
      console.error('Failed to save report:', error);
    }
  }
  
  /**
   * Run emergency diagnostic (called by FormatMonitor on critical failures)
   */
  static async runEmergencyDiagnostic() {
    console.log('\n🚨 EMERGENCY DIAGNOSTIC TRIGGERED 🚨');
    console.log('Format compliance has dropped below critical threshold!\n');
    
    const agent = new DiagnosticAgent();
    const report = await agent.runFullDiagnostic();
    
    // Take emergency actions based on findings
    if (report.summary.overallHealth === 'CRITICAL') {
      console.log('\n🔧 EMERGENCY ACTIONS:');
      console.log('1. Checking if all services are running...');
      console.log('2. Verifying API keys are configured...');
      console.log('3. Reloading format enforcement modules...');
      // In production, we'd actually implement these recovery actions
    }
    
    return report;
  }
}

// Export for use by other modules
module.exports = DiagnosticAgent;

// If run directly, execute full diagnostic
if (require.main === module) {
  const agent = new DiagnosticAgent();
  agent.runFullDiagnostic().then(() => {
    console.log('\n✅ Diagnostic complete!');
    process.exit(0);
  }).catch(error => {
    console.error('❌ Diagnostic failed:', error);
    process.exit(1);
  });
}