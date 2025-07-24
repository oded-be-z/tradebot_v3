/**
 * SmartInsights - Intelligent context-aware insights that make FinanceBot feel truly intelligent
 * Combines conversation context with real-time data to generate personalized insights
 */

class SmartInsights {
  constructor() {
    this.logger = console;
    this.insights = new Map(); // Cache insights to avoid repetition
    
    this.logger.info('[SmartInsights] Initialized - Ready to generate intelligent insights');
  }

  /**
   * Generate time-based insights showing price changes since last query
   */
  generateTimeBasedInsight(symbol, lastAskedTime, currentPrice, lastPrice) {
    try {
      if (!lastAskedTime) {
        return null;
      }

      const timeDiff = Date.now() - lastAskedTime;
      const hoursSince = timeDiff / 3600000;
      const minutesSince = timeDiff / 60000;
      const secondsSince = timeDiff / 1000;
      
      // Handle price data availability
      let priceInfo = '';
      if (currentPrice && lastPrice && currentPrice !== lastPrice) {
        const priceChange = ((currentPrice - lastPrice) / lastPrice * 100);
        const changeText = Math.abs(priceChange).toFixed(2);
        const direction = priceChange > 0 ? 'up' : 'down';
        const arrow = priceChange > 0 ? '📈' : '📉';
        priceInfo = ` (${direction} ${changeText}% ${arrow})`;
      }
      
      // Generate time-aware insights based on time gap
      if (secondsSince < 30) {
        const secs = Math.round(secondsSince);
        return `⚡ Just ${secs} second${secs !== 1 ? 's' : ''} since your last **${symbol}** check${priceInfo}`;
      } else if (minutesSince < 2) {
        const secs = Math.round(secondsSince);
        return `⏱️ Update: **${symbol}** checked ${secs} seconds ago${priceInfo}`;
      } else if (minutesSince < 5) {
        const mins = Math.round(minutesSince);
        return `⏰ **${symbol}** update: ${mins} minute${mins !== 1 ? 's' : ''} since last check${priceInfo}`;
      } else if (hoursSince < 1) {
        const mins = Math.round(minutesSince);
        return `📊 Quick update: **${symbol}** - ${mins} minutes since we last looked${priceInfo}`;
      } else if (hoursSince < 24) {
        const hours = Math.round(hoursSince);
        return `📈 **${symbol}** check-in: ${hours} hour${hours !== 1 ? 's' : ''} since last query${priceInfo}`;
      } else if (hoursSince < 168) { // 1 week
        const days = Math.round(hoursSince / 24);
        return `📅 **${symbol}** update: ${days} day${days !== 1 ? 's' : ''} since you last asked${priceInfo}`;
      }
      
      return null;
    } catch (error) {
      this.logger.error('[SmartInsights] Error generating time-based insight:', error);
      return null;
    }
  }

  /**
   * Generate expertise-level specific insights
   */
  generateExpertiseBasedInsights(userLevel, symbol, data) {
    try {
      if (!userLevel || !symbol || !data) {
        return null;
      }

      const price = data.price || data.currentPrice || 0;
      const changePercent = data.changePercent || data.change || 0;

      switch (userLevel) {
        case 'expert':
          // Advanced technical indicators for expert users
          const insights = [];
          
          if (data.rsi) {
            const rsiStatus = data.rsi > 70 ? 'overbought 🔴' : data.rsi < 30 ? 'oversold 🟢' : 'neutral 🟡';
            insights.push(`RSI: ${data.rsi} (${rsiStatus})`);
          }
          
          if (data.macd !== undefined) {
            const macdStatus = data.macd > 0 ? 'bullish 🐂' : 'bearish 🐻';
            insights.push(`MACD: ${macdStatus} signal`);
          }
          
          if (data.volumeRatio) {
            const volumeStatus = data.volumeRatio > 1.5 ? 'elevated 🔥' : data.volumeRatio < 0.5 ? 'light 💤' : 'normal 📊';
            insights.push(`Volume: ${data.volumeRatio.toFixed(1)}x avg (${volumeStatus})`);
          }
          
          if (insights.length > 0) {
            return `🔍 **${symbol}** Technical Analysis: ${insights.join(' • ')}`;
          }
          break;

        case 'intermediate':
          // Balanced insights for intermediate users
          const movement = Math.abs(changePercent);
          if (movement > 3) {
            const direction = changePercent > 0 ? 'surge 🚀' : 'drop 📉';
            return `⚡ **${symbol}** showing significant ${direction} today (${Math.abs(changePercent).toFixed(1)}%) - this is ${movement > 5 ? 'unusually high' : 'notable'} volatility`;
          } else if (data.volume && data.avgVolume) {
            const volumeRatio = data.volume / data.avgVolume;
            if (volumeRatio > 2) {
              return `🔥 **${symbol}** trading volume is ${volumeRatio.toFixed(1)}x higher than average - increased investor interest`;
            }
          }
          break;

        case 'beginner':
          // Educational insights for beginner users
          const absChange = Math.abs(changePercent);
          if (absChange > 2) {
            const significance = absChange > 5 ? 'very significant' : 'significant';
            const direction = changePercent > 0 ? 'gaining value 📈' : 'losing value 📉';
            return `💡 **${symbol}** is ${direction} today (${absChange.toFixed(1)}%). This is ${significance} movement for this stock`;
          } else {
            return `💡 **${symbol}** is showing stable trading today (${absChange.toFixed(1)}% change) - this is normal daily fluctuation`;
          }
          break;
      }
      
      return null;
    } catch (error) {
      this.logger.error('[SmartInsights] Error generating expertise-based insight:', error);
      return null;
    }
  }

  /**
   * Generate pattern-based insights from user behavior
   */
  generatePatternBasedInsights(context, symbol) {
    try {
      if (!context || !symbol) {
        return null;
      }

      const symbolData = context.recentSymbols?.get(symbol);
      const queryHistory = context.queryHistory || [];
      
      // Frequent symbol checking pattern
      if (symbolData?.frequency >= 3) {
        const timeSpan = this.getTimeSpanText(symbolData.firstSeen);
        return `🔍 You've checked **${symbol}** ${symbolData.frequency} times ${timeSpan} - Want me to set up price alerts so you don't have to keep checking?`;
      }
      
      // Comparison pattern detection
      const recentComparisons = queryHistory
        .filter(q => q.intent === 'comparison_query' && q.symbols?.includes(symbol))
        .slice(-3);
        
      if (recentComparisons.length >= 2) {
        const comparedSymbols = [...new Set(
          recentComparisons
            .flatMap(q => q.symbols || [])
            .filter(s => s !== symbol)
        )];
        
        if (comparedSymbols.length > 0) {
          return `📊 I notice you're comparing **${symbol}** with ${comparedSymbols.map(s => `**${s}**`).join(', ')} - Want me to create a comprehensive comparison dashboard?`;
        }
      }
      
      // Portfolio interest pattern
      const portfolioQueries = queryHistory.filter(q => 
        q.intent === 'portfolio_analysis' || q.query?.toLowerCase().includes('portfolio')
      ).length;
      
      if (portfolioQueries >= 2 && symbolData) {
        return `💼 Since you're interested in both **${symbol}** and portfolio analysis - Want me to show how ${symbol} would fit in your current holdings?`;
      }
      
      return null;
    } catch (error) {
      this.logger.error('[SmartInsights] Error generating pattern-based insight:', error);
      return null;
    }
  }

  /**
   * Generate market context insights
   */
  generateMarketContextInsights(symbol, marketData, context) {
    try {
      if (!marketData) return null;

      const insights = [];
      
      // Market sentiment insight
      if (marketData.marketSentiment) {
        const sentiment = marketData.marketSentiment;
        if (sentiment === 'bullish') {
          insights.push(`🐂 Market sentiment is bullish - **${symbol}** is riding the positive wave`);
        } else if (sentiment === 'bearish') {
          insights.push(`🐻 Current market headwinds may be affecting **${symbol}**'s performance`);
        }
      }
      
      // Sector performance insight
      if (marketData.sectorPerformance && marketData.sector) {
        const sectorChange = marketData.sectorPerformance;
        const direction = sectorChange > 0 ? 'outperforming 🚀' : 'underperforming 📉';
        insights.push(`📈 ${marketData.sector} sector is ${direction} the market (${sectorChange > 0 ? '+' : ''}${sectorChange.toFixed(1)}%)`);
      }
      
      // Peer comparison insight
      if (marketData.peerComparison) {
        const peerStatus = marketData.peerComparison > 0 ? 'outperforming' : 'lagging behind';
        insights.push(`🏆 **${symbol}** is ${peerStatus} its peers by ${Math.abs(marketData.peerComparison).toFixed(1)}%`);
      }
      
      return insights.length > 0 ? insights[0] : null; // Return first insight
    } catch (error) {
      this.logger.error('[SmartInsights] Error generating market context insight:', error);
      return null;
    }
  }

  /**
   * Generate comprehensive smart insight combining all sources
   */
  generateSmartInsight(sessionId, symbol, data, context, userLevel = 'intermediate') {
    try {
      this.logger.info(`[SmartInsights] Generating insight for ${symbol}, user level: ${userLevel}`);
      
      const insights = [];
      
      // Get symbol-specific context data
      const symbolContext = context.recentSymbols?.get(symbol);
      
      // 1. Time-based insights (highest priority)
      if (symbolContext?.lastPrice && symbolContext?.lastAskedTime && data?.price) {
        const timeInsight = this.generateTimeBasedInsight(
          symbol, 
          symbolContext.lastAskedTime, 
          data.price, 
          symbolContext.lastPrice
        );
        if (timeInsight) {
          insights.push(timeInsight);
        }
      }
      
      // 2. Expertise-based insights
      const expertiseInsight = this.generateExpertiseBasedInsights(userLevel, symbol, data);
      if (expertiseInsight) {
        insights.push(expertiseInsight);
      }
      
      // 3. Pattern-based insights
      const patternInsight = this.generatePatternBasedInsights(context, symbol);
      if (patternInsight) {
        insights.push(patternInsight);
      }
      
      // 4. Market context insights
      const marketInsight = this.generateMarketContextInsights(symbol, data, context);
      if (marketInsight) {
        insights.push(marketInsight);
      }
      
      // Return the most relevant insight (prioritize time-based, then expertise, then patterns)
      const selectedInsight = insights[0]; // Take first (highest priority) insight
      
      if (selectedInsight) {
        this.logger.info(`[SmartInsights] Generated insight: ${selectedInsight.substring(0, 50)}...`);
        return {
          insight: selectedInsight,
          type: this.categorizeInsight(selectedInsight),
          confidence: this.calculateConfidence(insights.length, symbolContext)
        };
      }
      
      return null;
    } catch (error) {
      this.logger.error('[SmartInsights] Error generating smart insight:', error);
      return null;
    }
  }

  /**
   * Helper method to calculate confidence score
   */
  calculateConfidence(insightCount, symbolContext) {
    let confidence = 0.5; // Base confidence
    
    if (insightCount > 1) confidence += 0.2;
    if (symbolContext?.frequency > 2) confidence += 0.2;
    if (symbolContext?.lastAskedTime) confidence += 0.1;
    
    return Math.min(confidence, 0.95); // Cap at 95%
  }

  /**
   * Helper method to categorize insights
   */
  categorizeInsight(insight) {
    if (insight.includes('Update:') || insight.includes('Since')) return 'temporal';
    if (insight.includes('RSI') || insight.includes('MACD')) return 'technical';
    if (insight.includes('checked') || insight.includes('comparing')) return 'behavioral';
    if (insight.includes('Market') || insight.includes('sector')) return 'contextual';
    return 'general';
  }

  /**
   * Helper method to format time spans
   */
  getTimeSpanText(timestamp) {
    const hoursSince = (Date.now() - timestamp) / 3600000;
    
    if (hoursSince < 1) return 'in the past hour';
    if (hoursSince < 24) return 'today';
    if (hoursSince < 48) return 'since yesterday';
    if (hoursSince < 168) return 'this week';
    return 'recently';
  }

  /**
   * Clear cached insights (useful for testing)
   */
  clearCache() {
    this.insights.clear();
    this.logger.info('[SmartInsights] Cache cleared');
  }
}

module.exports = SmartInsights;