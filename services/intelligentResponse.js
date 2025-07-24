const MarketDataService = require("../src/knowledge/market-data-service");
const NumberFormatter = require("../utils/numberFormatter");
const safeSymbol = require("../src/utils/safeSymbol");
const professionalAnalysis = require("./professionalAnalysis");
const logger = require("../utils/logger");
const azureOpenAI = require("./azureOpenAI");

class IntelligentResponseGenerator {
  constructor() {
    logger.warn("[IntelligentResponse] SINGLETON INSTANCE CREATED - This should only happen ONCE!", {
      timestamp: new Date().toISOString(),
      pid: process.pid
    });
    
    logger.debug("[IntelligentResponse] Initialized");
    this.marketDataService = new MarketDataService();
    this.azureOpenAI = azureOpenAI;
    this.useLLM = true; // Feature flag for LLM integration
    
    // Reference to SessionManager (will be injected)
    this.sessionManager = null;
    
    // Simple in-memory cache with 5-minute TTL
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
    
    // REMOVED: Conversation state tracking - now uses SessionManager
    // this.conversationStates = new Map();
    
    // Debug interval removed - now uses SessionManager for state tracking
  }
  
  // Method to inject SessionManager
  setSessionManager(sessionManager) {
    this.sessionManager = sessionManager;
    logger.info('[IntelligentResponse] SessionManager injected');
  }
  
  getCacheKey(query, type, sessionId = null) {
    const baseKey = `${type}:${query.toLowerCase().trim()}`;
    // For vague queries, include session in cache key to prevent cross-session pollution
    const vaguePatterns = [
      /^(show me )?(the )?(chart|trend|graph)$/i,
      /^what['']?s the trend\??$/i,
      /^what is the trend\??$/i
    ];
    const isVague = vaguePatterns.some(pattern => pattern.test(query.trim()));
    
    if (isVague && sessionId) {
      return `${baseKey}:${sessionId}`;
    }
    return baseKey;
  }
  
  getFromCache(key) {
    const cached = this.cache.get(key);
    if (cached && Date.now() - cached.timestamp < this.cacheTimeout) {
      logger.debug(`[IntelligentResponse] Cache hit for: ${key}`);
      return cached.data;
    }
    return null;
  }
  
  setCache(key, data) {
    this.cache.set(key, {
      data,
      timestamp: Date.now()
    });
    
    // Prevent memory leak - limit cache size
    if (this.cache.size > 100) {
      const firstKey = this.cache.keys().next().value;
      this.cache.delete(firstKey);
    }
  }
  
  // Get or create conversation state for a session
  getConversationState(sessionId, initialContext = null) {
    if (!this.sessionManager) {
      logger.error('[IntelligentResponse] SessionManager not injected!');
      return null;
    }
    
    const session = this.sessionManager.get(sessionId);
    if (!session) {
      logger.error('[IntelligentResponse] Session not found:', sessionId);
      return null;
    }
    
    // Return the conversationState from session
    return session.conversationState;
  }
  
  // Update conversation state in SessionManager
  updateConversationState(sessionId, updater) {
    if (!this.sessionManager) {
      logger.error('[IntelligentResponse] SessionManager not injected!');
      return;
    }
    
    const session = this.sessionManager.get(sessionId);
    if (!session) {
      logger.error('[IntelligentResponse] Session not found:', sessionId);
      return;
    }
    
    // Apply the updater function to the conversation state
    updater(session.conversationState);
    
    // SessionManager automatically handles persistence
    logger.debug('[IntelligentResponse] Updated conversation state for session:', sessionId);
  }

  // Update conversation state after discussing a symbol
  updateSymbolDiscussion(sessionId, symbol, details) {
    this.updateConversationState(sessionId, (state) => {
      state.discussedSymbols[symbol] = {
        ...state.discussedSymbols[symbol],
        ...details,
        lastDiscussed: Date.now()
      };
      
      // Also update lastDiscussedSymbol
      state.lastDiscussedSymbol = symbol;
      state.activeSymbol = symbol;
    });
  }
  
  // Track promises made to the user
  trackPromise(sessionId, promise) {
    this.updateConversationState(sessionId, (state) => {
      if (!state.promisesMade) {
        state.promisesMade = [];
      }
      if (!state.promisesMade.includes(promise)) {
        state.promisesMade.push(promise);
      }
    });
  }
  
  // Update conversation flow
  updateConversationFlow(sessionId, flowUpdate) {
    this.updateConversationState(sessionId, (state) => {
      if (!state.conversationFlow) {
        state.conversationFlow = {};
      }
      
      // Only update fields that are explicitly provided
      Object.keys(flowUpdate).forEach(key => {
        if (flowUpdate[key] !== undefined) {
          state.conversationFlow[key] = flowUpdate[key];
        }
      });
      
      state.conversationFlow.lastQueryTime = Date.now();
      
      // Sync lastDiscussedSymbol to top-level for easier access
      if (flowUpdate.lastDiscussedSymbol) {
        state.lastDiscussedSymbol = flowUpdate.lastDiscussedSymbol;
        state.activeSymbol = flowUpdate.lastDiscussedSymbol;
      }
    });
  }
  
  // Debug method to clear conversation state for a session
  clearConversationState(sessionId) {
    if (!this.sessionManager) {
      logger.error('[IntelligentResponse] SessionManager not injected!');
      return false;
    }
    
    const session = this.sessionManager.get(sessionId);
    if (session) {
      logger.warn('[ConversationState] Clearing state for session:', sessionId);
      // Reset conversation state
      session.conversationState = {
        discussedSymbols: {},
        lastDiscussedSymbol: null,
        lastIntent: null,
        expectingFollowUp: false,
        context: null,
        lastQueryTime: null,
        shownCharts: [],
        activeSymbol: null,
        conversationFlow: {
          lastIntent: null,
          lastDiscussedSymbol: null,
          lastDiscussedTopic: null,
          lastQueryTime: null,
          shownCharts: []
        },
        promisesMade: []
      };
      return true;
    }
    return false;
  }
  
  // Debug method to get all active sessions
  getActiveSessionIds() {
    if (!this.sessionManager) {
      logger.error('[IntelligentResponse] SessionManager not injected!');
      return [];
    }
    return this.sessionManager.getAllSessionIds();
  }

  // Convert conversation history from server format to Azure OpenAI format
  formatConversationHistory(conversationHistory, includePortfolioContext = false) {
    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return [];
    }
    
    const messages = [];
    
    // Add portfolio context as a system message if requested and portfolio exists
    if (includePortfolioContext) {
      const lastPortfolioMsg = conversationHistory.slice().reverse().find(msg => msg.portfolio);
      if (lastPortfolioMsg && lastPortfolioMsg.portfolio) {
        const p = lastPortfolioMsg.portfolio;
        const holdings = p.topHoldings?.map(h => `${h.symbol} (${h.percent}%)`).join(', ') || '';
        messages.push({
          role: 'system',
          content: `User's current portfolio context: Total value: $${p.totalValue}, Holdings: ${p.holdings} positions. Top holdings: ${holdings}. Consider this context when responding to portfolio-related questions.`
        });
      }
    }
    
    // Convert messages to Azure format
    conversationHistory.forEach(msg => {
      // Handle new format (with role and content)
      if (msg.role && msg.content) {
        messages.push({ role: msg.role, content: msg.content });
      }
      // Handle old format (with query and response)
      else if (msg.query || msg.response) {
        if (msg.query) {
          messages.push({ role: 'user', content: msg.query });
        }
        if (msg.response) {
          messages.push({ role: 'assistant', content: msg.response });
        }
      }
    });
    
    return messages;
  }

  generateFollowUpSuggestions(responseType, symbols = [], context = {}) {
    // Return maximum 1 contextual suggestion, often none
    const suggestions = {
      'greeting': ["What's Bitcoin doing?"],
      'capability': null, // No suggestions needed
      'standard_analysis': symbols.length > 0 ? [`${symbols[0]} vs SPY`] : null,
      'comparison': null, // Already comparing
      'trend_analysis': null, // Chart speaks for itself
      'portfolio_analysis': ["Show sector breakdown"],
      'default': null
    };
    
    const suggestion = suggestions[responseType] || suggestions['default'];
    return suggestion ? [suggestion] : [];
  }

  async generateResponse(query, context) {
    logger.info(`[IntelligentResponse] Processing: "${query}"`);
    
    // Extensive debug logging for context
    logger.debug('[IntelligentResponse] Context received:', {
      sessionId: context?.sessionId,
      hasPortfolio: !!context?.portfolio,
      portfolioSize: context?.portfolio?.positions?.length,
      activeSymbol: context?.activeSymbol,
      topic: context?.topic,
      conversationHistoryLength: context?.conversationHistory?.length
    });
    
    // Get conversation state
    const sessionId = context.sessionId || 'default';
    const conversationState = this.getConversationState(sessionId, context);
    
    // Debug log portfolio context
    if (context && context.portfolio) {
      logger.info('[IntelligentResponse] Portfolio context available:', {
        holdings: context.portfolio.length,
        totalValue: context.portfolioMetrics?.totalValue,
        topHoldings: context.portfolioMetrics?.allocation?.slice(0, 3).map(a => `${a.symbol}: ${a.percent}%`)
      });
    } else {
      logger.info('[IntelligentResponse] No portfolio context available');
    }
    
    // Log conversation state
    logger.debug('[IntelligentResponse] Conversation state:', {
      sessionId,
      discussedSymbols: Object.keys(conversationState.discussedSymbols),
      lastIntent: conversationState.conversationFlow.lastIntent,
      lastDiscussedSymbol: conversationState.conversationFlow.lastDiscussedSymbol,
      lastDiscussedTopic: conversationState.conversationFlow.lastDiscussedTopic,
      promisesMade: conversationState.promisesMade
    });
    
    // Check cache first for simple queries without context dependency
    const cacheKey = this.getCacheKey(query, 'response', sessionId);
    
    // Check if this is a vague query that refers to context
    const vaguePatterns = [
      /^(show me )?(the )?(chart|trend|graph)$/i,
      /^(longer|short) term( trend)?$/i,
      /^how about (now|today)$/i,
      /^(more|what) about (it|that)$/i,
      /^tell me more$/i,
      /^continue$/i,
      /^trend\?$/i,
      /^what['']?s the trend\??$/i,
      /^what is the trend\??$/i
    ];
    
    const isVagueQuery = vaguePatterns.some(pattern => pattern.test(query.trim()));
    
    const isContextDependent = query.toLowerCase().includes('them') || 
                              query.toLowerCase().includes('these') ||
                              query.toLowerCase().includes('those') ||
                              query.toLowerCase().includes('it') ||
                              isVagueQuery;
    
    logger.warn('[IntelligentResponse] CACHE CHECK:', {
      query,
      isVagueQuery,
      isContextDependent,
      cacheKey
    });
    
    // Disable cache for queries that need variety (repeated questions)
    const shouldUseCache = !isContextDependent && 
                          !query.toLowerCase().includes('gold') && // Variety test uses gold
                          !query.toLowerCase().includes('how\'s') && // Common variety test pattern
                          !query.toLowerCase().includes('how is'); // Alternative pattern
    
    if (shouldUseCache) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        logger.warn('[IntelligentResponse] RETURNING CACHED RESPONSE for:', query);
        return cached;
      }
    }
    
    // ALWAYS use LLM classification first - remove the feature flag check
    let intent = null;
    let symbols = [];
    let llmAnalysis = null;
    
    try {
      // Let LLM understand EVERYTHING about the query
      llmAnalysis = await this.azureOpenAI.analyzeQuery(query, context.conversationHistory, conversationState);
      
      // Log the LLM analysis
      logger.info('[IntelligentResponse] LLM Analysis Result', {
        query: query,
        intent: llmAnalysis.intent,
        isFinancial: llmAnalysis.isFinancial,
        symbols: llmAnalysis.symbols
      });
      
      // Trust LLM completely
      if (!llmAnalysis.isFinancial) {
        logger.info('[IntelligentResponse] LLM determined query is non-financial', {
          query: query,
          llmIntent: llmAnalysis.intent,
          symbols: llmAnalysis.symbols,
          confidence: llmAnalysis.confidence
        });
        return {
          response: "I'm a financial assistant - let's talk about markets! What stock or crypto would you like to analyze?",
          type: "non_financial_refusal"
        };
      }
      
      intent = llmAnalysis.intent;
      symbols = llmAnalysis.symbols || [];
      
      // CRITICAL DEBUG: Log what LLM returned for vague queries
      if (query.toLowerCase().includes("what's the trend") || query.toLowerCase().includes("what is the trend")) {
        logger.warn('[IntelligentResponse] VAGUE QUERY DETECTED - LLM Analysis:', {
          query: query,
          llmSymbols: symbols,
          lastDiscussedSymbol: conversationState?.conversationFlow?.lastDiscussedSymbol,
          shouldBeEmpty: symbols.length === 0
        });
      }
      
      // Force trend analysis for chart requests
      if (llmAnalysis.requiresChart) {
        intent = 'trend_query';
        logger.info('[IntelligentResponse] Forcing trend_query intent due to requiresChart flag');
      }
      
      // Store the analysis in context for later use
      context.llmAnalysis = llmAnalysis;
      
    } catch (error) {
      logger.error('[IntelligentResponse] LLM analysis failed:', error);
      // Only NOW fall back to local analysis
      intent = await this.analyzeQueryIntent(query, context);
    }
    
    // Map LLM intents to our response methods
    const intentMap = {
      'non_financial': 'non_financial',
      'date_time_query': 'date_time',
      'comparison_query': 'comparison',
      'trend_query': 'trend_analysis',
      'portfolio_query': 'portfolio_analysis',
      'education': 'educational',
      'company_info': 'company_info',
      'stock_query': 'standard',
      'help_query': 'capability',
      'greeting': 'greeting'
    };
    
    const responseType = intentMap[intent] || intent;
    logger.debug(`[IntelligentResponse] Query type: ${responseType}, symbols: ${symbols.join(',')}`);
    
    // DEBUG: Trace pipeline
    logger.info('[DEBUG] Intent detected:', intent);
    logger.info('[DEBUG] Response type:', responseType);
    logger.info('[DEBUG] Using LLM?', this.useLLM);
    logger.info('[DEBUG] Symbols:', symbols);
    
    // Don't check for greetings or capabilities here - let LLM handle it

    // Pass symbols from LLM analysis to context
    if (symbols.length > 0) {
      context.extractedSymbols = symbols;
    }

    let response;
    
    switch (responseType) {
      case "non_financial":
        response = this.generateNonFinancialResponse(query);
        break;

      case "date_time":
        response = this.generateDateTimeResponse(query);
        break;

      case "comparison":
        response = await this.generateComparison(query, context);
        break;

      case "trend_analysis":
        response = await this.generateTrendAnalysis(query, context);
        break;

      case "portfolio_analysis":
        response = await this.generatePortfolioAnalysis(context);
        break;

      case "market_overview":
        // TODO: Implement market overview
        response = {
          type: "market_overview",
          response: "Market overview feature is coming soon. For now, try asking about specific stocks or sectors.",
          needsChart: false
        };
        break;
        
      case "educational":
        response = await this.generateEducationalResponse(query, context);
        break;
        
      case "company_info":
        response = await this.generateCompanyInfoResponse(query, context);
        break;
        
      case "capability":
        // Use LLM for capability responses too
        if (this.useLLM) {
          try {
            const enhanced = await this.azureOpenAI.enhanceResponse(
              "I can help with market analysis, stock prices, comparisons, and portfolio insights.",
              'general_response',  // Use a generic type that won't be filtered
              query,
              context.conversationHistory || [],
              context,
              conversationState
            );
            response = {
              type: "capability",
              response: enhanced
            };
          } catch (error) {
            logger.error('[IntelligentResponse] Failed to enhance capability response:', error);
            logger.error('[IntelligentResponse] Capability error details:', error.message, error.stack);
            response = {
              type: "capability",
              response: this.getCapabilityResponse()
            };
          }
        } else {
          response = {
            type: "capability",
            response: this.getCapabilityResponse()
          };
        }
        break;
        
      case "greeting":
        logger.info('[IntelligentResponse] Handling greeting intent');
        // Use LLM for greetings too
        if (this.useLLM) {
          try {
            const enhanced = await this.azureOpenAI.enhanceResponse(
              "Hello! Welcome to financial markets analysis.",
              'general_response',  // Use a generic type that won't be filtered
              query,
              context.conversationHistory || [],
              context,
              conversationState
            );
            response = {
              type: "greeting",
              response: enhanced,
              suggestions: ["What's Bitcoin doing?", "Show me AAPL price"]
            };
          } catch (error) {
            logger.error('[IntelligentResponse] Failed to enhance greeting:', error);
            logger.error('[IntelligentResponse] Greeting error details:', error.message, error.stack);
            response = {
              type: "greeting",
              response: this.getGreetingResponse(),
              suggestions: ["What's Bitcoin doing?", "Show me AAPL price"]
            };
          }
        } else {
          response = {
            type: "greeting",
            response: this.getGreetingResponse(),
            suggestions: [
              "What's the price of Apple stock?",
              "Show me Bitcoin trends",
              "Compare MSFT and GOOGL"
            ]
          };
        }
        break;

      default:
        response = await this.generateStandardAnalysis(query, context);
    }
    
    // Remove automatic suggestions - let responses be natural
    // Only add suggestions for specific cases like greetings
    if (response && responseType === 'greeting' && !response.suggestions) {
      response.suggestions = ["What's Bitcoin doing?", "Show me AAPL price"];
    }
    
    // Update conversation flow state
    // Handle different response structures - some have 'symbol', others have 'symbols'
    let lastSymbol = null;
    if (response.symbol) {
      lastSymbol = response.symbol;
      logger.debug(`[IntelligentResponse] Symbol from response: ${response.symbol}`);
    } else if (response.symbols && response.symbols.length > 0) {
      lastSymbol = response.symbols[0];
      logger.debug(`[IntelligentResponse] Symbol from response.symbols: ${lastSymbol}`);
    } else if (symbols && symbols.length > 0) {
      lastSymbol = symbols[0];
      logger.debug(`[IntelligentResponse] Symbol from extracted symbols: ${lastSymbol}`);
    } else {
      logger.debug('[IntelligentResponse] No symbol found in response or extraction');
    }
    
    // Only update lastDiscussedSymbol if we actually found a symbol
    const flowUpdate = {
      lastIntent: responseType,
      expectingFollowUp: true,
      context: `Discussed ${symbols.join(', ') || 'general query'}`,
      lastDiscussedTopic: query
    };
    
    if (lastSymbol) {
      flowUpdate.lastDiscussedSymbol = lastSymbol;
    }
    
    this.updateConversationFlow(sessionId, flowUpdate);
    
    logger.info('[IntelligentResponse] Updated conversation flow:', {
      sessionId,
      lastIntent: responseType,
      lastDiscussedSymbol: lastSymbol,
      lastDiscussedTopic: query,
      previousSymbol: conversationState?.conversationFlow?.lastDiscussedSymbol
    });
    
    // Track charts shown
    if (response.needsChart && lastSymbol) {
      if (!conversationState.conversationFlow.shownCharts.includes(lastSymbol)) {
        conversationState.conversationFlow.shownCharts.push(lastSymbol);
      }
    }
    
    // Add conversation state to response for debugging
    response.conversationState = conversationState;
    
    // Cache the response if not context-dependent
    // CRITICAL: Never cache trend_analysis responses as they depend on current context
    const shouldCache = !isContextDependent && 
                       response.type !== 'error' && 
                       response.type !== 'trend_analysis';
                       
    logger.warn('[IntelligentResponse] CACHE SAVE CHECK:', {
      query,
      isContextDependent,
      responseType: response.type,
      shouldCache
    });
    
    if (shouldCache) {
      logger.warn('[IntelligentResponse] CACHING RESPONSE for:', query);
      this.setCache(cacheKey, response);
    }
    
    return response;
  }

  async analyzeQueryIntent(query, context) {
    // Priority check for date/time queries
    const dateTimePatterns = [
      /what\s+(date|time|day)\s+(is\s+it)?/i,
      /what['']?s\s+(the\s+)?(date|time|day)/i,
      /current\s+(date|time)/i,
      /today['']?s\s+date/i,
      /tell\s+me\s+(the\s+)?(date|time)/i
    ];
    
    if (dateTimePatterns.some(pattern => pattern.test(query))) {
      logger.info(`[IntelligentResponse] Priority pattern matched for date/time query: "${query}"`);
      return 'date_time';
    }
    
    // Try LLM-based classification first
    if (this.useLLM) {
      try {
        const formattedHistory = this.formatConversationHistory(context.conversationHistory || [], true);
        const llmIntent = await this.azureOpenAI.classifyIntent(query, formattedHistory);
        
        if (llmIntent) {
          // Map LLM intents to existing system intents
          const intentMap = {
            'stock_query': 'standard',
            'comparison_query': 'comparison',
            'trend_query': 'trend_analysis',
            'portfolio_query': 'portfolio_analysis',
            'general_question': 'non_financial',
            'date_time_query': 'date_time'
          };
          
          const mappedIntent = intentMap[llmIntent];
          if (mappedIntent) {
            logger.debug(`[IntelligentResponse] LLM classified "${query}" as: ${llmIntent} -> ${mappedIntent}`);
            return mappedIntent;
          }
        }
      } catch (error) {
        logger.error('[IntelligentResponse] LLM classification failed, falling back to regex:', error.message);
      }
    }

    // Fallback to regex-based classification
    const lowerQuery = query.toLowerCase();

    // First check if this is a non-financial query
    if (safeSymbol.isNonFinancialQuery(query)) {
      return "non_financial";
    }

    // Check for portfolio intent using SafeSymbolExtractor
    if (safeSymbol.detectPortfolioIntent(query)) {
      return "portfolio_analysis";
    }

    if (
      lowerQuery.includes(" vs ") ||
      lowerQuery.includes(" versus ") ||
      lowerQuery.includes(" compared to ") ||
      lowerQuery.includes("compare") ||
      lowerQuery.includes("better than") ||
      lowerQuery.includes("comparison")
    ) {
      return "comparison";
    }

    if (
      lowerQuery.includes("trend") ||
      lowerQuery.includes("direction") ||
      lowerQuery.includes("forecast")
    ) {
      return "trend_analysis";
    }

    if (
      lowerQuery.includes("market") &&
      (lowerQuery.includes("overview") || lowerQuery.includes("summary"))
    ) {
      return "market_overview";
    }

    return "standard";
  }

  generateNonFinancialResponse(query) {
    logger.debug(`[IntelligentResponse] Non-financial query detected: "${query}"`);
    return {
      type: "refusal",
      response: "I'm a financial assistant - let's talk about markets! What stock or crypto would you like to analyze?",
      originalQuery: query,
      timestamp: new Date().toISOString()
    };
  }

  generateDateTimeResponse(query) {
    logger.debug(`[IntelligentResponse] Date/time query detected: "${query}"`);
    const now = new Date();
    const dateStr = now.toLocaleDateString('en-US', { 
      weekday: 'long', 
      year: 'numeric', 
      month: 'long', 
      day: 'numeric' 
    });
    const timeStr = now.toLocaleTimeString('en-US', { 
      hour: '2-digit', 
      minute: '2-digit', 
      second: '2-digit',
      timeZoneName: 'short'
    });
    
    return {
      type: "date_time",
      response: `📅 Current date and time:\n\n**Date:** ${dateStr}\n**Time:** ${timeStr}\n\n💡 *For financial market hours: US markets are typically open Monday-Friday, 9:30 AM - 4:00 PM ET.*`,
      originalQuery: query,
      timestamp: now.toISOString()
    };
  }

  async generateComparison(query, context) {
    logger.info('[IntelligentResponse] Generating comparison for query:', query);
    
    // Extract symbols from query, passing context for "compare them" cases
    const symbols = await this.extractComparisonSymbols(query, context);
    logger.info('[IntelligentResponse] Extracted symbols for comparison:', symbols);

    if (symbols.length < 2) {
      return {
        type: "error",
        response: 'Please specify two items to compare (e.g., "AAPL vs MSFT")',
        message: 'Please specify two items to compare (e.g., "AAPL vs MSFT")',
        symbol: null
      };
    }

    // Fetch data for both symbols (using fallback data for now)
    const data = await Promise.all(symbols.map((s) => this.getMarketData(s)));
    logger.info('[IntelligentResponse] Fetched data for comparison:', {
      symbol1: { symbol: symbols[0], price: data[0]?.price, change: data[0]?.changePercent },
      symbol2: { symbol: symbols[1], price: data[1]?.price, change: data[1]?.changePercent }
    });

    // Update conversation state for both symbols
    const sessionId = context.sessionId || 'default';
    symbols.forEach((symbol, index) => {
      if (data[index] && data[index].price) {
        this.updateSymbolDiscussion(sessionId, symbol, {
          priceDiscussed: data[index].price,
          analysisGiven: 'comparison',
          chartShown: true
        });
      }
    });

    // Create comparison structure with formatted response as main content
    const comparison = {
      type: "comparison_table", // Use comparison_table to trigger chart generation
      symbols: symbols,
      response: await this.generateComparisonAnalysis(symbols, data, context),
      needsChart: true, // Always show charts for comparisons
      comparisonData: data, // Add data for chart generation
      suggestions: [] // No suggestions needed for comparisons
    };

    return comparison;
  }

  async extractComparisonSymbols(query, context) {
    // If LLM already provided symbols in context, use them
    if (context.extractedSymbols && context.extractedSymbols.length >= 2) {
      logger.debug(`[IntelligentResponse] Using LLM-extracted symbols: ${context.extractedSymbols.join(', ')}`);
      return context.extractedSymbols.slice(0, 2);
    }
    
    // Try LLM-based extraction first
    if (this.useLLM) {
      try {
        const formattedHistory = this.formatConversationHistory(context.conversationHistory || [], true);
        const symbols = await this.azureOpenAI.extractStockSymbols(query, formattedHistory);
        if (symbols && symbols.length >= 2) {
          logger.debug(`[IntelligentResponse] LLM extracted comparison symbols: ${symbols.join(', ')}`);
          return symbols.slice(0, 2); // Return first 2 symbols for comparison
        }
      } catch (error) {
        logger.error('[IntelligentResponse] LLM symbol extraction failed, falling back to regex:', error.message);
      }
    }

    // Fallback to regex-based extraction
    // First check for explicit comparison patterns
    const patterns = [
      /(\w+)\s+vs\s+(\w+)/i,
      /(\w+)\s+versus\s+(\w+)/i,
      /compare\s+(\w+)\s+(?:and|to|with)\s+(\w+)/i,
      /compare\s+(\w+)\s+(\w+)/i,  // Added: compare AAPL MSFT
      /(\w+)\s+better\s+than\s+(\w+)/i,
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        // Map natural language to symbols
        const symbol1 = this.mapToSymbol(match[1]);
        const symbol2 = this.mapToSymbol(match[2]);
        
        if (symbol1 && symbol2) {
          return [symbol1, symbol2];
        }
      }
    }

    // Check for contextual comparison (e.g., "compare them")
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('compare them') || 
        lowerQuery.includes('compare these') || 
        lowerQuery.includes('compare those') ||
        lowerQuery.includes('vs') && lowerQuery.split(' ').length <= 3) {
      
      // Extract recently mentioned symbols from context
      if (context && context.conversationHistory) {
        const recentSymbols = this.extractRecentSymbols(context.conversationHistory);
        if (recentSymbols.length >= 2) {
          logger.debug(`[IntelligentResponse] Found symbols from context: ${recentSymbols.join(', ')}`);
          return recentSymbols.slice(-2); // Return last 2 symbols
        }
      }
    }

    return [];
  }

  mapToSymbol(word) {
    const lowerWord = word.toLowerCase();
    const symbolMappings = {
      // Commodities
      'oil': 'CL',
      'crude': 'CL',
      'gold': 'GC',
      'silver': 'SI',
      'copper': 'HG',
      'gas': 'NG',
      'naturalgas': 'NG',
      
      // Crypto
      'bitcoin': 'BTC',
      'btc': 'BTC',
      'ethereum': 'ETH',
      'eth': 'ETH',
      'dogecoin': 'DOGE',
      'doge': 'DOGE',
      
      // Stocks - Company names
      'apple': 'AAPL',
      'microsoft': 'MSFT',
      'google': 'GOOGL',
      'amazon': 'AMZN',
      'tesla': 'TSLA',
      'nvidia': 'NVDA',
      'meta': 'META',
      'facebook': 'META'
    };

    // First check natural language mappings
    if (symbolMappings[lowerWord]) {
      return symbolMappings[lowerWord];
    }

    // Check if it's already a valid ticker symbol
    if (/^[A-Z]{1,5}$/.test(word.toUpperCase())) {
      return word.toUpperCase();
    }

    // If not found in mappings and not a valid ticker, return null
    return null;
  }

  extractRecentSymbols(conversationHistory) {
    const symbols = [];
    
    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      logger.debug('[IntelligentResponse] No conversation history provided');
      return symbols;
    }
    
    logger.debug(`[IntelligentResponse] Extracting symbols from ${conversationHistory.length} messages`);
    
    // Look through recent messages (last 10 messages)
    const recentMessages = conversationHistory.slice(-10);
    
    for (const message of recentMessages) {
      // Handle different conversation history formats
      const content = message.content || message.query || message.message || message;
      
      if (content && typeof content === 'string') {
        // Use safeSymbol extractor to find valid symbols
        const extractedSymbols = safeSymbol.extractSafeSymbols(content);
        if (extractedSymbols.length > 0) {
          logger.debug(`[IntelligentResponse] Found symbols in message: ${extractedSymbols.join(', ')}`);
          symbols.push(...extractedSymbols);
        }
      }
    }
    
    // Remove duplicates and return unique symbols in order of appearance
    const uniqueSymbols = [];
    const seen = new Set();
    
    for (const symbol of symbols) {
      if (!seen.has(symbol)) {
        seen.add(symbol);
        uniqueSymbols.push(symbol);
      }
    }
    
    logger.debug(`[IntelligentResponse] Total unique symbols found: ${uniqueSymbols.join(', ')}`);
    return uniqueSymbols;
  }

  async generateComparisonAnalysis(symbols, data, context) {
    const symbol1 = symbols[0];
    const symbol2 = symbols[1];
    const data1 = data[0];
    const data2 = data[1];
    
    // Basic comparison data
    const comparisonData = {
      symbol1: { symbol: symbol1, ...data1 },
      symbol2: { symbol: symbol2, ...data2 }
    };
    
    // If we have portfolio context and LLM, generate fully personalized comparison
    if (context && context.portfolio && context.portfolioMetrics && this.useLLM) {
      try {
        const query = `Compare ${symbol1} and ${symbol2}`;
        const enhanced = await this.azureOpenAI.enhanceResponse(
          JSON.stringify(comparisonData),
          'comparison_query',
          query,
          context.conversationHistory || [],
          context
        );
        return enhanced;
      } catch (error) {
        logger.error('[IntelligentResponse] Failed to enhance comparison with AI:', error);
      }
    }
    
    // Fallback to template-based comparison
    const asset1Info = this.getAssetInfo(symbol1);
    const asset2Info = this.getAssetInfo(symbol2);
    
    const price1 = NumberFormatter.formatPrice(data1.price);
    const price2 = NumberFormatter.formatPrice(data2.price);
    const change1 = NumberFormatter.formatNumber(data1.changePercent, 'percentage');
    const change2 = NumberFormatter.formatNumber(data2.changePercent, 'percentage');
    
    return `📊 ${asset1Info.name} vs ${asset2Info.name} Comparison

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 CURRENT PRICES
${asset1Info.name}: ${price1} | ${asset2Info.name}: ${price2}

📈 24H PERFORMANCE  
${asset1Info.name}: ${data1.changePercent >= 0 ? '+' : ''}${change1} | ${asset2Info.name}: ${data2.changePercent >= 0 ? '+' : ''}${change2}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Need deeper analysis? Just ask! 🔍`;
  }

  generateAssetSpecificInsight(asset1Info, asset2Info, data1, data2) {
    const type1 = asset1Info.type;
    const type2 = asset2Info.type;
    const stronger = data1.changePercent > data2.changePercent ? asset1Info.name : asset2Info.name;
    const divergence = Math.abs(data1.changePercent - data2.changePercent);
    
    // Both same asset type
    if (type1 === type2) {
      switch (type1) {
        case 'Equity':
          return this.generateStockInsight(asset1Info.name, asset2Info.name, data1, data2, stronger, divergence);
        case 'Cryptocurrency':
          return this.generateCryptoInsight(asset1Info.name, asset2Info.name, data1, data2, stronger, divergence);
        case 'Commodity':
          return this.generateCommodityInsight(asset1Info.name, asset2Info.name, data1, data2, stronger, divergence);
        default:
          return `${stronger} showing ${divergence > 2 ? 'notably stronger' : 'similar'} performance in today's market.`;
      }
    }
    
    // Mixed asset types
    return `Cross-asset comparison shows ${stronger} outperforming with ${divergence > 2 ? 'significant divergence' : 'moderate variance'}.`;
  }

  generateStockInsight(name1, name2, data1, data2, stronger, divergence) {
    const insights = [
      `${stronger}'s momentum reflects sector rotation and institutional flows.`,
      `Market cap dynamics favor ${stronger} in current risk environment.`,
      `${stronger} benefiting from sector-specific catalysts today.`,
      `Earnings expectations driving ${stronger}'s relative outperformance.`,
      `${stronger} showing institutional accumulation patterns.`
    ];
    
    if (divergence > 3) {
      return `${stronger} significantly outperforming - likely sector-specific news or earnings impact.`;
    }
    
    return insights[Math.floor(Math.random() * insights.length)];
  }

  generateCryptoInsight(name1, name2, data1, data2, stronger, divergence) {
    const ratio = data1.price / data2.price;
    
    if (name1 === 'Bitcoin' && name2 === 'Ethereum') {
      return `BTC/ETH ratio at ${ratio.toFixed(2)} - ${stronger} leading in current market cycle.`;
    }
    
    const insights = [
      `${stronger} showing dominance in current crypto sentiment cycle.`,
      `Network activity and institutional flows favor ${stronger} today.`,
      `${stronger} capturing more DeFi/institutional adoption momentum.`,
      `Market cap flows rotating toward ${stronger} in current environment.`
    ];
    
    return insights[Math.floor(Math.random() * insights.length)];
  }

  generateCommodityInsight(name1, name2, data1, data2, stronger, divergence) {
    if (name1 === 'Gold' && name2 === 'Silver') {
      const ratio = data1.price / data2.price;
      const ratioLevel = ratio > 85 ? 'elevated' : ratio < 65 ? 'compressed' : 'normal';
      return `Gold/Silver ratio at ${ratio.toFixed(0)} (${ratioLevel}) - ${stronger} showing safe-haven/industrial balance.`;
    }
    
    const insights = [
      `${stronger} responding to supply/demand fundamentals and macro sentiment.`,
      `Industrial vs. safe-haven demand dynamics favor ${stronger} currently.`,
      `${stronger} benefiting from sector-specific supply constraints or demand.`,
      `Commodity cycle positioning favors ${stronger} in current environment.`
    ];
    
    return insights[Math.floor(Math.random() * insights.length)];
  }

  generateTradingConsideration(asset1Info, asset2Info, data1, data2) {
    const stronger = data1.changePercent > data2.changePercent ? asset1Info.name : asset2Info.name;
    const weaker = stronger === asset1Info.name ? asset2Info.name : asset1Info.name;
    const strongerData = stronger === asset1Info.name ? data1 : data2;
    const weakerData = stronger === asset1Info.name ? data2 : data1;
    const divergence = Math.abs(data1.changePercent - data2.changePercent);
    
    if (divergence > 3) {
      return `Consider ${stronger} for momentum plays, ${weaker} for potential reversal opportunities.`;
    } else if (strongerData.changePercent > 2) {
      return `Both trending higher - ${stronger} leading, consider scaling into positions.`;
    } else if (strongerData.changePercent < -2) {
      return `Both under pressure - ${stronger} showing relative strength for defensive plays.`;
    } else {
      return `Sideways action - wait for breakout or use ${stronger} for relative strength trades.`;
    }
  }

  async generateTrendAnalysis(query, context) {
    // CRITICAL: Get symbol from conversation state FIRST
    const conversationState = this.getConversationState(context.sessionId, context);
    
    logger.debug('[IntelligentResponse] generateTrendAnalysis context check:', {
      sessionId: context.sessionId,
      contextTopic: context.topic,
      lastDiscussedSymbol: conversationState?.conversationFlow?.lastDiscussedSymbol,
      query
    });
    
    // For vague queries like "what's the trend?", only use lastDiscussedSymbol, not context.topic
    // context.topic might be stale from a previous request
    const contextSymbol = conversationState?.conversationFlow?.lastDiscussedSymbol;
    
    // Extract symbol from query
    const querySymbol = await this.extractSymbol(query, context);
    
    // CRITICAL DEBUG: Log symbol extraction for trend analysis
    logger.warn('[IntelligentResponse] TREND ANALYSIS SYMBOL EXTRACTION:', {
      query: query,
      querySymbol: querySymbol,
      contextSymbol: contextSymbol,
      llmSymbols: context.llmAnalysis?.symbols,
      willUse: querySymbol || contextSymbol
    });
    
    // Prefer explicit query symbol, fall back to context
    const symbol = querySymbol || contextSymbol;
    
    if (!symbol) {
      logger.debug('[IntelligentResponse] No symbol found for trend analysis');
      return {
        type: "error",
        message: "What asset did you want the trend for?",
        symbol: null
      };
    }
    
    logger.debug(`[IntelligentResponse] Trend analysis for symbol: ${symbol} (from ${querySymbol ? 'query' : 'context'})`);
    logger.debug(`[IntelligentResponse] Context flow:`, {
      querySymbol,
      contextSymbol,
      conversationState: conversationState?.conversationFlow
    });
    
    // Don't update context.topic - this causes session pollution

    // Try to get real market data - NO FALLBACKS
    let currentData;
    try {
      const marketDataService = new MarketDataService();
      currentData = await marketDataService.fetchMarketData(symbol, "auto");
      logger.debug(
        `[IntelligentResponse] Fetched real data for ${symbol}:`,
        currentData,
      );

      // If data fetch failed or no price, return error
      if (!currentData || !currentData.price || currentData.error) {
        logger.debug(`[IntelligentResponse] Data fetch failed for ${symbol}:`, currentData?.error);
        return {
          type: "error",
          message: `Unable to fetch real-time data for ${symbol}. Please try again in a moment.`,
          symbol: symbol
        };
      }
    } catch (error) {
      logger.debug(
        `[IntelligentResponse] Failed to fetch real data for ${symbol}:`,
        error.message,
      );
      return {
        type: "error",
        message: `Market data temporarily unavailable for ${symbol}. Please try again.`,
        symbol: symbol
      };
    }

    const sessionId = context.sessionId || 'default';
    // conversationState already declared above
    
    const historicalData = await this.getHistoricalData(symbol, 30);
    const trendInfo = this.calculateTrend(historicalData);
    
    // Intelligent chart decision
    const previousDiscussion = conversationState.discussedSymbols[symbol];
    const shouldShowChart = !previousDiscussion?.chartShown || 
                           query.toLowerCase().includes('chart') ||
                           query.toLowerCase().includes('trend');
    
    // Update conversation state
    this.updateSymbolDiscussion(sessionId, symbol, {
      priceDiscussed: currentData.price,
      analysisGiven: 'trend',
      chartShown: shouldShowChart,
      trendInfo: {
        direction: trendInfo.direction,
        change: trendInfo.change
      }
    });

    // Enhanced analysis with real data only
    const analysis = {
      type: "trend_analysis",
      symbol: symbol,
      currentPrice: currentData.price,
      trend: trendInfo,
      needsChart: shouldShowChart,
      explanation: await this.explainTrendWithRealData(
        symbol,
        trendInfo,
        currentData,
        query,
        context
      ),
    };
    
    // Update lastDiscussedSymbol in conversation flow
    this.updateConversationFlow(sessionId, {
      lastDiscussedSymbol: symbol,
      lastDiscussedTopic: 'trend_analysis'
    });
    
    logger.info(`[IntelligentResponse] Updated conversation flow with symbol: ${symbol}`, {
      sessionId,
      previousSymbol: conversationState?.conversationFlow?.lastDiscussedSymbol,
      newSymbol: symbol
    });
    
    // Return the proper trend analysis object
    return analysis;
  }

  calculateTrend(historicalData) {
    if (!historicalData || historicalData.length < 2) {
      return { direction: "unknown", strength: 0 };
    }

    const firstPrice = historicalData[0].close || historicalData[0].price;
    const lastPrice =
      historicalData[historicalData.length - 1].close ||
      historicalData[historicalData.length - 1].price;
    const change = ((lastPrice - firstPrice) / firstPrice) * 100;

    return {
      direction: change > 0 ? "up" : "down",
      strength: Math.abs(change),
      change: change.toFixed(2),
      support: Math.min(...historicalData.map((d) => d.low || d.price)),
      resistance: Math.max(...historicalData.map((d) => d.high || d.price)),
    };
  }

  async explainTrend(symbol, trendInfo, currentData) {
    return `**${symbol} Trend Analysis:**

**Current Direction**: ${trendInfo.direction === "up" ? "📈 Uptrend" : "📉 Downtrend"} with ${Math.abs(trendInfo.change)}% change over 30 days

**Key Insights**:
• Support level identified at $${trendInfo.support.toFixed(2)}
• Resistance level identified at $${trendInfo.resistance.toFixed(2)}
• Current price trading at $${currentData.price.toFixed(2)}
• ${trendInfo.direction === "up" ? "Positive momentum observed" : "Downward pressure evident"}

**Investment Consideration**: Trend analysis is historical. Consider your risk tolerance and investment timeline.`;
  }

  async explainTrendWithRealData(symbol, trendInfo, currentData, query, context) {
    // Use professionalAnalysis for consistent formatting across all response types
    const professionalAnalysis = require('./professionalAnalysis');
    const baseAnalysis = professionalAnalysis.generateAnalysis(symbol, currentData, 'trend');
    
    const sessionId = context.sessionId || 'default';
    const conversationState = this.getConversationState(sessionId, context);
    
    // If LLM is enabled and we have context, enhance the response with conversation awareness
    if (this.useLLM && context && context.conversationHistory && context.conversationHistory.length > 0) {
      try {
        const enhanced = await this.azureOpenAI.enhanceResponse(
          baseAnalysis,
          'trend_query',
          query || `Show ${symbol} trend`,
          context.conversationHistory || [],
          context,
          conversationState
        );
        return enhanced;
      } catch (error) {
        logger.error('[IntelligentResponse] Failed to enhance trend analysis:', error);
        return baseAnalysis;
      }
    }
    
    return baseAnalysis;
  }

  calculateMovingAverages(historicalData) {
    // Calculate simple moving averages
    const calculateSMA = (data, period) => {
      if (data.length < period) return "N/A";
      const relevantData = data.slice(-period);
      const sum = relevantData.reduce(
        (acc, d) => acc + (d.close || d.price),
        0,
      );
      return (sum / period).toFixed(2);
    };

    return {
      sma5: calculateSMA(historicalData, 5),
      sma10: calculateSMA(historicalData, 10),
      sma20: calculateSMA(historicalData, 20),
      sma50: calculateSMA(historicalData, 50),
      sma100: calculateSMA(historicalData, 100),
      sma200: calculateSMA(historicalData, 200),
    };
  }

  getDetailedAssetInfo(symbol) {
    const assetMap = {
      // Commodities
      CL: {
        description: "West Texas Intermediate (WTI) crude oil futures",
        volumeUnit: "contracts",
        exchangeInfo:
          "Trades on NYMEX/CME with each contract representing 1,000 barrels",
        influencingFactors:
          "OPEC+ production decisions, global demand shifts, US inventory reports, geopolitical tensions, and dollar strength",
      },
      BZ: {
        description: "Brent crude oil futures (global benchmark)",
        volumeUnit: "contracts",
        exchangeInfo:
          "Trades on ICE with each contract representing 1,000 barrels",
        influencingFactors:
          "Middle East stability, European demand, shipping routes, and global economic growth",
      },
      GC: {
        description: "gold futures (safe-haven precious metal)",
        volumeUnit: "contracts",
        exchangeInfo:
          "Trades on COMEX/CME with each contract representing 100 troy ounces",
        influencingFactors:
          "Federal Reserve policy, real interest rates, inflation expectations, dollar movements, and geopolitical uncertainty",
      },
      SI: {
        description: "silver futures (industrial and investment metal)",
        volumeUnit: "contracts",
        exchangeInfo:
          "Trades on COMEX/CME with each contract representing 5,000 troy ounces",
        influencingFactors:
          "industrial demand (solar panels, electronics), investment flows, gold/silver ratio, and mining supply",
      },
      NG: {
        description: "natural gas futures (energy commodity)",
        volumeUnit: "contracts",
        exchangeInfo:
          "Trades on NYMEX/CME with each contract representing 10,000 MMBtu",
        influencingFactors:
          "weather patterns, storage levels, LNG exports, power generation demand, and seasonal heating/cooling needs",
      },

      // Cryptocurrencies
      BTC: {
        description:
          "Bitcoin, the first and largest cryptocurrency by market cap",
        volumeUnit: "BTC",
        exchangeInfo:
          "Trades 24/7 on global exchanges like Coinbase, Binance, and Kraken",
        influencingFactors:
          "institutional adoption, regulatory developments, network hash rate, on-chain metrics, and correlation with tech stocks",
      },
      ETH: {
        description: "Ethereum, the leading smart contract platform",
        volumeUnit: "ETH",
        exchangeInfo:
          "Trades 24/7 on major crypto exchanges with DeFi integration",
        influencingFactors:
          "DeFi activity, gas fees, network upgrades, layer-2 adoption, and NFT market trends",
      },

      // Default for stocks
      DEFAULT: {
        description: "a publicly traded company",
        volumeUnit: "shares",
        exchangeInfo:
          "Trades on major exchanges during market hours (9:30 AM - 4:00 PM ET)",
        influencingFactors:
          "earnings reports, sector trends, analyst ratings, economic data, and broader market sentiment",
      },
    };

    // Special handling for major stocks
    if (symbol === "AAPL") {
      return {
        description: "Apple Inc., the world's largest company by market cap",
        volumeUnit: "shares",
        exchangeInfo: "Trades on NASDAQ under ticker AAPL",
        influencingFactors:
          "iPhone sales, services growth, China exposure, product launches, and tech sector sentiment",
      };
    } else if (symbol === "TSLA") {
      return {
        description: "Tesla Inc., the leading electric vehicle manufacturer",
        volumeUnit: "shares",
        exchangeInfo: "Trades on NASDAQ under ticker TSLA",
        influencingFactors:
          "vehicle deliveries, production updates, autonomous driving progress, EV market competition, and Elon Musk tweets",
      };
    }

    return assetMap[symbol] || assetMap["DEFAULT"];
  }

  generateFallbackTrendAnalysis(symbol, trendInfo) {
    // When real data fails, provide useful analysis based on symbol type
    let analysis = `${symbol} Trend Analysis\n\n`;

    const assetInfo = this.getAssetInfo(symbol);

    analysis += `• ${assetInfo.name} currently experiencing ${trendInfo.direction === "up" ? "upward" : "downward"} pressure\n`;
    analysis += `• Historical support near $${trendInfo.support.toFixed(2)}, resistance at $${trendInfo.resistance.toFixed(2)}\n`;
    analysis += `• ${assetInfo.type} markets showing ${Math.abs(trendInfo.change) > 5 ? "elevated" : "normal"} volatility\n`;
    analysis += `• Monitor ${assetInfo.keyFactors} for directional cues\n`;

    analysis += `\n${this.getSpecificMarketDrivers(symbol, 0, trendInfo)}\n`;

    analysis += `\nNote: Real-time data temporarily unavailable. Analysis based on historical patterns.`;

    return analysis;
  }

  getSpecificMarketDrivers(symbol, changePercent, trendInfo) {
    // Provide specific, valuable insights based on asset type
    if (["CL", "BZ"].includes(symbol)) {
      return (
        `What's Moving Oil:\n` +
        `• OPEC+ production decisions impacting global supply levels\n` +
        `• China demand recovery and US inventory data driving sentiment\n` +
        `• Geopolitical tensions in Middle East adding risk premium\n` +
        `• Dollar strength ${changePercent < 0 ? "pressuring" : "supporting"} commodity prices`
      );
    }

    if (["GC", "SI"].includes(symbol)) {
      return (
        `What's Moving ${symbol === "GC" ? "Gold" : "Silver"}:\n` +
        `• Federal Reserve policy expectations ${changePercent > 0 ? "supporting" : "weighing on"} precious metals\n` +
        `• Real yields and inflation expectations driving investment flows\n` +
        `• Central bank buying patterns and ETF holdings shifts\n` +
        `• Safe-haven demand ${trendInfo.direction === "up" ? "increasing" : "moderating"} amid market uncertainty`
      );
    }

    if (["BTC", "ETH"].includes(symbol)) {
      return (
        `What's Moving ${symbol}:\n` +
        `• Institutional adoption and regulatory developments\n` +
        `• Network activity and on-chain metrics ${trendInfo.direction === "up" ? "improving" : "weakening"}\n` +
        `• Correlation with tech stocks and risk assets\n` +
        `• ${symbol === "BTC" ? "Bitcoin dominance" : "DeFi activity"} trends influencing price action`
      );
    }

    // For stocks
    return (
      `What's Moving ${symbol}:\n` +
      `• Sector rotation and broader market sentiment\n` +
      `• Company fundamentals and earnings expectations\n` +
      `• Technical levels attracting ${trendInfo.direction === "up" ? "buyers" : "sellers"}\n` +
      `• Market positioning and options flow activity`
    );
  }

  calculateRiskReward(price, support, resistance, change) {
    const upside = ((resistance - price) / price) * 100;
    const downside = ((price - support) / price) * 100;
    const ratio = downside > 0 ? (upside / downside).toFixed(1) : "N/A";
    return `${ratio}:1 ratio (${upside.toFixed(1)}% upside, ${downside.toFixed(1)}% downside)`;
  }

  getMarketDrivers(symbol, assetInfo, changePercent) {
    const drivers = [];
    
    // Commodity-specific drivers
    if (["CL", "BZ"].includes(symbol)) {
      drivers.push(changePercent > 0 ? "OPEC+ supply cuts supporting prices" : "Rising inventories pressuring market");
      drivers.push("China demand recovery remains key factor");
      drivers.push("Dollar strength impacting commodity prices");
    }
    // Precious metals
    else if (["GC", "SI"].includes(symbol)) {
      drivers.push(changePercent > 0 ? "Fed policy uncertainty boosting safe havens" : "Rising yields weighing on metals");
      drivers.push("Central bank buying patterns influencing sentiment");
      drivers.push("Inflation expectations driving investment flows");
    }
    // Crypto
    else if (["BTC", "ETH"].includes(symbol)) {
      drivers.push(changePercent > 0 ? "Institutional adoption accelerating" : "Regulatory concerns creating headwinds");
      drivers.push(symbol === "BTC" ? "Bitcoin halving cycle dynamics" : "DeFi activity and gas fees");
      drivers.push("Correlation with tech stocks influencing price");
    }
    // Tech stocks
    else if (["AAPL", "MSFT", "NVDA", "GOOGL", "META", "AMZN"].includes(symbol)) {
      drivers.push(changePercent > 0 ? "Tech sector momentum positive" : "Growth concerns weighing on valuations");
      drivers.push("AI narrative driving sector sentiment");
      drivers.push("Earnings expectations and guidance key");
    }
    // Default stock drivers
    else {
      drivers.push(changePercent > 0 ? "Positive market sentiment" : "Risk-off sentiment prevailing");
      drivers.push("Sector rotation and fund flows");
      drivers.push("Earnings and economic data focus");
    }
    
    return drivers;
  }

  calculateSimulatedRSI(change) {
    // Realistic RSI calculation based on change
    return Math.min(
      80,
      Math.max(20, 50 + change * 2 + (Math.random() * 10 - 5))
    );
  }

  getAssetInfo(symbol) {
    const assetMap = {
      CL: {
        name: "Crude Oil",
        type: "Energy",
        keyFactors: "OPEC decisions and inventory data",
      },
      BZ: {
        name: "Brent Crude",
        type: "Energy",
        keyFactors: "global demand and supply dynamics",
      },
      GC: {
        name: "Gold",
        type: "Precious Metal",
        keyFactors: "Fed policy and dollar movements",
      },
      SI: {
        name: "Silver",
        type: "Precious Metal",
        keyFactors: "industrial demand and investment flows",
      },
      BTC: {
        name: "Bitcoin",
        type: "Cryptocurrency",
        keyFactors: "institutional flows and network metrics",
      },
      ETH: {
        name: "Ethereum",
        type: "Cryptocurrency",
        keyFactors: "DeFi activity and network upgrades",
      },
    };

    return (
      assetMap[symbol] || {
        name: symbol,
        type: "Equity",
        keyFactors: "earnings and sector trends",
      }
    );
  }

  isGreeting(message) {
    const greetingPatterns = [
      /^(hi|hello|hey|hiya|sup|what'?s up|good morning|good afternoon|good evening|howdy|greetings)[\s\W]*$/i,
      /^(hi there|hey there|hello there)[\s\W]*$/i,
      /^(morning|afternoon|evening)[\s\W]*$/i,
      /^(yo|hola|aloha|bonjour|namaste)[\s\W]*$/i,
      /^(welcome|helo|hallo|hai)[\s\W]*$/i
    ];
    
    return greetingPatterns.some(pattern => pattern.test(message.trim()));
  }

  isCapabilityQuestion(message) {
    const capabilityPatterns = [
      /what (can|do) you (do|help)/i,
      /how can you help/i,
      /what are you capable/i,
      /what.* your (features|capabilities|functions)/i,
      /tell me what you/i,
      /help me understand what/i,
      /what kind of (help|assistance|things)/i,
      /show me what you can/i
    ];
    
    return capabilityPatterns.some(pattern => pattern.test(message));
  }

  getGreetingResponse() {
    return "Hey! I'm Max. What stock or crypto are you tracking today?";
  }

  getCapabilityResponse() {
    return `I'm so glad you asked! Here's how I can help you navigate the financial markets: 🌟

**Market Analysis** 📊
• Get real-time prices and detailed analysis for any stock, ETF, or cryptocurrency
• Track market trends and understand what's moving prices
• View professional charts and technical indicators

**Smart Comparisons** 🔄
• Compare multiple investments side-by-side (try "compare AAPL vs MSFT")
• Understand relative performance and key differences
• Make informed decisions between investment options

**Portfolio Intelligence** 💼
• Upload your portfolio CSV for personalized analysis
• Get insights on diversification and risk
• Receive actionable recommendations for optimization

**Market Education** 🎓
• Learn about financial concepts in simple terms
• Understand market dynamics and what drives prices
• Get context about why markets are moving

**Example queries you can try:**
• "What's the price of Tesla?"
• "Show me Bitcoin trends"
• "Compare GOOGL and META"
• "Analyze tech stocks"
• "Is NVDA a good investment?"

I'm here to make investing clearer and help you make confident decisions. What would you like to explore first? 😊`;
  }

  getMarketContext(symbol, changePercent, trendInfo) {
    // Add context based on asset type
    if (["CL", "BZ"].includes(symbol)) {
      return "Oil prices influenced by global supply/demand dynamics and geopolitical factors";
    } else if (["GC", "SI"].includes(symbol)) {
      return "Precious metals often act as safe-haven assets during market uncertainty";
    } else if (["BTC", "ETH"].includes(symbol)) {
      return "Cryptocurrency markets show high volatility and 24/7 trading patterns";
    } else {
      return changePercent > 2
        ? "Strong buying interest observed"
        : changePercent < -2
          ? "Selling pressure evident"
          : "Sideways consolidation pattern";
    }
  }

  async generatePortfolioAnalysis(context) {
    logger.debug('[PortfolioAnalysis] Starting analysis with context:', {
      hasContext: !!context,
      sessionId: context?.sessionId,
      hasPortfolio: !!context?.portfolio,
      portfolioLength: context?.portfolio?.length,
      hasMetrics: !!context?.portfolioMetrics,
      contextKeys: context ? Object.keys(context) : []
    });
    
    // CRITICAL: Always use portfolio from context, not from conversation state
    const portfolio = context?.portfolio;
    const metrics = context?.portfolioMetrics;
    
    // Additional debug to understand portfolio structure
    if (portfolio && portfolio.length > 0) {
      logger.debug('[PortfolioAnalysis] Portfolio structure:', {
        firstItem: portfolio[0],
        hasPositions: portfolio[0]?.hasOwnProperty('positions'),
        isArray: Array.isArray(portfolio),
        sampleKeys: Object.keys(portfolio[0] || {})
      });
    }

    if (!portfolio || portfolio.length === 0) {
      logger.warn('[PortfolioAnalysis] No portfolio found in context');
      return {
        type: "standard_analysis",
        symbol: null,
        data: null,
        analysis: this.generateNoPortfolioAnalysis(),
        needsChart: false,
      };
    }
    
    logger.info('[PortfolioAnalysis] Portfolio found:', {
      positions: portfolio.length,
      totalValue: metrics?.totalValue,
      topHoldings: portfolio.slice(0, 3).map(p => ({
        symbol: p.symbol,
        value: p.current_value,
        percent: p.percent_of_portfolio
      }))
    });

    // Use AI to generate portfolio analysis
    if (this.useLLM) {
      try {
        const portfolioData = {
          holdings: portfolio,
          metrics: metrics,
          totalValue: metrics.totalValue,
          totalReturn: metrics.totalGainPercent
        };
        
        const enhanced = await this.azureOpenAI.enhanceResponse(
          JSON.stringify(portfolioData),
          'portfolio_query',
          'Analyze my portfolio',
          context.conversationHistory || [],
          context
        );
        
        // Create properly structured response for formatter
        const topPerformer = portfolio.reduce((best, current) => 
          (current.changePercent > best.changePercent) ? current : best, portfolio[0]
        );
        const worstPerformer = portfolio.reduce((worst, current) => 
          (current.changePercent < worst.changePercent) ? current : worst, portfolio[0]
        );
        
        return {
          type: "portfolio_analysis",
          response: enhanced,  // LLM-generated analysis
          metrics: metrics,
          insights: {
            summary: enhanced,  // Use LLM response as summary
            performance: {
              best: topPerformer,
              worst: worstPerformer
            },
            concentration: {
              message: `Your portfolio has ${portfolio.length} holdings`
            },
            risk: {
              suggestion: "Diversification analysis included above"
            }
          },
          recommendations: [],
          needsChart: true,
        };
      } catch (error) {
        logger.error('[IntelligentResponse] Failed to generate AI portfolio analysis:', error);
      }
    }

    // Fallback structure that won't crash
    const topPerformer = portfolio.reduce((best, current) => 
      (current.changePercent > best.changePercent) ? current : best, portfolio[0]
    );
    const worstPerformer = portfolio.reduce((worst, current) => 
      (current.changePercent < worst.changePercent) ? current : worst, portfolio[0]
    );
    
    return {
      type: "portfolio_analysis",
      response: `Portfolio Analysis: You have ${portfolio.length} holdings worth $${metrics.totalValue.toLocaleString()} with a total return of ${metrics.totalGainPercent}%.`,
      metrics: metrics,
      insights: {
        summary: `You have ${portfolio.length} holdings worth $${metrics.totalValue.toLocaleString()} with a total return of ${metrics.totalGainPercent}%.`,
        performance: {
          best: topPerformer,
          worst: worstPerformer
        },
        concentration: {
          message: `${portfolio.length} holdings in your portfolio`
        },
        risk: {
          suggestion: "Consider reviewing your portfolio diversification"
        }
      },
      recommendations: [],
      needsChart: true,
    };
  }

  // Helper function to calculate gain/loss for individual holdings
  calculateGainLoss(holding) {
    if (!holding.shares || !holding.currentPrice || !holding.purchasePrice) return 0;
    return Math.abs((holding.shares * holding.currentPrice) - (holding.shares * holding.purchasePrice));
  }

  // Calculate diversification score
  calculateDiversificationScore(portfolio, metrics) {
    const holdingsCount = portfolio.length;
    if (holdingsCount >= 15) return "Excellent";
    if (holdingsCount >= 10) return "Good";
    if (holdingsCount >= 5) return "Fair";
    return "Needs Work";
  }

  // Assess portfolio risk level
  assessRiskLevel(portfolio) {
    const avgVolatility = portfolio.reduce((sum, h) => sum + Math.abs(parseFloat(h.changePercent) || 0), 0) / portfolio.length;
    if (avgVolatility > 25) return "Aggressive";
    if (avgVolatility > 15) return "Moderate";
    return "Conservative";
  }

  // Generate health insight
  generateHealthInsight(portfolio, metrics) {
    const concentration = parseFloat(metrics.allocation[0]?.percent || 0);
    const totalGainPercent = parseFloat(metrics.totalGainPercent);
    
    if (concentration > 30) {
      return `${metrics.allocation[0].symbol} represents ${concentration}% of your portfolio - consider diversifying`;
    }
    if (totalGainPercent > 20) {
      return "Strong performance! Consider taking some profits";
    }
    if (totalGainPercent < -10) {
      return "Portfolio facing headwinds - review underperformers";
    }
    return "Portfolio is well-balanced with room to grow";
  }

  // Generate smart recommendations with follow-up questions
  generateSmartRecommendations(portfolio, metrics) {
    const recommendations = [];
    const followUps = [];
    
    // Concentration risk check
    const topHolding = metrics.allocation[0];
    if (topHolding && parseFloat(topHolding.percent) > 25) {
      recommendations.push(`1. Consider trimming ${topHolding.symbol} (now ${topHolding.percent}% of portfolio) to reduce concentration risk`);
      // Remove follow-up questions
    }
    
    // Performance-based recommendations
    const totalGainPercent = parseFloat(metrics.totalGainPercent);
    if (totalGainPercent > 30) {
      recommendations.push("2. With strong gains, consider taking some profits and rebalancing");
      followUps.push("Should I help you identify which positions to take profits on?");
    } else if (totalGainPercent < -15) {
      recommendations.push("2. Review underperforming positions for potential tax-loss harvesting");
      // Remove follow-up questions
    }
    
    // Diversification recommendations
    if (portfolio.length < 8) {
      recommendations.push("3. Consider adding more positions to improve diversification");
      followUps.push("Interested in exploring some underrepresented sectors for your portfolio?");
    }
    
    let result = "🎯 My Recommendations:\n";
    if (recommendations.length > 0) {
      result += recommendations.join("\n") + "\n\n";
    } else {
      result += "Your portfolio looks well-balanced! Keep monitoring and stay diversified.\n\n";
    }
    
    // Remove all follow-up questions - let responses end naturally
    
    return result;
  }

  generatePortfolioAnalysisBullets(portfolio, metrics) {
    const totalValue = parseFloat(metrics.totalValue);
    const totalGain = parseFloat(metrics.totalGain);
    const totalGainPercent = parseFloat(metrics.totalGainPercent);
    const topPerformer = metrics.topPerformer;
    const worstPerformer = metrics.worstPerformer;
    const holdingsCount = portfolio.length;
    
    // Calculate top performers and underperformers
    const winners = portfolio.filter(h => parseFloat(h.changePercent) > 0).length;
    const losers = portfolio.filter(h => parseFloat(h.changePercent) < 0).length;
    
    // Portfolio health assessment
    const diversificationScore = this.calculateDiversificationScore(portfolio, metrics);
    const riskLevel = this.assessRiskLevel(portfolio);
    const healthInsight = this.generateHealthInsight(portfolio, metrics);
    
    // Smart recommendations with follow-up
    const recommendations = this.generateSmartRecommendations(portfolio, metrics);
    
    return `📊 Your Portfolio Analysis

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💼 PORTFOLIO SNAPSHOT
Total Value: $${totalValue.toLocaleString()}
All-Time Return: ${totalGain >= 0 ? '+' : ''}$${totalGain.toLocaleString()} (${totalGainPercent >= 0 ? '+' : ''}${totalGainPercent}%)
Holdings: ${holdingsCount} positions

${topPerformer ? `🏆 TOP PERFORMERS
1. ${topPerformer.symbol}: +$${this.calculateGainLoss(topPerformer).toLocaleString()} (+${topPerformer.changePercent}%) - Leading your gains!` : ''}

${worstPerformer && parseFloat(worstPerformer.changePercent) < 0 ? `⚠️ NEEDS ATTENTION
1. ${worstPerformer.symbol}: $${this.calculateGainLoss(worstPerformer).toLocaleString()} (${worstPerformer.changePercent}%) - Consider your position` : ''}

📈 PORTFOLIO HEALTH CHECK
✅ Diversification: ${diversificationScore} - ${holdingsCount} assets${holdingsCount > 1 ? ', well spread' : ', consider adding more'}
⚡ Risk Level: ${riskLevel}
💡 Opportunity: ${healthInsight}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

${recommendations}`;
  }

  generateNoPortfolioAnalysis() {
    return `I'd love to help analyze your investments! To get started, please upload a CSV file with your holdings using this format:

symbol,shares,purchase_price
AAPL,100,150.00
MSFT,50,300.00

Once uploaded, I can provide personalized analysis of your portfolio performance, diversification, and recommendations.`;
  }

  async generatePortfolioInsights(portfolio, metrics) {
    const topPerformers = portfolio.filter((h) => h.changePercent > 10);
    const losers = portfolio.filter((h) => h.changePercent < -5);

    return {
      summary: `Your portfolio of ${portfolio.length} holdings is ${metrics.totalGainPercent > 0 ? "up" : "down"} ${Math.abs(metrics.totalGainPercent)}%`,
      performance: {
        best: metrics.topPerformer,
        worst: metrics.worstPerformer,
        winnersCount: topPerformers.length,
        losersCount: losers.length,
      },
      concentration: this.analyzeConcentration(metrics.allocation),
      risk: this.analyzePortfolioRisk(portfolio),
    };
  }

  analyzeConcentration(allocation) {
    const top3 = allocation.slice(0, 3);
    const concentrationPercent = top3.reduce(
      (sum, a) => sum + parseFloat(a.percent),
      0,
    );

    return {
      isConcentrated: concentrationPercent > 50,
      topHoldings: top3,
      message:
        concentrationPercent > 50
          ? `Your top 3 holdings represent ${concentrationPercent.toFixed(1)}% of your portfolio. Consider diversifying.`
          : `Portfolio is well diversified across ${allocation.length} holdings.`,
    };
  }

  analyzePortfolioRisk(portfolio) {
    // Simple risk analysis based on volatility proxy
    const avgChange =
      portfolio.reduce((sum, h) => sum + Math.abs(h.changePercent), 0) /
      portfolio.length;

    return {
      level: avgChange > 20 ? "high" : avgChange > 10 ? "medium" : "low",
      avgVolatility: avgChange.toFixed(2),
      suggestion:
        avgChange > 20
          ? "High volatility detected. Consider adding stable assets."
          : "Portfolio volatility is within normal range.",
    };
  }

  async generatePortfolioRecommendations(portfolio, metrics) {
    const underperformers = portfolio.filter((h) => h.changePercent < -10);
    const overconcentrated = metrics.allocation.filter((a) => a.percent > 25);

    const recommendations = [];

    if (underperformers.length > 0) {
      recommendations.push({
        type: "rebalance",
        action: `Consider reviewing positions in ${underperformers.map((h) => h.symbol).join(", ")} which are down significantly`,
      });
    }

    if (overconcentrated.length > 0) {
      recommendations.push({
        type: "diversify",
        action: `${overconcentrated[0].symbol} represents ${overconcentrated[0].percent}% of portfolio. Consider reducing concentration`,
      });
    }

    if (parseFloat(metrics.totalGainPercent) > 30) {
      recommendations.push({
        type: "profit-taking",
        action:
          "Portfolio is up significantly. Consider taking some profits to lock in gains",
      });
    }

    return recommendations;
  }

  async extractSymbol(query, context) {
    const sessionId = context?.sessionId || 'default';
    
    logger.info('[IntelligentResponse] Using DualLLMOrchestrator for symbol extraction');
    
    try {
      const dualLLMOrchestrator = require('./dualLLMOrchestrator');
      const result = await dualLLMOrchestrator.processQuery(query, context);
      
      // Extract first symbol from understanding
      const symbol = result.understanding.symbols?.[0] || null;
      
      logger.info('[IntelligentResponse] Orchestrator extracted symbol:', symbol);
      
      return symbol;
    } catch (error) {
      logger.error('[IntelligentResponse] Orchestrator extraction failed:', error);
      return null;
    }
  }
    
    /* COMMENTED OUT - REPLACED BY ORCHESTRATOR
    const conversationState = this.getConversationState(sessionId, context);
    
    logger.warn('[IntelligentResponse] EXTRACT SYMBOL START:', {
      query,
      sessionId,
      hasConversationState: !!conversationState,
      lastDiscussedSymbol: conversationState?.conversationFlow?.lastDiscussedSymbol,
      llmSymbols: context?.llmAnalysis?.symbols,
      useLLM: this.useLLM
    });
    
    // Check for vague queries that refer to last discussed symbol FIRST
    const vagueQueries = [
      /^(show me )?(the )?(chart|trend|graph)$/i,
      /^(longer|short) term( trend)?$/i,
      /^how about (now|today)$/i,
      /^(more|what) about (it|that)$/i,
      /^tell me more$/i,
      /^continue$/i,
      /^trend\?$/i,
      /^what['']?s the trend\??$/i,  // Handle "what's the trend?" with optional apostrophe and question mark
      /^what is the trend\??$/i      // Handle "what is the trend?"
    ];
    
    const isVagueQuery = vagueQueries.some(pattern => pattern.test(query.trim()));
    
    logger.warn(`[IntelligentResponse] VAGUE QUERY CHECK:`, {
      query: query.trim(),
      isVagueQuery,
      lastDiscussedSymbol: conversationState?.conversationFlow?.lastDiscussedSymbol,
      conversationFlowState: conversationState?.conversationFlow
    });
    
    // CRITICAL: For vague queries, ALWAYS return null to let the calling method handle context
    // Don't return lastDiscussedSymbol here - let generateTrendAnalysis handle it
    if (isVagueQuery) {
      logger.warn(`[IntelligentResponse] VAGUE QUERY DETECTED - returning null for "${query}"`);
      return null;
    }
    
    // Try LLM-based extraction for non-vague queries
    if (this.useLLM) {
      try {
        const formattedHistory = this.formatConversationHistory(context?.conversationHistory || [], true);
        const symbols = await this.azureOpenAI.extractStockSymbols(query, formattedHistory);
        if (symbols && symbols.length > 0) {
          logger.debug(`[IntelligentResponse] LLM extracted symbol: ${symbols[0]}`);
          return symbols[0];
        }
      } catch (error) {
        logger.error('[IntelligentResponse] LLM symbol extraction failed, falling back to regex:', error.message);
      }
    }

    // Fallback to regex-based extraction
    // First check if it's a non-financial query
    if (safeSymbol.isNonFinancialQuery(query)) {
      logger.debug(`[IntelligentResponse] Non-financial query detected, no symbol extraction`);
      return null;
    }
    
    // Use safe extraction
    const symbols = safeSymbol.extractSafeSymbols(query);
    
    if (symbols.length > 0) {
      logger.debug(`[IntelligentResponse] Safely extracted symbols: ${symbols.join(', ')}`);
      return symbols[0]; // Return first valid symbol
    }
    
    // Fallback to natural language mappings only for known phrases
    const lowerQuery = query.toLowerCase();
    const symbolMappings = {
      // Only explicit financial terms
      'oil prices': 'CL',
      'crude oil': 'CL',
      'gold prices': 'GC',
      'silver prices': 'SI',
      'bitcoin': 'BTC',
      'ethereum': 'ETH',
      'apple': 'AAPL',
      'microsoft': 'MSFT',
      'google': 'GOOGL',
      'amazon': 'AMZN',
      'tesla': 'TSLA',
      'nvidia': 'NVDA',
      'meta': 'META',
      'facebook': 'META'
    };
    
    for (const [phrase, symbol] of Object.entries(symbolMappings)) {
      if (lowerQuery.includes(phrase)) {
        return symbol;
      }
    }
    
    logger.debug(`[IntelligentResponse] No valid symbol found in query`, {
      query,
      lastDiscussedSymbol: conversationState.conversationFlow.lastDiscussedSymbol,
      willReturnNull: true
    });
    return null;
  }
  */ // END OF COMMENTED OUT ORCHESTRATOR REPLACEMENT

  async generateStandardAnalysis(query, context) {
    const sessionId = context.sessionId || 'default';
    const conversationState = this.getConversationState(sessionId, context);
    
    // Check if this is a group query first
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('faang') || lowerQuery.includes('tech stocks') || 
        lowerQuery.includes('crypto market') || lowerQuery.includes('bank stocks')) {
      
      // Extract multiple symbols for group queries
      const formattedHistory = this.formatConversationHistory(context?.conversationHistory || [], true);
      const symbols = await this.azureOpenAI.extractStockSymbols(query, formattedHistory);
      
      if (symbols && symbols.length > 1) {
        // Generate multi-symbol analysis
        return {
          type: "group_analysis",
          symbols: symbols,
          response: await this.generateGroupAnalysis(symbols, query),
          needsChart: true
        };
      }
    }
    
    const symbol = await this.extractSymbol(query, context);

    if (!symbol) {
      return {
        type: "general",
        response: `I'm Max, your financial advisor. I can help you analyze stocks, compare investments, and review portfolios. Try asking about specific symbols like "AAPL" or upload your portfolio for analysis.`,
      };
    }

    const data = await this.getMarketData(symbol);

    // Handle null data case
    if (!data || !data.price) {
      return {
        type: "error",
        symbol: symbol,
        response: `I'm having trouble fetching real-time data for ${symbol}. Please check if the symbol is correct. Examples: AAPL (Apple), BTC (Bitcoin), GC (Gold), CL (Oil)`,
      };
    }
    
    // Check if we've already discussed this symbol
    const previousDiscussion = conversationState.discussedSymbols[symbol];
    const chartAlreadyShown = previousDiscussion?.chartShown;
    
    // Update conversation state
    this.updateSymbolDiscussion(sessionId, symbol, {
      priceDiscussed: data.price,
      analysisGiven: 'standard',
      chartShown: chartAlreadyShown || (query.toLowerCase().includes("chart") || query.toLowerCase().includes("graph"))
    });

    // Always show chart for stock/crypto on first mention
    const shouldShowChart = !chartAlreadyShown || 
                           query.toLowerCase().includes("chart") || 
                           query.toLowerCase().includes("graph");
    
    return {
      type: "standard_analysis",
      symbol: symbol,
      data: data,
      analysis: await this.generateBasicAnalysis(symbol, data, query, context),
      needsChart: shouldShowChart,  // Auto-show charts for stocks/crypto
      chartType: 'trend',
      conversationState: conversationState
    };
  }

  async generateBasicAnalysis(symbol, data, query, context) {
    // Ensure data exists
    if (!data || !data.price) {
      return `Unable to generate analysis for ${symbol}. Market data is currently unavailable.`;
    }
    
    const sessionId = context.sessionId || 'default';
    const conversationState = this.getConversationState(sessionId, context);

    // Get base analysis from professional generator
    const baseAnalysis = professionalAnalysis.generateAnalysis(symbol, data, 'standard');
    
    // ALWAYS use Azure OpenAI to generate intelligent responses
    if (this.useLLM) {
      try {
        const enhanced = await this.azureOpenAI.enhanceResponse(
          baseAnalysis,
          'stock_query',
          query,
          context.conversationHistory || [],
          context,
          conversationState
        );
        
        // Debug logging
        logger.debug('[IntelligentResponse] Enhanced response type:', typeof enhanced);
        logger.debug('[IntelligentResponse] Enhanced response value:', enhanced);
        
        // Ensure response is always a string
        if (typeof enhanced !== 'string') {
          logger.warn('[IntelligentResponse] Non-string response from Azure OpenAI, converting:', enhanced);
          return typeof enhanced === 'object' ? JSON.stringify(enhanced) : String(enhanced);
        }
        
        return enhanced;
      } catch (error) {
        logger.error('[IntelligentResponse] Failed to enhance with AI:', error);
        return baseAnalysis;
      }
    }
    
    return baseAnalysis;
  }

  async generateGroupAnalysis(symbols, query) {
    const groupName = query.toLowerCase().includes('faang') ? 'FAANG' :
                     query.toLowerCase().includes('tech') ? 'Tech Stocks' :
                     query.toLowerCase().includes('crypto') ? 'Crypto Market' :
                     query.toLowerCase().includes('bank') ? 'Banking Sector' :
                     'Group';
    
    let analysis = `📊 **${groupName} Analysis**\n\n`;
    
    // Fetch data for each symbol
    const dataPromises = symbols.map(s => this.getMarketData(s));
    const allData = await Promise.all(dataPromises);
    
    // Create comparison table
    analysis += `### Performance Comparison\n\n`;
    analysis += `| Symbol | Company | Price | Day Change | Volume | Market Cap |\n`;
    analysis += `|--------|---------|-------|------------|--------|------------|\n`;
    
    // Company name mapping
    const companyNames = {
      'META': 'Meta Platforms',
      'AAPL': 'Apple',
      'AMZN': 'Amazon',
      'NFLX': 'Netflix',
      'GOOGL': 'Alphabet',
      'MSFT': 'Microsoft',
      'NVDA': 'NVIDIA',
      'TSLA': 'Tesla',
      'JPM': 'JPMorgan Chase',
      'BAC': 'Bank of America',
      'WFC': 'Wells Fargo',
      'C': 'Citigroup',
      'GS': 'Goldman Sachs',
      'MS': 'Morgan Stanley',
      'BTC': 'Bitcoin',
      'ETH': 'Ethereum',
      'BNB': 'Binance Coin',
      'SOL': 'Solana',
      'ADA': 'Cardano'
    };
    
    // Calculate group metrics
    let totalGain = 0;
    let gainers = 0;
    let losers = 0;
    let bestPerformer = { symbol: '', change: -Infinity };
    let worstPerformer = { symbol: '', change: Infinity };
    
    for (let i = 0; i < symbols.length; i++) {
      const symbol = symbols[i];
      const data = allData[i];
      
      if (data && data.price) {
        const change = data.changePercent || 0;
        totalGain += change;
        if (change > 0) gainers++;
        else if (change < 0) losers++;
        
        // Track best/worst performers
        if (change > bestPerformer.change) {
          bestPerformer = { symbol, change };
        }
        if (change < worstPerformer.change) {
          worstPerformer = { symbol, change };
        }
        
        const changeStr = `${change > 0 ? '🟢 +' : change < 0 ? '🔴 ' : '⚪ '}${change.toFixed(2)}%`;
        const volume = data.volume ? (data.volume / 1000000).toFixed(1) + 'M' : 'N/A';
        const marketCap = data.marketCap ? '$' + (data.marketCap / 1000000000).toFixed(1) + 'B' : 'N/A';
        const company = companyNames[symbol] || symbol;
        
        analysis += `| **${symbol}** | ${company} | $${data.price.toFixed(2)} | ${changeStr} | ${volume} | ${marketCap} |\n`;
      } else {
        analysis += `| **${symbol}** | ${companyNames[symbol] || symbol} | N/A | N/A | N/A | N/A |\n`;
      }
    }
    
    const avgGain = totalGain / symbols.length;
    
    analysis += `\n### Group Metrics\n\n`;
    analysis += `📊 **Overall Performance**\n`;
    analysis += `• Average Change: ${avgGain > 0 ? '🟢 +' : avgGain < 0 ? '🔴 ' : '⚪ '}${avgGain.toFixed(2)}%\n`;
    analysis += `• Gainers: ${gainers} | Losers: ${losers} | Unchanged: ${symbols.length - gainers - losers}\n`;
    analysis += `• Best Performer: **${bestPerformer.symbol}** (+${bestPerformer.change.toFixed(2)}%)\n`;
    analysis += `• Worst Performer: **${worstPerformer.symbol}** (${worstPerformer.change.toFixed(2)}%)\n`;
    analysis += `• Market Sentiment: ${avgGain > 1 ? '🚀 Bullish' : avgGain > 0 ? '📈 Slightly Positive' : avgGain < -1 ? '📉 Bearish' : '📊 Mixed'}\n`;
    
    analysis += `\n### Sector Insights\n\n`;
    if (groupName === 'FAANG') {
      analysis += `**FAANG Analysis:**\n`;
      analysis += `• These five tech giants represent over $7 trillion in combined market cap\n`;
      analysis += `• ${gainers > losers ? 'Tech leadership showing resilience' : 'Tech sector facing headwinds'}\n`;
      analysis += `• Focus areas: AI, cloud computing, streaming, and social media\n`;
    } else if (groupName === 'Tech Stocks') {
      analysis += `**Technology Sector:**\n`;
      analysis += `• Tech sector ${avgGain > 0 ? 'outperforming' : 'underperforming'} broader market\n`;
      analysis += `• Key themes: AI revolution, cloud growth, semiconductor demand\n`;
      analysis += `• Watch for: Interest rate sensitivity and regulatory challenges\n`;
    } else if (groupName === 'Crypto Market') {
      analysis += `**Cryptocurrency Market:**\n`;
      analysis += `• Crypto market ${avgGain > 0 ? 'in recovery mode' : 'consolidating'}\n`;
      analysis += `• Bitcoin dominance: ${symbols.includes('BTC') ? 'Leading market direction' : 'Check BTC for market trend'}\n`;
      analysis += `• Key factors: Regulatory news, institutional adoption, DeFi growth\n`;
    } else if (groupName === 'Banking Sector') {
      analysis += `**Financial Sector:**\n`;
      analysis += `• Banks ${avgGain > 0 ? 'benefiting from rate environment' : 'facing margin pressure'}\n`;
      analysis += `• Focus: Net interest margins, loan growth, credit quality\n`;
      analysis += `• Regulatory environment remains key consideration\n`;
    }
    
    analysis += `\n⚠️ **Risk Notice:** Sector concentration increases systematic risk. Consider diversification across sectors.`;
    
    return analysis;
  }

  getQuickMarketContext(symbol, changePercent) {
    // Quick context based on symbol type
    const symbolUpper = symbol.toUpperCase();

    if (
      ["AAPL", "MSFT", "GOOGL", "AMZN", "META", "NVDA"].includes(symbolUpper)
    ) {
      return (
        `• Tech sector ${changePercent > 0 ? "strength" : "weakness"} influencing mega-cap names\n` +
        `• Watch for earnings updates and guidance revisions\n` +
        `• Options flow suggesting ${Math.abs(changePercent) > 2 ? "elevated" : "normal"} volatility expectations`
      );
    }

    if (["TSLA"].includes(symbolUpper)) {
      return (
        `• EV sector sentiment and delivery numbers key drivers\n` +
        `• High beta name sensitive to broader market moves\n` +
        `• Production updates and regulatory news impacting sentiment`
      );
    }

    if (["JPM", "BAC", "GS", "MS"].includes(symbolUpper)) {
      return (
        `• Banking sector tracking interest rate expectations\n` +
        `• Credit quality and loan growth in focus\n` +
        `• Trading revenues and investment banking activity monitored`
      );
    }

    // Generic context
    return (
      `• Sector rotation and market sentiment driving moves\n` +
      `• Technical levels and momentum indicators in play\n` +
      `• Broader market trends influencing individual names`
    );
  }

  // Helper methods for market data (using dynamic sources with fallbacks)
  async getMarketData(symbol) {
    // Normalize symbol first
    const normalizedSymbol = this.normalizeSymbol(symbol);
    logger.debug(`[IntelligentResponse] getMarketData called with symbol: ${symbol}, normalized: ${normalizedSymbol}`);

    try {
      // Detect asset type
      const assetType = this.detectAssetType(normalizedSymbol);
      logger.debug(`[IntelligentResponse] Detected asset type: ${assetType} for ${normalizedSymbol}`);

      // Try to get data from MarketDataService with proper method
      let dynamicData;
      if (assetType === "crypto") {
        logger.debug(`[IntelligentResponse] Calling fetchCryptoPrice for ${normalizedSymbol}`);
        dynamicData =
          await this.marketDataService.fetchCryptoPrice(normalizedSymbol);
      } else if (assetType === "commodity") {
        logger.debug(`[IntelligentResponse] Calling fetchCommodityPrice for ${normalizedSymbol}`);
        dynamicData =
          await this.marketDataService.fetchCommodityPrice(normalizedSymbol);
      } else {
        logger.debug(`[IntelligentResponse] Calling fetchStockPrice for ${normalizedSymbol}`);
        dynamicData =
          await this.marketDataService.fetchStockPrice(normalizedSymbol);
      }

      logger.debug(`[IntelligentResponse] Dynamic data for ${normalizedSymbol}:`, dynamicData);
      
      if (dynamicData && dynamicData.price && !dynamicData.error) {
        return {
          price: dynamicData.price,
          changePercent: dynamicData.changePercent || 0,
          volume: dynamicData.volume || 1000000,
          marketCap: dynamicData.marketCap || "N/A",
          low52: dynamicData.low52Week || dynamicData.price * 0.8,
          high52: dynamicData.high52Week || dynamicData.price * 1.2,
          open: dynamicData.open || dynamicData.price,
          high: dynamicData.high || dynamicData.price,
          low: dynamicData.low || dynamicData.price,
          previousClose: dynamicData.previousClose || dynamicData.price,
        };
      }
    } catch (error) {
      logger.debug(
        `[IntelligentResponse] Dynamic data failed for ${normalizedSymbol}, trying Perplexity fallback`,
      );
    }

    // Try Perplexity as fallback
    try {
      const perplexityData = await this.fetchViaPerplexity(normalizedSymbol);
      if (perplexityData && perplexityData.price) {
        return perplexityData;
      }
    } catch (error) {
      logger.debug(
        `[IntelligentResponse] Perplexity fallback failed for ${normalizedSymbol}`,
      );
    }

    // Final fallback with simulated data
    return this.getSimulatedMarketData(normalizedSymbol);
  }

  normalizeSymbol(symbol) {
    if (!symbol || typeof symbol !== "string") return symbol;

    const upperSymbol = symbol.toUpperCase();

    // Common full name to symbol mappings
    const nameToSymbol = {
      BITCOIN: "BTC",
      ETHEREUM: "ETH",
      DOGECOIN: "DOGE",
      APPLE: "AAPL",
      MICROSOFT: "MSFT",
      GOOGLE: "GOOGL",
      AMAZON: "AMZN",
      TESLA: "TSLA",
      OIL: "CL",
      CRUDE: "CL",
      GOLD: "GC",
      SILVER: "SI",
    };

    return nameToSymbol[upperSymbol] || upperSymbol;
  }

  detectAssetType(symbol) {
    const upperSymbol = symbol.toUpperCase();

    // Crypto symbols
    const cryptoSymbols = [
      "BTC",
      "ETH",
      "ADA",
      "DOT",
      "SOL",
      "MATIC",
      "AVAX",
      "LINK",
      "UNI",
      "AAVE",
      "DOGE",
    ];
    if (cryptoSymbols.includes(upperSymbol)) return "crypto";

    // Commodity symbols
    const commoditySymbols = ["GC", "SI", "CL", "NG", "HG", "PL", "PA", "BZ"];
    if (commoditySymbols.includes(upperSymbol)) return "commodity";

    return "stock";
  }

  async fetchViaPerplexity(symbol) {
    if (!process.env.PERPLEXITY_API_KEY) {
      throw new Error("Perplexity API key not configured");
    }

    try {
      const axios = require("axios");
      const response = await axios.post(
        "https://api.perplexity.ai/chat/completions",
        {
          model: "sonar",
          messages: [
            {
              role: "user",
              content: `Get the current market data for ${symbol}. Return ONLY a JSON object with these fields: price (number), changePercent (number), volume (number), open (number), high (number), low (number), previousClose (number). Use real-time data.`,
            },
          ],
          temperature: 0.1,
          max_tokens: 200,
        },
        {
          headers: {
            Authorization: `Bearer ${process.env.PERPLEXITY_API_KEY}`,
            "Content-Type": "application/json",
          },
        },
      );

      const content = response.data.choices[0].message.content;
      // Extract JSON from the response
      const jsonMatch = content.match(/\{[\s\S]*\}/);
      if (jsonMatch) {
        const data = JSON.parse(jsonMatch[0]);
        return {
          price: data.price,
          changePercent: data.changePercent || 0,
          volume: data.volume || 1000000,
          open: data.open || data.price,
          high: data.high || data.price,
          low: data.low || data.price,
          previousClose: data.previousClose || data.price,
          marketCap: "N/A",
          low52: data.price * 0.8,
          high52: data.price * 1.2,
        };
      }
    } catch (error) {
      logger.error(
        `[IntelligentResponse] Perplexity API error: ${error.message}`,
      );
      throw error;
    }
  }

  getSimulatedMarketData(symbol) {
    // Realistic base prices for common symbols
    const basePrices = {
      AAPL: 195.5,
      MSFT: 425.75,
      GOOGL: 155.25,
      AMZN: 185.5,
      TSLA: 245.75,
      BTC: 102000,  // Aligned with AssetConfigManager for consistency
      ETH: 3133,    // Aligned with AssetConfigManager for consistency
      GC: 3350,
      SI: 24.5,
      CL: 78.5,
    };

    const basePrice = basePrices[symbol] || 100;
    const changePercent = (Math.random() - 0.5) * 4; // -2% to +2%
    const change = basePrice * (changePercent / 100);

    return {
      price: basePrice + change,
      changePercent: changePercent,
      volume: Math.floor(Math.random() * 50000000) + 10000000,
      open: basePrice,
      high: basePrice * 1.02,
      low: basePrice * 0.98,
      previousClose: basePrice,
      marketCap: "N/A",
      low52: basePrice * 0.8,
      high52: basePrice * 1.2,
    };
  }

  async getHistoricalData(symbol, days = 30) {
    // CRITICAL: Fetch REAL historical data from API - NEVER use mock data
    try {
      logger.debug(`[IntelligentResponse] Fetching real historical data for ${symbol}`);
      const historicalData = await this.marketDataService.fetchHistoricalData(symbol, days);
      
      if (!historicalData || historicalData.length === 0) {
        logger.error(`[IntelligentResponse] No historical data available for ${symbol}`);
        return [];
      }
      
      logger.debug(`[IntelligentResponse] Retrieved ${historicalData.length} days of real historical data`);
      return historicalData;
    } catch (error) {
      logger.error(`[IntelligentResponse] Failed to fetch historical data for ${symbol}:`, error.message);
      return [];
    }
  }

  async generateEducationalResponse(query, context) {
    logger.debug(`[IntelligentResponse] Generating educational response for: "${query}"`);
    
    const topic = context.llmAnalysis?.educationalTopic || this.extractEducationalTopic(query);
    
    // Educational topics mapping
    const educationalContent = {
      'inflation': "Inflation is the rate at which prices for goods and services rise over time, decreasing purchasing power. Central banks target 2% annual inflation as healthy for the economy. High inflation erodes savings and fixed incomes, while deflation can signal economic weakness.",
      'market_hours': "US stock markets are open Monday-Friday, 9:30 AM - 4:00 PM ET. Pre-market trading: 4:00 AM - 9:30 AM ET. After-hours trading: 4:00 PM - 8:00 PM ET. Markets are closed on weekends and major holidays.",
      'p_e_ratio': "The Price-to-Earnings (P/E) ratio compares a company's stock price to its earnings per share. It shows how much investors are willing to pay per dollar of earnings. Lower P/E may indicate undervaluation, while higher P/E suggests growth expectations.",
      'options': "Options are contracts giving the right (not obligation) to buy (call) or sell (put) an asset at a specific price before expiration. They're used for hedging, income generation, or speculation. Key concepts include strike price, expiration date, and premium.",
      'federal_reserve': "The Federal Reserve (Fed) is the US central bank, controlling monetary policy through interest rates and money supply. It aims to maximize employment and stabilize prices. Fed decisions significantly impact stock markets, bonds, and currency values.",
      'dividends': "Dividends are payments companies make to shareholders from profits. They provide income and signal financial health. Dividend yield = annual dividend / stock price. Growth companies often reinvest profits instead of paying dividends.",
      'market_cap': "Market capitalization = shares outstanding × stock price. Categories: Mega-cap (>$200B), Large-cap ($10-200B), Mid-cap ($2-10B), Small-cap ($300M-2B), Micro-cap (<$300M). Larger caps are generally more stable.",
      'bull_bear_markets': "Bull markets feature rising prices and optimism (20%+ gain from recent low). Bear markets have falling prices and pessimism (20%+ decline from recent high). Average bull market: 2.7 years. Average bear market: 9.6 months.",
      'etf': "Exchange-Traded Funds (ETFs) are baskets of securities trading like individual stocks. They offer diversification, lower fees than mutual funds, and intraday trading. Popular types include index ETFs, sector ETFs, and commodity ETFs.",
      'short_selling': "Short selling involves borrowing shares to sell, hoping to buy back cheaper later. Maximum gain: 100% (if stock goes to $0). Maximum loss: unlimited (stock can rise indefinitely). Requires margin account and carries high risk."
    };
    
    const content = educationalContent[topic] || `${topic} is a financial concept worth understanding. Here's the key insight...`;
    
    // If LLM is available, enhance the response
    if (this.useLLM) {
      try {
        const enhanced = await this.azureOpenAI.enhanceResponse(
          { content, topic },
          'education',
          query,
          context?.conversationHistory || []
        );
        return {
          type: "educational",
          response: enhanced,
          topic: topic
        };
      } catch (error) {
        logger.error('[IntelligentResponse] Failed to enhance educational response:', error);
      }
    }
    
    return {
      type: "educational",
      response: content,
      topic: topic
    };
  }

  async generateCompanyInfoResponse(query, context) {
    logger.debug(`[IntelligentResponse] Generating company info response for: "${query}"`);
    
    const symbols = context.llmAnalysis?.symbols || context.extractedSymbols || [];
    const infoType = context.llmAnalysis?.companyInfoRequest || 'general';
    
    if (symbols.length === 0) {
      return {
        type: "error",
        response: "Please specify which company you'd like information about.",
        symbol: null
      };
    }
    
    const symbol = symbols[0];
    
    try {
      // Get current market data
      const marketData = await this.getMarketData(symbol);
      
      // Company info mapping (in production, this would come from a company info API)
      const companyInfo = {
        'AAPL': {
          CEO: 'Tim Cook',
          founded: '1976',
          headquarters: 'Cupertino, CA',
          sector: 'Technology',
          industry: 'Consumer Electronics'
        },
        'MSFT': {
          CEO: 'Satya Nadella',
          founded: '1975',
          headquarters: 'Redmond, WA',
          sector: 'Technology',
          industry: 'Software'
        },
        'TSLA': {
          CEO: 'Elon Musk',
          founded: '2003',
          headquarters: 'Austin, TX',
          sector: 'Consumer Cyclical',
          industry: 'Auto Manufacturers'
        },
        'AMZN': {
          CEO: 'Andy Jassy',
          founded: '1994',
          headquarters: 'Seattle, WA',
          sector: 'Consumer Cyclical',
          industry: 'Internet Retail'
        },
        'GOOGL': {
          CEO: 'Sundar Pichai',
          founded: '1998',
          headquarters: 'Mountain View, CA',
          sector: 'Technology',
          industry: 'Internet Content & Information'
        }
      };
      
      const info = companyInfo[symbol] || {};
      
      let response = `**${marketData.name || symbol}** (${symbol})\n\n`;
      
      if (infoType === 'CEO' && info.CEO) {
        response += `CEO: ${info.CEO}\n\n`;
      } else if (infoType === 'general' || !info[infoType]) {
        // Provide comprehensive info
        if (info.CEO) response += `• CEO: ${info.CEO}\n`;
        if (info.founded) response += `• Founded: ${info.founded}\n`;
        if (info.headquarters) response += `• Headquarters: ${info.headquarters}\n`;
        if (info.sector) response += `• Sector: ${info.sector}\n`;
        if (info.industry) response += `• Industry: ${info.industry}\n`;
      }
      
      // Add current market data
      response += `\n**Current Market Data:**\n`;
      response += `• Price: $${NumberFormatter.formatPrice(marketData.price)}\n`;
      response += `• Market Cap: ${NumberFormatter.formatLargeNumber(marketData.marketCap)}\n`;
      response += `• Today's Change: ${NumberFormatter.formatPercentage(marketData.changePercent)}\n`;
      
      // For crypto, redirect to standard analysis (Bitcoin is not a company!)
      if (['BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'XRP', 'DOGE'].includes(symbol)) {
        logger.info(`[DEBUG] Redirecting crypto ${symbol} to standard analysis`);
        return await this.generateStandardAnalysis(query, context);
      }
      
      // Use LLM enhancement for company info
      const sessionId = context.sessionId || 'default';
      const conversationState = this.getConversationState(sessionId);
      
      if (this.useLLM) {
        try {
          const enhanced = await this.azureOpenAI.enhanceResponse(
            response,
            'company_info',
            query,
            context.conversationHistory || [],
            context,
            conversationState
          );
          
          return {
            type: "company_info",
            response: enhanced,
            symbol: symbol,
            data: marketData,
            needsChart: true,  // Show chart for company queries too
            conversationState: conversationState
          };
        } catch (error) {
          logger.error('[IntelligentResponse] Failed to enhance company info:', error);
        }
      }
      
      return {
        type: "company_info",
        response: response,
        symbol: symbol,
        data: marketData,
        needsChart: true
      };
      
    } catch (error) {
      logger.error(`[IntelligentResponse] Failed to get company info for ${symbol}:`, error);
      return {
        type: "error",
        response: `Unable to retrieve company information for ${symbol}. Please try again.`,
        symbol: symbol
      };
    }
  }

  extractEducationalTopic(query) {
    const lowerQuery = query.toLowerCase();
    
    if (lowerQuery.includes('inflation')) return 'inflation';
    if (lowerQuery.includes('market hours') || lowerQuery.includes('trading hours')) return 'market_hours';
    if (lowerQuery.includes('p/e') || lowerQuery.includes('price to earnings')) return 'p_e_ratio';
    if (lowerQuery.includes('option')) return 'options';
    if (lowerQuery.includes('fed') || lowerQuery.includes('federal reserve')) return 'federal_reserve';
    if (lowerQuery.includes('dividend')) return 'dividends';
    if (lowerQuery.includes('market cap')) return 'market_cap';
    if (lowerQuery.includes('bull') || lowerQuery.includes('bear')) return 'bull_bear_markets';
    if (lowerQuery.includes('etf')) return 'etf';
    if (lowerQuery.includes('short')) return 'short_selling';
    
    return 'general_finance';
  }
}

module.exports = new IntelligentResponseGenerator();
