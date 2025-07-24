# Agent Task Coordination

## 🤝 Communication Protocol
- Update PROGRESS_LOG.md every 2 hours
- Flag blockers immediately in this file
- Test your changes against other agents' work before merging
- Use feature flags to isolate changes

---

## 📊 File Ownership Matrix

| File | Agent 1 | Agent 2 | Agent 3 | Agent 4 |
|------|---------|---------|---------|---------|
| **server.js** | ✏️ Logging only | ✏️ Response building | ✏️ Portfolio charts | 👁️ Read-only |
| **dualLLMOrchestrator.js** | ✏️ Logging only | ✏️ Symbol methods | ✏️ Portfolio methods | ✏️ Auto-chart methods |
| **azureOpenAI.js** | ✏️ Logging only | 👁️ Read-only | 👁️ Read-only | 👁️ Read-only |
| **utils/pipelineLogger.js** | 🔧 Full ownership | 📦 Import only | 📦 Import only | 📦 Import only |
| **utils/portfolioChartGenerator.js** | 👁️ Read-only | 👁️ Read-only | ✏️ Integration | 👁️ Read-only |
| **test files** | 🔧 Create own | 🔧 Create own | 🔧 Create own | 🔧 Create own |

**Legend**: 🔧 Full ownership | ✏️ Partial modification | 📦 Import/use only | 👁️ Read-only

---

## 🎯 Agent-Specific Responsibilities

### Agent 1: Logging Infrastructure
**Primary Files**: utils/pipelineLogger.js  
**Modifies**: All service files (logging injection only)  
**Testing**: test_logging_verification.js  

**Key Methods to Add Logging**:
- server.js: `handleMessage()`, response building
- dualLLMOrchestrator.js: `processQuery()`, `understandQuery()`, `fetchRealtimeData()`, `synthesizeResponse()`
- azureOpenAI.js: `analyzeQuery()`, `makeRequest()`

### Agent 2: Symbol Propagation
**Primary Methods**: processQuery(), synthesizeResponse()  
**Modifies**: Symbol handling logic  
**Testing**: test_comparison_charts.js  

**Key Areas**:
- Ensure symbols flow from understanding → synthesis → response
- Fix response building to always include symbols array
- Handle both single and multiple symbols

### Agent 3: Portfolio Pipeline
**Primary Methods**: fetchRealtimeData(), portfolio analysis  
**Modifies**: Portfolio data flow  
**Testing**: test_portfolio_llm.js  

**Key Areas**:
- Portfolio data must reach fetchPortfolioAnalysis
- Enhanced synthesis prompt must be used
- Charts must be generated for portfolio queries

### Agent 4: Auto-Chart Logic
**Primary Method**: shouldAutoChart()  
**Modifies**: Chart decision logic  
**Testing**: test_auto_charts.js  

**Key Areas**:
- Handle investment_advice intent properly
- Fix single-word queries (bitcoin?, SPY?)
- Prevent false positives on general queries

---

## 🔀 Merge Coordination

### Pre-Merge Checklist:
- [ ] All tests pass locally
- [ ] No conflicts with other agents' branches
- [ ] Feature flag added if applicable
- [ ] Logging added for new functionality
- [ ] Documentation updated

### Merge Order:
1. **Agent 1** → main (no dependencies)
2. **Agent 2** → main (no dependencies)
3. **Agent 3** → Merge Agent 1 first, then → main
4. **Agent 4** → Merge Agent 2 first, then → main
5. **All** → Integration testing on main

---

## 🚨 Conflict Resolution

### Potential Conflict Areas:
1. **Import statements**: Add with agent comment
   ```javascript
   // Agent 1: Logging imports
   const pipelineLogger = require('./utils/pipelineLogger');
   ```

2. **Method modifications**: Use clear boundaries
   ```javascript
   async synthesizeResponse(understanding, data, originalQuery, context) {
     // Agent 1: Logging start
     pipelineLogger.logSynthesisStart(understanding);
     
     // [Existing code...]
     
     // Agent 2: Symbol preservation
     const preservedSymbols = understanding.symbols || [];
     
     // [Rest of method...]
   }
   ```

3. **Response building**: Coordinate additions
   ```javascript
   const response = {
     // Existing fields
     response: orchestratorResult.response,
     
     // Agent 2: Always include symbols
     symbols: extractedSymbols,
     
     // Agent 4: Enhanced chart logic
     showChart: FEATURES.AUTO_CHART_INTELLIGENCE ? 
                enhancedAutoChart(understanding) : 
                existingLogic
   };
   ```

---

## 📋 Daily Standup Template

```markdown
## Agent X - Date

### Completed:
- [ ] Task 1
- [ ] Task 2

### In Progress:
- [ ] Task 3

### Blockers:
- None / Description

### Next:
- [ ] Task 4

### Files Modified:
- file1.js (methods: x, y)
- file2.js (logging only)
```

---

## 🧪 Testing Coordination

### Individual Test Commands:
```bash
# Agent 1
npm test -- --grep "logging|pipeline"

# Agent 2  
npm test -- --grep "comparison|symbol"

# Agent 3
npm test -- --grep "portfolio|analysis"

# Agent 4
npm test -- --grep "auto.?chart|chart.*decision"
```

### Integration Test (After All Merge):
```bash
# Run full suite
npm test

# Run live API tests
node test_comparison_charts.js
node test_portfolio_llm.js
node test_auto_charts.js
node test_integration_complete.js
```

---

## 🔗 Quick Links

- [Implementation Plan](./IMPLEMENTATION_PLAN.md)
- [Progress Log](./PROGRESS_LOG.md)
- [Test Results](./test_results/)
- [Original Issues](./LIVE_TEST_REPORT.md)