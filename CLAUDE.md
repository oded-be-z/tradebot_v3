# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

FinanceBot Pro v4.0 is an **AI-powered financial assistant** that leverages **multiple Large Language Models (LLMs)** in an intelligent orchestration pattern. The system uses:

- **Primary AI Engine**: Perplexity AI API for financial analysis and insights
- **Secondary AI Engine**: Azure OpenAI GPT-4o for fallback and enhanced reasoning
- **Dual LLM Orchestration**: Intelligent routing between AI models for optimal responses
- **Real-time Market Data**: Integration with Yahoo Finance, Alpha Vantage, and Polygon APIs

The architecture is built on Node.js/Express and implements a sophisticated multi-LLM orchestration system that ensures high availability, intelligent responses, and seamless failover between AI providers.

## Key Development Commands

```bash
# Install dependencies
npm install

# Start production server
npm start

# Development with auto-reload
npm run dev

# Run tests
npm test                    # Jest unit tests
npm run test:e2e           # End-to-end tests
npm run test:api           # API test suite
npm run test:chat "query"  # Test chat functionality

# Specific test utilities (from root directory)
node test_smart_insights.js        # Test AI insights generation
node test_visual_builder.js        # Test visual response building
node test_portfolio_complete.js    # Test portfolio analysis
node test_dual_llm_orchestrator.js # Test LLM orchestration
node test_comprehensive_suite.js   # Run comprehensive test suite

# Code quality
npm run lint               # ESLint checking
npm run format             # Prettier formatting

# Health check
npm run health             # Check server status

# Monitoring & debugging
node monitoring/FormatMonitor.js   # Monitor response formatting
node debug_context_flow.js         # Debug conversation context
node diagnostic_agent.js           # Run diagnostic checks
```

## Architecture & Code Structure

### Core Server Architecture
- **server.js**: Main Express server (lines 1-2500+) implementing secure API key management, rate limiting, CORS, and WebSocket support
- **Session Management**: TTL-based sessions with LRU eviction and automatic cleanup
- **Security**: Helmet.js, rate limiting, input validation, no hardcoded API keys

### AI & LLM Orchestration Layer (`/services`)

#### Core AI Services
- **dualLLMOrchestrator.js**: **Multi-LLM orchestration engine** that intelligently routes between:
  - Perplexity AI (primary) for financial analysis
  - Azure OpenAI GPT-4o (fallback) for enhanced reasoning
  - Implements retry logic, failover, and response optimization
- **azureOpenAI.js**: Azure OpenAI GPT-4o integration with:
  - Retry logic with exponential backoff
  - Temperature and parameter optimization
  - Error handling and fallback strategies
- **intelligentResponse.js**: AI response generation that:
  - Combines LLM outputs with real-time market data
  - Enriches responses with financial context
  - Maintains conversation coherence

#### Response Processing Services
- **professionalAnalysis.js**: Formats AI outputs into professional financial analysis
- **smartInsights.js**: Context-aware AI insights generation
- **visualResponseBuilder.js**: Enhanced visual formatting for AI responses
- **responseFormatter.js**: Ensures consistent AI response structure
- **responseTemplates.js**: AI-optimized response templates

#### Supporting Services
- **chartGenerator.js**: Creates Chart.js visualizations from AI-analyzed data
- **portfolioManager.js**: AI-enhanced portfolio analysis
- **conversationContext.js**: Maintains AI conversation memory and context
- **websocket-service.js**: Real-time price updates (currently disabled)

### Knowledge & Data Layer (`/src`)
- **knowledge/market-data-service.js**: Aggregates real-time data from Yahoo Finance, Alpha Vantage, Polygon
- **knowledge/nlp-processor.js**: Natural language processing for query understanding
- **knowledge/knowledge-base.js**: Financial knowledge embeddings and context
- **guardrails/intent-classifier.js**: Minimal keyword-based fallback (LLM is primary for intent)
- **guardrails/disclaimer-manager.js**: Adds educational disclaimers to responses
- **utils/cleanFormatter.js**: Cleans and formats AI responses for display

### Frontend (`/public`)
- **index.html**: Main chat interface with mobile-responsive design
- Real-time market sidebar with live price updates
- Portfolio upload functionality
- WebSocket integration for live data

## Environment Configuration

Required environment variables in `.env`:
```bash
# REQUIRED - Primary AI Engine (Perplexity)
PERPLEXITY_API_KEY=your_key_here      # Primary LLM for financial analysis

# REQUIRED - Secondary AI Engine (Azure OpenAI GPT-4o)
AZURE_OPENAI_API_KEY=your_key_here    # Fallback LLM for enhanced reasoning
AZURE_OPENAI_ENDPOINT=your_endpoint_here
AZURE_OPENAI_DEPLOYMENT_NAME=gpt-4o   # GPT-4o model deployment

# OPTIONAL - Additional data sources
ALPHA_VANTAGE_API_KEY=your_key_here
POLYGON_API_KEY=your_key_here

# Server configuration
PORT=3000
NODE_ENV=development|production
ALLOWED_ORIGINS=http://localhost:3000
```

## Key Implementation Patterns

### API Integration Pattern
All external API calls use:
- Bottleneck for rate limiting
- Retry logic with exponential backoff
- Fallback data sources (Yahoo Finance → Alpha Vantage → Polygon)
- Error handling that doesn't expose sensitive information

### Multi-LLM AI Response Flow
1. **Query Analysis**: Azure OpenAI GPT-4o analyzes user intent
2. **Parallel Processing**: 
   - Perplexity AI generates financial insights
   - Market data fetched from multiple sources
   - Azure OpenAI provides fallback/enhancement
3. **Dual LLM Orchestration**:
   - Primary route: Perplexity for specialized financial analysis
   - Fallback route: Azure OpenAI GPT-4o for complex reasoning
   - Automatic failover on API errors or timeouts
4. **Response Synthesis**: Combines AI outputs with real-time data
5. **Enhancement**: Educational disclaimers and chart generation

### Session Management
- Sessions stored in-memory with 30-minute TTL
- LRU eviction when limit reached
- Automatic cleanup every 5 minutes
- Portfolio data persisted per session

### Real-time Updates
- WebSocket server for live price updates
- 30-second update interval for active symbols
- Automatic reconnection handling
- Efficient subscription management

### Caching Strategy
- Tiered caching with different TTLs:
  - Understanding cache: 30 seconds
  - Price data: 30 seconds
  - News data: 5 minutes
  - Technical analysis: 15 minutes
- Request coalescing to prevent duplicate API calls

## Testing Strategy

The codebase includes comprehensive test suites:
- **Unit tests**: Jest-based tests for individual services
- **E2E tests**: Full conversation flow testing
- **API tests**: Endpoint validation and error handling
- **Portfolio tests**: CSV parsing and analysis validation

When modifying code:
1. Run relevant test suites to ensure no regressions
2. Update tests if changing functionality
3. Use test files as examples for expected behavior

## AI Model Configuration

### Perplexity AI (Primary)
- Model: `llama-3.1-sonar-large-128k-online`
- Temperature: 0.7 for balanced creativity/accuracy
- Max tokens: 4096
- Specialized for financial analysis and market insights

### Azure OpenAI GPT-4o (Secondary)
- Model: `gpt-4o` (latest version)
- Temperature: 0.7 for consistent responses
- Max tokens: 4096
- Used for complex reasoning and fallback scenarios

## Security Considerations

- **API Key Security**: 
  - Never hardcode API keys - all must come from environment variables
  - Server refuses to start without BOTH Perplexity and Azure OpenAI keys
  - Keys are validated on startup
- **AI Safety**:
  - All LLM inputs are validated and sanitized
  - Trading advice filtered through compliance checks
  - Educational disclaimers added to all financial advice
- **Data Protection**:
  - Error messages never expose API keys or sensitive data
  - LLM responses sanitized before client delivery

## Debugging & Monitoring Tools

### Debug Utilities
The codebase includes extensive debugging tools in the root directory:
- **debug_context_flow.js**: Trace conversation context through the system
- **diagnostic_agent.js**: Run comprehensive system diagnostics
- **test_symbols_trace.js**: Debug symbol extraction and processing
- **test_orchestrator_debug.js**: Debug LLM orchestration flows
- **test_format_enforcement.js**: Verify response format compliance

### Monitoring
- **monitoring/FormatMonitor.js**: Real-time response format monitoring
- **services/debugLogger.js**: Centralized debug logging service
- **utils/pipelineLogger.js**: Log data pipeline operations

### Common Debugging Patterns
1. **LLM Response Issues**: Use `test_orchestrator_debug.js` to trace LLM calls
2. **Symbol Extraction**: Run `test_symbols_trace.js` with specific queries
3. **Format Problems**: Use `monitoring/FormatMonitor.js` to track formatting
4. **Context Loss**: Debug with `debug_context_flow.js`
5. **Performance**: Check `utils/performance-monitor.js` metrics

## Common Development Workflows

### Adding New Features
1. **Implement in appropriate service directory** (`/services` for AI logic, `/src` for data/utilities)
2. **Test with specific test file** (e.g., `node test_[feature_name].js`)
3. **Run comprehensive suite** (`node test_comprehensive_suite.js`)
4. **Check format compliance** (`node test_format_enforcement.js`)
5. **Validate with E2E tests** (`npm run test:e2e`)

### Modifying LLM Behavior
1. **Update orchestration logic** in `services/dualLLMOrchestrator.js`
2. **Test with debug tool** (`node test_orchestrator_debug.js`)
3. **Verify responses** (`node test_smart_insights.js`)
4. **Check fallback behavior** by simulating API failures

### Portfolio Analysis Updates
1. **Modify** `services/portfolioManager.js`
2. **Test CSV parsing** with `test-portfolio.csv`
3. **Run full portfolio test** (`node test_portfolio_complete.js`)
4. **Verify chart generation** (`node test_auto_charts.js`)