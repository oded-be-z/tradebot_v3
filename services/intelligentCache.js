// services/intelligentCache.js
// Smart semantic caching system for financial queries

const logger = require('../utils/logger');

class IntelligentCache {
  constructor() {
    // Multi-level cache structure
    this.caches = {
      // Level 1: Exact query matches (instant)
      exact: new Map(),
      
      // Level 2: Semantic similarity cache (fast lookup)
      semantic: new Map(),
      
      // Level 3: Symbol-based cache (for price/info queries)
      symbol: new Map(),
      
      // Level 4: Pattern-based cache (for similar query types)
      pattern: new Map()
    };
    
    // Cache configuration
    this.config = {
      maxSize: {
        exact: 1000,
        semantic: 500,
        symbol: 2000,
        pattern: 300
      },
      ttl: {
        exact: 30 * 1000,      // 30 seconds for exact matches
        semantic: 60 * 1000,   // 1 minute for semantic matches
        symbol: 30 * 1000,     // 30 seconds for symbol data
        pattern: 5 * 60 * 1000 // 5 minutes for pattern responses
      },
      similarity: {
        threshold: 0.85,       // Minimum similarity for semantic cache
        maxCandidates: 50      // Max entries to check for similarity
      }
    };
    
    // Cache statistics
    this.stats = {
      hits: { exact: 0, semantic: 0, symbol: 0, pattern: 0 },
      misses: 0,
      total: 0,
      evictions: 0,
      sizeMB: 0
    };
    
    // Cleanup interval
    this.cleanupInterval = setInterval(() => {
      this.cleanup();
    }, 60 * 1000); // Every minute
    
    logger.info('[IntelligentCache] Initialized with 4-level caching strategy');
  }
  
  // Main cache retrieval method
  async get(query, context = {}) {
    const startTime = Date.now();
    this.stats.total++;
    
    const normalizedQuery = this.normalizeQuery(query);
    const cacheKey = this.generateCacheKey(normalizedQuery, context);
    
    // Level 1: Exact match cache (fastest)
    const exactResult = this.getExact(cacheKey);
    if (exactResult) {
      this.stats.hits.exact++;
      logger.debug(`[Cache] Exact hit: "${query}" (${Date.now() - startTime}ms)`);
      return {
        ...exactResult,
        cacheLevel: 'exact',
        cacheTime: Date.now() - startTime
      };
    }
    
    // Level 2: Semantic similarity cache
    const semanticResult = await this.getSemantic(normalizedQuery, context);
    if (semanticResult) {
      this.stats.hits.semantic++;
      logger.debug(`[Cache] Semantic hit: "${query}" -> "${semanticResult.originalQuery}" (${Date.now() - startTime}ms)`);
      return {
        ...semanticResult,
        cacheLevel: 'semantic',
        cacheTime: Date.now() - startTime
      };
    }
    
    // Level 3: Symbol-based cache (for stock/crypto queries)
    const symbols = this.extractSymbols(query);
    if (symbols.length > 0) {
      const symbolResult = this.getSymbolBased(symbols, this.detectQueryType(query));
      if (symbolResult) {
        this.stats.hits.symbol++;
        logger.debug(`[Cache] Symbol hit: "${query}" -> ${symbols.join(', ')} (${Date.now() - startTime}ms)`);
        return {
          ...symbolResult,
          cacheLevel: 'symbol',
          cacheTime: Date.now() - startTime
        };
      }
    }
    
    // Level 4: Pattern-based cache (for similar query types)
    const patternResult = this.getPatternBased(query, context);
    if (patternResult) {
      this.stats.hits.pattern++;
      logger.debug(`[Cache] Pattern hit: "${query}" (${Date.now() - startTime}ms)`);
      return {
        ...patternResult,
        cacheLevel: 'pattern',
        cacheTime: Date.now() - startTime
      };
    }
    
    // Cache miss
    this.stats.misses++;
    logger.debug(`[Cache] Miss: "${query}" (${Date.now() - startTime}ms)`);
    return null;
  }
  
  // Store response in appropriate cache levels
  async set(query, response, context = {}) {
    const normalizedQuery = this.normalizeQuery(query);
    const cacheKey = this.generateCacheKey(normalizedQuery, context);
    const timestamp = Date.now();
    
    const cacheEntry = {
      originalQuery: query,
      normalizedQuery,
      response,
      context,
      timestamp,
      hits: 0,
      symbols: this.extractSymbols(query),
      queryType: this.detectQueryType(query)
    };
    
    // Store in exact cache
    this.setExact(cacheKey, cacheEntry);
    
    // Store in semantic cache if query has good semantic value
    if (this.hasSemanticValue(query)) {
      this.setSemantic(normalizedQuery, cacheEntry);
    }
    
    // Store in symbol cache if query contains symbols
    if (cacheEntry.symbols.length > 0) {
      this.setSymbolBased(cacheEntry.symbols, cacheEntry.queryType, cacheEntry);
    }
    
    // Store in pattern cache for reusable response patterns
    if (this.hasPatternValue(query, response)) {
      this.setPatternBased(query, cacheEntry);
    }
    
    logger.debug(`[Cache] Stored: "${query}" in ${this.getStorageLevels(cacheEntry).join(', ')} cache(s)`);
  }
  
  // Level 1: Exact match cache
  getExact(cacheKey) {
    const entry = this.caches.exact.get(cacheKey);
    if (entry && !this.isExpired(entry, 'exact')) {
      entry.hits++;
      return entry;
    }
    if (entry) this.caches.exact.delete(cacheKey);
    return null;
  }
  
  setExact(cacheKey, entry) {
    this.enforceMaxSize('exact');
    this.caches.exact.set(cacheKey, entry);
  }
  
  // Level 2: Semantic similarity cache
  async getSemantic(normalizedQuery, context) {
    const candidates = Array.from(this.caches.semantic.values())
      .filter(entry => !this.isExpired(entry, 'semantic'))
      .slice(0, this.config.similarity.maxCandidates);
    
    for (const candidate of candidates) {
      const similarity = this.calculateSimilarity(normalizedQuery, candidate.normalizedQuery);
      if (similarity >= this.config.similarity.threshold) {
        // Additional context matching for better precision
        if (this.contextMatches(context, candidate.context)) {
          candidate.hits++;
          return candidate;
        }
      }
    }
    
    return null;
  }
  
  setSemantic(normalizedQuery, entry) {
    this.enforceMaxSize('semantic');
    const semanticKey = `sem_${normalizedQuery.slice(0, 50)}_${Date.now()}`;
    this.caches.semantic.set(semanticKey, entry);
  }
  
  // Level 3: Symbol-based cache
  getSymbolBased(symbols, queryType) {
    for (const symbol of symbols) {
      const symbolKey = `${symbol}_${queryType}`;
      const entry = this.caches.symbol.get(symbolKey);
      if (entry && !this.isExpired(entry, 'symbol')) {
        entry.hits++;
        return entry;
      }
      if (entry) this.caches.symbol.delete(symbolKey);
    }
    return null;
  }
  
  setSymbolBased(symbols, queryType, entry) {
    this.enforceMaxSize('symbol');
    for (const symbol of symbols) {
      const symbolKey = `${symbol}_${queryType}`;
      this.caches.symbol.set(symbolKey, { ...entry, symbol, queryType });
    }
  }
  
  // Level 4: Pattern-based cache
  getPatternBased(query, context) {
    const queryPattern = this.extractPattern(query);
    if (!queryPattern) return null;
    
    const entry = this.caches.pattern.get(queryPattern);
    if (entry && !this.isExpired(entry, 'pattern')) {
      // Adapt response to current query
      const adaptedResponse = this.adaptPatternResponse(entry.response, query, entry.originalQuery);
      if (adaptedResponse) {
        entry.hits++;
        return {
          ...entry,
          response: adaptedResponse,
          adapted: true
        };
      }
    }
    if (entry) this.caches.pattern.delete(queryPattern);
    return null;
  }
  
  setPatternBased(query, entry) {
    const pattern = this.extractPattern(query);
    if (pattern) {
      this.enforceMaxSize('pattern');
      this.caches.pattern.set(pattern, entry);
    }
  }
  
  // Utility methods
  normalizeQuery(query) {
    return query
      .toLowerCase()
      .trim()
      .replace(/[^\w\s]/g, '') // Remove punctuation
      .replace(/\s+/g, ' '); // Normalize whitespace
  }
  
  generateCacheKey(normalizedQuery, context) {
    const contextKey = [
      context.sessionId || 'anon',
      context.userTier || 'standard',
      (context.symbols || []).sort().join(',')
    ].join('|');
    
    return `${normalizedQuery}|${contextKey}`;
  }
  
  extractSymbols(query) {
    // Extract stock symbols, crypto symbols, etc.
    const symbols = [];
    
    // Common stock symbol patterns
    const stockPattern = /\b[A-Z]{1,5}\b/g;
    const stockMatches = query.match(stockPattern) || [];
    
    // Known symbols and crypto
    const knownSymbols = new Set([
      'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'SPY', 'QQQ',
      'BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT', 'LINK', 'UNI'
    ]);
    
    // Crypto aliases
    const cryptoAliases = {
      'bitcoin': 'BTC',
      'ethereum': 'ETH',
      'binance': 'BNB'
    };
    
    // Company name to symbol mapping
    const companyNames = {
      'apple': 'AAPL',
      'microsoft': 'MSFT',
      'google': 'GOOGL',
      'amazon': 'AMZN',
      'tesla': 'TSLA',
      'facebook': 'META',
      'nvidia': 'NVDA'
    };
    
    // Extract from stock patterns
    stockMatches.forEach(match => {
      if (knownSymbols.has(match)) {
        symbols.push(match);
      }
    });
    
    // Extract from crypto aliases
    const queryLower = query.toLowerCase();
    Object.entries(cryptoAliases).forEach(([alias, symbol]) => {
      if (queryLower.includes(alias)) {
        symbols.push(symbol);
      }
    });
    
    // Extract from company names
    Object.entries(companyNames).forEach(([name, symbol]) => {
      if (queryLower.includes(name)) {
        symbols.push(symbol);
      }
    });
    
    return [...new Set(symbols)]; // Remove duplicates
  }
  
  detectQueryType(query) {
    const queryLower = query.toLowerCase();
    
    if (/price|cost|worth|\$/.test(queryLower)) return 'price';
    if (/news|earnings|report/.test(queryLower)) return 'news';
    if (/analysis|forecast|trend/.test(queryLower)) return 'analysis';
    if (/compare|vs|versus/.test(queryLower)) return 'comparison';
    if (/portfolio|allocation/.test(queryLower)) return 'portfolio';
    if (/info|about|what.*is/.test(queryLower)) return 'info';
    
    return 'general';
  }
  
  extractPattern(query) {
    const queryLower = query.toLowerCase().trim();
    
    // Pattern templates
    const patterns = [
      { regex: /^(what'?s?\s+)?(the\s+)?price\s+of\s+\w+\??$/, pattern: 'price_of_symbol' },
      { regex: /^\w+\s+price\??$/, pattern: 'symbol_price' },
      { regex: /^(tell\s+me\s+about|what\s+is)\s+\w+\??$/, pattern: 'about_symbol' },
      { regex: /^compare\s+\w+\s+(and|vs|versus)\s+\w+/, pattern: 'compare_symbols' },
      { regex: /^how\s+is\s+\w+\s+(doing|performing)/, pattern: 'symbol_performance' }
    ];
    
    for (const { regex, pattern } of patterns) {
      if (regex.test(queryLower)) {
        return pattern;
      }
    }
    
    return null;
  }
  
  calculateSimilarity(query1, query2) {
    // Simple word-based similarity (could be enhanced with embeddings)
    const words1 = new Set(query1.split(' '));
    const words2 = new Set(query2.split(' '));
    
    const intersection = new Set([...words1].filter(x => words2.has(x)));
    const union = new Set([...words1, ...words2]);
    
    return intersection.size / union.size; // Jaccard similarity
  }
  
  contextMatches(context1, context2) {
    // Check if contexts are similar enough for cache reuse
    if (!context1 || !context2) return true;
    
    // Same user tier
    if (context1.userTier && context2.userTier && context1.userTier !== context2.userTier) {
      return false;
    }
    
    // Overlapping symbols
    const symbols1 = new Set(context1.symbols || []);
    const symbols2 = new Set(context2.symbols || []);
    const symbolOverlap = new Set([...symbols1].filter(x => symbols2.has(x)));
    
    if (symbols1.size > 0 && symbols2.size > 0 && symbolOverlap.size === 0) {
      return false;
    }
    
    return true;
  }
  
  adaptPatternResponse(originalResponse, newQuery, originalQuery) {
    // Simple response adaptation for pattern-based cache
    try {
      const newSymbols = this.extractSymbols(newQuery);
      const originalSymbols = this.extractSymbols(originalQuery);
      
      if (newSymbols.length === 1 && originalSymbols.length === 1) {
        // Replace symbol in response
        const newSymbol = newSymbols[0];
        const originalSymbol = originalSymbols[0];
        
        return originalResponse.replace(
          new RegExp(originalSymbol, 'gi'),
          newSymbol
        );
      }
      
      return originalResponse;
    } catch (error) {
      logger.error('[Cache] Error adapting pattern response:', error);
      return null;
    }
  }
  
  hasSemanticValue(query) {
    // Determine if query has good semantic value for caching
    const wordCount = query.split(/\s+/).length;
    return wordCount >= 3 && wordCount <= 20 && !/^\w+\??$/.test(query);
  }
  
  hasPatternValue(query, response) {
    // Determine if query-response pair has pattern value
    const hasPattern = this.extractPattern(query) !== null;
    const hasSymbols = this.extractSymbols(query).length > 0;
    const responseLength = response.length;
    
    return hasPattern && hasSymbols && responseLength > 50 && responseLength < 1000;
  }
  
  getStorageLevels(entry) {
    const levels = ['exact'];
    
    if (this.hasSemanticValue(entry.originalQuery)) levels.push('semantic');
    if (entry.symbols.length > 0) levels.push('symbol');
    if (this.extractPattern(entry.originalQuery)) levels.push('pattern');
    
    return levels;
  }
  
  isExpired(entry, cacheType) {
    const age = Date.now() - entry.timestamp;
    return age > this.config.ttl[cacheType];
  }
  
  enforceMaxSize(cacheType) {
    const cache = this.caches[cacheType];
    const maxSize = this.config.maxSize[cacheType];
    
    if (cache.size >= maxSize) {
      // LRU eviction - remove oldest entries
      const entries = Array.from(cache.entries());
      entries.sort((a, b) => a[1].timestamp - b[1].timestamp);
      
      const toRemove = Math.floor(maxSize * 0.1); // Remove 10%
      for (let i = 0; i < toRemove; i++) {
        cache.delete(entries[i][0]);
        this.stats.evictions++;
      }
    }
  }
  
  cleanup() {
    let totalRemoved = 0;
    
    // Clean expired entries from all cache levels
    Object.entries(this.caches).forEach(([cacheType, cache]) => {
      const toRemove = [];
      
      cache.forEach((entry, key) => {
        if (this.isExpired(entry, cacheType)) {
          toRemove.push(key);
        }
      });
      
      toRemove.forEach(key => cache.delete(key));
      totalRemoved += toRemove.length;
    });
    
    // Update memory usage statistics
    this.updateMemoryStats();
    
    if (totalRemoved > 0) {
      logger.debug(`[Cache] Cleanup: removed ${totalRemoved} expired entries`);
    }
  }
  
  updateMemoryStats() {
    let totalSize = 0;
    
    Object.values(this.caches).forEach(cache => {
      cache.forEach(entry => {
        totalSize += JSON.stringify(entry).length;
      });
    });
    
    this.stats.sizeMB = (totalSize / 1024 / 1024).toFixed(2);
  }
  
  // Get cache statistics
  getStats() {
    const totalHits = Object.values(this.stats.hits).reduce((sum, hits) => sum + hits, 0);
    const totalRequests = totalHits + this.stats.misses;
    const hitRate = totalRequests > 0 ? (totalHits / totalRequests * 100).toFixed(2) : 0;
    
    return {
      performance: {
        totalRequests,
        totalHits,
        hitRate: hitRate + '%',
        missRate: (100 - parseFloat(hitRate)).toFixed(2) + '%'
      },
      hitsByLevel: {
        exact: this.stats.hits.exact,
        semantic: this.stats.hits.semantic,
        symbol: this.stats.hits.symbol,
        pattern: this.stats.hits.pattern
      },
      hitRatesByLevel: Object.entries(this.stats.hits).reduce((rates, [level, hits]) => {
        rates[level] = totalRequests > 0 ? (hits / totalRequests * 100).toFixed(1) + '%' : '0%';
        return rates;
      }, {}),
      memory: {
        sizeMB: this.stats.sizeMB,
        entriesByLevel: Object.entries(this.caches).reduce((counts, [level, cache]) => {
          counts[level] = cache.size;
          return counts;
        }, {}),
        evictions: this.stats.evictions
      }
    };
  }
  
  // Clear all caches
  clear() {
    Object.values(this.caches).forEach(cache => cache.clear());
    this.stats = {
      hits: { exact: 0, semantic: 0, symbol: 0, pattern: 0 },
      misses: 0,
      total: 0,
      evictions: 0,
      sizeMB: 0
    };
    logger.info('[IntelligentCache] All caches cleared');
  }
  
  // Preemptive cache warming for popular queries
  async warmCache(popularQueries) {
    logger.info(`[Cache] Warming cache with ${popularQueries.length} popular queries`);
    
    for (const queryData of popularQueries) {
      // This would be called with actual responses when available
      await this.set(queryData.query, queryData.response, queryData.context || {});
    }
  }
  
  // Destructor
  destroy() {
    if (this.cleanupInterval) {
      clearInterval(this.cleanupInterval);
    }
    this.clear();
  }
}

// Export singleton instance
module.exports = new IntelligentCache();