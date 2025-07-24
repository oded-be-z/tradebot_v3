/**
 * ResponseTemplates - Enhanced response formatting for FinanceBot Pro
 * Provides structured, emoji-rich templates for different query types
 */

class ResponseTemplates {
  
  /**
   * Price Analysis Response Template
   */
  static priceAnalysis(symbol, data) {
    const price = data.quote?.price || data.price || 'N/A';
    const change = data.quote?.changePercent || data.changePercent || 0;
    const changeEmoji = change > 0 ? '📈' : '📉';
    const volume = data.quote?.volume || data.volume;
    const support = data.technicals?.support || (price * 0.95).toFixed(2);
    const resistance = data.technicals?.resistance || (price * 1.05).toFixed(2);
    
    // Generate insight based on data
    const insight = this.generatePriceInsight(data, change);
    
    return {
      structure: `📊 **${symbol}** is trading at $${price} (${change > 0 ? '+' : ''}${change.toFixed(2)}% ${changeEmoji})

**Key Signals:**
• ${this.getVolumeInsight(volume, data.avgVolume)}
• Support at $${support}, Resistance at $${resistance}
• ${this.getTechnicalSignal(data)}

🎯 **Your Move**: ${insight}

Want me to set up price alerts or analyze the technicals?`,
      
      metadata: {
        type: 'price_analysis',
        actionable: true,
        chartRequired: true,
        followUpSuggestions: ['Set price alert', 'Technical analysis', 'Compare with peers']
      }
    };
  }

  /**
   * Portfolio Analysis Response Template
   */
  static portfolioAnalysis(portfolio, analysis) {
    if (!portfolio || portfolio.length === 0) {
      return {
        structure: `📈 **Portfolio Analysis**

No portfolio data available. Upload your holdings to get:
• Personalized risk assessment
• Specific rebalancing recommendations  
• Performance tracking with alerts

🎯 **Get Started**: Upload your portfolio CSV or enter holdings manually.

Ready to analyze your investments?`,
        metadata: { type: 'portfolio_prompt', actionable: true }
      };
    }

    const totalValue = portfolio.reduce((sum, h) => sum + (h.value || 0), 0);
    const holdings = portfolio.length;
    
    // Find best and worst performers
    const topGainer = portfolio.reduce((max, h) => (h.return || 0) > (max.return || 0) ? h : max, portfolio[0]);
    const topLoser = portfolio.reduce((min, h) => (h.return || 0) < (min.return || 0) ? h : min, portfolio[0]);
    
    // Calculate total return
    const totalReturn = analysis?.totalReturn || this.calculatePortfolioReturn(portfolio);
    const returnEmoji = totalReturn > 0 ? '📈' : '📉';
    
    // Generate risk alerts
    const risks = this.identifyPortfolioRisks(portfolio);
    
    // Generate specific actions
    const actions = this.generatePortfolioActions(portfolio, analysis);
    
    return {
      structure: `📈 **Portfolio Snapshot**: $${totalValue.toLocaleString()} (${totalReturn > 0 ? '+' : ''}${totalReturn.toFixed(1)}% ${returnEmoji})

**Performance Leaders:**
🟢 **Best**: **${topGainer.symbol}** ${(topGainer.return || 0) > 0 ? '+' : ''}${(topGainer.return || 0).toFixed(1)}%
🔴 **Concern**: **${topLoser.symbol}** ${(topLoser.return || 0).toFixed(1)}%

⚠️ **Risk Alerts**:
${risks.slice(0, 3).map(risk => `• ${risk.icon} ${risk.message}`).join('\n')}

🎯 **Smart Actions**:
${actions.slice(0, 3).map((action, i) => `${i + 1}. **${action.type}** ${action.details}`).join('\n')}

Which action should we execute first?`,
      
      metadata: {
        type: 'portfolio_analysis',
        interactive: true,
        visualizations: ['allocation_pie', 'performance_bar'],
        actions: actions
      }
    };
  }

  /**
   * Comparison Analysis Response Template
   */
  static comparison(symbols, data) {
    if (!symbols || symbols.length < 2) {
      return { structure: "Need at least 2 symbols for comparison.", metadata: { type: 'error' } };
    }

    const [symbol1, symbol2] = symbols;
    const data1 = data[symbol1] || {};
    const data2 = data[symbol2] || {};
    
    const change1 = data1.quote?.changePercent || 0;
    const change2 = data2.quote?.changePercent || 0;
    
    const winner = change1 > change2 ? symbol1 : symbol2;
    const winnerChange = Math.max(change1, change2);
    
    // Generate key differences
    const differences = this.generateComparisonInsights(symbols, data);
    
    // Generate recommendation
    const recommendation = this.generateComparisonRecommendation(symbols, data);

    return {
      structure: `⚔️ **${symbol1} vs ${symbol2}** Performance Race

**The Winner** (Today): 🥇 **${winner}** ${winnerChange > 0 ? '+' : ''}${winnerChange.toFixed(2)}%

**Key Differences:**
${differences.map(diff => `• ${diff}`).join('\n')}

🎯 **The Verdict**: ${recommendation}

Want to see the detailed comparison chart?`,
      
      metadata: {
        type: 'comparison_analysis',
        chartType: 'comparison',
        interactive: true,
        symbols: symbols
      }
    };
  }

  /**
   * Contextual Greeting with User Context
   */
  static contextualGreeting(userContext = {}) {
    const hour = new Date().getHours();
    const timeGreeting = hour < 12 ? 'Good morning' : hour < 17 ? 'Good afternoon' : 'Good evening';
    
    let contextInfo = '';
    if (userContext.lastSymbol) {
      const change = userContext.lastChange || 0;
      contextInfo += `${userContext.lastSymbol} is ${change > 0 ? 'up' : 'down'} ${Math.abs(change).toFixed(1)}% since we last talked. `;
    }
    
    if (userContext.hasPortfolio) {
      const portfolioChange = userContext.portfolioChange || 0;
      contextInfo += `Your portfolio is ${portfolioChange > 0 ? 'up' : 'down'} ${Math.abs(portfolioChange).toFixed(1)}% today. `;
    }

    return `${timeGreeting}! 👋 

${contextInfo}💡 **What would you like to explore?**

• 📊 Check specific stock prices
• 📈 Analyze your portfolio  
• ⚔️ Compare investments
• 🔍 Market trends and news

Just ask me anything!`;
  }

  /**
   * Generate price insight based on data and change
   */
  static generatePriceInsight(data, change) {
    if (Math.abs(change) > 5) {
      return change > 0 ? 
        `Strong momentum - consider taking partial profits above current levels` :
        `Significant dip - potential buying opportunity if fundamentals remain strong`;
    } else if (Math.abs(change) > 2) {
      return change > 0 ? 
        `Positive momentum building - watch for breakout above resistance` :
        `Minor pullback - normal healthy correction in uptrend`;
    } else {
      return `Consolidating around current levels - wait for clear direction signal`;
    }
  }

  /**
   * Generate volume insight
   */
  static getVolumeInsight(volume, avgVolume) {
    if (!volume || !avgVolume) return 'Volume data updating...';
    
    const ratio = volume / avgVolume;
    if (ratio > 2) return `🔥 Volume surging at ${ratio.toFixed(1)}x average`;
    if (ratio > 1.5) return `📊 Higher volume at ${ratio.toFixed(1)}x average`;
    if (ratio < 0.5) return `😐 Light volume at ${ratio.toFixed(1)}x average`;
    return `📊 Normal volume at ${ratio.toFixed(1)}x average`;
  }

  /**
   * Generate technical signal
   */
  static getTechnicalSignal(data) {
    // Simple technical signal based on available data
    const rsi = data.technicals?.rsi;
    if (rsi > 70) return '⚠️ RSI overbought - potential pullback ahead';
    if (rsi < 30) return '🟢 RSI oversold - potential bounce opportunity';
    return '📊 RSI neutral - momentum balanced';
  }

  /**
   * Identify portfolio risks
   */
  static identifyPortfolioRisks(portfolio) {
    const risks = [];
    
    // Concentration risk
    const totalValue = portfolio.reduce((sum, h) => sum + (h.value || 0), 0);
    const largestHolding = Math.max(...portfolio.map(h => (h.value || 0) / totalValue));
    
    if (largestHolding > 0.3) {
      const symbol = portfolio.find(h => (h.value || 0) / totalValue === largestHolding)?.symbol;
      risks.push({
        icon: '🔴',
        message: `Over-concentrated in ${symbol} (${(largestHolding * 100).toFixed(0)}% of portfolio)`
      });
    }
    
    // Sector concentration (simplified)
    const techStocks = portfolio.filter(h => ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA'].includes(h.symbol));
    if (techStocks.length > portfolio.length * 0.6) {
      risks.push({
        icon: '🟡',
        message: `Heavy tech exposure (${techStocks.length}/${portfolio.length} holdings)`
      });
    }
    
    // Performance laggards
    const losers = portfolio.filter(h => (h.return || 0) < -10);
    if (losers.length > 0) {
      risks.push({
        icon: '🔴',
        message: `${losers.length} holdings down >10% need attention`
      });
    }
    
    return risks;
  }

  /**
   * Generate specific portfolio actions
   */
  static generatePortfolioActions(portfolio, analysis) {
    const actions = [];
    const totalValue = portfolio.reduce((sum, h) => sum + (h.value || 0), 0);
    
    // Find overweight positions
    const overweightHolding = portfolio.find(h => (h.value || 0) / totalValue > 0.25);
    if (overweightHolding) {
      const currentPercent = ((overweightHolding.value || 0) / totalValue * 100).toFixed(0);
      const suggestedShares = Math.floor((overweightHolding.shares || 0) * 0.2);
      actions.push({
        type: 'TRIM POSITION',
        details: `Sell ${suggestedShares} shares of ${overweightHolding.symbol} (reduce from ${currentPercent}% to 20%)`
      });
    }
    
    // Find strong performers to take profits
    const strongPerformer = portfolio.find(h => (h.return || 0) > 20);
    if (strongPerformer) {
      const suggestedShares = Math.floor((strongPerformer.shares || 0) * 0.25);
      actions.push({
        type: 'TAKE PROFITS',
        details: `Sell ${suggestedShares} shares of ${strongPerformer.symbol} (lock in ${(strongPerformer.return || 0).toFixed(0)}% gains)`
      });
    }
    
    // Suggest diversification
    if (portfolio.length < 10) {
      actions.push({
        type: 'DIVERSIFY',
        details: `Add ETF position like VTI or QQQ for broader market exposure`
      });
    }
    
    return actions;
  }

  /**
   * Calculate simple portfolio return
   */
  static calculatePortfolioReturn(portfolio) {
    const totalCurrent = portfolio.reduce((sum, h) => sum + (h.value || 0), 0);
    const totalCost = portfolio.reduce((sum, h) => sum + ((h.shares || 0) * (h.costBasis || h.value || 0)), 0);
    return totalCost > 0 ? ((totalCurrent - totalCost) / totalCost * 100) : 0;
  }

  /**
   * Generate comparison insights
   */
  static generateComparisonInsights(symbols, data) {
    const insights = [];
    const [symbol1, symbol2] = symbols;
    const data1 = data[symbol1] || {};
    const data2 = data[symbol2] || {};
    
    // Price comparison
    const price1 = data1.quote?.price || 0;
    const price2 = data2.quote?.price || 0;
    
    if (price1 && price2) {
      insights.push(`Price levels: ${symbol1} $${price1.toFixed(2)} vs ${symbol2} $${price2.toFixed(2)}`);
    }
    
    // Volume comparison
    const vol1 = data1.quote?.volume || 0;
    const vol2 = data2.quote?.volume || 0;
    
    if (vol1 && vol2) {
      const moreActive = vol1 > vol2 ? symbol1 : symbol2;
      insights.push(`${moreActive} showing higher trading activity today`);
    }
    
    // Market cap comparison (if available)
    const mc1 = data1.quote?.marketCap || 0;
    const mc2 = data2.quote?.marketCap || 0;
    
    if (mc1 && mc2) {
      const larger = mc1 > mc2 ? symbol1 : symbol2;
      insights.push(`${larger} is the larger company by market cap`);
    }
    
    return insights.length > 0 ? insights : ['Both showing similar trading patterns today'];
  }

  /**
   * Generate comparison recommendation
   */
  static generateComparisonRecommendation(symbols, data) {
    const [symbol1, symbol2] = symbols;
    const change1 = data[symbol1]?.quote?.changePercent || 0;
    const change2 = data[symbol2]?.quote?.changePercent || 0;
    
    if (Math.abs(change1 - change2) < 1) {
      return `Both showing similar performance - consider broader market factors`;
    }
    
    const outperformer = change1 > change2 ? symbol1 : symbol2;
    const underperformer = change1 > change2 ? symbol2 : symbol1;
    
    return `${outperformer} showing stronger momentum than ${underperformer} today`;
  }
}

module.exports = ResponseTemplates;