// services/costOptimizer.js
// Real-time API cost tracking and optimization engine

const logger = require('../utils/logger');

class CostOptimizer {
  constructor() {
    // Cost configuration (based on actual API pricing)
    this.COST_CONFIG = {
      azure: {
        gpt4o: {
          input: 0.005,  // $0.005 per 1K input tokens
          output: 0.015, // $0.015 per 1K output tokens
          typical_tokens: {
            understanding: { input: 200, output: 150 },
            synthesis: { input: 800, output: 400 }
          }
        }
      },
      perplexity: {
        sonar: {
          cost_per_request: 0.005, // $0.005 per request
          typical_tokens: 300
        }
      },
      // Budget limits per user tier
      budgets: {
        free: {
          daily: 1.00,     // $1 per day
          hourly: 0.10,    // $0.10 per hour
          perRequest: 0.02 // $0.02 per request
        },
        premium: {
          daily: 10.00,
          hourly: 1.00,
          perRequest: 0.05
        },
        enterprise: {
          daily: 100.00,
          hourly: 10.00,
          perRequest: 0.20
        }
      }
    };
    
    // Real-time cost tracking
    this.costTracking = {
      current: {
        hourly: 0,
        daily: 0,
        requests: 0,
        lastReset: {
          hour: Date.now(),
          day: Date.now()
        }
      },
      breakdown: {
        azure: { hourly: 0, daily: 0, requests: 0 },
        perplexity: { hourly: 0, daily: 0, requests: 0 },
        cache: { hourly: 0, daily: 0, requests: 0 } // Cache saves
      },
      predictions: {
        hourlyProjection: 0,
        dailyProjection: 0,
        weeklyProjection: 0
      }
    };
    
    // User cost tracking (sessionId -> costs)
    this.userCosts = new Map();
    
    // Cost optimization decisions
    this.optimizationStats = {
      routeOptimizations: 0,
      cacheUtilization: 0,
      parallelSavings: 0,
      totalSavings: 0
    };
    
    // Auto-reset timers
    this.setupAutoReset();
    
    logger.info('[CostOptimizer] Initialized with budget enforcement and real-time tracking');
  }
  
  // Pre-request cost estimation and budget checking
  async checkBudgetAndEstimate(requestType, userTier = 'free', sessionId = null) {
    try {
      // Reset counters if needed
      this.resetCountersIfNeeded();
      
      // Estimate cost for this request
      const estimate = this.estimateRequestCost(requestType);
      
      // Check global budget
      const globalBudgetCheck = this.checkGlobalBudget(estimate);
      if (!globalBudgetCheck.allowed) {
        return {
          allowed: false,
          reason: 'global_budget_exceeded',
          details: globalBudgetCheck,
          estimate
        };
      }
      
      // Check user-specific budget
      const userBudgetCheck = this.checkUserBudget(sessionId, userTier, estimate);
      if (!userBudgetCheck.allowed) {
        return {
          allowed: false,
          reason: 'user_budget_exceeded',
          details: userBudgetCheck,
          estimate
        };
      }
      
      // Pre-approve the cost
      await this.preApproveCost(estimate, sessionId, userTier);
      
      return {
        allowed: true,
        estimate,
        budgetStatus: {
          global: globalBudgetCheck,
          user: userBudgetCheck
        }
      };
      
    } catch (error) {
      logger.error('[CostOptimizer] Error in budget check:', error);
      return {
        allowed: true, // Fail open for availability
        error: error.message,
        estimate: { total: 0.001 } // Minimal fallback cost
      };
    }
  }
  
  // Record actual costs after request completion
  async recordActualCost(requestType, routeUsed, tokens = {}, sessionId = null, userTier = 'free') {
    try {
      const actualCost = this.calculateActualCost(requestType, routeUsed, tokens);
      
      // Update global tracking
      this.costTracking.current.hourly += actualCost.total;
      this.costTracking.current.daily += actualCost.total;
      this.costTracking.current.requests++;
      
      // Update service breakdown
      if (actualCost.azure > 0) {
        this.costTracking.breakdown.azure.hourly += actualCost.azure;
        this.costTracking.breakdown.azure.daily += actualCost.azure;
        this.costTracking.breakdown.azure.requests++;
      }
      
      if (actualCost.perplexity > 0) {
        this.costTracking.breakdown.perplexity.hourly += actualCost.perplexity;
        this.costTracking.breakdown.perplexity.daily += actualCost.perplexity;
        this.costTracking.breakdown.perplexity.requests++;
      }
      
      // Record cache savings if applicable
      if (routeUsed === 'CACHE_HIT') {
        const savedCost = this.estimateRequestCost('FULL_ORCHESTRATION').total;
        this.costTracking.breakdown.cache.hourly += savedCost;
        this.costTracking.breakdown.cache.daily += savedCost;
        this.costTracking.breakdown.cache.requests++;
        this.optimizationStats.cacheUtilization++;
      }
      
      // Update user tracking
      this.updateUserCosts(sessionId, actualCost);
      
      // Update projections
      this.updateProjections();
      
      logger.debug(`[CostOptimizer] Recorded cost: $${actualCost.total.toFixed(4)} for ${requestType} via ${routeUsed}`);
      
      return actualCost;
      
    } catch (error) {
      logger.error('[CostOptimizer] Error recording cost:', error);
      return { total: 0, error: error.message };
    }
  }
  
  // Estimate cost for different request types
  estimateRequestCost(requestType) {
    const estimates = {
      CACHE_HIT: { azure: 0, perplexity: 0, total: 0 },
      QUICK_AZURE: { 
        azure: this.calculateAzureCost(200, 150), // Typical quick query
        perplexity: 0,
        total: 0
      },
      PERPLEXITY_SEARCH: {
        azure: this.calculateAzureCost(200, 150), // Understanding only
        perplexity: this.COST_CONFIG.perplexity.sonar.cost_per_request,
        total: 0
      },
      FULL_ORCHESTRATION: {
        azure: this.calculateAzureCost(1000, 550), // Understanding + synthesis
        perplexity: this.COST_CONFIG.perplexity.sonar.cost_per_request,
        total: 0
      },
      BATCH_QUEUE: {
        azure: this.calculateAzureCost(600, 300), // Averaged
        perplexity: this.COST_CONFIG.perplexity.sonar.cost_per_request * 0.7, // Batch discount
        total: 0
      }
    };
    
    // Calculate totals
    Object.values(estimates).forEach(estimate => {
      if (estimate.total === 0) { // Only calculate if not already set
        estimate.total = estimate.azure + estimate.perplexity;
      }
    });
    
    return estimates[requestType] || estimates.FULL_ORCHESTRATION;
  }
  
  // Calculate actual Azure OpenAI costs based on token usage
  calculateAzureCost(inputTokens, outputTokens) {
    const config = this.COST_CONFIG.azure.gpt4o;
    const inputCost = (inputTokens / 1000) * config.input;
    const outputCost = (outputTokens / 1000) * config.output;
    return inputCost + outputCost;
  }
  
  // Calculate actual costs based on real usage
  calculateActualCost(requestType, routeUsed, tokens) {
    const cost = { azure: 0, perplexity: 0, total: 0 };
    
    // Azure costs based on actual tokens
    if (tokens.azure) {
      cost.azure = this.calculateAzureCost(
        tokens.azure.input || 0,
        tokens.azure.output || 0
      );
    } else {
      // Use estimates if actual tokens not provided
      const estimate = this.estimateRequestCost(routeUsed);
      cost.azure = estimate.azure;
    }
    
    // Perplexity costs
    if (routeUsed === 'PERPLEXITY_SEARCH' || routeUsed === 'FULL_ORCHESTRATION') {
      cost.perplexity = this.COST_CONFIG.perplexity.sonar.cost_per_request;
    } else if (routeUsed === 'BATCH_QUEUE') {
      cost.perplexity = this.COST_CONFIG.perplexity.sonar.cost_per_request * 0.7;
    }
    
    cost.total = cost.azure + cost.perplexity;
    
    return cost;
  }
  
  // Check global budget limits
  checkGlobalBudget(estimate) {
    const current = this.costTracking.current;
    const projectedHourly = current.hourly + estimate.total;
    const projectedDaily = current.daily + estimate.total;
    
    // Set reasonable global limits (can be configured)
    const globalLimits = {
      hourly: 50.00,  // $50/hour max
      daily: 500.00,  // $500/day max
      requests: 10000 // 10k requests/hour max
    };
    
    const issues = [];
    
    if (projectedHourly > globalLimits.hourly) {
      issues.push(`Hourly limit exceeded: $${projectedHourly.toFixed(2)} > $${globalLimits.hourly}`);
    }
    
    if (projectedDaily > globalLimits.daily) {
      issues.push(`Daily limit exceeded: $${projectedDaily.toFixed(2)} > $${globalLimits.daily}`);
    }
    
    if (current.requests >= globalLimits.requests) {
      issues.push(`Request limit exceeded: ${current.requests} >= ${globalLimits.requests}`);
    }
    
    return {
      allowed: issues.length === 0,
      issues,
      current: {
        hourly: current.hourly,
        daily: current.daily,
        requests: current.requests
      },
      projected: {
        hourly: projectedHourly,
        daily: projectedDaily
      },
      limits: globalLimits
    };
  }
  
  // Check user-specific budget limits
  checkUserBudget(sessionId, userTier, estimate) {
    if (!sessionId) return { allowed: true, reason: 'no_session_tracking' };
    
    const userCosts = this.getUserCosts(sessionId);
    const limits = this.COST_CONFIG.budgets[userTier] || this.COST_CONFIG.budgets.free;
    
    const projectedHourly = userCosts.hourly + estimate.total;
    const projectedDaily = userCosts.daily + estimate.total;
    
    const issues = [];
    
    if (projectedHourly > limits.hourly) {
      issues.push(`User hourly limit exceeded: $${projectedHourly.toFixed(4)} > $${limits.hourly}`);
    }
    
    if (projectedDaily > limits.daily) {
      issues.push(`User daily limit exceeded: $${projectedDaily.toFixed(2)} > $${limits.daily}`);
    }
    
    if (estimate.total > limits.perRequest) {
      issues.push(`Per-request limit exceeded: $${estimate.total.toFixed(4)} > $${limits.perRequest}`);
    }
    
    return {
      allowed: issues.length === 0,
      issues,
      userTier,
      current: userCosts,
      projected: {
        hourly: projectedHourly,
        daily: projectedDaily
      },
      limits
    };
  }
  
  // Pre-approve cost (reserve budget)
  async preApproveCost(estimate, sessionId, userTier) {
    // This could implement actual budget reservation
    // For now, just log the pre-approval
    logger.debug(`[CostOptimizer] Pre-approved $${estimate.total.toFixed(4)} for session ${sessionId}`);
  }
  
  // Get or create user cost tracking
  getUserCosts(sessionId) {
    if (!this.userCosts.has(sessionId)) {
      this.userCosts.set(sessionId, {
        hourly: 0,
        daily: 0,
        requests: 0,
        lastReset: {
          hour: Date.now(),
          day: Date.now()
        }
      });
    }
    
    const userCosts = this.userCosts.get(sessionId);
    
    // Reset user costs if needed
    const now = Date.now();
    const hourAge = now - userCosts.lastReset.hour;
    const dayAge = now - userCosts.lastReset.day;
    
    if (hourAge > 3600000) { // 1 hour
      userCosts.hourly = 0;
      userCosts.lastReset.hour = now;
    }
    
    if (dayAge > 86400000) { // 24 hours
      userCosts.daily = 0;
      userCosts.lastReset.day = now;
    }
    
    return userCosts;
  }
  
  // Update user cost tracking
  updateUserCosts(sessionId, actualCost) {
    if (!sessionId) return;
    
    const userCosts = this.getUserCosts(sessionId);
    userCosts.hourly += actualCost.total;
    userCosts.daily += actualCost.total;
    userCosts.requests++;
  }
  
  // Update cost projections
  updateProjections() {
    const current = this.costTracking.current;
    const now = Date.now();
    
    // Calculate hourly projection
    const hourAge = now - current.lastReset.hour;
    const hourProgress = Math.min(hourAge / 3600000, 1); // 0-1
    
    if (hourProgress > 0.1) { // Only project if we have meaningful data
      this.costTracking.predictions.hourlyProjection = current.hourly / hourProgress;
    }
    
    // Calculate daily projection
    const dayAge = now - current.lastReset.day;
    const dayProgress = Math.min(dayAge / 86400000, 1); // 0-1
    
    if (dayProgress > 0.1) {
      this.costTracking.predictions.dailyProjection = current.daily / dayProgress;
    }
    
    // Weekly projection (simple multiplication)
    this.costTracking.predictions.weeklyProjection = this.costTracking.predictions.dailyProjection * 7;
  }
  
  // Reset counters when time periods expire
  resetCountersIfNeeded() {
    const now = Date.now();
    const current = this.costTracking.current;
    
    // Reset hourly counter
    if (now - current.lastReset.hour > 3600000) { // 1 hour
      current.hourly = 0;
      current.lastReset.hour = now;
      
      // Reset breakdown hourly counters
      Object.values(this.costTracking.breakdown).forEach(service => {
        service.hourly = 0;
      });
    }
    
    // Reset daily counter
    if (now - current.lastReset.day > 86400000) { // 24 hours
      current.daily = 0;
      current.requests = 0;
      current.lastReset.day = now;
      
      // Reset breakdown daily counters
      Object.values(this.costTracking.breakdown).forEach(service => {
        service.daily = 0;
        service.requests = 0;
      });
      
      // Clean old user cost data
      this.cleanOldUserData();
    }
  }
  
  // Setup automatic reset timers
  setupAutoReset() {
    // Reset hourly counters every hour
    setInterval(() => {
      this.resetCountersIfNeeded();
    }, 300000); // Check every 5 minutes
    
    // Clean user data daily
    setInterval(() => {
      this.cleanOldUserData();
    }, 86400000); // 24 hours
  }
  
  // Clean old user cost data
  cleanOldUserData() {
    const now = Date.now();
    const maxAge = 86400000; // 24 hours
    
    for (const [sessionId, userCosts] of this.userCosts.entries()) {
      const age = now - userCosts.lastReset.day;
      if (age > maxAge) {
        this.userCosts.delete(sessionId);
      }
    }
    
    logger.debug(`[CostOptimizer] Cleaned old user data, ${this.userCosts.size} active sessions remaining`);
  }
  
  // Record optimization savings
  recordOptimization(type, amount) {
    switch (type) {
      case 'route':
        this.optimizationStats.routeOptimizations++;
        this.optimizationStats.totalSavings += amount;
        break;
      case 'cache':
        this.optimizationStats.cacheUtilization++;
        this.optimizationStats.totalSavings += amount;
        break;
      case 'parallel':
        this.optimizationStats.parallelSavings += amount;
        this.optimizationStats.totalSavings += amount;
        break;
    }
  }
  
  // Get comprehensive cost statistics
  getStats() {
    this.resetCountersIfNeeded();
    this.updateProjections();
    
    const current = this.costTracking.current;
    const breakdown = this.costTracking.breakdown;
    const predictions = this.costTracking.predictions;
    
    // Calculate savings
    const totalCacheSavings = breakdown.cache.daily;
    const estimatedWithoutOptimization = current.daily + totalCacheSavings;
    const savingsPercent = estimatedWithoutOptimization > 0 ? 
      ((totalCacheSavings / estimatedWithoutOptimization) * 100).toFixed(2) : 0;
    
    return {
      current: {
        hourly: current.hourly.toFixed(4),
        daily: current.daily.toFixed(2),
        requests: current.requests
      },
      predictions: {
        hourlyProjection: predictions.hourlyProjection.toFixed(2),
        dailyProjection: predictions.dailyProjection.toFixed(2),
        weeklyProjection: predictions.weeklyProjection.toFixed(2)
      },
      breakdown: {
        azure: {
          hourly: breakdown.azure.hourly.toFixed(4),
          daily: breakdown.azure.daily.toFixed(2),
          requests: breakdown.azure.requests
        },
        perplexity: {
          hourly: breakdown.perplexity.hourly.toFixed(4),
          daily: breakdown.perplexity.daily.toFixed(2),
          requests: breakdown.perplexity.requests
        },
        cacheSavings: {
          hourly: breakdown.cache.hourly.toFixed(4),
          daily: breakdown.cache.daily.toFixed(2),
          requests: breakdown.cache.requests
        }
      },
      optimization: {
        ...this.optimizationStats,
        savingsPercent: savingsPercent + '%',
        totalSavings: this.optimizationStats.totalSavings.toFixed(2)
      },
      users: {
        activeSessions: this.userCosts.size,
        averageDailyCostPerUser: this.userCosts.size > 0 ? 
          (current.daily / this.userCosts.size).toFixed(4) : '0.0000'
      }
    };
  }
  
  // Get cost breakdown for specific user
  getUserStats(sessionId) {
    const userCosts = this.getUserCosts(sessionId);
    const limits = this.COST_CONFIG.budgets.free; // Default to free tier
    
    return {
      costs: userCosts,
      limits,
      utilization: {
        hourly: ((userCosts.hourly / limits.hourly) * 100).toFixed(1) + '%',
        daily: ((userCosts.daily / limits.daily) * 100).toFixed(1) + '%'
      }
    };
  }
  
  // Emergency budget controls
  emergencyStop() {
    logger.error('[CostOptimizer] EMERGENCY STOP - All API calls blocked');
    this.emergencyMode = true;
  }
  
  isEmergencyMode() {
    return this.emergencyMode || false;
  }
  
  // Reset emergency mode
  resetEmergencyMode() {
    this.emergencyMode = false;
    logger.info('[CostOptimizer] Emergency mode reset');
  }
}

// Export singleton instance
module.exports = new CostOptimizer();