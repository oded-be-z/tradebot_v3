/**
 * ConversationContext - Manages conversation memory and user personalization
 * Tracks symbols, user expertise level, and conversation flow for enhanced responses
 */

class ConversationContext {
  constructor() {
    // Session-based context storage
    this.sessions = new Map();
    this.SESSION_TTL = 30 * 60 * 1000; // 30 minutes
    
    // User level indicators
    this.BEGINNER_TERMS = ['what is', 'explain', 'how does', 'basics', 'simple', 'help me understand'];
    this.EXPERT_TERMS = ['P/E ratio', 'RSI', 'MACD', 'options', 'volatility', 'beta', 'dividend yield', 'market cap', 'earnings per share'];
    
    // Context cleanup interval
    setInterval(() => this.cleanupExpiredSessions(), 5 * 60 * 1000); // Every 5 minutes
  }

  /**
   * Gets or creates session context
   */
  getSessionContext(sessionId) {
    if (!this.sessions.has(sessionId)) {
      this.sessions.set(sessionId, {
        symbols: [], // Array of {symbol, timestamp, query, frequency}
        userLevel: 'intermediate', // beginner, intermediate, expert
        interests: [], // Array of detected interests/topics
        queries: [], // Recent query history
        lastActivity: Date.now(),
        patterns: {
          tradingStyle: null, // dayTrader, longTerm, swing
          riskTolerance: null, // conservative, moderate, aggressive
          preferredMetrics: [] // P/E, RSI, volume, etc.
        },
        // Smart Insights tracking
        symbolQueryCount: new Map(), // Track how many times each symbol is queried
        lastSymbolQuery: new Map(), // Track last query time for each symbol
        lastPrices: new Map(), // Track last known price for each symbol
        recentSymbols: new Map() // PRODUCTION FIX: Changed from Set to Map for Smart Insights compatibility
      });
    }
    
    // Update last activity
    const context = this.sessions.get(sessionId);
    context.lastActivity = Date.now();
    return context;
  }

  /**
   * Updates context from query and understanding
   */
  updateFromQuery(sessionId, originalQuery, understanding, data = {}) {
    const context = this.getSessionContext(sessionId);
    const timestamp = Date.now();
    
    // 1. Track symbols mentioned and Smart Insights data
    if (understanding.symbols && understanding.symbols.length > 0) {
      understanding.symbols.forEach(symbol => {
        const existing = context.symbols.find(s => s.symbol === symbol);
        
        // Get price data if available
        const symbolData = data[symbol] || data[`${symbol}_market`];
        const currentPrice = symbolData?.price || symbolData?.quote?.price || null;
        
        // Update Smart Insights tracking
        const currentCount = context.symbolQueryCount.get(symbol) || 0;
        context.symbolQueryCount.set(symbol, currentCount + 1);
        context.lastSymbolQuery.set(symbol, timestamp);
        // PRODUCTION FIX: Store symbol data in Map format for Smart Insights
        context.recentSymbols.set(symbol, {
          frequency: existing ? existing.frequency : 1,
          lastPrice: currentPrice,
          lastAskedTime: timestamp
        });
        
        // Track price for comparison
        if (currentPrice !== null) {
          context.lastPrices.set(symbol, currentPrice);
        }
        
        if (existing) {
          existing.frequency++;
          existing.lastMentioned = timestamp;
          existing.lastQuery = originalQuery;
          // Update price data if available
          if (currentPrice !== null) {
            existing.lastPrice = currentPrice;
          }
        } else {
          context.symbols.push({
            symbol,
            firstMentioned: timestamp,
            lastMentioned: timestamp,
            frequency: 1,
            lastQuery: originalQuery,
            lastPrice: currentPrice
          });
        }
      });
      
      // Keep only last 10 symbols, sorted by recency
      context.symbols.sort((a, b) => b.lastMentioned - a.lastMentioned);
      context.symbols = context.symbols.slice(0, 10);
      
      // PRODUCTION FIX: Limit recent symbols to last 5 (Map version)
      if (context.recentSymbols.size > 5) {
        const entries = Array.from(context.recentSymbols.entries());
        const recentEntries = entries.slice(-5);
        context.recentSymbols = new Map(recentEntries);
      }
    }
    
    // 2. Detect and update user level
    const detectedLevel = this.detectUserLevel(originalQuery);
    if (detectedLevel !== context.userLevel) {
      // Only upgrade user level, don't downgrade unless clear beginner query
      if (detectedLevel === 'expert' || 
          (detectedLevel === 'beginner' && this.isClearBeginnerQuery(originalQuery))) {
        context.userLevel = detectedLevel;
      }
    }
    
    // 3. Track interests and patterns
    this.updateInterests(context, originalQuery, understanding);
    this.detectTradingPatterns(context, originalQuery, understanding);
    
    // 4. Store query history (last 5 queries)
    context.queries.unshift({
      query: originalQuery,
      intent: understanding.intent,
      symbols: understanding.symbols || [],
      timestamp
    });
    context.queries = context.queries.slice(0, 5);
    
    return context;
  }

  /**
   * Detects user expertise level from query
   */
  detectUserLevel(query) {
    const lowerQuery = query.toLowerCase();
    
    // Check for expert terms
    if (this.EXPERT_TERMS.some(term => lowerQuery.includes(term.toLowerCase()))) {
      return 'expert';
    }
    
    // Check for beginner terms
    if (this.BEGINNER_TERMS.some(term => lowerQuery.includes(term))) {
      return 'beginner';
    }
    
    // Analyze query complexity
    if (query.length > 100 || query.split(' ').length > 15) {
      return 'expert';
    }
    
    if (query.length < 20 || /^[A-Z]{1,5}\?*$/.test(query.trim())) {
      return 'beginner';
    }
    
    return 'intermediate';
  }

  /**
   * Checks if query is clearly from a beginner
   */
  isClearBeginnerQuery(query) {
    const lowerQuery = query.toLowerCase();
    return this.BEGINNER_TERMS.some(term => lowerQuery.startsWith(term)) ||
           /^(what|how|why|explain|tell me about)/i.test(query);
  }

  /**
   * Updates user interests based on query
   */
  updateInterests(context, query, understanding) {
    const interests = [];
    
    // Intent-based interests
    if (understanding.intent === 'portfolio_query') interests.push('portfolio_management');
    if (understanding.intent === 'comparison_query') interests.push('stock_comparison');
    if (understanding.intent === 'trend_query') interests.push('technical_analysis');
    
    // Keyword-based interests
    const lowerQuery = query.toLowerCase();
    if (lowerQuery.includes('dividend')) interests.push('dividend_investing');
    if (lowerQuery.includes('option')) interests.push('options_trading');
    if (lowerQuery.includes('crypto')) interests.push('cryptocurrency');
    if (lowerQuery.includes('sector') || lowerQuery.includes('industry')) interests.push('sector_analysis');
    
    // Add new interests
    interests.forEach(interest => {
      if (!context.interests.includes(interest)) {
        context.interests.push(interest);
      }
    });
    
    // Keep only last 5 interests
    context.interests = context.interests.slice(-5);
  }

  /**
   * Detects trading patterns and style
   */
  detectTradingPatterns(context, query, understanding) {
    const lowerQuery = query.toLowerCase();
    
    // Trading style detection
    if (lowerQuery.includes('day trade') || lowerQuery.includes('scalp')) {
      context.patterns.tradingStyle = 'dayTrader';
    } else if (lowerQuery.includes('long term') || lowerQuery.includes('hold')) {
      context.patterns.tradingStyle = 'longTerm';
    } else if (lowerQuery.includes('swing') || lowerQuery.includes('short term')) {
      context.patterns.tradingStyle = 'swing';
    }
    
    // Risk tolerance
    if (lowerQuery.includes('safe') || lowerQuery.includes('conservative')) {
      context.patterns.riskTolerance = 'conservative';
    } else if (lowerQuery.includes('aggressive') || lowerQuery.includes('risk')) {
      context.patterns.riskTolerance = 'aggressive';
    }
    
    // Preferred metrics
    this.EXPERT_TERMS.forEach(term => {
      if (lowerQuery.includes(term.toLowerCase()) && 
          !context.patterns.preferredMetrics.includes(term)) {
        context.patterns.preferredMetrics.push(term);
      }
    });
  }

  /**
   * Gets recent symbols (last 5)
   */
  getRecentSymbols(sessionId) {
    const context = this.getSessionContext(sessionId);
    return context.symbols
      .slice(0, 5)
      .map(s => ({
        symbol: s.symbol,
        timestamp: s.lastMentioned,
        frequency: s.frequency
      }));
  }

  /**
   * Generates context prompt for synthesis
   */
  getContextPrompt(sessionId) {
    const context = this.getSessionContext(sessionId);
    
    if (context.queries.length === 0) {
      return ''; // No context for first query
    }
    
    let contextPrompt = '\n=== CONVERSATION CONTEXT ===\n';
    
    // User level adaptation
    contextPrompt += `User Level: ${context.userLevel}\n`;
    if (context.userLevel === 'beginner') {
      contextPrompt += '- Use simple language, explain terms, avoid jargon\n';
    } else if (context.userLevel === 'expert') {
      contextPrompt += '- Use technical terminology, provide detailed metrics\n';
    }
    
    // Recent symbols context
    if (context.symbols.length > 0) {
      const recentSymbols = context.symbols.slice(0, 3);
      contextPrompt += `Recent symbols discussed: ${recentSymbols.map(s => s.symbol).join(', ')}\n`;
      
      // Most discussed symbol
      const mostDiscussed = context.symbols.reduce((max, s) => s.frequency > max.frequency ? s : max);
      if (mostDiscussed.frequency > 2) {
        contextPrompt += `Primary focus: ${mostDiscussed.symbol} (mentioned ${mostDiscussed.frequency} times)\n`;
      }
    }
    
    // Recent query context for reference resolution
    if (context.queries.length > 1) {
      const lastQuery = context.queries[0];
      const prevQuery = context.queries[1];
      contextPrompt += `Previous query: "${prevQuery.query}"\n`;
      contextPrompt += `Current query context: If user says "it", "that", "this stock", "compare it", they likely refer to: ${prevQuery.symbols?.[0] || 'the previous topic'}\n`;
    }
    
    // User interests and patterns
    if (context.interests.length > 0) {
      contextPrompt += `User interests: ${context.interests.join(', ')}\n`;
    }
    
    if (context.patterns.tradingStyle) {
      contextPrompt += `Trading style: ${context.patterns.tradingStyle}\n`;
    }
    
    if (context.patterns.preferredMetrics.length > 0) {
      contextPrompt += `Preferred metrics: ${context.patterns.preferredMetrics.join(', ')}\n`;
    }
    
    contextPrompt += '=== END CONTEXT ===\n\n';
    
    return contextPrompt;
  }

  /**
   * Resolves pronoun references (it, that, this stock, etc.)
   */
  resolvePronounReference(sessionId, query) {
    const context = this.getSessionContext(sessionId);
    
    if (context.queries.length === 0) return query;
    
    const lowerQuery = query.toLowerCase();
    const pronouns = ['it', 'that', 'this stock', 'compare it', 'how about it'];
    
    if (pronouns.some(pronoun => lowerQuery.includes(pronoun))) {
      // Find the most recent symbol mentioned
      const lastSymbol = context.symbols[0]?.symbol;
      if (lastSymbol) {
        // Replace pronouns with the symbol
        let resolved = query;
        pronouns.forEach(pronoun => {
          const regex = new RegExp(`\\b${pronoun}\\b`, 'gi');
          resolved = resolved.replace(regex, lastSymbol);
        });
        return resolved;
      }
    }
    
    return query;
  }

  /**
   * Cleanup expired sessions
   */
  cleanupExpiredSessions() {
    const now = Date.now();
    for (const [sessionId, context] of this.sessions.entries()) {
      if (now - context.lastActivity > this.SESSION_TTL) {
        this.sessions.delete(sessionId);
      }
    }
  }

  /**
   * Get user expertise level
   */
  getUserExpertiseLevel(sessionId) {
    const context = this.getSessionContext(sessionId);
    return context.userLevel || 'intermediate';
  }

  /**
   * Get context data formatted for SmartInsights
   */
  getContext(sessionId) {
    const context = this.getSessionContext(sessionId);
    
    // Convert symbols array to Map format expected by SmartInsights
    const recentSymbols = new Map();
    context.symbols.forEach(symbolData => {
      recentSymbols.set(symbolData.symbol, {
        symbol: symbolData.symbol,
        frequency: symbolData.frequency,
        firstSeen: symbolData.firstMentioned,
        lastAskedTime: symbolData.lastMentioned,
        lastPrice: symbolData.lastPrice || null,
        lastQuery: symbolData.lastQuery
      });
    });
    
    return {
      recentSymbols,
      queryHistory: context.queries,
      userLevel: context.userLevel,
      interests: context.interests,
      patterns: context.patterns,
      // Smart Insights specific data
      symbolQueryCount: context.symbolQueryCount,
      lastSymbolQuery: context.lastSymbolQuery,
      lastPrices: context.lastPrices,
      recentSymbolsSet: context.recentSymbols
    };
  }

  /**
   * Get context summary for debugging
   */
  getContextSummary(sessionId) {
    const context = this.getSessionContext(sessionId);
    return {
      userLevel: context.userLevel,
      recentSymbols: context.symbols.slice(0, 3).map(s => s.symbol),
      interests: context.interests,
      queryCount: context.queries.length,
      patterns: context.patterns
    };
  }
}

module.exports = new ConversationContext();