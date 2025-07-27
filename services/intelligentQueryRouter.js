// services/intelligentQueryRouter.js
// Intelligent LLM-based query routing for cost and performance optimization

const logger = require('../utils/logger');
const azureOpenAI = require('./azureOpenAI');

class IntelligentQueryRouter {
  constructor() {
    this.azureOpenAI = azureOpenAI;
    
    // Route types and their characteristics
    this.ROUTES = {
      CACHE_HIT: {
        cost: 0,
        avgLatency: 0.01, // 10ms
        description: 'Return cached response'
      },
      QUICK_AZURE: {
        cost: 0.001,
        avgLatency: 1.0, // 1 second
        description: 'Simple factual query via Azure only'
      },
      PERPLEXITY_SEARCH: {
        cost: 0.005,
        avgLatency: 2.5, // 2.5 seconds
        description: 'Real-time data via Perplexity'
      },
      FULL_ORCHESTRATION: {
        cost: 0.015,
        avgLatency: 6.0, // 6 seconds
        description: 'Complex analysis via full pipeline'
      },
      BATCH_QUEUE: {
        cost: 0.008, // Variable, averaged
        avgLatency: 3.0, // Depends on batch timing
        description: 'Batch similar queries together'
      }
    };
    
    // Query pattern analysis
    this.QUERY_PATTERNS = {
      // Simple price queries - route to quick
      simple_price: {
        patterns: [
          /^(what'?s?\s+)?(the\s+)?(current\s+)?price\s+of\s+\w+\??$/i,
          /^\w+\s+price\??$/i,
          /^\w+\??$/i,
          /^how\s+much\s+is\s+\w+\??$/i
        ],
        route: 'QUICK_AZURE',
        confidence: 0.9
      },
      
      // Basic stock info - quick route
      basic_info: {
        patterns: [
          /^(what\s+is|tell\s+me\s+about)\s+\w+\??$/i,
          /^\w+\s+(info|information)\??$/i,
          /^(show\s+me\s+)?\w+\s+(stock|crypto)\??$/i
        ],
        route: 'QUICK_AZURE',
        confidence: 0.8
      },
      
      // Research queries - need real-time data
      research: {
        patterns: [
          /news|earnings|report|forecast|outlook|trend/i,
          /what.*happen|why.*up|why.*down/i,
          /analysis|research|fundamental|technical/i
        ],
        route: 'PERPLEXITY_SEARCH',
        confidence: 0.85
      },
      
      // Complex analysis - full orchestration
      complex: {
        patterns: [
          /compare|vs|versus|better|best|worst/i,
          /portfolio|diversification|allocation|rebalance/i,
          /should\s+i|recommend|advice|strategy/i,
          /correlation|relationship|impact/i
        ],
        route: 'FULL_ORCHESTRATION',
        confidence: 0.9
      },
      
      // Batch-able queries - similar to recent
      batchable: {
        patterns: [
          /^(price|info|update)\s+for\s+multiple/i,
          /^compare\s+\w+\s+and\s+\w+/i
        ],
        route: 'BATCH_QUEUE',
        confidence: 0.7
      }
    };
    
    // Cost and performance tracking
    this.stats = {
      totalQueries: 0,
      routeDistribution: {},
      costSavings: 0,
      avgLatencyReduction: 0,
      cacheHitRate: 0
    };
    
    // Initialize route distribution tracking
    Object.keys(this.ROUTES).forEach(route => {
      this.stats.routeDistribution[route] = 0;
    });
    
    // Recent queries for pattern analysis
    this.recentQueries = [];
    this.RECENT_QUERY_LIMIT = 50;
    
    logger.info('[IntelligentQueryRouter] Initialized with 5 routing strategies');
  }
  
  // Main routing decision method
  async routeQuery(query, context = {}) {
    const startTime = Date.now();
    const requestId = `route_${Date.now()}_${Math.random().toString(36).substr(2, 6)}`;
    
    try {
      logger.info(`[QueryRouter] Analyzing query: "${query}" | RequestID: ${requestId}`);
      
      // Step 1: Quick pattern matching
      const patternResult = this.analyzePatterns(query);
      
      // Step 2: Check for cache potential
      const cacheResult = this.analyzeCachePotential(query, context);
      
      // Step 3: Analyze recent queries for batching
      const batchResult = this.analyzeBatchPotential(query, context);
      
      // Step 4: If unclear, use LLM for intelligent analysis
      let routingDecision;
      if (patternResult.confidence > 0.8) {
        routingDecision = {
          route: patternResult.route,
          reasoning: `Pattern match: ${patternResult.matchedPattern}`,
          confidence: patternResult.confidence,
          method: 'pattern'
        };
      } else if (cacheResult.canUseCache) {
        routingDecision = {
          route: 'CACHE_HIT',
          reasoning: cacheResult.reasoning,
          confidence: 0.95,
          method: 'cache'
        };
      } else if (batchResult.canBatch) {
        routingDecision = {
          route: 'BATCH_QUEUE',
          reasoning: batchResult.reasoning,
          confidence: 0.8,
          method: 'batch'
        };
      } else {
        // Use LLM for complex routing decision
        routingDecision = await this.llmRouteAnalysis(query, context, requestId);
      }
      
      // Step 5: Add cost and timing estimates
      const routeInfo = this.ROUTES[routingDecision.route];
      routingDecision.estimatedCost = routeInfo.cost;
      routingDecision.estimatedLatency = routeInfo.avgLatency;
      routingDecision.description = routeInfo.description;
      
      // Step 6: Update statistics
      this.updateStats(routingDecision);
      
      // Step 7: Store query for future pattern analysis
      this.storeRecentQuery(query, routingDecision.route, context);
      
      const routingTime = Date.now() - startTime;
      logger.info(`[QueryRouter] Route decision (${routingTime}ms): ${routingDecision.route} | Confidence: ${routingDecision.confidence} | Cost: $${routingDecision.estimatedCost}`);
      
      return routingDecision;
      
    } catch (error) {
      logger.error(`[QueryRouter] Routing error for "${query}":`, error);
      
      // Fallback to full orchestration on error
      return {
        route: 'FULL_ORCHESTRATION',
        reasoning: 'Fallback due to routing error',
        confidence: 0.5,
        estimatedCost: this.ROUTES.FULL_ORCHESTRATION.cost,
        estimatedLatency: this.ROUTES.FULL_ORCHESTRATION.avgLatency,
        error: error.message,
        method: 'fallback'
      };
    }
  }
  
  // Pattern-based quick routing
  analyzePatterns(query) {
    const normalizedQuery = query.toLowerCase().trim();
    
    for (const [patternType, config] of Object.entries(this.QUERY_PATTERNS)) {
      for (const pattern of config.patterns) {
        if (pattern.test(normalizedQuery)) {
          logger.debug(`[QueryRouter] Pattern match: ${patternType} -> ${config.route}`);
          return {
            route: config.route,
            confidence: config.confidence,
            matchedPattern: patternType,
            pattern: pattern.source
          };
        }
      }
    }
    
    return { route: null, confidence: 0 };
  }
  
  // Cache potential analysis
  analyzeCachePotential(query, context) {
    const normalizedQuery = query.toLowerCase().trim();
    const sessionId = context.sessionId;
    
    // Check for recent identical queries
    const recentIdentical = this.recentQueries.find(q => 
      q.normalizedQuery === normalizedQuery && 
      q.sessionId === sessionId &&
      Date.now() - q.timestamp < 30000 // 30 seconds
    );
    
    if (recentIdentical) {
      return {
        canUseCache: true,
        reasoning: 'Identical query within 30 seconds',
        cacheType: 'recent_identical'
      };
    }
    
    // Check for similar queries (semantic similarity would be better but expensive)
    const recentSimilar = this.recentQueries.find(q => 
      this.calculateStringSimilarity(normalizedQuery, q.normalizedQuery) > 0.85 &&
      Date.now() - q.timestamp < 300000 // 5 minutes
    );
    
    if (recentSimilar) {
      return {
        canUseCache: true,
        reasoning: 'Highly similar query within 5 minutes',
        cacheType: 'recent_similar'
      };
    }
    
    return { canUseCache: false };
  }
  
  // Batch potential analysis
  analyzeBatchPotential(query, context) {
    // Check for queries that could be batched together
    const pendingQueries = this.recentQueries.filter(q => 
      q.route === 'BATCH_QUEUE' &&
      Date.now() - q.timestamp < 200 // 200ms batching window
    );
    
    if (pendingQueries.length > 0) {
      return {
        canBatch: true,
        reasoning: `Can batch with ${pendingQueries.length} pending queries`,
        batchSize: pendingQueries.length + 1
      };
    }
    
    // Check if this query type typically benefits from batching
    const queryType = this.detectQueryType(query);
    if (['price_check', 'basic_info'].includes(queryType)) {
      return {
        canBatch: true,
        reasoning: 'Query type benefits from batching',
        queryType
      };
    }
    
    return { canBatch: false };
  }
  
  // LLM-based routing analysis for complex cases
  async llmRouteAnalysis(query, context, requestId) {
    const prompt = this.generateRoutingPrompt(query, context);
    
    try {
      const messages = [
        {
          role: 'system',
          content: 'You are an intelligent query router for a financial AI system. Your job is to analyze queries and determine the optimal routing strategy for cost and performance.'
        },
        {
          role: 'user',
          content: prompt
        }
      ];
      
      const response = await this.azureOpenAI.makeRequest(
        messages,
        0.1, // Low temperature for consistent routing
        150  // Limited tokens for quick decision
      );
      
      const decision = this.parseRoutingDecision(response);
      decision.method = 'llm';
      decision.requestId = requestId;
      
      return decision;
      
    } catch (error) {
      logger.error('[QueryRouter] LLM routing analysis failed:', error);
      
      // Intelligent fallback based on query characteristics
      return this.intelligentFallback(query, context);
    }
  }
  
  // Generate LLM routing prompt
  generateRoutingPrompt(query, context) {
    const recentQueries = this.recentQueries.slice(-5).map(q => q.query);
    const systemLoad = this.calculateSystemLoad();
    
    return `Analyze this financial query for optimal routing:

QUERY: "${query}"

CONTEXT:
- Session ID: ${context.sessionId || 'new'}
- Recent queries: [${recentQueries.join('", "')}]
- System load: ${systemLoad.currentApiCosts}/hour, ${systemLoad.queueLength} queued
- User tier: ${context.userTier || 'standard'}

ROUTING OPTIONS:
1. CACHE_HIT - Use cached response (cost: $0, latency: 0.01s)
2. QUICK_AZURE - Simple lookup via Azure only (cost: $0.001, latency: 1s)
3. PERPLEXITY_SEARCH - Real-time data via Perplexity (cost: $0.005, latency: 2.5s)
4. FULL_ORCHESTRATION - Complex analysis pipeline (cost: $0.015, latency: 6s)
5. BATCH_QUEUE - Combine with similar pending queries (cost: $0.008, latency: 3s)

DECISION FACTORS:
- Query complexity and required accuracy
- Real-time data requirements
- Cost optimization vs response quality
- User expectations and urgency
- System load and resource availability

Respond with JSON only:
{
  "route": "ROUTE_NAME",
  "reasoning": "why this route is optimal",
  "confidence": 0.85,
  "urgency": "low|medium|high",
  "dataFreshness": "not_critical|important|critical"
}`;
  }
  
  // Parse LLM routing decision
  parseRoutingDecision(response) {
    try {
      const jsonMatch = response.match(/\{[\s\S]*\}/);
      if (!jsonMatch) {
        throw new Error('No JSON found in LLM response');
      }
      
      const parsed = JSON.parse(jsonMatch[0]);
      
      // Validate the decision
      if (!this.ROUTES[parsed.route]) {
        throw new Error(`Invalid route: ${parsed.route}`);
      }
      
      return {
        route: parsed.route,
        reasoning: parsed.reasoning || 'LLM analysis',
        confidence: parsed.confidence || 0.7,
        urgency: parsed.urgency || 'medium',
        dataFreshness: parsed.dataFreshness || 'important'
      };
      
    } catch (error) {
      logger.error('[QueryRouter] Failed to parse LLM routing decision:', error);
      throw error;
    }
  }
  
  // Intelligent fallback routing
  intelligentFallback(query, context) {
    const queryLen = query.length;
    const wordCount = query.split(/\s+/).length;
    
    // Simple heuristics for fallback
    if (queryLen < 20 && wordCount < 4) {
      return {
        route: 'QUICK_AZURE',
        reasoning: 'Short, simple query - fallback heuristic',
        confidence: 0.6,
        method: 'heuristic'
      };
    } else if (query.includes('?') && wordCount < 8) {
      return {
        route: 'PERPLEXITY_SEARCH',
        reasoning: 'Question requiring data - fallback heuristic',
        confidence: 0.6,
        method: 'heuristic'
      };
    } else {
      return {
        route: 'FULL_ORCHESTRATION',
        reasoning: 'Complex query requiring full analysis - safe fallback',
        confidence: 0.5,
        method: 'heuristic'
      };
    }
  }
  
  // Utility functions
  calculateStringSimilarity(str1, str2) {
    const longer = str1.length > str2.length ? str1 : str2;
    const shorter = str1.length > str2.length ? str2 : str1;
    
    if (longer.length === 0) return 1.0;
    
    const editDistance = this.levenshteinDistance(longer, shorter);
    return (longer.length - editDistance) / longer.length;
  }
  
  levenshteinDistance(str1, str2) {
    const matrix = [];
    
    for (let i = 0; i <= str2.length; i++) {
      matrix[i] = [i];
    }
    
    for (let j = 0; j <= str1.length; j++) {
      matrix[0][j] = j;
    }
    
    for (let i = 1; i <= str2.length; i++) {
      for (let j = 1; j <= str1.length; j++) {
        if (str2.charAt(i - 1) === str1.charAt(j - 1)) {
          matrix[i][j] = matrix[i - 1][j - 1];
        } else {
          matrix[i][j] = Math.min(
            matrix[i - 1][j - 1] + 1,
            matrix[i][j - 1] + 1,
            matrix[i - 1][j] + 1
          );
        }
      }
    }
    
    return matrix[str2.length][str1.length];
  }
  
  detectQueryType(query) {
    const normalized = query.toLowerCase();
    
    if (/price|cost|worth|\$/.test(normalized)) return 'price_check';
    if (/info|about|what.*is/.test(normalized)) return 'basic_info';
    if (/news|earnings|report/.test(normalized)) return 'research';
    if (/compare|vs|better/.test(normalized)) return 'comparison';
    if (/should|recommend|advice/.test(normalized)) return 'advice';
    
    return 'general';
  }
  
  calculateSystemLoad() {
    return {
      currentApiCosts: (this.stats.totalQueries * 0.005).toFixed(2),
      queueLength: Math.floor(Math.random() * 10), // Placeholder
      memoryUsage: process.memoryUsage().heapUsed / 1024 / 1024
    };
  }
  
  // Store query for pattern learning
  storeRecentQuery(query, route, context) {
    const queryRecord = {
      query,
      normalizedQuery: query.toLowerCase().trim(),
      route,
      sessionId: context.sessionId,
      timestamp: Date.now(),
      context: {
        userTier: context.userTier,
        symbols: context.symbols
      }
    };
    
    this.recentQueries.push(queryRecord);
    
    // Keep only recent queries
    if (this.recentQueries.length > this.RECENT_QUERY_LIMIT) {
      this.recentQueries = this.recentQueries.slice(-this.RECENT_QUERY_LIMIT);
    }
  }
  
  // Update performance statistics
  updateStats(decision) {
    this.stats.totalQueries++;
    this.stats.routeDistribution[decision.route]++;
    
    // Calculate cost savings vs always using full orchestration
    const fullCost = this.ROUTES.FULL_ORCHESTRATION.cost;
    const actualCost = decision.estimatedCost;
    this.stats.costSavings += (fullCost - actualCost);
    
    // Calculate latency improvements
    const fullLatency = this.ROUTES.FULL_ORCHESTRATION.avgLatency;
    const actualLatency = decision.estimatedLatency;
    const latencyReduction = fullLatency - actualLatency;
    
    const currentAvg = this.stats.avgLatencyReduction;
    const count = this.stats.totalQueries;
    this.stats.avgLatencyReduction = ((currentAvg * (count - 1)) + latencyReduction) / count;
    
    // Calculate cache hit rate
    const cacheHits = this.stats.routeDistribution.CACHE_HIT || 0;
    this.stats.cacheHitRate = (cacheHits / this.stats.totalQueries * 100).toFixed(2);
  }
  
  // Get performance statistics
  getStats() {
    const totalCost = this.stats.totalQueries * this.ROUTES.FULL_ORCHESTRATION.cost;
    const actualCost = Object.entries(this.stats.routeDistribution).reduce((sum, [route, count]) => {
      return sum + (count * this.ROUTES[route].cost);
    }, 0);
    
    const costSavingsPercent = totalCost > 0 ? ((totalCost - actualCost) / totalCost * 100).toFixed(2) : 0;
    
    return {
      totalQueries: this.stats.totalQueries,
      costSavings: {
        totalSaved: this.stats.costSavings.toFixed(4),
        percentSaved: costSavingsPercent + '%',
        actualCost: actualCost.toFixed(4),
        wouldHaveCost: totalCost.toFixed(4)
      },
      performance: {
        avgLatencyReduction: this.stats.avgLatencyReduction.toFixed(2) + 's',
        cacheHitRate: this.stats.cacheHitRate + '%'
      },
      routeDistribution: this.stats.routeDistribution,
      routePercentages: Object.entries(this.stats.routeDistribution).reduce((pct, [route, count]) => {
        pct[route] = this.stats.totalQueries > 0 ? (count / this.stats.totalQueries * 100).toFixed(1) + '%' : '0%';
        return pct;
      }, {})
    };
  }
  
  // Reset statistics (for testing)
  resetStats() {
    this.stats = {
      totalQueries: 0,
      routeDistribution: {},
      costSavings: 0,
      avgLatencyReduction: 0,
      cacheHitRate: 0
    };
    
    Object.keys(this.ROUTES).forEach(route => {
      this.stats.routeDistribution[route] = 0;
    });
    
    this.recentQueries = [];
    logger.info('[IntelligentQueryRouter] Statistics reset');
  }
}

// Export singleton instance
module.exports = new IntelligentQueryRouter();