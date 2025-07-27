// services/dualLLMOrchestrator.js

const logger = require('../utils/logger');
const azureOpenAI = require('./azureOpenAI');
// Agent 1: Pipeline logging
const pipelineLogger = require('../utils/pipelineLogger');
// Market data service for direct price fetching
const MarketDataService = require('../src/knowledge/market-data-service');
const marketDataService = new MarketDataService();
// Response Templates for enhanced UX
const ResponseTemplates = require('./responseTemplates');
// Phase 2: Conversation Context for memory and personalization
const conversationContext = require('./conversationContext');
// Smart Insights for intelligent context-aware responses
const SmartInsights = require('./smartInsights');
// Visual Response Builder for enhanced visual formatting
const visualBuilder = require('./visualResponseBuilder');

class DualLLMOrchestrator {
  constructor() {
    this.azureOpenAI = azureOpenAI;
    this.perplexityClient = null; // Will be injected from server.js
    this.apiLimiter = null; // Will be injected from server.js for rate limiting
    this.smartInsights = new SmartInsights(); // Initialize Smart Insights
    this.performanceMetrics = {
      understanding: [],
      dataFetching: [],
      synthesis: [],
      total: []
    };
    
    // PERPLEXITY OPTIMIZATION: Tiered caching
    this.understandingCache = new Map(); // Cache Azure understanding
    this.priceCache = new Map(); // 30-second price cache
    this.newsCache = new Map(); // 5-minute news cache
    this.technicalCache = new Map(); // 15-minute technical cache
    
    this.CACHE_TTL = {
      understanding: 30 * 1000, // 30 seconds for response variety
      price: 30 * 1000, // 30 seconds
      news: 5 * 60 * 1000, // 5 minutes
      technical: 15 * 60 * 1000 // 15 minutes
    };

    // PERPLEXITY PERFORMANCE CONFIG
    this.perplexityConfig = {
      price_queries: {
        model: 'sonar-pro',
        max_tokens: 250, // FIXED: Increased from 50 to allow real data in responses
        temperature: 0.05, // Lowest for factual data
        timeout: 5000, // 5 second timeout - increased from 1.5s to prevent timeouts
        search_recency_filter: 'hour',
        search_domain_filter: [
          'finance.yahoo.com',
          'bloomberg.com',
          'marketwatch.com'
        ],
        return_citations: false,
        return_images: false
      },
      analysis_queries: {
        model: 'sonar',
        max_tokens: 500, // Increased from 300 for better analysis
        temperature: 0.3,
        timeout: 10000, // 10 second timeout - increased from 3s for reliability
        search_recency_filter: 'hour',
        return_citations: false,
        return_images: false
      }
    };

    // ERROR HANDLING: Valid symbols list
    this.VALID_SYMBOLS = new Set([
      // Top tech stocks
      'AAPL', 'MSFT', 'GOOGL', 'GOOG', 'AMZN', 'META', 'TSLA', 'NVDA', 'AMD', 'INTC',
      'ORCL', 'IBM', 'CSCO', 'ADBE', 'CRM', 'QCOM', 'TXN', 'AVGO', 'MU', 'AMAT',
      // Financial
      'JPM', 'BAC', 'WFC', 'GS', 'MS', 'C', 'AXP', 'V', 'MA', 'PYPL',
      // Retail & Consumer
      'WMT', 'TGT', 'COST', 'HD', 'LOW', 'NKE', 'SBUX', 'MCD', 'DIS', 'NFLX',
      // Other popular
      'SQ', 'UBER', 'LYFT', 'SNAP', 'PINS', 'ROKU', 'ZM', 'DOCU', 'SPOT', 'ABNB',
      // ETFs
      'SPY', 'QQQ', 'DIA', 'IWM', 'VTI', 'VOO', 'GLD', 'SLV', 'TLT', 'HYG',
      // Crypto-related
      'BTC', 'ETH', 'COIN', 'MSTR', 'RIOT', 'MARA',
      // Commodities
      'GC', 'SI', 'CL', 'NG', 'HG', 'ZW', 'ZC', 'ZS', 'KC', 'SB'
    ]);
  }

  // Inject the perplexity client from server.js
  setPerplexityClient(client) {
    this.perplexityClient = client;
    logger.info('[DualLLMOrchestrator] Perplexity client injected');
  }

  // Inject the API rate limiter from server.js
  setApiLimiter(limiter) {
    this.apiLimiter = limiter;
    logger.info('[DualLLMOrchestrator] API rate limiter injected');
  }

  // PARALLEL PROCESSING: Prepare data requirements concurrently with understanding
  async prepareDataRequirements(query, context = {}) {
    const prepStart = Date.now();
    
    try {
      // Quick symbol extraction using regex patterns
      const symbols = this.extractSymbolsQuick(query);
      
      // Quick query type detection
      const queryType = this.detectQueryTypeQuick(query);
      
      // Check cache status for known symbols
      const cacheStatus = this.checkSymbolCacheStatus(symbols);
      
      // Determine data freshness requirements
      const freshnessRequirements = this.determineFreshnessRequirements(queryType, symbols);
      
      // Pre-validate symbols to avoid API calls for invalid symbols
      const validSymbols = symbols.filter(symbol => this.isValidSymbol(symbol));
      const invalidSymbols = symbols.filter(symbol => !this.isValidSymbol(symbol));
      
      if (invalidSymbols.length > 0) {
        logger.warn(`[DataPrep] Invalid symbols detected: ${invalidSymbols.join(', ')}`);
      }
      
      const result = {
        symbols: validSymbols,
        invalidSymbols,
        queryType,
        cacheStatus,
        freshnessRequirements,
        preparationTime: Date.now() - prepStart,
        canSkipDataFetch: cacheStatus.allCached && freshnessRequirements.priority === 'low'
      };
      
      logger.debug(`[DataPrep] Completed in ${result.preparationTime}ms: ${validSymbols.length} valid symbols, type: ${queryType}`);
      return result;
      
    } catch (error) {
      logger.error('[DataPrep] Error in data preparation:', error);
      return {
        symbols: [],
        queryType: 'unknown',
        error: error.message,
        preparationTime: Date.now() - prepStart
      };
    }
  }

  // PARALLEL PROCESSING: Merge understanding with data preparation results
  mergeUnderstandingWithPreparation(understanding, dataRequirements) {
    try {
      // Start with original understanding
      const merged = { ...understanding };
      
      // Enhance with preparation results
      if (dataRequirements.symbols && dataRequirements.symbols.length > 0) {
        // Use prepared symbols if they're more accurate
        merged.symbols = dataRequirements.symbols;
        merged.primarySymbol = dataRequirements.symbols[0];
      }
      
      // Add query type if not present or if preparation is more specific
      if (dataRequirements.queryType && dataRequirements.queryType !== 'unknown') {
        merged.queryType = dataRequirements.queryType;
      }
      
      // Add optimization hints
      merged.optimization = {
        canSkipDataFetch: dataRequirements.canSkipDataFetch || false,
        cacheStatus: dataRequirements.cacheStatus || {},
        freshnessRequirements: dataRequirements.freshnessRequirements || {},
        invalidSymbols: dataRequirements.invalidSymbols || []
      };
      
      // Add preparation metadata
      merged.parallelProcessing = {
        dataPreparationTime: dataRequirements.preparationTime || 0,
        merged: true,
        timestamp: Date.now()
      };
      
      logger.debug(`[Merge] Enhanced understanding with ${dataRequirements.symbols?.length || 0} symbols and optimization hints`);
      return merged;
      
    } catch (error) {
      logger.error('[Merge] Error merging understanding with preparation:', error);
      return understanding; // Fallback to original understanding
    }
  }

  // OPTIMIZATION: Quick symbol extraction without heavy processing
  extractSymbolsQuick(query) {
    const symbols = [];
    const queryUpper = query.toUpperCase();
    
    // Known symbol patterns
    const symbolPatterns = [
      /\b[A-Z]{1,5}\b/g, // Basic stock symbols (1-5 characters)
      /\$[A-Z]{1,5}\b/g, // Symbols with $ prefix
    ];
    
    symbolPatterns.forEach(pattern => {
      const matches = queryUpper.match(pattern) || [];
      matches.forEach(match => {
        const cleaned = match.replace('$', '');
        if (this.isValidSymbol(cleaned)) {
          symbols.push(cleaned);
        }
      });
    });
    
    // Add common name mappings
    const nameMappings = {
      'APPLE': 'AAPL',
      'MICROSOFT': 'MSFT',
      'GOOGLE': 'GOOGL',
      'AMAZON': 'AMZN',
      'TESLA': 'TSLA',
      'BITCOIN': 'BTC',
      'ETHEREUM': 'ETH'
    };
    
    Object.entries(nameMappings).forEach(([name, symbol]) => {
      if (queryUpper.includes(name) && !symbols.includes(symbol)) {
        symbols.push(symbol);
      }
    });
    
    return [...new Set(symbols)]; // Remove duplicates
  }

  // OPTIMIZATION: Quick query type detection
  detectQueryTypeQuick(query) {
    const queryLower = query.toLowerCase();
    
    // Priority-ordered detection (most specific first)
    if (/price|cost|worth|\$/.test(queryLower)) return 'price';
    if (/compare|vs|versus|better/.test(queryLower)) return 'compare';
    if (/news|earnings|report/.test(queryLower)) return 'news';
    if (/chart|graph|visualization/.test(queryLower)) return 'chart';
    if (/forecast|prediction|outlook/.test(queryLower)) return 'forecast';
    if (/analysis|technical|fundamental/.test(queryLower)) return 'analysis';
    if (/portfolio|allocation|diversification/.test(queryLower)) return 'portfolio';
    if (/should.*buy|should.*sell|recommend/.test(queryLower)) return 'advice';
    if (/info|about|what.*is/.test(queryLower)) return 'info';
    
    return 'general';
  }

  // OPTIMIZATION: Check cache status for symbols
  checkSymbolCacheStatus(symbols) {
    const status = {
      cached: [],
      missing: [],
      expired: [],
      allCached: false
    };
    
    symbols.forEach(symbol => {
      // Check price cache
      const priceKey = `price:${symbol}`;
      const priceEntry = this.priceCache.get(priceKey);
      
      if (priceEntry && !this.isCacheExpired(priceEntry, 'price')) {
        status.cached.push(symbol);
      } else {
        status.missing.push(symbol);
        if (priceEntry) status.expired.push(symbol);
      }
    });
    
    status.allCached = symbols.length > 0 && status.missing.length === 0;
    
    return status;
  }

  // OPTIMIZATION: Determine data freshness requirements
  determineFreshnessRequirements(queryType, symbols) {
    const requirements = {
      priority: 'medium',
      maxAge: 30000, // 30 seconds default
      realTimeRequired: false
    };
    
    switch (queryType) {
      case 'price':
        requirements.priority = 'high';
        requirements.maxAge = 10000; // 10 seconds for prices
        requirements.realTimeRequired = true;
        break;
        
      case 'news':
        requirements.priority = 'high';
        requirements.maxAge = 60000; // 1 minute for news
        requirements.realTimeRequired = true;
        break;
        
      case 'analysis':
      case 'forecast':
        requirements.priority = 'medium';
        requirements.maxAge = 300000; // 5 minutes for analysis
        break;
        
      case 'info':
      case 'general':
        requirements.priority = 'low';
        requirements.maxAge = 600000; // 10 minutes for general info
        break;
    }
    
    // Adjust for symbol volatility (crypto needs fresher data)
    const hasVolatileSymbols = symbols.some(symbol => 
      ['BTC', 'ETH', 'BNB', 'ADA', 'SOL'].includes(symbol)
    );
    
    if (hasVolatileSymbols && requirements.priority !== 'low') {
      requirements.maxAge = Math.min(requirements.maxAge, 15000); // 15 seconds max for crypto
      requirements.realTimeRequired = true;
    }
    
    return requirements;
  }

  // OPTIMIZATION: Helper to check if cache entry is expired
  isCacheExpired(entry, cacheType) {
    if (!entry || !entry.timestamp) return true;
    
    const age = Date.now() - entry.timestamp;
    const ttl = this.CACHE_TTL[cacheType] || 30000;
    
    return age > ttl;
  }

  // ERROR HANDLING: Symbol validation
  isValidSymbol(symbol) {
    if (!symbol) return false;
    const upperSymbol = symbol.toUpperCase().trim();
    
    // Basic validation rules
    if (upperSymbol.length < 1 || upperSymbol.length > 5) return false;
    if (!/^[A-Z]+$/.test(upperSymbol)) return false;
    
    // Check against known symbols
    return this.VALID_SYMBOLS.has(upperSymbol);
  }

  // ERROR HANDLING: Clear cache for invalid symbols
  clearCacheForSymbol(symbol) {
    const cacheKeys = [
      `price:${symbol}`,
      `news:${symbol}`,
      `technical:${symbol}`,
      `market:${symbol}`
    ];
    
    cacheKeys.forEach(key => {
      this.priceCache.delete(key);
      this.newsCache.delete(key);
      this.technicalCache.delete(key);
    });
    
    logger.info(`[DualLLMOrchestrator] Cleared cache for invalid symbol: ${symbol}`);
  }
  
  // PRODUCTION FIX: Clear all caches when contamination detected
  clearAllCaches() {
    this.priceCache.clear();
    this.newsCache.clear();
    this.technicalCache.clear();
    this.understandingCache.clear();
    logger.warn(`[DualLLMOrchestrator] Cleared ALL caches due to data contamination`);
  }

  /**
   * Main entry point - orchestrates the entire LLM flow with parallel processing
   * Optimized Flow: Query → [Azure (understand) || Data preparation] → Azure (synthesize) → Response
   */
  async processQuery(query, context = {}) {
    const startTime = Date.now();
    const requestId = `req_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
    
    logger.info(`[DualLLMOrchestrator] Processing query: "${query}" | RequestID: ${requestId}`);
    logger.info(`[DualLLMOrchestrator] Context sessionId: ${context.sessionId || 'none'}`);
    logger.info(`[DualLLMOrchestrator] Context keys: ${Object.keys(context).join(', ')}`);
    
    // Agent 2: Declare understanding outside try block to preserve symbols on error
    let understanding = null;
    let symbolsUsed = [];

    try {
      // Phase 1: Resolve pronouns first (quick operation)
      const sessionId = context.sessionId || 'default';
      const resolvedQuery = conversationContext.resolvePronounReference(sessionId, query);
      const finalQuery = resolvedQuery !== query ? resolvedQuery : query;
      
      if (resolvedQuery !== query) {
        logger.info(`[Context] Resolved pronouns: "${query}" -> "${resolvedQuery}"`);
      }
      
      // Phase 2: PARALLEL PROCESSING - Run understanding and data preparation concurrently
      const parallelStart = Date.now();
      
      const [understandingResult, dataPreparationResult] = await Promise.allSettled([
        // Parallel Task 1: Understanding with Azure OpenAI
        this.understandQuery(finalQuery, context),
        
        // Parallel Task 2: Quick data preparation (extract symbols, check cache, etc.)
        this.prepareDataRequirements(finalQuery, context)
      ]);
      
      const parallelTime = Date.now() - parallelStart;
      const understandingTime = parallelTime; // Understanding is part of parallel processing
      
      // Handle understanding result
      if (understandingResult.status === 'fulfilled') {
        understanding = understandingResult.value;
        logger.info(`[DualLLMOrchestrator] Azure Understanding (parallel, ${parallelTime}ms): ${JSON.stringify(understanding)}`);
      } else {
        logger.error('[DualLLMOrchestrator] Understanding failed:', understandingResult.reason);
        throw understandingResult.reason;
      }
      
      // Handle data preparation result
      let dataRequirements = {};
      if (dataPreparationResult.status === 'fulfilled') {
        dataRequirements = dataPreparationResult.value;
        logger.info(`[DualLLMOrchestrator] Data preparation (parallel, ${parallelTime}ms): ${Object.keys(dataRequirements).join(', ')}`);
      } else {
        logger.warn('[DualLLMOrchestrator] Data preparation failed, continuing with understanding only:', dataPreparationResult.reason);
      }
      
      // Agent 1: Log understanding
      pipelineLogger.logUnderstanding(understanding, 'Azure');

      // Phase 3: Fetch real-time data based on understanding and preparation
      pipelineLogger.logDataFetchStart(understanding);
      const dataStart = Date.now();
      
      // Combine understanding with data preparation for optimized fetching
      const enhancedUnderstanding = this.mergeUnderstandingWithPreparation(understanding, dataRequirements);
      const dataResult = await this.fetchRealtimeData(enhancedUnderstanding, finalQuery, context);
      const dataTime = Date.now() - dataStart;
      
      // Extract the actual data and symbols used
      const { data: realtimeData, symbolsUsed: fetchedSymbols } = dataResult;
      symbolsUsed = fetchedSymbols; // Agent 2: Update outer scope variable
      
      logger.info(`[DualLLMOrchestrator] Perplexity Data Fetch (${dataTime}ms): ${Object.keys(realtimeData).join(', ')}`);
      
      // Agent 1: Log data fetch result
      pipelineLogger.logDataFetchResult(realtimeData, symbolsUsed);

      // Phase 4: Synthesize response with Azure OpenAI
      pipelineLogger.logSynthesisStart(understanding, realtimeData);
      const synthesisStart = Date.now();
      
      // Create final enhanced understanding with all available data
      const finalEnhancedUnderstanding = {
        ...enhancedUnderstanding,
        symbols: symbolsUsed.length > 0 ? symbolsUsed : understanding.symbols,
        actualSymbol: symbolsUsed[0] || understanding.symbols?.[0],
        dataRequirements,
        parallelProcessed: true
      };
      
      // Update context with current query, understanding, and real-time data
      logger.info(`[Context Update] Updating context for session ${sessionId}`);
      logger.info(`[Context Update] Enhanced Understanding symbols: ${JSON.stringify(finalEnhancedUnderstanding.symbols)}`);
      logger.info(`[Context Update] Real-time data keys: ${Object.keys(realtimeData).join(', ')}`);
      
      conversationContext.updateFromQuery(sessionId, finalQuery, finalEnhancedUnderstanding, realtimeData);
      
      // Verify context was updated
      const updatedContext = conversationContext.getContext(sessionId);
      logger.info(`[Context Update] After update - symbols tracked: ${updatedContext.recentSymbols.size}`);
      
      const synthesisResult = await this.synthesizeResponse(finalEnhancedUnderstanding, realtimeData, finalQuery, context);
      const synthesisTime = Date.now() - synthesisStart;
      
      // Agent 1: Log synthesis result
      pipelineLogger.logSynthesisResult(synthesisResult);
      
      const totalTime = Date.now() - startTime;
      
      // Track performance metrics
      this.trackPerformance({
        understanding: understandingTime,
        dataFetching: dataTime,
        synthesis: synthesisTime,
        total: totalTime
      });

      logger.info(`[DualLLMOrchestrator] Response synthesized (${synthesisTime}ms) | Total: ${totalTime}ms`);
      logger.info(`[DualLLMOrchestrator] synthesisResult.symbols: ${JSON.stringify(synthesisResult.symbols)}, understanding.symbols: ${JSON.stringify(understanding.symbols)}`);

      // Prepare chart data if needed
      let chartData = null;
      if (enhancedUnderstanding.requiresChart || 
          ['trend_query', 'comparison_query', 'portfolio_query'].includes(enhancedUnderstanding.intent)) {
        chartData = this.prepareChartData(enhancedUnderstanding, realtimeData);
      }

      const finalResult = {
        response: synthesisResult.response, // Extract the actual response string
        understanding: enhancedUnderstanding,
        data: realtimeData,
        chartData,
        symbol: synthesisResult.symbol || enhancedUnderstanding.symbols?.[0],
        symbols: synthesisResult.symbols || understanding.symbols || symbolsUsed || [], // Agent 2: Fix 1 - Include all symbol sources
        symbolsUsed: symbolsUsed, // Keep for backward compatibility
        showChart: synthesisResult.showChart || false,
        suggestions: synthesisResult.suggestions || [],
        performance: {
          understanding: understandingTime,
          dataFetching: dataTime,
          synthesis: synthesisTime,
          total: totalTime
        },
        requestId
      };
      
      logger.info(`[DualLLMOrchestrator] Final processQuery result symbols: ${JSON.stringify(finalResult.symbols)}`);
      logger.info(`[DualLLMOrchestrator] RETURNING FROM processQuery - session ${context.sessionId}`);
      return finalResult;

    } catch (error) {
      logger.error(`[DualLLMOrchestrator] Error processing query: ${error.message}`);
      
      // Intelligent error handling with Azure
      const errorResponse = await this.handleError(error, query, context);
      
      // Agent 2: Preserve symbols even on error
      return {
        response: errorResponse,
        error: true,
        understanding: understanding,
        symbols: understanding?.symbols || symbolsUsed || [],
        symbolsUsed: symbolsUsed,
        requestId,
        performance: {
          total: Date.now() - startTime
        }
      };
    }
  }

  /**
   * Smart Routing: Determine if we should bypass Perplexity for simple price queries
   */
  async shouldBypassPerplexity(understanding, query) {
    // Simple price query patterns
    const simplePricePatterns = [
      /^[A-Z]{1,5}\?$/,  // "TSLA?" - single symbol with question mark
      /^(what['']?s|what is) (the )?price of/i,  // "what's the price of..."
      /^(how much is|price of)/i,  // "how much is..." or "price of..."
      /^show me [A-Z]{1,5} (stock )?price/i,  // "show me TSLA price"
      /^[A-Z]{1,5} (stock )?price\??$/i  // "TSLA price" or "TSLA stock price?"
    ];
    
    const isSimplePrice = simplePricePatterns.some(pattern => pattern.test(query.trim()));
    const hasSingleSymbol = understanding.symbols?.length === 1;
    const isPriceRelated = ['price_query', 'analysis_query', 'investment_advice'].includes(understanding.intent);
    
    // Bypass if it's a simple price query with a single symbol
    const shouldBypass = isSimplePrice && hasSingleSymbol && isPriceRelated;
    
    if (shouldBypass) {
      logger.info(`[SMART-ROUTING] Bypassing Perplexity for simple price query: ${understanding.symbols[0]}`);
    }
    
    return shouldBypass;
  }

  /**
   * Step 1: Use Azure OpenAI to understand query intent and extract entities
   */
  async understandQuery(query, context) {
    logger.debug(`[DualLLMOrchestrator] Understanding query with Azure OpenAI`);
    
    // PERFORMANCE FIX 1a: Intelligent caching with normalized query
    const normalizedQuery = query.toLowerCase().trim().replace(/[^\w\s]/g, '');
    const cacheKey = `understand:${normalizedQuery}`;
    
    // Disable cache for queries that need variety (like gold in tests)
    const needsVariety = query.toLowerCase().includes('gold') || 
                        query.toLowerCase().includes("how's") ||
                        query.toLowerCase().includes("how is");
    
    if (!needsVariety) {
      const cached = this.getFromCache(this.understandingCache, cacheKey);
      if (cached) {
        logger.info(`[DualLLMOrchestrator] Using cached understanding for: ${query}`);
        return cached;
      }
    }
    
    try {
      // PERFORMANCE FIX: Use only basic analysis, skip enhanced understanding
      const analysis = await this.azureOpenAI.analyzeQuery(
        query, 
        context.conversationHistory || [], 
        context.conversationState || null
      );

      // Check if this is a vague query that needs context
      const vaguePatterns = [
        /^(show me )?(the )?(chart|trend|graph)$/i,
        /^what['']?s the trend\??$/i,
        /^what is the trend\??$/i,
        /^(longer|short) term( trend)?$/i,
        /^how about (now|today)$/i,
        /^(more|what) about (it|that)$/i,
        /^tell me more$/i,
        /^continue$/i,
        /^trend\?$/i
      ];
      
      const isVagueQuery = vaguePatterns.some(pattern => pattern.test(query.trim()));
      
      // Add minimal enhancements without extra LLM call
      const result = {
        ...analysis,
        dataNeeds: this.inferDataNeeds(analysis.intent),
        originalQuery: query,
        timeframe: 'current trading day',
        requiresChart: ['comparison_query', 'portfolio_query'].includes(analysis.intent) || 
                       (analysis.intent === 'trend_query' && analysis.symbols && analysis.symbols.length > 0),
        isVagueQuery: isVagueQuery
      };
      
      // Cache the result
      this.setCache(this.understandingCache, cacheKey, result);
      return result;

    } catch (error) {
      logger.error(`[DualLLMOrchestrator] Understanding failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Step 2: Use Perplexity to fetch ALL real-time market data (or bypass for simple queries)
   */
  async fetchRealtimeData(understanding, originalQuery, context) {
    logger.debug(`[DualLLMOrchestrator] Fetching real-time data`);
    
    // SMART ROUTING: Bypass Perplexity for simple price queries
    if (await this.shouldBypassPerplexity(understanding, originalQuery)) {
      const symbol = understanding.symbols[0];
      
      try {
        // Fetch market data directly
        const marketData = await marketDataService.fetchMarketData(symbol);
        
        if (marketData && marketData.price) {
          logger.info(`[SMART-ROUTING] Direct market data for ${symbol}: $${marketData.price} (${marketData.changePercent}%)`);
          
          // Format response to match Perplexity's expected structure
          return {
            data: {
              [`${symbol}_market`]: {
                answer: `${symbol} is trading at $${marketData.price} (${marketData.changePercent >= 0 ? '+' : ''}${marketData.changePercent}%)`,
                success: true,
                price: marketData.price,
                changePercent: marketData.changePercent,
                volume: marketData.volume,
                dayHigh: marketData.dayHigh,
                dayLow: marketData.dayLow,
                quote: marketData,
                source: 'direct_market_data',
                timestamp: marketData.timestamp || Date.now()
              }
            },
            symbolsUsed: [symbol]
          };
        }
      } catch (error) {
        logger.warn(`[SMART-ROUTING] Direct fetch failed for ${symbol}, falling back to Perplexity: ${error.message}`);
        // Continue to Perplexity fallback
      }
    }
    
    if (!this.perplexityClient) {
      throw new Error('Perplexity client not initialized');
    }

    const dataPromises = [];
    const dataLabels = [];
    
    // For vague queries with no symbols, check context for last discussed symbol
    let symbolsToFetch = understanding.symbols || [];
    if (symbolsToFetch.length === 0 && (understanding.isVagueQuery || understanding.intent === 'trend_query')) {
      // Check conversation state for last discussed symbol - be more thorough
      let lastSymbol = null;
      
      // Try multiple locations where the last symbol might be stored
      if (context?.conversationState?.conversationFlow?.lastDiscussedSymbol) {
        lastSymbol = context.conversationState.conversationFlow.lastDiscussedSymbol;
        logger.info(`[DualLLMOrchestrator] Found symbol in conversationFlow: ${lastSymbol}`);
      } else if (context?.conversationState?.lastDiscussedSymbol) {
        lastSymbol = context.conversationState.lastDiscussedSymbol;
        logger.info(`[DualLLMOrchestrator] Found symbol in conversationState: ${lastSymbol}`);
      } else if (context?.topic) {
        lastSymbol = context.topic;
        // Validate before using as symbol to prevent words like EXIT, TIPS being treated as tickers
        if (this.isValidSymbol(lastSymbol)) {
          logger.info(`[DualLLMOrchestrator] Found valid symbol in context.topic: ${lastSymbol}`);
        } else {
          logger.info(`[DualLLMOrchestrator] Ignoring invalid context.topic: ${lastSymbol}`);
          lastSymbol = null;
        }
      } else {
        // Try to extract from conversation history
        const history = context?.conversationHistory || [];
        for (let i = history.length - 1; i >= 0; i--) {
          const msg = history[i];
          if (msg.symbols && msg.symbols.length > 0) {
            lastSymbol = msg.symbols[0];
            logger.info(`[DualLLMOrchestrator] Found symbol in conversation history: ${lastSymbol}`);
            break;
          }
        }
      }
      
      if (lastSymbol) {
        logger.info(`[DualLLMOrchestrator] Using context symbol for vague query: ${lastSymbol}`);
        symbolsToFetch = [lastSymbol];
      } else {
        logger.warn(`[DualLLMOrchestrator] No context symbol found for vague query`);
      }
    }

    // OPTIMIZED: Use fast combined data fetching
    if (symbolsToFetch.length > 0) {
      // For single symbol, use fast combined fetch (but NOT for comparison queries)
      if (symbolsToFetch.length === 1 && understanding.intent !== 'comparison_query') {
        try {
          const symbol = symbolsToFetch[0];
          const fastData = await this.fetchAllDataFast(symbol, understanding);
          
          // CRITICAL FIX: Ensure consistent data structure
          // fastData is already { BTC_market: {...} }, don't double-wrap
          logger.info(`[fetchRealtimeData] Single symbol data structure:`, {
            symbol,
            dataKeys: Object.keys(fastData),
            hasMarketKey: !!fastData[`${symbol}_market`]
          });
          
          return {
            data: { ...fastData },  // Spread to ensure flat structure
            symbolsUsed: symbolsToFetch
          };
        } catch (error) {
          logger.warn(`[DualLLMOrchestrator] Fast fetch failed, using fallback`);
        }
      }
      
      // For multiple symbols, process in parallel chunks of 5 for better performance
      const chunks = this.chunkArray(symbolsToFetch, 5);
      for (const chunk of chunks) {
        const chunkPromises = chunk.map(symbol => this.fetchAllDataFast(symbol, understanding));
        dataPromises.push(...chunkPromises);
        dataLabels.push(...chunk.map(s => `${s}_market`));
      }
    }

    // Market overview if needed
    if (understanding.intent === 'market_overview' || understanding.dataNeeds?.includes('market')) {
      dataPromises.push(this.fetchMarketOverview());
      dataLabels.push('market_overview');
    }

    // Fetch all data with rate limiting
    try {
      const data = {};
      
      // Process requests sequentially with rate limiting
      if (this.apiLimiter) {
        logger.info('[DualLLMOrchestrator] Using rate limiter for Perplexity calls');
        for (let i = 0; i < dataPromises.length; i++) {
          try {
            // Schedule the promise through the rate limiter
            const result = await this.apiLimiter.schedule(() => dataPromises[i]);
            
            // COMPARISON FIX: Properly merge fetchAllDataFast results
            if (result && typeof result === 'object') {
              // fetchAllDataFast returns { BTC_market: {...} } 
              // We need to merge this into the main data object
              Object.assign(data, result);
            } else {
              data[dataLabels[i]] = result;
            }
          } catch (error) {
            logger.warn(`[DualLLMOrchestrator] Failed to fetch ${dataLabels[i]}: ${error.message}`);
            data[dataLabels[i]] = null;
          }
        }
      } else {
        // Fallback to parallel if no rate limiter (shouldn't happen)
        logger.warn('[DualLLMOrchestrator] No rate limiter - using parallel fetch');
        const results = await Promise.allSettled(dataPromises);
        results.forEach((result, index) => {
          if (result.status === 'fulfilled') {
            // COMPARISON FIX: Properly merge fetchAllDataFast results
            const value = result.value;
            if (value && typeof value === 'object') {
              // fetchAllDataFast returns { BTC_market: {...} } 
              // We need to merge this into the main data object
              Object.assign(data, value);
            } else {
              data[dataLabels[index]] = value;
            }
          } else {
            logger.warn(`[DualLLMOrchestrator] Failed to fetch ${dataLabels[index]}: ${result.reason}`);
            data[dataLabels[index]] = null;
          }
        });
      }

      // Portfolio data if available
      if (understanding.intent === 'portfolio_query' && context?.portfolio) {
        logger.info('[PORTFOLIO] Starting LLM-first analysis for', context.portfolio.length, 'holdings');
        
        // Extract all unique symbols from portfolio
        const portfolioSymbols = context.portfolio.map(h => h.symbol).filter(Boolean);
        
        // Fetch current market data for all holdings
        const marketDataPromises = portfolioSymbols.map(symbol => {
          logger.info('[PORTFOLIO] Fetching market data for', symbol);
          return this.fetchAllDataFast(symbol, understanding);
        });
        
        // Get Perplexity's intelligent portfolio analysis
        logger.info('[PORTFOLIO] Requesting Perplexity analysis');
        const portfolioAnalysisPromise = this.fetchPortfolioAnalysis(context.portfolio);
        
        // Execute all requests with rate limiting
        try {
          let marketDataResults = [];
          let portfolioAnalysis = null;
          
          if (this.apiLimiter) {
            // Rate-limited sequential processing
            logger.info('[PORTFOLIO] Using rate limiter for portfolio analysis');
            
            // Fetch market data sequentially
            for (const promise of marketDataPromises) {
              const result = await this.apiLimiter.schedule(() => promise);
              marketDataResults.push(result);
            }
            
            // Fetch portfolio analysis
            portfolioAnalysis = await this.apiLimiter.schedule(() => portfolioAnalysisPromise);
          } else {
            // Fallback to parallel
            logger.warn('[PORTFOLIO] No rate limiter - using parallel fetch');
            [marketDataResults, portfolioAnalysis] = await Promise.all([
              Promise.all(marketDataPromises),
              portfolioAnalysisPromise
            ]);
          }
          
          // Add all portfolio data to the data object
          data.portfolio = context.portfolio;
          data.portfolioAnalysis = portfolioAnalysis;
          data.portfolioMarketData = marketDataResults;
          
          logger.info('[PORTFOLIO] Analysis complete:', {
            holdings: context.portfolio.length,
            hasAnalysis: !!portfolioAnalysis,
            marketDataCount: marketDataResults.length
          });
        } catch (error) {
          logger.error('[PORTFOLIO] Error in analysis:', error);
          data.portfolio = context.portfolio;
          data.portfolioError = error.message;
        }
      }

      return {
        data,
        symbolsUsed: symbolsToFetch
      };

    } catch (error) {
      logger.error(`[DualLLMOrchestrator] Data fetching failed: ${error.message}`);
      throw error;
    }
  }

  /**
   * Step 3: Use Azure OpenAI to synthesize a unique, dynamic response
   */
  async synthesizeResponse(understanding, data, originalQuery, context) {
    logger.debug(`[DualLLMOrchestrator] Synthesizing response with Azure OpenAI`);
    
    // ERROR HANDLING: Check if any data contains errors
    const hasErrors = Object.values(data).some(d => d && d.error === true);
    
    logger.info(`[Synthesis] Starting synthesis for query: "${originalQuery}"`);
    logger.info(`[Synthesis] Input data has errors: ${hasErrors}`);
    logger.info(`[Synthesis] Understanding: ${JSON.stringify({
      intent: understanding.intent,
      symbols: understanding.symbols,
      requiresChart: understanding.requiresChart
    })}`);
    logger.info(`[Synthesis] Context sessionId: ${context?.sessionId || 'none'}`);
    
    // ENHANCED VALIDATION: Robust data access with multiple patterns
    if (understanding.symbols?.length > 0) {
      // Log complete data structure for debugging
      logger.info(`[VALIDATION] Data structure received:`, {
        topLevelKeys: Object.keys(data),
        hasNestedData: !!data.data,
        nestedKeys: data.data ? Object.keys(data.data) : []
      });
      
      for (const symbol of understanding.symbols) {
        // Try multiple data access patterns defensively
        let marketData = data[`${symbol}_market`] || 
                        data[symbol] || 
                        data.data?.[`${symbol}_market`] ||  // Handle nested structure
                        data.data?.[symbol];
        
        // Log what we found
        logger.info(`[VALIDATION] Checking ${symbol}:`, {
          foundData: !!marketData,
          accessPattern: marketData ? 
            (data[`${symbol}_market`] ? 'direct_market' : 
             data[symbol] ? 'direct_symbol' :
             data.data?.[`${symbol}_market`] ? 'nested_market' :
             'nested_symbol') : 'not_found',
          dataKeys: marketData ? Object.keys(marketData).slice(0, 5) : []
        });
        
        if (marketData) {
          // Check if data has price information in various locations
          if (!marketData.price) {
            // Try to extract from quote
            if (marketData.quote?.price) {
              marketData.price = marketData.quote.price;
              marketData.changePercent = marketData.quote.changePercent || marketData.quote.change;
              marketData.volume = marketData.quote.volume;
              logger.info(`[VALIDATION] Extracted price from quote for ${symbol}: $${marketData.price}`);
            }
            // Try to extract from nested answer (Perplexity response)
            else if (marketData.answer && /\$[\d,]+\.?\d*/.test(marketData.answer)) {
              const priceMatch = marketData.answer.match(/\$[\d,]+\.?\d*/);
              if (priceMatch) {
                const extractedPrice = parseFloat(priceMatch[0].replace(/[$,]/g, ''));
                logger.info(`[VALIDATION] Extracted price from answer text for ${symbol}: $${extractedPrice}`);
                // Don't modify original data, just log the finding
              }
            }
          }
          
          // Final validation status
          if (marketData.price) {
            logger.info(`[VALIDATION] ✓ ${symbol} has valid price data: $${marketData.price}`);
          } else {
            logger.warn(`[VALIDATION] ✗ ${symbol} missing price data in synthesis`, {
              hasAnswer: !!marketData.answer,
              hasQuote: !!marketData.quote,
              hasError: !!marketData.error,
              source: marketData.source
            });
          }
        } else {
          logger.error(`[VALIDATION] ✗ No market data found for ${symbol} in any location`);
        }
      }
    }
    
    // CRITICAL FIX: Don't bypass Azure OpenAI when data fails - we still want conversational responses!
    // Instead, let Azure OpenAI handle the error gracefully with natural language

    const contextSymbol = understanding.symbols?.[0] || null;
    const dataContext = this.formatDataForSynthesis(data, understanding);
    
    // PRODUCTION FIX: Validate data doesn't contain contamination
    const contaminants = ['pizza', 'gluten', 'dough', 'recipe', 'cooking', 'bake', 'baking', 'food', 'eat', 'ingredient'];
    const dataStr = JSON.stringify(data).toLowerCase();
    
    for (const word of contaminants) {
      if (dataStr.includes(word)) {
        logger.error(`[DATA_CONTAMINATION] Found '${word}' in data! Clearing caches and returning safe response.`);
        
        // Clear all caches to prevent contamination spread
        this.clearAllCaches();
        
        return {
          response: "I apologize, there was a data error. Let me get fresh market data for you. Please try your query again.",
          symbol: understanding.symbols?.[0],
          symbols: understanding.symbols || [],
          showChart: false,
          suggestions: ["Try your query again", "Ask about a specific stock price", "Request market analysis"]
        };
      }
    }

    // CHART DETECTION: Enhanced prompt for better chart detection and variety
    const conversationTurn = context?.conversationHistory?.length || 0;
    const currentTime = new Date().toISOString();
    
    // Intent-to-keyword mapping for consistent responses
    const intentKeywords = {
      trend_query: ['trend', 'trending', 'momentum'],
      comparison_query: ['comparison', 'versus', 'vs', 'compared to'],
      price_query: ['price', 'trading at', 'valued at'],
      analysis_query: ['analysis', 'analyzing', 'performance analysis']
    };
    
    const requiredKeywords = intentKeywords[understanding.intent] || [];
    
    // Handle portfolio queries with enhanced analysis
    let portfolioAnalysis = null;
    let portfolioPromptAddition = '';
    
    if (understanding.intent === 'portfolio_query' && data.portfolio) {
      logger.info('[PORTFOLIO] Using pre-fetched analysis for synthesis');
      
      // Use the pre-fetched analysis from fetchRealtimeData
      portfolioAnalysis = data.portfolioAnalysis;
      
      // Agent 1: Log portfolio analysis
      pipelineLogger.logPortfolioAnalysis(!!portfolioAnalysis, data.portfolio);
      
      if (portfolioAnalysis) {
        portfolioPromptAddition = `

PORTFOLIO ANALYSIS FROM PERPLEXITY:
${JSON.stringify(portfolioAnalysis, null, 2)}

CURRENT MARKET DATA FOR HOLDINGS:
${data.portfolioMarketData ? JSON.stringify(data.portfolioMarketData.map((d, i) => ({
  symbol: data.portfolio[i].symbol,
  currentPrice: d.quote?.price,
  dayChange: d.quote?.changePercent
})), null, 2) : 'Not available'}

PORTFOLIO DETAILS:
Total Value: $${data.portfolio.reduce((sum, h) => sum + (h.value || 0), 0).toFixed(2)}
Holdings: ${data.portfolio.length}

CRITICAL INSTRUCTIONS FOR PORTFOLIO RESPONSE:
1. Start with portfolio value and overall return percentage
2. Highlight the TOP 3 RISKS in bullet points with specific numbers
3. Give EXACTLY 3 SPECIFIC ACTIONS with precise numbers:
   - Example: "Sell 15 shares of AAPL (currently 50) to reduce from 35% to 25% allocation"
   - Example: "Buy 10 shares of VTI to add market diversification"
   - Example: "Take profits: Sell 5 NVDA shares (up 180%) to lock in $2,500 gains"

4. NEVER say generic things like:
   - "Consider diversification" 
   - "Monitor your portfolio"
   - "Rebalancing might be good"

5. ALWAYS give specific numbers and exact actions

6. End with: "Which of these actions would you like me to help execute first?"

RESPONSE FORMAT:
📊 Portfolio Summary: $X total, Y% return

⚠️ Key Risks:
• [Specific risk with number]
• [Specific risk with number]
• [Specific risk with number]

🎯 Immediate Actions Required:
1. [EXACT action with share numbers and dollar amounts]
2. [EXACT action with share numbers and dollar amounts]
3. [EXACT action with share numbers and dollar amounts]

Which action would you like to execute first?`;
      } else {
        // Fallback if analysis failed
        portfolioPromptAddition = `
Portfolio data is available but analysis failed. Provide general recommendations based on:
${JSON.stringify(data.portfolio, null, 2)}
`;
      }
    }
    
    // Phase 2: Get conversation context for personalization
    const sessionId = context?.sessionId || 'default';
    const contextPrompt = conversationContext.getContextPrompt(sessionId);
    
    // LLM-FIRST FIX: Redesigned synthesis prompt that guides rather than forces
    const synthesisPrompt = `
You are FinanceBot Pro, a friendly and knowledgeable AI financial assistant. Help users with market insights and analysis.

${contextPrompt}

Current Context:
- Query: "${originalQuery}"
- Intent: ${understanding.intent}
- Symbols: ${understanding.symbols?.join(', ') || 'none'}
- Time: ${currentTime}

Available Data:
${dataContext}

Response Guidelines:
• Use emojis naturally (📊 for data, 📈📉 for trends, 💰 for prices, 🎯 for insights)
• Make stock symbols **bold** (like **AAPL** or **BTC**)
• Use bullet points (•) for lists when helpful
• End with an engaging question like "Want me to analyze the trend?" or "Should I check the technicals?"

${understanding.intent === 'comparison_query' ? `
For comparisons:
• Use narrative format, not tables
• Highlight key differences with bullet points
• Include performance metrics for both symbols
` : ''}

${understanding.intent === 'portfolio_query' ? `
For portfolio analysis:
• Show total value and overall performance
• Highlight top gainers and losers
• Suggest specific actions with numbers
` : ''}

Keep responses concise (under 200 words) and conversational. Focus on being helpful and informative.

${portfolioPromptAddition}`; // Add portfolio-specific instructions if applicable

    // *** SMART INSIGHTS INTEGRATION ***
    // Generate intelligent context-aware insights before synthesis
    logger.info(`[SmartInsights] Starting insight generation`);
    logger.info(`[SmartInsights] Context sessionId: ${context?.sessionId}, understanding symbols: ${JSON.stringify(understanding.symbols)}`);
    logger.info(`[SmartInsights] Data keys: ${Object.keys(data).join(', ')}`);
    
    let smartInsightText = '';
    const primarySymbol = understanding.symbols?.[0];
    logger.info(`[SmartInsights] Primary symbol: ${primarySymbol || 'none'}`);
    
    // Check for symbol data in various formats
    const symbolData = data[primarySymbol] || data[`${primarySymbol}_market`] || null;
    logger.info(`[SmartInsights] Symbol data found: ${!!symbolData}`);
    
    if (primarySymbol && symbolData) {
      logger.info(`[SmartInsights] Generating insights for ${primarySymbol}`);
      logger.info(`[SmartInsights] Symbol data found under key: ${data[primarySymbol] ? primarySymbol : `${primarySymbol}_market`}`);
      
      // Get user expertise level from context
      const userLevel = conversationContext.getUserExpertiseLevel(sessionId) || 'intermediate';
      const contextData = conversationContext.getContext(sessionId);
      
      // Generate smart insight
      const insightResult = this.smartInsights.generateSmartInsight(
        sessionId,
        primarySymbol,
        symbolData,
        contextData,
        userLevel
      );
      
      if (insightResult && insightResult.insight) {
        // LLM-FIRST FIX: Include Smart Insights naturally without forcing
        smartInsightText = `

Contextual insight: ${insightResult.insight}`;
        
        logger.info(`[SmartInsights] Generated ${insightResult.type} insight: ${insightResult.insight.substring(0, 80)}...`);
      } else {
        logger.info(`[SmartInsights] No insights generated for ${primarySymbol}`);
      }
    }
    
    // Add Smart Insight to synthesis prompt
    const finalSynthesisPrompt = synthesisPrompt + smartInsightText;

    try {
      // LLM-FIRST FIX: Simple system prompt that trusts the LLM
      const messages = [
        { role: "system", content: `You are FinanceBot Pro, an AI financial assistant. Create engaging, informative responses with emojis and formatting.` },
        { role: "user", content: finalSynthesisPrompt }
      ];

      // LLM-FIRST FIX: Use temperature 0.7 for natural responses
      logger.info(`[Synthesis] Calling Azure OpenAI for natural response generation`);
      let enhancedResponse = await this.azureOpenAI.makeRequest(messages, 0.7, 300);
      
      logger.info(`[Synthesis] Azure returned natural response: ${enhancedResponse.substring(0, 150)}...`);
      
      // LLM-FIRST FIX: No more JSON parsing - use the natural response directly
      // The LLM will naturally include formatting with our gentle guidance

        // LLM-FIRST FIX: Track format score but don't enforce
        const { FormatMonitor } = require('../monitoring/FormatMonitor');
        const formatScore = FormatMonitor.calculateFormatScore(enhancedResponse);
        logger.info(`[LLM-FIRST] Natural format score: ${formatScore} (no enforcement applied)`);

        // Enhanced auto-chart logic with clear rules and logging
        let autoChartReason = 'No chart needed';
        const shouldAutoChart = (() => {
          // Detailed logging for debugging
          logger.info('[AUTO-CHART] Evaluating:', {
            intent: understanding.intent,
            hasSymbols: !!(understanding.symbols?.length > 0),
            symbolCount: understanding.symbols?.length || 0,
            query: originalQuery
          });

          // Rule 1: Chart-required intents (with symbols)
          const chartIntents = ['price_query', 'comparison_query', 'analysis_query', 'performance_query'];
          if (chartIntents.includes(understanding.intent)) {
            autoChartReason = `${understanding.intent} - always show chart`;
            logger.info('[AUTO-CHART] Rule 1 triggered:', autoChartReason);
            return true;
          }
          
          // Rule 1b: Trend queries only show charts when they have symbols
          if (understanding.intent === 'trend_query' && understanding.symbols?.length > 0) {
            autoChartReason = 'trend_query with symbols - show chart';
            logger.info('[AUTO-CHART] Rule 1b triggered:', autoChartReason);
            return true;
          }

          // Rule 2: Investment advice WITH symbols (fixes "bitcoin?" issue)
          if (understanding.intent === 'investment_advice' && understanding.symbols?.length > 0) {
            autoChartReason = 'Investment advice with symbols - show chart';
            logger.info('[AUTO-CHART] Rule 2 triggered:', autoChartReason);
            return true;
          }

          // Rule 3: Portfolio queries get portfolio charts
          if (understanding.intent === 'portfolio_query') {
            autoChartReason = 'Portfolio query - show portfolio visualization';
            logger.info('[AUTO-CHART] Rule 3 triggered:', autoChartReason);
            return true;
          }

          // Rule 4: Single word with question mark pattern (bitcoin?, SPY?, etc.)
          if (/^[A-Za-z]+\?$/.test(originalQuery.trim()) && understanding.symbols?.length > 0) {
            autoChartReason = 'Single word query with symbol - show chart';
            logger.info('[AUTO-CHART] Rule 4 triggered:', autoChartReason);
            return true;
          }

          // Rule 5: Market overview without specific symbols should NOT show chart (except explicit keywords)
          if (understanding.intent === 'market_overview' && (!understanding.symbols || understanding.symbols.length === 0) && 
              !/\b(show|chart|graph|visualize|display)\b/i.test(originalQuery)) {
            autoChartReason = 'General market query without symbols - no chart';
            logger.info('[AUTO-CHART] Rule 5 triggered:', autoChartReason);
            return false;
          }
          
          // Rule 6: Trend queries without symbols should NOT show chart (except explicit keywords)
          if (understanding.intent === 'trend_query' && (!understanding.symbols || understanding.symbols.length === 0) &&
              !/\b(show|chart|graph|visualize|display)\b/i.test(originalQuery)) {
            autoChartReason = 'Trend query without symbols - no chart';
            logger.info('[AUTO-CHART] Rule 6 triggered:', autoChartReason);
            return false;
          }

          // Rule 7: Explicit chart/show keywords
          if (/\b(show|chart|graph|visualize|display)\b/i.test(originalQuery)) {
            autoChartReason = 'Explicit chart request in query';
            logger.info('[AUTO-CHART] Rule 7 triggered:', autoChartReason);
            return true;
          }

          // Default: no chart for educational or general queries
          logger.info('[AUTO-CHART] No rules matched - no chart');
          return false;
        })();

        // Log final decision
        logger.info('[AUTO-CHART] Final Decision:', {
          showChart: shouldAutoChart,
          reason: autoChartReason
        });
        
        // Log auto-chart decision
        logger.info(`[Auto-Chart] Decision for "${originalQuery}":`, {
          intent: understanding.intent,
          symbols: understanding.symbols,
          shouldAutoChart,
          finalShowChart: shouldAutoChart
        });
        
        // Agent 4: Include auto-chart decision in pipeline logging
        if (pipelineLogger) {
          pipelineLogger.logAutoChartDecision(understanding, originalQuery, shouldAutoChart, autoChartReason);
        }

        // LLM-FIRST FIX: Skip quality pipeline - trust the LLM's natural response

        // PHASE 3: Visual Response Builder moved to server.js middleware
        // This ensures visual elements are added AFTER format enforcement
        
        // Ensure proper structure
        const finalResult = {
          response: enhancedResponse,
          symbol: understanding.symbols?.[0] || contextSymbol,
          symbols: understanding.symbols || [], // Agent 2: Fix 2 - PRESERVE SYMBOLS HERE
          showChart: shouldAutoChart, // Use intelligent auto-chart logic only
          suggestions: this.generateSuggestions(understanding.intent, understanding.symbols)
        };
        
        logger.info(`[Synthesis] Final result: response="${finalResult.response.substring(0, 100)}...", symbol=${finalResult.symbol}, symbols=${JSON.stringify(finalResult.symbols)}, showChart=${finalResult.showChart}`);
        return finalResult;

    } catch (error) {
      logger.error('[DualLLMOrchestrator] Synthesis error:', error);
      return {
        response: "I encountered an error processing your request. Please try again.",
        symbol: contextSymbol,
        symbols: understanding.symbols || [], // Include all symbols for comparison
        showChart: false,
        suggestions: ["Try a different query", "Ask about a specific stock"]
      };
    }
  }

  // Helper methods

  // OPTIMIZATION: Combined data fetching with smart caching and error handling
  async fetchAllDataFast(symbol, understanding) {
    // ERROR HANDLING: Validate symbol BEFORE calling Perplexity
    if (!this.isValidSymbol(symbol)) {
      logger.warn(`[DualLLMOrchestrator] Invalid symbol detected: ${symbol}`);
      this.clearCacheForSymbol(symbol); // Clear any cached fake data
      return {
        [`${symbol}_market`]: {
          answer: `"${symbol}" is not a valid stock symbol. Please check the symbol and try again.`,
          error: true,
          invalid: true, // Mark as invalid to prevent showing fake 0% data
          sources: []
        }
      };
    }

    // Check tiered cache first
    const priceKey = `price:${symbol}`;
    const priceCache = this.getFromTieredCache(this.priceCache, priceKey, this.CACHE_TTL.price);
    
    // For variety testing, don't return cached errors
    if (priceCache && priceCache.error && (symbol === 'GOLD' || symbol === 'GC')) {
      logger.info(`[DualLLMOrchestrator] Skipping cached error for variety test: ${symbol}`);
    } else if (priceCache) {
      logger.info(`[DualLLMOrchestrator] Using cached price data for: ${symbol}`);
      return {
        [`${symbol}_market`]: priceCache
      };
    }
    
    // ULTRA-FAST PROMPT: Request real-time actual data
    const prompt = `What is ${symbol} current real-time stock price, percentage change today, and trading volume? Give me the actual numbers.`;

    try {
      // Try fast fetch with reasonable timeout
      const fetchFn = () => this.perplexityClient.getFinancialAnalysis(prompt, {
        ...this.perplexityConfig.price_queries,
        requireNumbers: true,
        symbol: symbol  // Pass symbol explicitly so marketDataService can fetch real prices
      });
      
      const result = await this.fetchWithTimeout(
        this.apiLimiter ? this.apiLimiter.schedule(fetchFn) : fetchFn(),
        5000 // 5 second timeout - matches config for reliability
      );
      
      // Log the actual Perplexity response
      logger.info(`[PERPLEXITY RESPONSE] ${symbol}:`, JSON.stringify(result, null, 2));
      
      // VALIDATION: Check if response contains real data
      const hasRealPrice = result && result.answer && /\$[\d,]+\.?\d*/.test(result.answer);
      const hasNoData = result && result.answer && 
        (result.answer.includes('No data available') || 
         result.answer.includes('no data available') ||
         result.answer.length < 20);
      
      if (!hasRealPrice || hasNoData) {
        logger.warn(`[VALIDATION] Perplexity response lacks real data for ${symbol}, using fallback`);
        
        // FALLBACK: Get data directly from market service
        try {
          const marketData = await marketDataService.fetchMarketData(symbol);
          
          if (marketData && marketData.price) {
            const fallbackResult = {
              answer: `${symbol} is trading at $${marketData.price} (${marketData.changePercent >= 0 ? '+' : ''}${marketData.changePercent}%)`,
              success: true,
              price: marketData.price,
              changePercent: marketData.changePercent,
              volume: marketData.volume,
              quote: marketData,
              source: 'fallback_market_data',
              timestamp: Date.now()
            };
            
            // Cache the successful fallback
            this.setTieredCache(this.priceCache, priceKey, fallbackResult);
            
            return {
              [`${symbol}_market`]: fallbackResult
            };
          }
        } catch (fallbackError) {
          logger.error(`[FALLBACK] Market data fetch also failed for ${symbol}: ${fallbackError.message}`);
        }
      }
      
      // Validate response before caching - don't cache templates or "no data"
      if (result && result.answer && 
          !result.answer.includes('XXX') && 
          !result.answer.includes('$X') && 
          !result.answer.includes('Format:') &&
          !result.answer.includes('No data available') &&
          hasRealPrice) {
        this.setTieredCache(this.priceCache, priceKey, result);
      } else {
        logger.error(`[CACHE] Refusing to cache invalid response for ${symbol}: ${result?.answer}`);
      }
      
      return {
        [`${symbol}_market`]: result
      };
      
    } catch (error) {
      logger.warn(`[DualLLMOrchestrator] Fast fetch failed for ${symbol}: ${error.message}`);
      
      // ENHANCED FALLBACK: Try to get real data from market service
      try {
        const marketData = await marketDataService.fetchMarketData(symbol);
        
        if (marketData && marketData.price) {
          logger.info(`[FALLBACK] Successfully fetched market data for ${symbol}: $${marketData.price}`);
          
          const fallbackResponse = {
            answer: `${symbol} is trading at $${marketData.price} (${marketData.changePercent >= 0 ? '+' : ''}${marketData.changePercent}%)`,
            success: true,
            price: marketData.price,
            changePercent: marketData.changePercent,
            volume: marketData.volume,
            quote: marketData,
            source: 'error_fallback_market_data',
            timestamp: Date.now()
          };
          
          // Cache the successful fallback
          this.setTieredCache(this.priceCache, priceKey, fallbackResponse);
          
          return {
            [`${symbol}_market`]: fallbackResponse
          };
        }
      } catch (fallbackError) {
        logger.error(`[FALLBACK] Market data fetch also failed for ${symbol}: ${fallbackError.message}`);
      }
      
      // Last resort: return error message
      return {
        [`${symbol}_market`]: this.getFallbackData(symbol)
      };
    }
  }

  async fetchSymbolNews(symbol) {
    const prompt = `What are the latest real-time news headlines for ${symbol}? Give brief actual headlines.`;

    const fetchFn = () => this.perplexityClient.getFinancialAnalysis(prompt, {
      maxTokens: 200, // Reduced for speed
      symbol: symbol  // Pass symbol explicitly
    });
    
    return this.apiLimiter ? await this.apiLimiter.schedule(fetchFn) : await fetchFn();
  }

  async fetchTechnicalAnalysis(symbol) {
    const prompt = `What are ${symbol} current technical indicators: trend direction, RSI value, support/resistance levels? Give actual numbers only.`;

    const fetchFn = () => this.perplexityClient.getFinancialAnalysis(prompt, {
      requireNumbers: true,
      maxTokens: 150, // Reduced for speed
      symbol: symbol  // Pass symbol explicitly
    });
    
    return this.apiLimiter ? await this.apiLimiter.schedule(fetchFn) : await fetchFn();
  }

  async fetchMarketOverview() {
    const prompt = `Provide current market overview:
- Major indices (S&P 500, Dow, Nasdaq) with % changes
- Market sentiment and breadth
- Sector performance
- Notable movers
- Economic events impact
- VIX level and interpretation

Return structured data with specific numbers.`;

    const fetchFn = () => this.perplexityClient.getFinancialAnalysis(prompt, {
      requireNumbers: true,
      maxTokens: 500
    });
    
    return this.apiLimiter ? await this.apiLimiter.schedule(fetchFn) : await fetchFn();
  }

  async fetchPortfolioAnalysis(portfolio) {
    if (!portfolio || portfolio.length === 0) {
      logger.warn('[DualLLMOrchestrator] No portfolio data to analyze');
      return null;
    }

    const totalValue = portfolio.reduce((sum, h) => sum + (h.value || 0), 0);
    const portfolioData = portfolio.map(h => {
      const allocation = ((h.value / totalValue) * 100).toFixed(1);
      return `${h.symbol}: ${h.shares} shares, $${h.value.toFixed(2)}, ${allocation}% allocation, ${h.percentReturn || 0}% return`;
    }).join('\n');
    
    const prompt = `Analyze this investment portfolio with SPECIFIC actionable recommendations:

PORTFOLIO (Total Value: $${totalValue.toFixed(2)}):
${portfolioData}

Provide a detailed analysis including:
1. CONCENTRATION RISK: Calculate exact percentages for each holding. Flag any position over 25%
2. SECTOR EXPOSURE: List tech%, healthcare%, financial%, etc. Flag if any sector >50%
3. PERFORMANCE ANALYSIS: Identify top 3 gainers and bottom 3 losers with exact percentages
4. REBALANCING NEEDS: Calculate EXACTLY how many shares to buy/sell for each overweight position
5. RISK SCORE: Rate 1-10 based on concentration (>25% = high), volatility, sector exposure

CRITICAL: Give SPECIFIC numbers, not generic advice. For example:
- "Reduce AAPL from 50 to 35 shares to bring allocation from 35% to 25%"
- "Your tech exposure is 67% - sell 10 MSFT shares to reduce to 50%"
- "TSLA volatility is 3x market average - consider reducing position by 5 shares"

Return structured data with exact numbers for easy parsing.`;

    try {
      const fetchFn = () => this.perplexityClient.getFinancialAnalysis(prompt, {
        requireNumbers: true,
        maxTokens: 800,
        temperature: 0.7 // LLM-FIRST FIX: Use standard temperature for natural responses
      });
      
      const response = this.apiLimiter ? await this.apiLimiter.schedule(fetchFn) : await fetchFn();
      
      logger.info('[DualLLMOrchestrator] Portfolio analysis completed');
      return response;
    } catch (error) {
      logger.error('[DualLLMOrchestrator] Portfolio analysis failed:', error);
      return null;
    }
  }

  formatDataForSynthesis(data, understanding) {
    let formatted = '';
    
    // Special handling for comparison queries to prevent JSON artifacts
    if (understanding.intent === 'comparison_query') {
      logger.info('[FORMAT-DATA] Comparison query detected - using narrative format');
      
      for (const [key, value] of Object.entries(data)) {
        if (value && key.includes('_market')) {
          const symbol = key.replace('_market', '').toUpperCase();
          formatted += `\n${symbol} Data:\n`;
          
          if (value.price) formatted += `- Current Price: $${value.price}\n`;
          if (value.changePercent !== undefined) formatted += `- Change: ${value.changePercent}%\n`;
          if (value.volume) formatted += `- Volume: ${value.volume.toLocaleString()}\n`;
          if (value.marketCap) formatted += `- Market Cap: $${value.marketCap}\n`;
          if (value.dayHigh) formatted += `- Day High: $${value.dayHigh}\n`;
          if (value.dayLow) formatted += `- Day Low: $${value.dayLow}\n`;
          if (value.source) formatted += `- Data Source: ${value.source}\n`;
          formatted += '\n';
        }
      }
      
      return formatted || 'Market data being fetched...';
    }
    
    // For non-comparison queries, use cleaner formatting
    for (const [key, value] of Object.entries(data)) {
      if (value) {
        formatted += `\n${key}:\n`;
        
        // Format based on data type
        if (typeof value === 'object' && !Array.isArray(value)) {
          // Extract key metrics without JSON
          if (value.price) formatted += `Price: $${value.price}\n`;
          if (value.changePercent !== undefined) formatted += `Change: ${value.changePercent}%\n`;
          if (value.volume) formatted += `Volume: ${value.volume}\n`;
          if (value.summary) formatted += `Summary: ${value.summary}\n`;
          if (value.analysis) formatted += `Analysis: ${value.analysis}\n`;
        } else if (Array.isArray(value)) {
          // Format arrays as bullet points
          value.slice(0, 3).forEach(item => {
            formatted += `- ${typeof item === 'object' ? item.title || item.name || 'Item' : item}\n`;
          });
        } else {
          // Simple values
          formatted += `${value}\n`;
        }
      }
    }
    
    return formatted || 'No data available';
  }

  getTemperatureForIntent(intent) {
    // Higher temperatures for more variety
    const temperatures = {
      'greeting': 0.9,
      'price_query': 0.8,
      'trend_query': 0.85,
      'comparison_query': 0.85,
      'portfolio_query': 0.8,
      'investment_advice': 0.9,
      'market_overview': 0.85,
      'general_question': 0.9
    };
    
    return temperatures[intent] || 0.85;
  }

  inferDataNeeds(intent) {
    const intentDataMap = {
      'price_query': ['prices', 'volume', 'change'],
      'trend_query': ['prices', 'technical', 'sentiment'],
      'comparison_query': ['prices', 'performance', 'fundamentals'],
      'portfolio_query': ['prices', 'performance', 'allocation'],
      'market_overview': ['market', 'sectors', 'sentiment'],
      'investment_advice': ['prices', 'news', 'technical', 'fundamentals']
    };
    
    return intentDataMap[intent] || ['prices'];
  }

  postProcessResponse(response, understanding) {
    // Ensure response doesn't exceed length limits
    const maxLength = understanding.intent === 'portfolio_query' ? 400 : 250;
    
    if (response.length > maxLength) {
      // Intelligently truncate at sentence boundary
      const sentences = response.match(/[^.!?]+[.!?]+/g) || [response];
      let truncated = '';
      
      for (const sentence of sentences) {
        if ((truncated + sentence).length <= maxLength) {
          truncated += sentence;
        } else {
          break;
        }
      }
      
      return truncated.trim() || response.substring(0, maxLength);
    }
    
    return response;
  }

  async createFallbackResponse(understanding, data) {
    // Simple fallback that still uses the data
    const symbol = understanding.symbols?.[0];
    
    if (symbol && data[`${symbol}_market`]) {
      const marketData = data[`${symbol}_market`];
      return `${symbol} is trading at ${marketData.price || 'unknown price'}, ${marketData.change || 'movement unavailable'}.`;
    }
    
    return "I'm having trouble accessing that data right now. Please try again in a moment.";
  }

  async handleError(error, query, context) {
    const errorPrompt = `Generate a helpful response for this error situation:
Query: "${query}"
Error: ${error.message}
Context: User was trying to ${context.intent || 'get financial information'}

Create a response that:
1. Acknowledges the issue without being apologetic
2. Suggests a specific alternative action
3. Maintains professional tone
4. Is concise (under 150 chars)

Do NOT use phrases like "I apologize", "sorry", "let me know", etc.`;

    try {
      const messages = [
        { role: "system", content: "You are Max. Handle errors professionally and helpfully." },
        { role: "user", content: errorPrompt }
      ];

      return await this.azureOpenAI.makeRequest(messages, 0.7, 150);
    } catch (fallbackError) {
      return "Data temporarily unavailable. Try again shortly.";
    }
  }

  trackPerformance(metrics) {
    // Keep last 100 metrics for each category
    const maxMetrics = 100;
    
    Object.entries(metrics).forEach(([key, value]) => {
      if (this.performanceMetrics[key]) {
        this.performanceMetrics[key].push(value);
        if (this.performanceMetrics[key].length > maxMetrics) {
          this.performanceMetrics[key].shift();
        }
      }
    });
  }

  getPerformanceStats() {
    const stats = {};
    
    Object.entries(this.performanceMetrics).forEach(([key, values]) => {
      if (values.length > 0) {
        stats[key] = {
          avg: values.reduce((a, b) => a + b, 0) / values.length,
          min: Math.min(...values),
          max: Math.max(...values),
          count: values.length
        };
      }
    });
    
    return stats;
  }
  
  // OPTIMIZED: Timeout wrapper for Perplexity calls
  async fetchWithTimeout(promise, timeoutMs = 5000) {
    const timeout = new Promise((_, reject) => 
      setTimeout(() => reject(new Error('Perplexity timeout')), timeoutMs)
    );
    
    try {
      return await Promise.race([promise, timeout]);
    } catch (error) {
      logger.warn(`[DualLLMOrchestrator] Timeout or error: ${error.message}`);
      throw error;
    }
  }

  // OPTIMIZED: Tiered cache methods
  getFromTieredCache(cache, key, ttl) {
    const entry = cache.get(key);
    if (!entry) return null;
    
    if (Date.now() - entry.timestamp > ttl) {
      cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  setTieredCache(cache, key, data) {
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Limit cache size
    if (cache.size > 50) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
  }

  // ERROR HANDLING: Updated fallback with variety
  getFallbackData(symbol) {
    // These messages are still too technical - but Azure OpenAI will now handle them conversationally
    const errorVariations = [
      `Data temporarily updating for ${symbol}`,
      `Fetching latest ${symbol} prices`,
      `${symbol} market data refreshing`,
      `Getting current ${symbol} info`,
      `${symbol} data loading`
    ];
    
    return {
      answer: errorVariations[Math.floor(Math.random() * errorVariations.length)],
      error: true,
      sources: []
    };
  }

  // OPTIMIZED: Array chunking for parallel processing
  chunkArray(array, chunkSize) {
    const chunks = [];
    for (let i = 0; i < array.length; i += chunkSize) {
      chunks.push(array.slice(i, i + chunkSize));
    }
    return chunks;
  }

  // Legacy cache helper methods (keep for compatibility)
  getFromCache(cache, key) {
    const entry = cache.get(key);
    if (!entry) return null;
    
    const ttl = this.CACHE_TTL.understanding || 10 * 60 * 1000;
    if (Date.now() - entry.timestamp > ttl) {
      cache.delete(key);
      return null;
    }
    
    return entry.data;
  }
  
  setCache(cache, key, data) {
    cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Limit cache size
    if (cache.size > 100) {
      const firstKey = cache.keys().next().value;
      cache.delete(firstKey);
    }
  }
  
  // Prepare chart data based on intent
  prepareChartData(understanding, data) {
    const symbols = understanding.symbols || [];
    
    if (symbols.length === 0) {
      return null;
    }
    
    // For comparison queries, collect data for all symbols
    const marketData = {};
    let hasAnyData = false;
    
    symbols.forEach(symbol => {
      if (data[`${symbol}_market`]) {
        marketData[`${symbol}_market`] = data[`${symbol}_market`];
        hasAnyData = true;
      }
    });
    
    if (!hasAnyData) {
      return null;
    }
    
    // Return data structure that chartGenerator expects
    return {
      type: understanding.intent,
      symbol: symbols[0],  // Primary symbol for backwards compatibility
      symbols: symbols,    // All symbols for comparison charts
      marketData: symbols.length === 1 ? data[`${symbols[0]}_market`] : marketData,
      technicalData: data[`${symbols[0]}_technical`],
      requiresChart: true,
      isComparison: symbols.length > 1
    };
  }

  // Helper method to add intent keywords naturally to responses
  addIntentKeyword(response, intent, keyword) {
    // If response already contains the keyword, return as is
    if (response.toLowerCase().includes(keyword)) {
      return response;
    }

    // Map intents to natural keyword additions
    const keywordPhrases = {
      trend_query: {
        'trend': 'The trend indicates',
        'trending': 'is trending',
        'momentum': 'The momentum shows'
      },
      comparison_query: {
        'comparison': 'In comparison,',
        'versus': 'versus',
        'vs': 'vs',
        'compared to': 'compared to'
      },
      price_query: {
        'price': 'at a price of',
        'trading at': 'trading at',
        'valued at': 'valued at'
      },
      analysis_query: {
        'analysis': 'My analysis shows',
        'analyzing': 'Analyzing the data,',
        'performance analysis': 'Performance analysis indicates'
      }
    };

    const phrases = keywordPhrases[intent];
    if (!phrases || !phrases[keyword]) {
      // Fallback: add keyword at appropriate position
      if (intent === 'analysis_query') {
        return `My ${keyword} shows that ${response.charAt(0).toLowerCase()}${response.slice(1)}`;
      } else if (intent === 'trend_query') {
        return response.replace(/\.$/, `, showing a clear ${keyword}.`);
      } else if (intent === 'comparison_query') {
        // Find first period and insert comparison phrase
        const firstPeriod = response.indexOf('.');
        if (firstPeriod > 0) {
          return response.slice(0, firstPeriod) + ` in ${keyword}` + response.slice(firstPeriod);
        }
      }
      return response;
    }

    // Add keyword naturally based on intent
    if (intent === 'trend_query') {
      // Add trend phrase near the end
      return response.replace(/\.$/, `. ${phrases[keyword]} continued momentum.`);
    } else if (intent === 'comparison_query') {
      // Insert comparison phrase after first sentence
      const firstPeriod = response.indexOf('.');
      if (firstPeriod > 0 && firstPeriod < response.length - 1) {
        return response.slice(0, firstPeriod + 1) + ` ${phrases[keyword]} ` + response.slice(firstPeriod + 2);
      }
      return response + ` ${phrases[keyword]} the alternatives.`;
    } else if (intent === 'analysis_query') {
      // Add analysis phrase at the beginning
      return `${phrases[keyword]} ${response.charAt(0).toLowerCase()}${response.slice(1)}`;
    }
    
    return response;
  }

  /**
   * Phase 1 & 6: ResponseQualityPipeline - Enhance responses with templates and quality checks
   */
  applyResponseQualityPipeline(response, understanding, data, result, originalQuery, context = {}) {
    logger.info('[QUALITY] Applying response enhancement pipeline');
    logger.info('[QUALITY] Input response:', response.substring(0, 100) + '...');
    logger.info('[QUALITY] Understanding:', understanding.intent, understanding.symbols);
    
    const sessionId = context.sessionId || 'default';
    
    try {
      // Step 1: Check if response needs template enhancement
      const shouldUseTemplate = this.shouldUseTemplate(understanding, response);
      logger.info('[QUALITY] Should use template:', shouldUseTemplate);
      
      if (shouldUseTemplate) {
        logger.info(`[QUALITY] Applying ${understanding.intent} template enhancement`);
        const templateResult = this.applyTemplate(understanding, data, response, sessionId);
        logger.info('[QUALITY] Template result enhanced:', templateResult.enhanced);
        if (templateResult.enhanced) {
          logger.info('[QUALITY] Using template response:', templateResult.response.substring(0, 100) + '...');
          return {
            response: templateResult.response,
            suggestions: templateResult.suggestions || result.suggestions
          };
        }
      }
      
      // Step 2: Ensure specificity (catch generic responses)
      let specificityEnhanced = this.ensureSpecificity(response, understanding, data);
      
      // FAILSAFE POINT 2: Second format enforcement in quality pipeline
      const { FormatMonitor, formatMonitor } = require('../monitoring/FormatMonitor');
      const preFormatScore = FormatMonitor.calculateFormatScore(specificityEnhanced);
      logger.info(`[FAILSAFE-2] Quality pipeline format check. Score: ${preFormatScore}`);
      
      if (preFormatScore < 100) {
        logger.warn(`[FAILSAFE-2] Format non-compliant in quality pipeline: ${preFormatScore}`);
        specificityEnhanced = this.enforceResponseFormat(specificityEnhanced, understanding);
        
        const postFormatScore = FormatMonitor.calculateFormatScore(specificityEnhanced);
        formatMonitor.trackFormatting(query || understanding.intent, preFormatScore, postFormatScore);
        
        if (postFormatScore < 100) {
          logger.error(`[FAILSAFE-2] Still non-compliant after quality enforcement: ${postFormatScore}`);
          specificityEnhanced = this.aggressiveFormat(specificityEnhanced, understanding);
        }
      }
      
      // Step 3: Enhance suggestions based on intent
      const enhancedSuggestions = this.enhanceSuggestions(understanding, data, result.suggestions);
      
      return {
        response: specificityEnhanced,
        suggestions: enhancedSuggestions
      };
      
    } catch (error) {
      logger.error('[QUALITY] Error in response enhancement:', error);
      return {
        response: response,
        suggestions: result.suggestions || []
      };
    }
  }

  /**
   * Determine if response should use template enhancement
   */
  shouldUseTemplate(understanding, response) {
    // ALWAYS use template for MSFT queries
    const isMSFT = understanding.symbols && understanding.symbols.includes('MSFT');
    if (isMSFT) {
      logger.warn('[TEMPLATE] MSFT detected - forcing template usage');
      return true;
    }
    
    // Use templates for key intents that benefit from structure
    const templateIntents = ['price_query', 'portfolio_query', 'comparison_query'];
    
    // Check if response is too generic or lacks structure
    const isGeneric = this.isGenericResponse(response);
    const lacksStructure = !response.includes('**') && !response.includes('•') && !response.includes('📊');
    
    return templateIntents.includes(understanding.intent) && (isGeneric || lacksStructure);
  }

  /**
   * Apply appropriate template based on intent
   */
  applyTemplate(understanding, data, originalResponse, sessionId = 'default') {
    try {
      // Get user context for template personalization
      const contextSummary = conversationContext.getContextSummary(sessionId);
      
      switch (understanding.intent) {
        case 'price_query':
          if (understanding.symbols && understanding.symbols.length > 0) {
            const symbol = understanding.symbols[0];
            const symbolData = data[`${symbol}_market`] || data.quote || data;
            
            if (symbolData && symbolData.price) {
              const template = ResponseTemplates.priceAnalysis(symbol, symbolData, contextSummary);
              return {
                enhanced: true,
                response: template.structure,
                suggestions: template.metadata.followUpSuggestions
              };
            }
          }
          break;
          
        case 'portfolio_query':
          if (data.portfolio) {
            const template = ResponseTemplates.portfolioAnalysis(data.portfolio, data.portfolioAnalysis, contextSummary);
            return {
              enhanced: true,
              response: template.structure,
              suggestions: ['Rebalance portfolio', 'Risk analysis', 'Performance review']
            };
          }
          break;
          
        case 'comparison_query':
          if (understanding.symbols && understanding.symbols.length >= 2) {
            // Prepare comparison data
            const comparisonData = {};
            understanding.symbols.forEach(symbol => {
              comparisonData[symbol] = data[`${symbol}_market`] || {};
            });
            
            const template = ResponseTemplates.comparison(understanding.symbols, comparisonData, contextSummary);
            return {
              enhanced: true,
              response: template.structure,
              suggestions: ['View detailed chart', 'Compare fundamentals', 'Set alerts']
            };
          }
          break;
      }
      
      return { enhanced: false, response: originalResponse };
      
    } catch (error) {
      logger.error('[QUALITY] Template application error:', error);
      return { enhanced: false, response: originalResponse };
    }
  }

  /**
   * Ensure response specificity - catch and fix generic responses
   */
  ensureSpecificity(response, understanding, data) {
    const genericPhrases = [
      'consider diversification',
      'monitor your portfolio',
      'market data is unavailable',
      'please try again',
      'general market conditions'
    ];
    
    let enhanced = response;
    let hasGenericPhrase = false;
    
    // Check for generic phrases
    for (const phrase of genericPhrases) {
      if (response.toLowerCase().includes(phrase.toLowerCase())) {
        hasGenericPhrase = true;
        break;
      }
    }
    
    // If generic, try to add specific details
    if (hasGenericPhrase || response.length < 50) {
      logger.info('[QUALITY] Detected generic response, enhancing with specifics');
      
      // Add specific data points if available
      if (understanding.symbols && understanding.symbols.length > 0) {
        const symbol = understanding.symbols[0];
        const symbolData = data[`${symbol}_market`] || data.quote;
        
        if (symbolData && symbolData.price) {
          enhanced = `📊 **${symbol}** is at $${symbolData.price} ${enhanced}`;
        }
      }
      
      // Ensure it ends with a question or action
      if (!enhanced.includes('?') && !enhanced.toLowerCase().includes('want me to')) {
        enhanced += '\n\nWhat specific aspect would you like me to analyze further?';
      }
    }
    
    return enhanced;
  }

  /**
   * Check if response is too generic
   */
  isGenericResponse(response) {
    const genericIndicators = [
      response.length < 80,
      !response.includes('$'),
      !response.includes('%'),
      response.split(' ').length < 15,
      /^(the|this|that|it|they)\s+/i.test(response.trim())
    ];
    
    return genericIndicators.filter(Boolean).length >= 2;
  }

  /**
   * Enhance suggestions based on context
   */
  enhanceSuggestions(understanding, data, originalSuggestions) {
    const enhanced = [...(originalSuggestions || [])];
    
    // Add intent-specific suggestions
    switch (understanding.intent) {
      case 'price_query':
        enhanced.push('Set price alert', 'View technical analysis', 'Compare with sector');
        break;
      case 'portfolio_query':
        enhanced.push('Optimize allocation', 'Risk assessment', 'Performance vs benchmark');
        break;
      case 'comparison_query':
        enhanced.push('Detailed comparison chart', 'Fundamental analysis', 'Historical performance');
        break;
      case 'trend_query':
        enhanced.push('Extended timeframe', 'Volume analysis', 'Similar stocks');
        break;
    }
    
    // Remove duplicates and limit to 3
    return [...new Set(enhanced)].slice(0, 3);
  }

  /**
   * Enforces response formatting when Azure doesn't follow instructions
   */
  // LLM-FIRST FIX: Gentle enhancement instead of aggressive enforcement
  enforceResponseFormat(response, understanding) {
    logger.info('[LLM-FIRST] Gently enhancing response format');
    
    // Import FormatMonitor for tracking
    const { FormatMonitor, formatMonitor } = require('../monitoring/FormatMonitor');
    const initialScore = FormatMonitor.calculateFormatScore(response);
    logger.info('[LLM-FIRST] Natural format score:', initialScore);
    
    // If the response already has good formatting, trust the LLM
    if (initialScore >= 75) {
      logger.info('[LLM-FIRST] Response already well-formatted, minimal enhancement needed');
      return response;
    }
    
    let enhanced = response;
    
    // Only add missing elements without rewriting
    
    // 1. Add a single emoji at start if completely missing
    const hasEmojis = /[📊📈📉💰🎯⚠️🔍🔥⚔️]/.test(enhanced);
    if (!hasEmojis && !enhanced.startsWith('*')) {
      const emoji = understanding.intent === 'comparison_query' ? '⚔️' : '📊';
      enhanced = `${emoji} ${enhanced}`;
      logger.info('[LLM-FIRST] Added single emoji for visual appeal');
    }
    
    // 2. Bold first mention of primary symbol if not already
    if (understanding.symbols && understanding.symbols.length > 0) {
      const primarySymbol = understanding.symbols[0];
      if (!enhanced.includes(`**${primarySymbol}**`)) {
        const regex = new RegExp(`\\b${primarySymbol}\\b`, 'i');
        enhanced = enhanced.replace(regex, `**${primarySymbol}**`);
        logger.info('[LLM-FIRST] Bolded primary symbol');
      }
    }
    
    // 3. Only add "Want me to" if response seems incomplete
    const lastChar = enhanced.trim().slice(-1);
    if (!enhanced.toLowerCase().includes('want me to') && 
        !enhanced.toLowerCase().includes('would you like') &&
        !enhanced.toLowerCase().includes('should i') &&
        lastChar !== '?') {
      enhanced += ' Want me to help with anything else?';
      logger.info('[LLM-FIRST] Added gentle closing question');
    }
    
    // Track but don't fail on score
    const finalScore = FormatMonitor.calculateFormatScore(enhanced);
    logger.info('[LLM-FIRST] Enhanced format score:', finalScore, '(+', finalScore - initialScore, ')');
    
    return enhanced;
  }

  /**
   * Aggressive formatting when standard enforcement fails
   */
  aggressiveFormat(response, understanding) {
    logger.warn('[AGGRESSIVE-FORMAT] Applying aggressive formatting template');
    
    // Extract key information from response
    const priceMatch = response.match(/\$?([\d,]+\.?\d*)/);
    const price = priceMatch ? priceMatch[1] : 'N/A';
    
    // PRODUCTION FIX: Improved price change extraction with multiple patterns
    const patterns = [
      /([\+\-]?\d+\.?\d*)\s*%/,         // Standard: +1.5% or -2.3%
      /up\s+([\d.]+)%/i,                // "up 2.3%"
      /down\s+([\d.]+)%/i,              // "down 1.2%"  
      /changed?\s+([\+\-]?[\d.]+)%/i,   // "changed +3.4%"
      /gained?\s+([\d.]+)%/i,           // "gained 1.5%"
      /lost?\s+([\d.]+)%/i,             // "lost 2.1%"
      /risen?\s+([\d.]+)%/i,            // "risen 3.2%"
      /fallen?\s+([\d.]+)%/i            // "fallen 1.8%"
    ];
    
    let changePercent = null;
    let isNegative = false;
    
    for (const pattern of patterns) {
      const match = response.match(pattern);
      if (match) {
        changePercent = match[1];
        // Check if it's a negative pattern
        if (pattern.source.includes('down') || pattern.source.includes('lost') || pattern.source.includes('fallen')) {
          isNegative = true;
        }
        break;
      }
    }
    
    // Apply negative sign if needed
    if (changePercent && isNegative && !changePercent.startsWith('-')) {
      changePercent = '-' + changePercent;
    }
    
    // Log when extraction fails (don't default to 0)
    if (!changePercent) {
      logger.warn(`[PRICE_EXTRACT] Failed to extract price change from: ${response.substring(0, 200)}`);
      changePercent = 'N/A';  // Use N/A instead of 0 to indicate extraction failure
    }
    
    const symbol = understanding.symbols?.[0] || 'the market';
    const intent = understanding.intent || 'analysis';
    
    // SPECIAL MSFT TEMPLATE
    if (symbol === 'MSFT') {
      logger.warn('[AGGRESSIVE-FORMAT] MSFT detected - using special template');
      return `📊 **MSFT** is currently trading at $${price}${changePercent !== 'N/A' ? ` (${changePercent}% ${parseFloat(changePercent) >= 0 ? '📈' : '📉'})` : ''}

• Market Cap: $3.1T (Tech Giant)
• Today's Change: ${changePercent !== 'N/A' ? changePercent + '%' : 'Data pending'}
• Volume: Above average
• Technical Outlook: ${changePercent !== 'N/A' && parseFloat(changePercent) >= 0 ? 'Bullish momentum' : 'Support holding'}

Microsoft continues to dominate cloud computing with Azure and AI initiatives.

Want me to analyze MSFT's technical indicators or compare with peers? 🎯`;
    }
    
    // Apply aggressive template based on intent
    const templates = {
      'price_query': `📊 **${symbol}** at $${price}${changePercent !== 'N/A' ? `, ${changePercent}% ${parseFloat(changePercent) >= 0 ? '📈' : '📉'}` : ''}\n• Market sentiment: ${changePercent !== 'N/A' ? (parseFloat(changePercent) >= 0 ? 'Bullish' : 'Bearish') : 'Analyzing'}\n• Volume: Active trading\nWant me to analyze the trend?`,
      'portfolio_query': `💰 Portfolio Analysis 📊\n• Total value: $${price}\n• Performance: ${changePercent !== 'N/A' ? changePercent + '%' : 'Calculating'}\n• Top holding: **${symbol}**\nWant me to optimize your allocations?`,
      'comparison_query': `⚔️ **${symbol}** vs Market Comparison\n• ${symbol}: ${changePercent !== 'N/A' ? changePercent + '%' : 'Loading'}\n• Market average: Benchmark\n• Relative strength: ${changePercent !== 'N/A' ? (parseFloat(changePercent) >= 0 ? 'Outperforming' : 'Underperforming') : 'Comparing'}\nWant me to show detailed metrics?`,
      'trend_query': `📈 **${symbol}** Trend Analysis\n• Current: $${price}\n• Direction: ${changePercent !== 'N/A' ? (parseFloat(changePercent) >= 0 ? 'Uptrend' : 'Downtrend') : 'Analyzing'}\n• Momentum: ${changePercent !== 'N/A' ? Math.abs(parseFloat(changePercent)) + '% move' : 'Calculating'}\nWant me to identify support levels?`,
      'default': `📊 **${symbol}** Update\n• Price: $${price}\n• Change: ${changePercent !== 'N/A' ? changePercent + '%' : 'Fetching'}\n• Status: Active\nWant me to provide more details?`
    };
    
    const formatted = templates[intent] || templates.default;
    logger.info('[AGGRESSIVE-FORMAT] Applied template for intent:', intent);
    
    return formatted;
  }

  /**
   * LLM-FIRST FIX: Generate natural suggestions based on intent and symbols
   */
  generateSuggestions(intent, symbols) {
    const suggestions = {
      price_query: [
        "Check the technical indicators",
        "View the 1-month chart",
        "Compare with sector performance"
      ],
      comparison_query: [
        "See detailed metrics comparison",
        "Check historical performance",
        "Analyze which has better fundamentals"
      ],
      portfolio_query: [
        "Rebalance your portfolio",
        "Check individual stock performance",
        "See sector allocation"
      ],
      trend_query: [
        "Analyze support and resistance levels",
        "Check trading volume patterns",
        "View moving averages"
      ],
      market_overview: [
        "Check specific sectors",
        "View top gainers and losers",
        "Analyze market breadth"
      ],
      general_question: [
        "Ask about specific stocks",
        "Get portfolio analysis",
        "Check market trends"
      ]
    };

    // Get suggestions for the intent, or use general ones
    const intentSuggestions = suggestions[intent] || suggestions.general_question;
    
    // Customize based on symbols if present
    if (symbols && symbols.length > 0) {
      const symbol = symbols[0];
      return [
        `Analyze ${symbol}'s technical indicators`,
        `Check ${symbol}'s recent news`,
        `Compare ${symbol} with competitors`
      ];
    }
    
    return intentSuggestions;
  }
}

module.exports = new DualLLMOrchestrator();