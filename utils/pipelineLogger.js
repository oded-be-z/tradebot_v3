// utils/pipelineLogger.js
// Comprehensive logging utility for LLM pipeline debugging

class PipelineLogger {
  constructor() {
    this.enabled = true;
    this.startTime = null;
  }

  // === Entry Point Logging ===
  logQueryStart(query, sessionId, context) {
    this.startTime = Date.now();
    console.log('\n════════════════════════════════════════════════════════════════');
    console.log('║                    QUERY PIPELINE START                        ║');
    console.log('════════════════════════════════════════════════════════════════');
    console.log(`[1. ENTRY] ${new Date().toISOString()}`);
    console.log(`  Query: "${query}"`);
    console.log(`  Session ID: ${sessionId}`);
    console.log(`  Context: {`);
    console.log(`    hasPortfolio: ${!!context?.portfolio}`);
    console.log(`    portfolioSize: ${context?.portfolio?.length || 0}`);
    console.log(`    conversationHistory: ${context?.conversationHistory?.length || 0} messages`);
    console.log(`    topic: ${context?.topic || 'none'}`);
    console.log(`  }`);
  }

  // === Understanding Phase ===
  logUnderstanding(understanding, source = 'Azure') {
    console.log(`\n[2. UNDERSTANDING - ${source}]`);
    console.log(`  Intent: ${understanding.intent}`);
    console.log(`  Symbols: ${JSON.stringify(understanding.symbols || [])}`);
    console.log(`  Confidence: ${understanding.confidence || 'N/A'}`);
    console.log(`  Data Needs: ${JSON.stringify(understanding.dataNeeds || [])}`);
    console.log(`  Requires Chart: ${understanding.requiresChart || false}`);
    console.log(`  Is Vague Query: ${understanding.isVagueQuery || false}`);
  }

  // === Data Fetching Phase ===
  logDataFetchStart(understanding) {
    console.log('\n[3. DATA FETCHING - Start]');
    console.log(`  Intent: ${understanding.intent}`);
    console.log(`  Symbols to fetch: ${JSON.stringify(understanding.symbols || [])}`);
  }

  logDataFetchResult(data, symbolsUsed) {
    console.log('\n[3. DATA FETCHING - Complete]');
    console.log(`  Data keys: ${JSON.stringify(Object.keys(data || {}))}`);
    console.log(`  Symbols used: ${JSON.stringify(symbolsUsed || [])}`);
    console.log(`  Has portfolio data: ${!!data?.portfolio}`);
    console.log(`  Has portfolio analysis: ${!!data?.portfolioAnalysis}`);
    
    // Log data quality
    Object.entries(data || {}).forEach(([key, value]) => {
      if (value && typeof value === 'object') {
        console.log(`  ${key}: ${value.error ? '❌ ERROR' : '✅ SUCCESS'}`);
      }
    });
  }

  // === Synthesis Phase ===
  logSynthesisStart(understanding, data) {
    console.log('\n[4. SYNTHESIS - Start]');
    console.log(`  Intent: ${understanding.intent}`);
    console.log(`  Available data: ${Object.keys(data || {}).join(', ')}`);
  }

  logAutoChartDecision(understanding, query, shouldAutoChart, reason) {
    console.log('\n[4.1 AUTO-CHART DECISION]');
    console.log(`  Query: "${query}"`);
    console.log(`  Intent: ${understanding.intent}`);
    console.log(`  Has symbols: ${(understanding.symbols?.length || 0) > 0}`);
    console.log(`  Decision: ${shouldAutoChart ? '✅ SHOW CHART' : '❌ NO CHART'}`);
    console.log(`  Reason: ${reason}`);
  }

  logPortfolioAnalysis(triggered, portfolioData) {
    console.log('\n[4.2 PORTFOLIO ANALYSIS]');
    console.log(`  Analysis triggered: ${triggered ? '✅ YES' : '❌ NO'}`);
    if (triggered && portfolioData) {
      console.log(`  Portfolio size: ${portfolioData.length} holdings`);
      console.log(`  Total value: $${portfolioData.reduce((sum, h) => sum + (h.value || 0), 0).toFixed(2)}`);
    }
  }

  logSynthesisResult(result) {
    console.log('\n[4. SYNTHESIS - Complete]');
    console.log(`  Response length: ${result.response?.length || 0} chars`);
    console.log(`  Symbol: ${result.symbol || 'none'}`);
    console.log(`  Symbols: ${JSON.stringify(result.symbols || [])}`);
    console.log(`  Show chart: ${result.showChart || false}`);
    console.log(`  Suggestions: ${result.suggestions?.length || 0}`);
  }

  // === Response Building Phase ===
  logResponseBuilding(orchestratorResult, finalResponse) {
    console.log('\n[5. RESPONSE BUILDING]');
    console.log(`  Orchestrator symbols: ${JSON.stringify(orchestratorResult.symbols || [])}`);
    console.log(`  Orchestrator understanding symbols: ${JSON.stringify(orchestratorResult.understanding?.symbols || [])}`);
    console.log(`  Final response symbols: ${JSON.stringify(finalResponse.symbols || [])}`);
    console.log(`  Show chart: ${finalResponse.showChart}`);
    console.log(`  Chart data: ${finalResponse.chartData ? '✅ Present' : '❌ Missing'}`);
    console.log(`  Response type: ${finalResponse.type}`);
  }

  // === Chart Generation ===
  logChartGeneration(type, symbols, success) {
    console.log('\n[6. CHART GENERATION]');
    console.log(`  Type: ${type}`);
    console.log(`  Symbols: ${JSON.stringify(symbols)}`);
    console.log(`  Result: ${success ? '✅ SUCCESS' : '❌ FAILED'}`);
  }

  // === Pipeline Complete ===
  logQueryComplete(success = true) {
    const duration = this.startTime ? Date.now() - this.startTime : 0;
    console.log('\n[7. PIPELINE COMPLETE]');
    console.log(`  Status: ${success ? '✅ SUCCESS' : '❌ ERROR'}`);
    console.log(`  Duration: ${duration}ms`);
    console.log('════════════════════════════════════════════════════════════════\n');
  }

  // === Error Logging ===
  logError(phase, error) {
    console.error(`\n[ERROR - ${phase}]`);
    console.error(`  Message: ${error.message}`);
    console.error(`  Stack: ${error.stack}`);
  }

  // === Warning Logging ===
  logWarning(phase, message) {
    console.warn(`\n[WARNING - ${phase}] ${message}`);
  }

  // === Symbol Flow Tracking ===
  logSymbolFlow(phase, symbols, source) {
    console.log(`\n[SYMBOL FLOW - ${phase}]`);
    console.log(`  Source: ${source}`);
    console.log(`  Symbols: ${JSON.stringify(symbols || [])}`);
    console.log(`  Count: ${symbols?.length || 0}`);
  }

  // === Portfolio Flow Tracking ===
  logPortfolioFlow(phase, hasData, details = {}) {
    console.log(`\n[PORTFOLIO FLOW - ${phase}]`);
    console.log(`  Has data: ${hasData ? '✅ YES' : '❌ NO'}`);
    Object.entries(details).forEach(([key, value]) => {
      console.log(`  ${key}: ${value}`);
    });
  }

  // === Feature Flag Status ===
  logFeatureFlags(features) {
    console.log('\n[FEATURE FLAGS]');
    Object.entries(features).forEach(([feature, enabled]) => {
      console.log(`  ${feature}: ${enabled ? '✅ ENABLED' : '❌ DISABLED'}`);
    });
  }
}

// Export singleton instance
module.exports = new PipelineLogger();