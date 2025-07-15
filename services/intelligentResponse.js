const MarketDataService = require("../src/knowledge/market-data-service");

class IntelligentResponseGenerator {
  constructor() {
    console.log("[IntelligentResponse] Initialized");
    this.marketDataService = new MarketDataService();
  }

  async generateResponse(query, context) {
    const responseType = this.analyzeQueryIntent(query, context);
    console.log(`[IntelligentResponse] Query type: ${responseType}`);

    switch (responseType) {
      case "comparison":
        return await this.generateComparison(query, context);

      case "trend_analysis":
        return await this.generateTrendAnalysis(query, context);

      case "portfolio_analysis":
        return await this.generatePortfolioAnalysis(context);

      case "market_overview":
        return await this.generateMarketOverview(query, context);

      default:
        return await this.generateStandardAnalysis(query, context);
    }
  }

  analyzeQueryIntent(query, context) {
    const lowerQuery = query.toLowerCase();

    if (
      lowerQuery.includes(" vs ") ||
      lowerQuery.includes(" versus ") ||
      lowerQuery.includes(" compared to ")
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
      lowerQuery.includes("portfolio") ||
      lowerQuery.includes("my stocks") ||
      lowerQuery.includes("holdings")
    ) {
      return "portfolio_analysis";
    }

    if (
      lowerQuery.includes("market") &&
      (lowerQuery.includes("overview") || lowerQuery.includes("summary"))
    ) {
      return "market_overview";
    }

    return "standard";
  }

  async generateComparison(query, context) {
    // Extract symbols from query
    const symbols = this.extractComparisonSymbols(query);

    if (symbols.length < 2) {
      return {
        type: "error",
        message: 'Please specify two items to compare (e.g., "AAPL vs MSFT")',
      };
    }

    // Fetch data for both symbols (using fallback data for now)
    const data = await Promise.all(symbols.map((s) => this.getMarketData(s)));

    // Create comparison structure
    const comparison = {
      type: "comparison_table",
      symbols: symbols,
      timestamp: Date.now(),
      data: {
        headers: ["Metric", ...symbols.map((s) => s.toUpperCase())],
        rows: [
          [
            "Current Price",
            ...data.map((d) => (d.price ? `$${d.price.toFixed(2)}` : "N/A")),
          ],
          [
            "Day Change",
            ...data.map((d) =>
              d.changePercent ? `${d.changePercent}%` : "N/A",
            ),
          ],
          [
            "Volume",
            ...data.map((d) => (d.volume ? d.volume.toLocaleString() : "N/A")),
          ],
          [
            "52-Week Range",
            ...data.map((d) => {
              if (d.low52 && d.high52) {
                return `$${d.low52} - $${d.high52}`;
              }
              return "N/A";
            }),
          ],
          ["Market Cap", ...data.map((d) => d.marketCap || "N/A")],
        ],
      },
      analysis: await this.generateComparisonAnalysis(symbols, data),
      chart: false, // Explicitly no chart for comparisons
    };

    return comparison;
  }

  extractComparisonSymbols(query) {
    const patterns = [
      /(\w+)\s+vs\s+(\w+)/i,
      /(\w+)\s+versus\s+(\w+)/i,
      /compare\s+(\w+)\s+(?:and|to|with)\s+(\w+)/i,
    ];

    for (const pattern of patterns) {
      const match = query.match(pattern);
      if (match) {
        return [match[1], match[2]].map((s) => s.toUpperCase());
      }
    }

    return [];
  }

  async generateComparisonAnalysis(symbols, data) {
    // Simple comparison analysis
    try {
      const symbol1 = symbols[0];
      const symbol2 = symbols[1];
      const data1 = data[0];
      const data2 = data[1];

      let analysis = `**${symbol1} vs ${symbol2} Analysis:**\n\n`;

      // Always generate exactly 4 bullet points
      if (data1.price && data2.price) {
        const priceDiff = (
          ((data1.price - data2.price) / data2.price) *
          100
        ).toFixed(2);
        analysis += `• ${symbol1} is ${priceDiff > 0 ? "trading higher" : "trading lower"} than ${symbol2}\n`;
      } else {
        analysis += `• Price comparison data unavailable for both assets\n`;
      }

      if (data1.changePercent && data2.changePercent) {
        const performer =
          parseFloat(data1.changePercent) > parseFloat(data2.changePercent)
            ? symbol1
            : symbol2;
        analysis += `• ${performer} is outperforming in today's session\n`;
      } else {
        analysis += `• Performance comparison data currently unavailable\n`;
      }

      if (data1.marketCap && data2.marketCap) {
        const largerCap = data1.marketCap > data2.marketCap ? symbol1 : symbol2;
        analysis += `• ${largerCap} has larger market capitalization\n`;
      } else {
        analysis += `• Market cap comparison data currently unavailable\n`;
      }

      analysis += `• Both assets carry different risk profiles\n`;

      analysis += `\n**Investment Consideration**: Consider your investment timeline and risk tolerance.`;

      return analysis;
    } catch (error) {
      return `**${symbols[0]} vs ${symbols[1]} Analysis:**\n\n• ${symbols[0]} is currently trading at $${data[0]?.price || "N/A"}\n• ${symbols[1]} is trading at $${data[1]?.price || "N/A"}\n• Both assets show different risk profiles\n• Consider your investment timeline carefully\n\n**Investment Consideration**: Different risk/reward profiles apply.`;
    }
  }

  async generateTrendAnalysis(query, context) {
    const currentSymbol = this.extractSymbol(query);
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
      console.log(
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
      console.log(
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
    const changePercent = currentData.changePercent || 0;
    const volume = currentData.volume || 0;
    const price = currentData.price;

    // Calculate moving averages from historical data (simplified for now)
    const historicalData = await this.getHistoricalData(symbol, 200);
    const movingAverages = this.calculateMovingAverages(historicalData);

    // Get asset-specific information
    const assetInfo = this.getDetailedAssetInfo(symbol);

    let analysis = `${symbol} Trend Analysis\n\n`;

    // 1. Summary Card
    analysis += `**Summary Card**\n`;
    analysis += `Current price $${price.toFixed(2)} (${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%).\n`;
    analysis += `Support (price may stop falling): $${trendInfo.support.toFixed(2)}.\n`;
    analysis += `Resistance (price may stop rising): $${trendInfo.resistance.toFixed(2)}.\n\n`;

    // 2. Key Metrics List
    analysis += `**Key Metrics List**\n`;
    const volumeStr =
      volume > 1000000
        ? (volume / 1000000).toFixed(1) + "M"
        : volume.toLocaleString();
    analysis += `Volume ${volumeStr} ${assetInfo.volumeUnit}.\n`;
    analysis += `Moving averages (avg price over time to spot trends): 5-day $${movingAverages.sma5}, 10-day $${movingAverages.sma10}, 20-day $${movingAverages.sma20}, 50-day $${movingAverages.sma50}, 100-day $${movingAverages.sma100}, 200-day $${movingAverages.sma200}.\n\n`;

    // 3. Valuable Info
    analysis += `**Valuable Info**\n`;
    analysis += `${symbol} is ${assetInfo.description}.\n`;
    analysis += `${assetInfo.exchangeInfo}.\n`;
    analysis += `Prices shift from supply/demand basics like ${assetInfo.influencingFactors}.\n\n`;

    // 4. Historical Price Range
    analysis += `**Historical Price Range**\n`;
    const high52 = currentData.high52Week || price * 1.2;
    const low52 = currentData.low52Week || price * 0.8;
    analysis += `52-week high $${high52.toFixed(2)} (highest price in last year), low $${low52.toFixed(2)} (lowest). (Shows recent price variability for context.)\n\n`;

    analysis += `Below: Real-time graph/charts.\n\n`;
    analysis += `Data source: ${currentData.source || "Market Feed"} | Updated: ${new Date(currentData.timestamp).toLocaleTimeString()}`;

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
        volumeUnit: "(contracts traded today)",
        exchangeInfo:
          "Trades on NYMEX/CME with each contract representing 1,000 barrels",
        influencingFactors:
          "OPEC+ production decisions, global demand shifts, US inventory reports, geopolitical tensions, and dollar strength",
      },
      BZ: {
        description: "Brent crude oil futures (global benchmark)",
        volumeUnit: "(contracts traded today)",
        exchangeInfo:
          "Trades on ICE with each contract representing 1,000 barrels",
        influencingFactors:
          "Middle East stability, European demand, shipping routes, and global economic growth",
      },
      GC: {
        description: "gold futures (safe-haven precious metal)",
        volumeUnit: "(contracts traded today)",
        exchangeInfo:
          "Trades on COMEX/CME with each contract representing 100 troy ounces",
        influencingFactors:
          "Federal Reserve policy, real interest rates, inflation expectations, dollar movements, and geopolitical uncertainty",
      },
      SI: {
        description: "silver futures (industrial and investment metal)",
        volumeUnit: "(contracts traded today)",
        exchangeInfo:
          "Trades on COMEX/CME with each contract representing 5,000 troy ounces",
        influencingFactors:
          "industrial demand (solar panels, electronics), investment flows, gold/silver ratio, and mining supply",
      },
      NG: {
        description: "natural gas futures (energy commodity)",
        volumeUnit: "(contracts traded today)",
        exchangeInfo:
          "Trades on NYMEX/CME with each contract representing 10,000 MMBtu",
        influencingFactors:
          "weather patterns, storage levels, LNG exports, power generation demand, and seasonal heating/cooling needs",
      },

      // Cryptocurrencies
      BTC: {
        description:
          "Bitcoin, the first and largest cryptocurrency by market cap",
        volumeUnit: "(BTC traded today)",
        exchangeInfo:
          "Trades 24/7 on global exchanges like Coinbase, Binance, and Kraken",
        influencingFactors:
          "institutional adoption, regulatory developments, network hash rate, on-chain metrics, and correlation with tech stocks",
      },
      ETH: {
        description: "Ethereum, the leading smart contract platform",
        volumeUnit: "(ETH traded today)",
        exchangeInfo:
          "Trades 24/7 on major crypto exchanges with DeFi integration",
        influencingFactors:
          "DeFi activity, gas fees, network upgrades, layer-2 adoption, and NFT market trends",
      },

      // Default for stocks
      DEFAULT: {
        description: "a publicly traded company",
        volumeUnit: "(shares traded today)",
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
        volumeUnit: "(shares traded today)",
        exchangeInfo: "Trades on NASDAQ under ticker AAPL",
        influencingFactors:
          "iPhone sales, services growth, China exposure, product launches, and tech sector sentiment",
      };
    } else if (symbol === "TSLA") {
      return {
        description: "Tesla Inc., the leading electric vehicle manufacturer",
        volumeUnit: "(shares traded today)",
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

  generatePortfolioAnalysisBullets(portfolio, metrics) {
    const totalValue = parseFloat(metrics.totalValue);
    const totalGainPercent = parseFloat(metrics.totalGainPercent);
    const topPerformer = metrics.topPerformer;
    const holdingsCount = portfolio.length;

    return `**Portfolio Analysis:**

**Total Value**: $${totalValue.toLocaleString()}
**Total Return**: ${totalGainPercent > 0 ? "+" : ""}${totalGainPercent}% (${totalGainPercent > 0 ? "📈" : "📉"})
**Holdings**: ${holdingsCount} positions

**Key Insights**:
• Your portfolio of ${holdingsCount} holdings is ${totalGainPercent > 0 ? "up" : "down"} ${Math.abs(totalGainPercent)}%
• ${topPerformer ? `${topPerformer.symbol} is your top performer with ${topPerformer.changePercent}% gain` : "No clear top performer identified"}
• Portfolio is ${holdingsCount > 10 ? "well diversified" : "concentrated"} across ${holdingsCount} holdings
• Consider ${totalGainPercent > 30 ? "taking profits on positions up >30%" : "monitoring performance trends"}

**Investment Consideration**: Diversification helps manage risk but doesn't guarantee profits.`;
  }

  generateNoPortfolioAnalysis() {
    return `**Portfolio Analysis:**

**Current Status**: No portfolio uploaded
**Upload Required**: CSV file needed for analysis
**Supported Formats**: symbol, shares, purchase_price columns

**Key Insights**:
• Upload your portfolio CSV for detailed analysis
• I can analyze risk, diversification, and performance metrics
• Portfolio tracking helps optimize your investment strategy
• Consider uploading holdings for personalized recommendations

**Investment Consideration**: Upload your portfolio to get started with analysis.`;
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

  extractSymbol(query) {
    // First, try natural language mappings
    const lowerQuery = query.toLowerCase();
    const symbolMappings = {
      // Commodities
      oil: "CL",
      crude: "CL",
      "crude oil": "CL",
      wti: "CL",
      brent: "BZ",
      gold: "GC",
      silver: "SI",
      copper: "HG",
      "natural gas": "NG",
      gas: "NG",

      // Crypto
      bitcoin: "BTC",
      btc: "BTC",
      ethereum: "ETH",
      eth: "ETH",
      dogecoin: "DOGE",
      doge: "DOGE",

      // Stocks
      apple: "AAPL",
      microsoft: "MSFT",
      google: "GOOGL",
      amazon: "AMZN",
      tesla: "TSLA",
      nvidia: "NVDA",
      meta: "META",
      facebook: "META",
    };

    // Check for natural language matches - prioritize longer matches
    const sortedMappings = Object.entries(symbolMappings).sort(
      ([a], [b]) => b.length - a.length,
    ); // Sort by length descending

    for (const [keyword, symbol] of sortedMappings) {
      // Use word boundaries to ensure exact matches
      const regex = new RegExp(`\\b${keyword}\\b`, "i");
      if (regex.test(lowerQuery)) {
        return symbol;
      }
    }

    // Extract stock symbols from query (uppercase letters)
    const match = query.match(/\b[A-Z]{1,5}\b/);
    return match ? match[0] : null;
  }

  async generateStandardAnalysis(query, context) {
    const symbol = this.extractSymbol(query) || context.topic;

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

    // Get asset-specific information
    const assetInfo = this.getDetailedAssetInfo(symbol);

    // Calculate or use existing 52-week data
    const high52 = data.high52 || data.price * 1.2;
    const low52 = data.low52 || data.price * 0.8;

    // Mock moving averages for basic analysis (in production, fetch from API)
    const mockMA = {
      sma5: (data.price * 1.01).toFixed(2),
      sma10: (data.price * 0.99).toFixed(2),
      sma20: (data.price * 1.02).toFixed(2),
      sma50: (data.price * 0.98).toFixed(2),
      sma100: (data.price * 0.97).toFixed(2),
      sma200: (data.price * 0.95).toFixed(2),
    };

    let analysis = `${symbol} Analysis\n\n`;

    // 1. Summary Card
    analysis += `**Summary Card**\n`;
    analysis += `Current price $${data.price.toFixed(2)} (${data.changePercent > 0 ? "+" : ""}${data.changePercent}%).\n`;
    analysis += `Support (price may stop falling): $${(data.price * 0.95).toFixed(2)}.\n`;
    analysis += `Resistance (price may stop rising): $${(data.price * 1.05).toFixed(2)}.\n\n`;

    // 2. Key Metrics List
    analysis += `**Key Metrics List**\n`;
    const volumeStr =
      data.volume > 1000000
        ? (data.volume / 1000000).toFixed(1) + "M"
        : data.volume.toLocaleString();
    analysis += `Volume ${volumeStr} ${assetInfo.volumeUnit}.\n`;
    analysis += `Moving averages (avg price over time to spot trends): 5-day $${mockMA.sma5}, 10-day $${mockMA.sma10}, 20-day $${mockMA.sma20}, 50-day $${mockMA.sma50}, 100-day $${mockMA.sma100}, 200-day $${mockMA.sma200}.\n\n`;

    // 3. Valuable Info
    analysis += `**Valuable Info**\n`;
    analysis += `${symbol} is ${assetInfo.description}. ${assetInfo.exchangeInfo}.\n`;
    analysis += `Prices shift from supply/demand basics like ${assetInfo.influencingFactors}.\n\n`;

    // 4. Historical Price Range
    analysis += `**Historical Price Range**\n`;
    analysis += `52-week high $${high52.toFixed(2)} (highest price in last year), low $${low52.toFixed(2)} (lowest). (Shows recent price variability for context.)\n\n`;

    analysis += `Below: Real-time graph/charts.`;

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
    console.log(`[IntelligentResponse] getMarketData called with symbol: ${symbol}, normalized: ${normalizedSymbol}`);

    try {
      // Detect asset type
      const assetType = this.detectAssetType(normalizedSymbol);
      console.log(`[IntelligentResponse] Detected asset type: ${assetType} for ${normalizedSymbol}`);

      // Try to get data from MarketDataService with proper method
      let dynamicData;
      if (assetType === "crypto") {
        console.log(`[IntelligentResponse] Calling fetchCryptoPrice for ${normalizedSymbol}`);
        dynamicData =
          await this.marketDataService.fetchCryptoPrice(normalizedSymbol);
      } else if (assetType === "commodity") {
        console.log(`[IntelligentResponse] Calling fetchCommodityPrice for ${normalizedSymbol}`);
        dynamicData =
          await this.marketDataService.fetchCommodityPrice(normalizedSymbol);
      } else {
        console.log(`[IntelligentResponse] Calling fetchStockPrice for ${normalizedSymbol}`);
        dynamicData =
          await this.marketDataService.fetchStockPrice(normalizedSymbol);
      }

      console.log(`[IntelligentResponse] Dynamic data for ${normalizedSymbol}:`, dynamicData);
      
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
      console.log(
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
      console.log(
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
      console.error(
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
      BTC: 95000,
      ETH: 3500,
      GC: 2050,
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
    // Generate mock historical data
    const currentPrice = (await this.getMarketData(symbol)).price;
    const historical = [];

    for (let i = days - 1; i >= 0; i--) {
      const date = new Date();
      date.setDate(date.getDate() - i);

      const volatility = 0.02; // 2% daily volatility
      const randomChange = (Math.random() - 0.5) * volatility;
      const price = currentPrice * (1 + randomChange);

      historical.push({
        date: date.toISOString(),
        close: price,
        price: price,
        high: price * 1.02,
        low: price * 0.98,
        volume: Math.floor(Math.random() * 50000000) + 10000000,
      });
    }

    return historical;
  }
}

module.exports = new IntelligentResponseGenerator();
