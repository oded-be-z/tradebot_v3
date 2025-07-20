const MarketDataService = require("../src/knowledge/market-data-service");
const NumberFormatter = require("../utils/numberFormatter");
const safeSymbol = require("../src/utils/safeSymbol");
const professionalAnalysis = require("./professionalAnalysis");
const logger = require("../utils/logger");
const azureOpenAI = require("./azureOpenAI");

class IntelligentResponseGenerator {
  constructor() {
    logger.debug("[IntelligentResponse] Initialized");
    this.marketDataService = new MarketDataService();
    this.azureOpenAI = azureOpenAI;
    this.useLLM = true; // Feature flag for LLM integration
    
    // Simple in-memory cache with 5-minute TTL
    this.cache = new Map();
    this.cacheTimeout = 5 * 60 * 1000; // 5 minutes
  }
  
  getCacheKey(query, type) {
    return `${type}:${query.toLowerCase().trim()}`;
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

  // Convert conversation history from server format to Azure OpenAI format
  formatConversationHistory(conversationHistory) {
    if (!conversationHistory || !Array.isArray(conversationHistory)) {
      return [];
    }
    
    return conversationHistory.flatMap(msg => {
      const messages = [];
      if (msg.query) {
        messages.push({ role: 'user', content: msg.query });
      }
      if (msg.response) {
        messages.push({ role: 'assistant', content: msg.response });
      }
      return messages;
    });
  }

  generateFollowUpSuggestions(responseType, symbols = [], context = {}) {
    const suggestions = {
      'greeting': [
        "What's the price of Apple stock?",
        "Show me Bitcoin trends",
        "Compare TSLA and NVDA"
      ],
      'capability': [
        "Analyze Tesla stock",
        "What's happening with crypto today?",
        "Show me the FAANG stocks"
      ],
      'standard_analysis': symbols.length > 0 ? [
        `Compare ${symbols[0]} with its competitors`,
        `Show me ${symbols[0]} trends`,
        `Is ${symbols[0]} a good investment?`
      ] : [
        "What are the top gainers today?",
        "Show me tech stock performance",
        "Analyze the crypto market"
      ],
      'comparison': [
        "Add another stock to compare",
        "Show me historical performance",
        "Which one is better for long-term?"
      ],
      'trend_analysis': symbols.length > 0 ? [
        `What's the forecast for ${symbols[0]}?`,
        `Show me ${symbols[0]} support and resistance`,
        `Compare ${symbols[0]} to the S&P 500`
      ] : [
        "What about the 1-year trend?",
        "Show me key technical indicators",
        "What's driving this trend?"
      ],
      'portfolio_analysis': [
        "How can I improve my diversification?",
        "What are my biggest risks?",
        "Show me sector allocation"
      ],
      'default': [
        "Tell me more about market trends",
        "What stocks are you watching?",
        "Show me today's market movers"
      ]
    };
    
    return suggestions[responseType] || suggestions['default'];
  }

  async generateResponse(query, context) {
    logger.info(`[IntelligentResponse] Processing: "${query}"`);
    
    // Check cache first for simple queries without context dependency
    const cacheKey = this.getCacheKey(query, 'response');
    const isContextDependent = query.toLowerCase().includes('them') || 
                              query.toLowerCase().includes('these') ||
                              query.toLowerCase().includes('those') ||
                              query.toLowerCase().includes('it');
    
    if (!isContextDependent) {
      const cached = this.getFromCache(cacheKey);
      if (cached) {
        return cached;
      }
    }
    
    // ALWAYS use LLM classification first - remove the feature flag check
    let intent = null;
    let symbols = [];
    let llmAnalysis = null;
    
    try {
      // Let LLM understand EVERYTHING about the query
      llmAnalysis = await this.azureOpenAI.analyzeQuery(query, context.conversationHistory);
      
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
        response = await this.generateMarketOverview(query, context);
        break;
        
      case "educational":
        response = await this.generateEducationalResponse(query, context);
        break;
        
      case "company_info":
        response = await this.generateCompanyInfoResponse(query, context);
        break;
        
      case "capability":
        response = {
          type: "capability",
          response: this.getCapabilityResponse()
        };
        break;
        
      case "greeting":
        logger.info('[IntelligentResponse] Handling greeting intent');
        response = {
          type: "greeting",
          response: this.getGreetingResponse(),
          suggestions: [
            "What's the price of Apple stock?",
            "Show me Bitcoin trends",
            "Compare MSFT and GOOGL"
          ]
        };
        break;

      default:
        response = await this.generateStandardAnalysis(query, context);
    }
    
    // Add follow-up suggestions based on response type
    if (response && !response.suggestions) {
      response.suggestions = this.generateFollowUpSuggestions(
        response.type || responseType, 
        symbols, 
        context
      );
    }
    
    // Cache the response if not context-dependent
    if (!isContextDependent && response.type !== 'error') {
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
        const formattedHistory = this.formatConversationHistory(context.conversationHistory || []);
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
      };
    }

    // Fetch data for both symbols (using fallback data for now)
    const data = await Promise.all(symbols.map((s) => this.getMarketData(s)));
    logger.info('[IntelligentResponse] Fetched data for comparison:', {
      symbol1: { symbol: symbols[0], price: data[0]?.price, change: data[0]?.changePercent },
      symbol2: { symbol: symbols[1], price: data[1]?.price, change: data[1]?.changePercent }
    });

    // Create comparison structure with formatted response as main content
    const comparison = {
      type: "comparison_table", // Use comparison_table to trigger chart generation
      symbols: symbols,
      response: await this.generateComparisonAnalysis(symbols, data),
      needsChart: true, // Always show charts for comparisons
      comparisonData: data, // Add data for chart generation
      suggestions: [
        `Show me ${symbols[0]} chart`,
        `Show me ${symbols[1]} chart`,
        "Compare with other assets"
      ]
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
        const formattedHistory = this.formatConversationHistory(context.conversationHistory || []);
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

  async generateComparisonAnalysis(symbols, data) {
    const symbol1 = symbols[0];
    const symbol2 = symbols[1];
    const data1 = data[0];
    const data2 = data[1];
    
    // Get asset info for better formatting
    const asset1Info = this.getAssetInfo(symbol1);
    const asset2Info = this.getAssetInfo(symbol2);
    
    // Format prices and percentages
    const price1 = NumberFormatter.formatPrice(data1.price);
    const price2 = NumberFormatter.formatPrice(data2.price);
    const change1 = NumberFormatter.formatNumber(data1.changePercent, 'percentage');
    const change2 = NumberFormatter.formatNumber(data2.changePercent, 'percentage');
    
    // Generate insights
    const insight = this.generateAssetSpecificInsight(asset1Info, asset2Info, data1, data2);
    const tradingTip = this.generateTradingConsideration(asset1Info, asset2Info, data1, data2);
    
    // EXACT format with proper line breaks
    const comparison = `📊 ${asset1Info.name} vs ${asset2Info.name} Comparison

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💰 CURRENT PRICES
${asset1Info.name}: ${price1} | ${asset2Info.name}: ${price2}

📈 24H PERFORMANCE  
${asset1Info.name}: ${data1.changePercent >= 0 ? '+' : ''}${change1} | ${asset2Info.name}: ${data2.changePercent >= 0 ? '+' : ''}${change2}

💡 MARKET INSIGHT
${insight}

🎯 TRADING CONSIDERATION
${tradingTip}

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Need deeper analysis? Just ask! 🔍`;
    
    return comparison;
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
    const currentSymbol = await this.extractSymbol(query, context);
    const symbol = currentSymbol || context.topic;
    // Don't update context.topic - this causes session pollution

    if (!symbol) {
      return {
        type: "error",
        message:
          'Please specify a symbol to analyze trends (e.g., "AAPL trends", "oil trends")',
      };
    }

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
        return {
          type: "error",
          message: `Unable to fetch real-time data for ${symbol}. Please try again in a moment.`,
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
      };
    }

    const historicalData = await this.getHistoricalData(symbol, 30);
    const trendInfo = this.calculateTrend(historicalData);

    // Enhanced analysis with real data only
    const analysis = {
      type: "trend_analysis",
      symbol: symbol,
      currentPrice: currentData.price,
      trend: trendInfo,
      needsChart: true,
      explanation: await this.explainTrendWithRealData(
        symbol,
        trendInfo,
        currentData,
      ),
    };
    
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

  async explainTrendWithRealData(symbol, trendInfo, currentData) {
    // Use professionalAnalysis for consistent formatting across all response types
    const professionalAnalysis = require('./professionalAnalysis');
    const analysis = professionalAnalysis.generateAnalysis(symbol, currentData, 'trend');
    return analysis;
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
    return "Hey there! I'm Max, your financial markets companion. 👋 Ready to dive into the markets? What would you like to explore - stocks, crypto, or market trends?";
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
    const portfolio = context.portfolio;
    const metrics = context.portfolioMetrics;

    if (!portfolio || portfolio.length === 0) {
      return {
        type: "standard_analysis",
        symbol: null,
        data: null,
        analysis: this.generateNoPortfolioAnalysis(),
        needsChart: false,
      };
    }

    return {
      type: "portfolio_analysis",
      metrics: metrics,
      holdings: portfolio,
      insights: await this.generatePortfolioInsights(portfolio, metrics),
      recommendations: await this.generatePortfolioRecommendations(
        portfolio,
        metrics,
      ),
      analysis: this.generatePortfolioAnalysisBullets(portfolio, metrics),
      needsChart: true, // Pie chart for allocation
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
      followUps.push(`Want me to suggest some diversification options for your ${topHolding.symbol} position?`);
    }
    
    // Performance-based recommendations
    const totalGainPercent = parseFloat(metrics.totalGainPercent);
    if (totalGainPercent > 30) {
      recommendations.push("2. With strong gains, consider taking some profits and rebalancing");
      followUps.push("Should I help you identify which positions to take profits on?");
    } else if (totalGainPercent < -15) {
      recommendations.push("2. Review underperforming positions for potential tax-loss harvesting");
      followUps.push("Want me to analyze which holdings might be good candidates for tax-loss harvesting?");
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
    
    if (followUps.length > 0) {
      result += followUps[0] + " 💡";
    } else {
      result += "Want me to help you rebalance or analyze deeper? 🎯";
    }
    
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
    return `📊 Portfolio Analysis

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

💼 NO PORTFOLIO UPLOADED

I'd love to help analyze your investments! Here's how to get started:

📁 UPLOAD YOUR PORTFOLIO
Upload a CSV file with your holdings using this format:
\`\`\`
symbol,shares,purchase_price
AAPL,100,150.00
MSFT,50,300.00
GOOGL,25,2500.00
\`\`\`

🎯 WHAT I'LL ANALYZE
✅ Total value and returns
✅ Top performers and underperformers  
✅ Diversification score
✅ Risk assessment
✅ Personalized recommendations

💡 OR TELL ME WHAT YOU OWN
You can also just tell me: "I own 100 shares of AAPL and 50 shares of MSFT"

━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━

Ready to optimize your investments? Upload your portfolio or tell me what you own! 🚀`;
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
    // Try LLM-based extraction first
    if (this.useLLM) {
      try {
        const formattedHistory = this.formatConversationHistory(context?.conversationHistory || []);
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
    
    logger.debug(`[IntelligentResponse] No valid symbol found in query`);
    return null;
  }

  async generateStandardAnalysis(query, context) {
    // Check if this is a group query first
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('faang') || lowerQuery.includes('tech stocks') || 
        lowerQuery.includes('crypto market') || lowerQuery.includes('bank stocks')) {
      
      // Extract multiple symbols for group queries
      const formattedHistory = this.formatConversationHistory(context?.conversationHistory || []);
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
    
    const symbol = await this.extractSymbol(query, context) || context.topic;

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

    return {
      type: "standard_analysis",
      symbol: symbol,
      data: data,
      analysis: this.generateBasicAnalysis(symbol, data, query),
      needsChart:
        query.toLowerCase().includes("chart") ||
        query.toLowerCase().includes("graph"),
    };
  }

  generateBasicAnalysis(symbol, data, query) {
    // Ensure data exists
    if (!data || !data.price) {
      return `Unable to generate analysis for ${symbol}. Market data is currently unavailable.`;
    }

    // Use professional analysis generator
    return professionalAnalysis.generateAnalysis(symbol, data, 'standard');
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
    
    const content = educationalContent[topic] || `I'll explain ${topic} in financial context. Please let me know what specific aspect you'd like to understand better.`;
    
    // If LLM is available, enhance the response
    if (this.useLLM) {
      try {
        const enhanced = await this.azureOpenAI.enhanceResponse(
          { content, topic },
          'education',
          query
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
        response: "Please specify which company you'd like information about."
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
      
      return {
        type: "company_info",
        response: response,
        symbol: symbol,
        data: marketData
      };
      
    } catch (error) {
      logger.error(`[IntelligentResponse] Failed to get company info for ${symbol}:`, error);
      return {
        type: "error",
        response: `Unable to retrieve company information for ${symbol}. Please try again.`
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
