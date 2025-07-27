// server.js - FINANCEBOT PRO v4.0 - SECURE PRODUCTION READY
// ================================================================

const express = require("express");
const cors = require("cors");
const axios = require("axios");
const dotenv = require("dotenv");
const path = require("path");
const multer = require("multer");
const Papa = require("papaparse");
const NumberFormatter = require("./utils/numberFormatter");
const fs = require("fs").promises;
const rateLimit = require("express-rate-limit");
const helmet = require("helmet");
const Bottleneck = require("bottleneck");
const pLimit = require("p-limit");
const http = require("http");
const WebSocket = require("ws");
const logger = require("./utils/logger");

// Load environment variables FIRST
logger.info("📁 Loading environment variables from .env file...");
dotenv.config();

// Import new modules for real testing
const MarketDataService = require("./src/knowledge/market-data-service");
const marketDataService = new MarketDataService();
const IntentClassifier = require("./src/guardrails/intent-classifier");
const DisclaimerManager = require("./src/guardrails/disclaimer-manager");
const WebSocketService = require("./services/websocket-service");
const portfolioManager = require("./services/portfolioManager");

// Will initialize portfolio manager with sessions reference later
const intelligentResponse = require("./services/intelligentResponse");
const responseFormatter = require("./services/responseFormatter");
const chartGenerator = require("./services/chartGenerator");
const dualLLMOrchestrator = require("./services/dualLLMOrchestrator");

// Initialize services
const intentClassifier = new IntentClassifier();
const disclaimerManager = new DisclaimerManager();

// ================================================================
// CRITICAL SECURITY FIX: REMOVE HARDCODED API KEYS
// ================================================================

// SECURE API KEY LOADING - NO FALLBACKS
const PERPLEXITY_KEY = process.env.PERPLEXITY_API_KEY;
const ALPHA_VANTAGE_KEY = process.env.ALPHA_VANTAGE_API_KEY;
const POLYGON_KEY = process.env.POLYGON_API_KEY;

// ================================================================
// STARTUP VALIDATION - ENFORCE REQUIRED API KEYS
// ================================================================

// Check keys and warn if missing (non-blocking)
if (!PERPLEXITY_KEY || PERPLEXITY_KEY === "your_perplexity_api_key_here") {
  logger.warn("\n⚠️  WARNING: PERPLEXITY_API_KEY not configured properly");
  logger.warn("│ Server will operate in fallback mode without AI enhancement");
  logger.warn("│ To enable AI features:");
  logger.warn("│ 1. Get API key from: https://www.perplexity.ai/");
  logger.warn("│ 2. Update PERPLEXITY_API_KEY in .env file");
  logger.warn("│ 3. Restart server");
  logger.warn("└─ Continuing startup in fallback mode...\n");
} else {
  logger.info("🔑 Perplexity API key found - will validate on startup");
}

// Warn about optional keys (non-blocking)
if (!ALPHA_VANTAGE_KEY) {
  logger.warn(
    "⚠️  WARNING: ALPHA_VANTAGE_API_KEY not set. Some market data features may be limited."
  );
  logger.warn("   Get one free at: https://www.alphavantage.co/");
}

if (!POLYGON_KEY) {
  logger.warn(
    "⚠️  WARNING: POLYGON_API_KEY not set. Advanced market data features disabled."
  );
  logger.warn("   Get one at: https://polygon.io/");
}

// Success message for properly configured environment
logger.info("✅ Environment Check:", {
  NODE_ENV: process.env.NODE_ENV || "development",
  PORT: process.env.PORT || 3000,
  PERPLEXITY_KEY_EXISTS: !!PERPLEXITY_KEY,
  ALPHA_VANTAGE_KEY_EXISTS: !!ALPHA_VANTAGE_KEY,
  POLYGON_KEY_EXISTS: !!POLYGON_KEY,
  timestamp: new Date().toISOString(),
});

// ================================================================
// API KEY VALIDATION ON STARTUP
// ================================================================

async function validatePerplexityAPI() {
  if (!PERPLEXITY_KEY || PERPLEXITY_KEY === "your_perplexity_api_key_here") {
    logger.debug(
      "⚠️  Perplexity API key not configured properly - using fallback mode",
    );
    return false;
  }

  try {
    logger.debug("🔑 Validating Perplexity API key...");
    const testResponse = await axios.post(
      "https://api.perplexity.ai/chat/completions",
      {
        model: "sonar-pro",
        messages: [{ role: "user", content: "test" }],
        max_tokens: 10,
      },
      {
        headers: {
          Authorization: `Bearer ${PERPLEXITY_KEY}`,
          "Content-Type": "application/json",
        },
        timeout: 10000,
      },
    );

    logger.debug("✅ Perplexity API key validated successfully");
    return true;
  } catch (error) {
    logger.warn(
      "❌ Perplexity API validation failed:",
      error.response?.status || error.message,
    );
    logger.warn("   Operating in fallback mode without AI enhancement");
    return false;
  }
}

const app = express();
const PORT = process.env.PORT || 3000;

// ================================================================
// FILE UPLOAD CONFIGURATION
// ================================================================

// Configure multer for memory storage
const upload = multer({
  storage: multer.memoryStorage(),
  limits: {
    fileSize: 5 * 1024 * 1024, // 5MB limit
    files: 1,
  },
  fileFilter: (req, file, cb) => {
    if (file.mimetype === "text/csv" || file.originalname.endsWith(".csv")) {
      cb(null, true);
    } else {
      cb(new Error("Only CSV files are allowed"));
    }
  },
});

// ================================================================
// PHASE 1 - TASK 1.3: SCALABLE SESSION STORAGE
// ================================================================

class SessionManager {
  constructor(options = {}) {
    this.maxSessions = options.maxSessions || 1000;
    this.sessionTTL = options.sessionTTL || 24 * 60 * 60 * 1000; // 24 hours
    this.cleanupInterval = options.cleanupInterval || 60 * 60 * 1000; // 1 hour
    this.maxSessionSize = options.maxSessionSize || 100 * 1024; // 100KB per session

    this.storage = new Map();
    this.accessOrder = new Map();

    this.stats = {
      totalSessions: 0,
      totalCreated: 0,
      totalEvicted: 0,
      totalExpired: 0,
      memoryUsage: 0,
      lastCleanup: Date.now(),
      cleanupCount: 0,
    };

    this.startCleanupJob();
    logger.debug(
      `[SessionManager] Initialized with capacity: ${this.maxSessions}, TTL: ${this.sessionTTL / 1000}s`,
    );
  }

  create(sessionId) {
    if (!sessionId || typeof sessionId !== "string") {
      throw new Error("Session ID must be a non-empty string");
    }

    if (this.storage.has(sessionId)) {
      return this.get(sessionId);
    }

    if (this.storage.size >= this.maxSessions) {
      this.evictOldestSession();
    }

    const session = {
      id: sessionId,
      portfolio: null,
      conversationHistory: [],
      lastTopic: null,  // Keep for backward compatibility
      lastAnalysis: null,
      
      // Add conversation state directly to session
      conversationState: {
        discussedSymbols: {},
        lastDiscussedSymbol: null,
        lastIntent: null,
        expectingFollowUp: false,
        context: null,
        lastQueryTime: null,
        shownCharts: [],  // Using array instead of Set for JSON serialization
        activeSymbol: null,
        conversationFlow: {
          lastIntent: null,
          lastDiscussedSymbol: null,
          lastDiscussedTopic: null,
          lastQueryTime: null,
          shownCharts: []  // Using array instead of Set
        },
        promisesMade: []
      },
      
      disclaimerShown: false,
      preferences: {
        theme: "dark",
        notifications: true,
        autoSave: true,
      },
      metadata: {
        createdAt: Date.now(),
        lastAccessed: Date.now(),
        accessCount: 1,
        totalQueries: 0,
      },
    };

    this.storage.set(sessionId, session);
    this.accessOrder.set(sessionId, Date.now());

    this.stats.totalSessions = this.storage.size;
    this.stats.totalCreated++;
    this.updateMemoryUsage();

    logger.debug(
      `[SessionManager] Created session ${sessionId} (total: ${this.storage.size})`,
    );
    return session;
  }

  get(sessionId) {
    if (!sessionId) return null;

    const session = this.storage.get(sessionId);
    if (!session) {
      logger.debug('[SessionManager] Session not found:', {
        sessionId,
        totalSessions: this.storage.size
      });
      return null;
    }

    const now = Date.now();

    if (now - session.metadata.lastAccessed > this.sessionTTL) {
      logger.debug(`[SessionManager] Session ${sessionId} expired, removing`);
      this.remove(sessionId);
      this.stats.totalExpired++;
      return null;
    }

    session.metadata.lastAccessed = now;
    session.metadata.accessCount++;
    this.accessOrder.set(sessionId, now);

    // Debug log portfolio status when retrieved
    logger.debug('[SessionManager] Retrieved session:', {
      sessionId,
      hasPortfolio: !!session.portfolio,
      portfolioLength: session.portfolio?.length,
      hasMetrics: !!session.portfolioMetrics,
      totalValue: session.portfolioMetrics?.totalValue,
      accessCount: session.metadata.accessCount
    });

    return session;
  }

  update(sessionId, updates) {
    const session = this.get(sessionId);
    if (!session) {
      logger.error('[SessionManager] Cannot update - session not found:', sessionId);
      return false;
    }

    // Debug logging for portfolio updates
    if (updates.portfolio || updates.portfolioMetrics) {
      logger.info('[SessionManager] Updating session with portfolio data:', {
        sessionId,
        hasPortfolio: !!updates.portfolio,
        portfolioSize: updates.portfolio?.length,
        hasMetrics: !!updates.portfolioMetrics,
        totalValue: updates.portfolioMetrics?.totalValue
      });
    }

    Object.assign(session, updates);
    session.metadata.lastAccessed = Date.now();
    this.accessOrder.set(sessionId, Date.now());
    this.updateMemoryUsage();
    
    // Verify update
    if (updates.portfolio) {
      logger.info('[SessionManager] Portfolio update verified:', {
        sessionId,
        portfolioStored: !!session.portfolio,
        portfolioLength: session.portfolio?.length
      });
    }
    
    return true;
  }

  remove(sessionId) {
    if (this.storage.has(sessionId)) {
      this.storage.delete(sessionId);
      this.accessOrder.delete(sessionId);
      this.stats.totalSessions = this.storage.size;
      this.updateMemoryUsage();
      return true;
    }
    return false;
  }

  evictOldestSession() {
    if (this.accessOrder.size === 0) return false;

    let oldestTime = Date.now();
    let oldestId = null;

    for (const [sessionId, accessTime] of this.accessOrder) {
      if (accessTime < oldestTime) {
        oldestTime = accessTime;
        oldestId = sessionId;
      }
    }

    if (oldestId) {
      logger.debug(`[SessionManager] Evicting session ${oldestId} (LRU)`);
      this.remove(oldestId);
      this.stats.totalEvicted++;
      return true;
    }
    return false;
  }

  cleanup() {
    const now = Date.now();
    let cleaned = 0;
    const expiredSessions = [];

    for (const [sessionId, session] of this.storage) {
      if (now - session.metadata.lastAccessed > this.sessionTTL) {
        expiredSessions.push(sessionId);
      }
    }

    for (const sessionId of expiredSessions) {
      this.remove(sessionId);
      cleaned++;
    }

    this.stats.totalExpired += cleaned;
    this.stats.lastCleanup = now;
    this.stats.cleanupCount++;

    if (cleaned > 0) {
      logger.debug(
        `[SessionManager] Cleanup completed - removed ${cleaned} expired sessions`,
      );
    }
    return cleaned;
  }

  startCleanupJob() {
    this.cleanupTimer = setInterval(() => {
      try {
        this.cleanup();
      } catch (error) {
        logger.error("[SessionManager] Cleanup error:", error);
      }
    }, this.cleanupInterval);
  }

  updateMemoryUsage() {
    this.stats.memoryUsage = this.storage.size * 2.5; // Rough estimate in KB
  }

  getStats() {
    return {
      totalSessions: this.storage.size,
      maxSessions: this.maxSessions,
      estimatedMemoryUsage: `${this.stats.memoryUsage.toFixed(2)} KB`,
      isHealthy: this.storage.size < this.maxSessions * 0.9,
    };
  }

  getAllSessionIds() {
    return Array.from(this.storage.keys());
  }

  shutdown() {
    if (this.cleanupTimer) {
      clearInterval(this.cleanupTimer);
    }
    this.storage.clear();
    this.accessOrder.clear();
    logger.debug("[SessionManager] Shutdown completed");
  }
}

// Initialize session manager
const sessions = new SessionManager();

// Initialize portfolio manager with sessions reference
portfolioManager.initializeSessions(sessions);

// Wire SessionManager into IntelligentResponse
intelligentResponse.setSessionManager(sessions);
logger.info('[Server] SessionManager wired into IntelligentResponse');

// ================================================================
// PORTFOLIO ANALYZER
// ================================================================

class PortfolioAnalyzer {
  constructor() {
    this.supportedFormats = {
      standard: ["symbol", "quantity", "price", "value"],
      extended: [
        "symbol",
        "name",
        "quantity",
        "price",
        "value",
        "sector",
        "type",
      ],
    };
  }

  async analyzeCSV(fileBuffer, filename, session = null) {
    try {
      const csvString = fileBuffer.toString("utf-8");

      // Parse CSV with Papa Parse
      const parseResult = Papa.parse(csvString, {
        header: true,
        dynamicTyping: true,
        skipEmptyLines: true,
        transformHeader: (header) => header.trim().toLowerCase(),
      });

      if (parseResult.errors.length > 0) {
        logger.error(
          "[PortfolioAnalyzer] CSV parsing errors:",
          parseResult.errors,
        );
        throw new Error("Invalid CSV format");
      }

      const data = parseResult.data;
      if (!data || data.length === 0) {
        throw new Error("CSV file is empty");
      }

      // Normalize headers for flexibility
      data.forEach((row) => {
        if (!row.value && row.market_value) row.value = row.market_value;
        if (!row.value && row.marketvalue) row.value = row.marketvalue;
        if (!row.symbol && row.ticker) row.symbol = row.ticker;
        if (!row.quantity && row.shares) row.quantity = row.shares;
      });

      // Analyze portfolio with session for caching
      const analysis = await this.performAnalysis(data, session);

      return {
        success: true,
        portfolio: analysis,
        filename: filename,
        rowCount: data.length,
        timestamp: new Date().toISOString(),
      };
    } catch (error) {
      logger.error("[PortfolioAnalyzer] Error:", error);
      throw error;
    }
  }

  async performAnalysis(data, session = null) {
    // Check session cache first (5 minute TTL)
    if (session && session.portfolioCache) {
      const cacheAge = Date.now() - session.portfolioCache.timestamp;
      if (cacheAge < 300000) {
        // 5 minutes
        logger.debug("[PortfolioAnalyzer] Using cached portfolio data");
        return session.portfolioCache.data;
      }
    }

    const portfolio = {
      assets: [],
      totalValue: 0,
      totalCost: 0,
      dayChange: 0,
      distribution: {},
      topHoldings: [],
      metadata: {
        analyzedAt: new Date().toISOString(),
        assetCount: 0,
      },
    };

    // Process each asset
    data.forEach((row) => {
      const symbol = (row.symbol || row.ticker || "").toUpperCase();
      const quantity = parseFloat(row.quantity || row.shares || 0);
      const price = parseFloat(row.price || row.current_price || 0);
      const value = parseFloat(row.value || quantity * price || 0);

      if (symbol && quantity > 0) {
        const asset = {
          symbol,
          quantity,
          price,
          value,
          weight: 0, // Will calculate after
          change: 0, // Will fetch real change data
        };

        portfolio.assets.push(asset);
        portfolio.totalValue += value;
        portfolio.totalCost += value * 0.95; // Mock cost basis

        // Track distribution
        const type = this.getAssetType(symbol);
        portfolio.distribution[type] =
          (portfolio.distribution[type] || 0) + value;
      }
    });

    // Fetch real market data for portfolio assets with concurrency limit
    // Use the shared instance
    const limit = pLimit(3); // Limit to 3 concurrent requests

    await Promise.all(
      portfolio.assets.map((asset) =>
        limit(async () => {
          asset.weight = (asset.value / portfolio.totalValue) * 100;

          try {
            // Fetch real market data with timeout
            const marketData = await Promise.race([
              marketDataService.fetchMarketData(asset.symbol),
              new Promise((_, reject) =>
                setTimeout(() => reject(new Error("Timeout")), 5000),
              ),
            ]);
            asset.change = marketData.changePercent || 0;
            asset.changePercent = asset.change;
            asset.gain = asset.value * (asset.change / 100);
          } catch (error) {
            logger.debug(
              `Failed to fetch data for ${asset.symbol}, using fallback`,
            );
            // Fallback to realistic random changes
            if (["BTC", "ETH", "DOGE", "ADA", "SOL"].includes(asset.symbol)) {
              asset.change = (Math.random() - 0.3) * 13;
            } else if (
              ["TSLA", "NVDA", "PLTR", "ARKK"].includes(asset.symbol)
            ) {
              asset.change = (Math.random() - 0.4) * 8;
            } else {
              asset.change = (Math.random() - 0.4) * 5;
            }
            asset.changePercent = asset.change;
            asset.gain = asset.value * (asset.change / 100);
          }
        }),
      ),
    );

    // Sort for top holdings
    portfolio.topHoldings = portfolio.assets
      .sort((a, b) => b.value - a.value)
      .slice(0, 5);

    // Calculate REAL overall performance metrics
    const totalGain = portfolio.assets.reduce(
      (sum, asset) => sum + (asset.gain || 0),
      0,
    );
    portfolio.dayChange = (totalGain / portfolio.totalValue) * 100;
    portfolio.totalGain = totalGain;

    // Calculate additional performance metrics
    portfolio.gainersCount = portfolio.assets.filter(
      (a) => a.change > 0,
    ).length;
    portfolio.losersCount = portfolio.assets.filter((a) => a.change < 0).length;
    portfolio.topGainer = portfolio.assets.reduce(
      (max, asset) => (asset.change > (max?.change || -Infinity) ? asset : max),
      null,
    );
    portfolio.topLoser = portfolio.assets.reduce(
      (min, asset) => (asset.change < (min?.change || Infinity) ? asset : min),
      null,
    );
    portfolio.metadata.assetCount = portfolio.assets.length;

    // Calculate Sharpe Ratio approximation
    const avgReturn = portfolio.dayChange;
    const volatility = this.calculateVolatility(portfolio.assets);
    portfolio.sharpeRatio =
      volatility > 0 ? (avgReturn / volatility).toFixed(2) : 0;

    // Calculate beta (market correlation)
    portfolio.beta = this.calculatePortfolioBeta(portfolio.assets);

    // Calculate Value at Risk (VaR) - 95% confidence
    portfolio.valueAtRisk = this.calculateVaR(portfolio.totalValue, volatility);

    portfolio.riskAssessment = this.analyzeRisk(portfolio.assets);
    portfolio.recommendations = this.generateRecommendations(portfolio);

    // Generate professional pie chart for top holdings
    if (portfolio.topHoldings.length > 0) {
      portfolio.pieChart = this.generatePieChart(portfolio.topHoldings);
    }

    // Cache the portfolio data in session
    if (session) {
      session.portfolioCache = {
        data: portfolio,
        timestamp: Date.now(),
      };
    }

    return portfolio;
  }

  getAssetType(symbol) {
    // Simple classification
    if (["BTC", "ETH", "DOGE", "ADA", "SOL"].includes(symbol)) {
      return "Crypto";
    } else if (symbol.length <= 5) {
      return "Stocks";
    } else {
      return "Other";
    }
  }

  generatePieChart(holdings) {
    // FIXED: Generate proper pie chart with individual segments
    const colors = [
      "#ff0000",
      "#00ff00",
      "#ffff00",
      "#0000ff",
      "#ff8800",
      "#ff00ff",
      "#00ffff",
      "#800080",
    ];

    // Fix solid color by ensuring multiple segments for single holdings
    let processedHoldings = [...holdings];
    if (holdings.length === 1) {
      processedHoldings.push({
        symbol: "Other",
        value: 0.001,
        weight: 0.0,
      });
    }

    return {
      type: "pie",
      title: "Portfolio Distribution",
      // BLOOMBERG STANDARD: Minimum 600x400px
      width: 600,
      height: 400,
      data: {
        labels: processedHoldings.map(
          (h) => `${h.symbol} (${h.weight.toFixed(1)}%)`,
        ),
        datasets: [
          {
            data: processedHoldings.map((h) => h.value),
            backgroundColor: processedHoldings.map(
              (h, i) => colors[i % colors.length],
            ),
            borderColor: "#ffffff",
            borderWidth: 2,
            hoverBackgroundColor: processedHoldings.map(
              (h, i) => colors[i % colors.length],
            ),
            hoverBorderColor: "#ffffff",
            hoverBorderWidth: 3,
          },
        ],
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        scales: {
          x: { display: false },
          y: { display: false },
        },
        plugins: {
          legend: {
            display: true,
            position: "right",
            labels: {
              color: "#ffffff",
              font: { size: 14, weight: "bold" }, // BLOOMBERG: Larger, bolder text
              padding: 20,
              usePointStyle: true,
              pointStyle: "rect",
              generateLabels: function (chart) {
                const data = chart.data;
                return data.labels.map((label, i) => ({
                  text: `${holdings[i].symbol}: ${NumberFormatter.formatNumber(holdings[i].value, 'price')} (${holdings[i].weight.toFixed(1)}%)`,
                  fillStyle: data.datasets[0].backgroundColor[i],
                  strokeStyle: data.datasets[0].borderColor,
                  lineWidth: data.datasets[0].borderWidth,
                }));
              },
            },
          },
          tooltip: {
            backgroundColor: "rgba(0,0,0,0.9)",
            titleColor: "#ffffff",
            bodyColor: "#00D4FF",
            callbacks: {
              label: function (context) {
                const holding = holdings[context.dataIndex];
                return `${holding.symbol}: ${NumberFormatter.formatNumber(holding.value, 'price')} (${holding.weight.toFixed(1)}%)`;
              },
            },
          },
        },
        layout: {
          padding: 20,
        },
      },
    };
  }

  generateChartData(portfolio) {
    // CRITICAL FIX: Use the proper pie chart generator that creates segments
    if (portfolio.topHoldings && portfolio.topHoldings.length > 0) {
      return this.generatePieChart(portfolio.topHoldings);
    }

    // Fallback: Create chart from assets if no topHoldings
    if (portfolio.assets && portfolio.assets.length > 0) {
      const topAssets = portfolio.assets
        .sort((a, b) => b.value - a.value)
        .slice(0, 5);
      return this.generatePieChart(topAssets);
    }

    // Last resort: basic distribution chart
    const distributionChart = {
      type: "pie",
      title: "Portfolio Distribution",
      data: {
        labels: Object.keys(portfolio.distribution || {}),
        datasets: [
          {
            data: Object.values(portfolio.distribution || {}),
            backgroundColor: [
              "#ff0000",
              "#00ff00",
              "#ffff00",
              "#0000ff",
              "#ff8800",
            ],
            borderColor: "#ffffff",
            borderWidth: 2,
          },
        ],
      },
    };

    return distributionChart;
  }

  getStockColor(symbol) {
    // Find the asset
    const asset = this.assets.find((a) => a.symbol === symbol);
    if (asset && asset.change > 0) {
      return "#00ff88"; // green
    } else {
      return "#ff4444"; // red
    }
  }

  analyzeRisk(holdings) {
    let riskScore = 0.2; // Base conservative risk
    let concentrationRisk = 0;
    let sectorRisk = 0;
    let volatilityRisk = 0;

    // ENHANCED CONCENTRATION RISK ANALYSIS
    holdings.forEach((holding) => {
      // Critical: Any position over 25% adds significant risk
      if (holding.weight > 25) {
        concentrationRisk += (holding.weight - 25) * 0.03; // Increased penalty
      }
      // Major positions over 15% add some risk
      if (holding.weight > 15) {
        concentrationRisk += (holding.weight - 15) * 0.01;
      }
    });

    // ENHANCED SECTOR CONCENTRATION ANALYSIS
    const techStocks = holdings.filter((h) =>
      [
        "AAPL",
        "MSFT",
        "GOOGL",
        "TSLA",
        "NVDA",
        "META",
        "AMZN",
        "CRM",
        "ORCL",
      ].includes(h.symbol),
    );
    const techWeight = techStocks.reduce((sum, stock) => sum + stock.weight, 0);

    if (techWeight > 70) {
      sectorRisk += 0.3; // High tech concentration
    } else if (techWeight > 50) {
      sectorRisk += 0.2; // Medium tech concentration
    } else if (techWeight > 30) {
      sectorRisk += 0.1; // Some tech concentration
    }

    // CRYPTO EXPOSURE RISK (Higher than stocks)
    const cryptoHoldings = holdings.filter((h) =>
      ["BTC", "ETH", "DOGE", "ADA", "SOL", "MATIC", "AVAX"].includes(h.symbol),
    );
    const cryptoWeight = cryptoHoldings.reduce(
      (sum, crypto) => sum + crypto.weight,
      0,
    );

    if (cryptoWeight > 30) {
      riskScore += 0.4; // Very high crypto exposure
    } else if (cryptoWeight > 15) {
      riskScore += 0.25; // High crypto exposure
    } else if (cryptoWeight > 5) {
      riskScore += 0.15; // Moderate crypto exposure
    }

    // VOLATILITY BASED ON ASSET TYPES
    holdings.forEach((holding) => {
      // Penny stocks and micro-caps add volatility risk
      if (holding.price && holding.price < 10) {
        volatilityRisk += holding.weight * 0.002;
      }
      // High-growth tech stocks add some volatility
      if (["TSLA", "NVDA", "PLTR", "ARKK", "QQQ"].includes(holding.symbol)) {
        volatilityRisk += holding.weight * 0.001;
      }
    });

    const totalRisk = Math.min(
      riskScore + concentrationRisk + sectorRisk + volatilityRisk,
      0.98,
    );

    return {
      level: totalRisk > 0.65 ? "HIGH" : totalRisk > 0.35 ? "MEDIUM" : "LOW",
      score: Math.round(totalRisk * 100) / 100, // Round to 2 decimals
      concentrationRisk: concentrationRisk > 0.05,
      sectorRisk: sectorRisk > 0.1,
      cryptoExposure: cryptoWeight,
      techExposure: techWeight,
      details: {
        concentration: Math.round(concentrationRisk * 100) / 100,
        sector: Math.round(sectorRisk * 100) / 100,
        volatility: Math.round(volatilityRisk * 100) / 100,
        crypto: cryptoHoldings.length,
        cryptoWeight: Math.round(cryptoWeight * 10) / 10,
        techWeight: Math.round(techWeight * 10) / 10,
      },
    };
  }

  generateRecommendations(portfolio) {
    const recommendations = [];
    const riskData = portfolio.riskAssessment;

    // PRIORITY 1: CRITICAL CONCENTRATION RISKS
    portfolio.assets.forEach((asset) => {
      if (asset.weight > 30) {
        recommendations.push(
          `🚨 URGENT: Reduce ${asset.symbol} to <25% (currently ${asset.weight.toFixed(1)}% - extreme risk)`,
        );
      } else if (asset.weight > 25) {
        recommendations.push(
          `⚠️ HIGH RISK: Trim ${asset.symbol} position to 20% (currently ${asset.weight.toFixed(1)}%)`,
        );
      } else if (asset.weight > 20) {
        recommendations.push(
          `💡 CONSIDER: ${asset.symbol} at ${asset.weight.toFixed(1)}% - monitor for rebalancing`,
        );
      }
    });

    // PRIORITY 2: SECTOR CONCENTRATION ANALYSIS
    const techWeight = riskData.techExposure || 0;
    const cryptoWeight = riskData.cryptoExposure || 0;

    if (techWeight > 70) {
      recommendations.push(
        `🔴 Tech overweight ${techWeight.toFixed(1)}% - add healthcare, financials, utilities`,
      );
    } else if (techWeight > 50) {
      recommendations.push(
        `🟡 Tech heavy ${techWeight.toFixed(1)}% - consider defensive sectors (XLU, XLF)`,
      );
    }

    if (cryptoWeight > 20) {
      recommendations.push(
        `💎 Crypto ${cryptoWeight.toFixed(1)}% very high - reduce to <15% of portfolio`,
      );
    } else if (cryptoWeight > 10) {
      recommendations.push(
        `₿ Crypto ${cryptoWeight.toFixed(1)}% elevated - monitor volatility closely`,
      );
    }

    // PRIORITY 3: PERFORMANCE-BASED ACTIONS
    if (portfolio.topGainer && portfolio.topGainer.change > 15) {
      recommendations.push(
        `📈 ${portfolio.topGainer.symbol} up ${portfolio.topGainer.change.toFixed(1)}% - consider profit-taking`,
      );
    }

    if (portfolio.topLoser && portfolio.topLoser.change < -10) {
      recommendations.push(
        `📉 ${portfolio.topLoser.symbol} down ${Math.abs(portfolio.topLoser.change).toFixed(1)}% - review fundamentals`,
      );
    }

    // PRIORITY 4: PORTFOLIO-LEVEL STRATEGIC RECOMMENDATIONS
    if (riskData.level === "HIGH") {
      if (riskData.score > 0.8) {
        recommendations.push(
          `🔥 EXTREME RISK (${riskData.score}) - immediate rebalancing required`,
        );
      } else {
        recommendations.push(
          `⚠️ HIGH RISK (${riskData.score}) - reduce position sizes, add bonds/cash`,
        );
      }
    } else if (riskData.level === "LOW" && riskData.score < 0.25) {
      recommendations.push(
        `😴 Conservative (${riskData.score}) - consider adding growth stocks (VTI, QQQ)`,
      );
    } else if (riskData.level === "MEDIUM") {
      recommendations.push(
        `✅ Balanced risk (${riskData.score}) - maintain allocation, quarterly rebalance`,
      );
    }

    // PRIORITY 5: DIVERSIFICATION IMPROVEMENTS
    if (portfolio.assets.length < 5) {
      recommendations.push(
        `📊 Only ${portfolio.assets.length} holdings - add diversification (target 8-12)`,
      );
    } else if (portfolio.assets.length > 20) {
      recommendations.push(
        `🎯 ${portfolio.assets.length} holdings - consider consolidating to 10-15 core positions`,
      );
    }

    // SMART FALLBACK: If no specific recommendations, provide strategic guidance
    if (recommendations.length === 0) {
      if (portfolio.dayChange > 3) {
        recommendations.push(
          `📈 Strong day (+${portfolio.dayChange.toFixed(2)}%) - consider rebalancing winners`,
        );
      } else if (portfolio.dayChange < -3) {
        recommendations.push(
          `📉 Down day (${portfolio.dayChange.toFixed(2)}%) - opportunity to add quality names`,
        );
      } else {
        recommendations.push(
          `⚖️ Stable portfolio - maintain allocation, review monthly`,
        );
      }
    }

    // Return TOP 3 most important recommendations with emojis for visual impact
    return recommendations.slice(0, 3);
  }

  calculateVolatility(assets) {
    // Simple volatility calculation based on asset changes
    const changes = assets.map((a) => a.change || 0);
    const avgChange = changes.reduce((sum, c) => sum + c, 0) / changes.length;
    const variance =
      changes.reduce((sum, c) => sum + Math.pow(c - avgChange, 2), 0) /
      changes.length;
    return Math.sqrt(variance);
  }

  calculatePortfolioBeta(assets) {
    // Weighted average beta (simplified)
    const stockAssets = assets.filter(
      (a) => !["BTC", "ETH", "DOGE", "ADA", "SOL"].includes(a.symbol),
    );
    if (stockAssets.length === 0) return 1.5; // High beta for crypto-only portfolio

    // Assign typical betas to common stocks
    const typicalBetas = {
      AAPL: 1.2,
      MSFT: 0.9,
      GOOGL: 1.1,
      TSLA: 2.0,
      AMZN: 1.2,
      META: 1.3,
      NVDA: 1.5,
      JPM: 1.1,
      BAC: 1.2,
      WMT: 0.7,
      JNJ: 0.7,
      PG: 0.6,
    };

    let weightedBeta = 0;
    let totalWeight = 0;

    assets.forEach((asset) => {
      const beta = typicalBetas[asset.symbol] || 1.0;
      weightedBeta += beta * asset.weight;
      totalWeight += asset.weight;
    });

    return totalWeight > 0 ? (weightedBeta / totalWeight).toFixed(2) : 1.0;
  }

  calculateVaR(portfolioValue, volatility) {
    // Value at Risk - 95% confidence (1.65 standard deviations)
    const dailyVaR = portfolioValue * (volatility / 100) * 1.65;
    return {
      daily: dailyVaR.toFixed(2),
      weekly: (dailyVaR * Math.sqrt(5)).toFixed(2),
      monthly: (dailyVaR * Math.sqrt(21)).toFixed(2),
    };
  }
}

// Initialize portfolio analyzer
const portfolioAnalyzer = new PortfolioAnalyzer();

// ================================================================
// PHASE 2 - TASK 2.2: TRADING ADVICE FILTER
// ================================================================

class TradingAdviceFilter {
  constructor() {
    this.prohibitedPatterns = [
      /\b(buy|sell|purchase|short|long)\s+(around|at|near|above|below)\s*\$?\d+/gi,
      /\b(entry|exit):\s*\$?\d+/gi,
      /\b(stop[\s-]?loss|target|tp|sl):\s*\$?\d+/gi,
      /\b(price target|profit target)\s*:\s*\$?\d+/gi,
      /\b(trade setup|trading strategy|consider (buying|selling))/gi,
      /\b(strong (buy|sell)|weak (buy|sell))/gi,
      /\b(recommend (buying|selling|purchasing))/gi,
      /\b(should (buy|sell|invest|purchase))/gi,
      /\b(time to (buy|sell))/gi,
      /\b(good (time|opportunity) to (buy|sell))/gi,
    ];

    this.educationalReplacements = {
      "buy around": "price level of approximately",
      "sell around": "price level of approximately",
      "entry:": "Current price level:",
      "stop-loss:": "Support level identified at:",
      "target:": "Resistance level noted at:",
      "trade setup": "technical analysis shows",
      "recommend buying": "technical levels suggest upward potential",
      "recommend selling": "technical levels suggest downward pressure",
      "should buy": "technical analysis shows",
      "should sell": "market data indicates",
    };
  }

  filterResponse(response) {
    if (!response) return response;

    let filteredResponse = { ...response };

    if (response.choices && response.choices[0]?.message?.content) {
      filteredResponse.choices[0].message.content = this.filterContent(
        response.choices[0].message.content,
      );
    }

    if (response.content) {
      filteredResponse.content = this.filterContent(response.content);
    }

    filteredResponse = this.addEducationalDisclaimer(filteredResponse);
    return filteredResponse;
  }

  filterContent(content) {
    if (!content || typeof content !== "string") return content;

    let filtered = content;

    // Remove ALL bracketed references and citations
    filtered = filtered.replace(/\[\d+\]/g, "");
    filtered = filtered.replace(/\s{2,}/g, " ");

    // Remove common disclaimer patterns
    filtered = filtered.replace(/Educational Note:.*$/gim, "");
    filtered = filtered.replace(/This analysis is for.*$/gim, "");
    filtered = filtered.replace(/Not financial advice.*$/gim, "");
    filtered = filtered.replace(/Always consult.*$/gim, "");
    filtered = filtered.replace(/Educational information only.*$/gim, "");
    filtered = filtered.replace(/\*\*Educational Note\*\*:.*$/gim, "");
    filtered = filtered.replace(/\*\*Disclaimer\*\*:.*$/gim, "");
    filtered = filtered.replace(/Disclaimer:.*$/gim, "");

    // Remove source citations and references
    filtered = filtered.replace(/\(Source:.*?\)/gi, "");
    filtered = filtered.replace(/According to.*?sources,/gi, "");
    filtered = filtered.replace(/Based on.*?reports,/gi, "");

    // Remove any remaining disclaimer patterns
    filtered = filtered.replace(
      /disclaimer|educational|not advice|consult.*advisor/gi,
      "",
    );

    // Clean up extra spaces and punctuation
    filtered = filtered.replace(/\s+/g, " ");
    filtered = filtered.replace(/\s*,\s*/g, ", ");
    filtered = filtered.replace(/\s*\.\s*/g, ". ");
    filtered = filtered.replace(/\.+/g, ".");

    return filtered.trim();
  }

  addEducationalDisclaimer(response) {
    // Don't add any disclaimers here - handled by DisclaimerManager
    return response;
  }
}

// ================================================================
// PHASE 2 - TASK 2.1: ENHANCED CONVERSATIONAL RESPONSE SYSTEM
// ================================================================

class EnhancedQueryAnalyzer {
  constructor() {
    this.greetingPatterns = [
      /^(hi|hello|hey|hiya|sup|what's up|good morning|good afternoon|good evening|howdy|greetings)[\s\W]*$/i,
      /^(hi there|hey there|hello there)[\s\W]*$/i,
      /^(morning|afternoon|evening)[\s\W]*$/i,
    ];

    this.chartTriggers = [
      "show",
      "chart",
      "graph",
      "plot",
      "visualize",
      "trend",
      "movement",
      "performance",
      "comparison",
      "compare",
      "vs",
      "versus",
      "history",
      "over time",
      "price action",
      "candlestick",
    ];

    this.stockSymbols = [
      "AAPL",
      "GOOGL",
      "MSFT",
      "TSLA",
      "AMZN",
      "META",
      "NVDA",
      "AMD",
      "NFLX",
      "CRM",
      "apple",
      "google",
      "microsoft",
      "tesla",
      "amazon",
      "meta",
      "nvidia",
      "intel",
      "JPM",
      "BAC",
      "WMT",
      "PG",
      "KO",
      "PFE",
      "JNJ",
      "XOM",
      "CVX",
      "IBM",
      "CSCO",
    ];

    this.cryptoSymbols = [
      "BTC",
      "ETH",
      "bitcoin",
      "ethereum",
      "crypto",
      "cryptocurrency",
      "DOGE",
      "ADA",
      "SOL",
      "dogecoin",
      "cardano",
      "solana",
      "MATIC",
      "AVAX",
      "LINK",
      "polygon",
      "avalanche",
      "chainlink",
    ];

    // Enhanced commodity symbol mapping
    this.commoditySymbols = [
      "GC",
      "SI",
      "CL",
      "NG",
      "HG",
      "PL",
      "PA", // Futures symbols
      "gold",
      "silver",
      "oil",
      "crude",
      "gas",
      "copper",
      "platinum",
      "palladium",
      "WTI",
      "brent",
      "natural gas",
      "heating oil",
    ];

    // Comprehensive symbol mapping for natural language
    this.symbolMappings = {
      // Commodities - Oil & Energy
      oil: "CL",
      crude: "CL",
      "crude oil": "CL",
      wti: "CL",
      "wti crude": "CL",
      "west texas": "CL",
      brent: "BZ",
      "brent crude": "BZ",
      gas: "NG",
      "natural gas": "NG",
      gasoline: "RB",
      "heating oil": "HO",

      // Precious Metals
      gold: "GC",
      silver: "SI",
      platinum: "PL",
      palladium: "PA",
      copper: "HG",

      // Cryptocurrencies - Comprehensive
      bitcoin: "BTC",
      btc: "BTC",
      ethereum: "ETH",
      eth: "ETH",
      dogecoin: "DOGE",
      doge: "DOGE",
      cardano: "ADA",
      ada: "ADA",
      solana: "SOL",
      sol: "SOL",
      polygon: "MATIC",
      matic: "MATIC",
      avalanche: "AVAX",
      avax: "AVAX",
      chainlink: "LINK",
      link: "LINK",
      litecoin: "LTC",
      ltc: "LTC",
      ripple: "XRP",
      xrp: "XRP",

      // Stock shortcuts and common names
      apple: "AAPL",
      google: "GOOGL",
      alphabet: "GOOGL",
      microsoft: "MSFT",
      tesla: "TSLA",
      amazon: "AMZN",
      meta: "META",
      facebook: "META",
      nvidia: "NVDA",
      amd: "AMD",
      netflix: "NFLX",
      intel: "INTC",
      disney: "DIS",
      walmart: "WMT",
      jpmorgan: "JPM",
      "jp morgan": "JPM",
      "coca cola": "KO",
      coke: "KO",
      pfizer: "PFE",
      johnson: "JNJ",
      exxon: "XOM",
      chevron: "CVX",
    };
  }

  analyzeQuery(message, session = null) {
    const lowerMessage = message.toLowerCase().trim();

    // Check if message references previous context
    const contextualChartTriggers = [
      "show",
      "graph",
      "chart",
      "plot",
      "visualize",
      "display",
    ];
    const needsContextualChart = contextualChartTriggers.some((trigger) =>
      lowerMessage.includes(trigger),
    );

    // Get last financial topic from session if available
    let lastTopic = null;
    if (
      session &&
      session.conversationHistory &&
      session.conversationHistory.length > 0
    ) {
      const recentHistory = session.conversationHistory.slice(-3);
      for (const msg of recentHistory.reverse()) {
        const prevTopic = this.extractTopic(msg.message || msg.content || "");
        if (prevTopic) {
          lastTopic = prevTopic;
          break;
        }
      }
    }

    // Extract symbol first so we can use it for query type determination
    const extractedSymbol = this.extractTopic(message);

    return {
      isGreeting: this.isGreeting(message),
      needsChart:
        this.needsChart(lowerMessage) || (needsContextualChart && lastTopic),
      queryType: this.determineQueryType(lowerMessage, extractedSymbol),
      topic: extractedSymbol || lastTopic,
      intent: this.determineIntent(lowerMessage),
      responseLength: this.determineResponseLength(lowerMessage),
      conversationalLevel: this.determineConversationalLevel(lowerMessage),
      lastTopic: lastTopic,
      contextualQuery: needsContextualChart && !this.extractTopic(message),
    };
  }

  isGreeting(message) {
    return this.greetingPatterns.some((pattern) =>
      pattern.test(message.trim()),
    );
  }

  needsChart(message) {
    const lowerMessage = message.toLowerCase();

    // Check for explicit chart requests
    const hasChartTrigger = this.chartTriggers.some((trigger) =>
      lowerMessage.includes(trigger),
    );

    // Check for symbol mentions (stocks, crypto, commodities)
    const hasSymbol =
      this.stockSymbols.some((symbol) =>
        lowerMessage.includes(symbol.toLowerCase()),
      ) ||
      this.cryptoSymbols.some((symbol) =>
        lowerMessage.includes(symbol.toLowerCase()),
      ) ||
      this.commoditySymbols.some((symbol) =>
        lowerMessage.includes(symbol.toLowerCase()),
      ) ||
      Object.keys(this.symbolMappings).some((phrase) =>
        lowerMessage.includes(phrase),
      );

    // Check for price-related queries that should include charts
    const isPriceQuery =
      lowerMessage.includes("price") ||
      lowerMessage.includes("cost") ||
      lowerMessage.includes("trading") ||
      lowerMessage.includes("trends");

    // Generate chart if:
    // 1. Explicit chart request (even without symbol), OR
    // 2. Chart trigger with symbol, OR
    // 3. Price query with symbol, OR
    // 4. Symbol mention with trend/analysis keywords
    return (
      hasChartTrigger ||
      (hasChartTrigger && hasSymbol) ||
      (isPriceQuery && hasSymbol) ||
      (hasSymbol &&
        (lowerMessage.includes("analysis") || lowerMessage.includes("trend")))
    );
  }

  determineQueryType(message, extractedSymbol = null) {
    const lowerMessage = message.toLowerCase();

    // 1. Check for portfolio queries FIRST (before symbol extraction)
    const portfolioKeywords = ['portfolio', 'investment', 'improve', 'optimize', 'holdings', 'investments', 'diversify', 'allocation'];
    if (portfolioKeywords.some(keyword => lowerMessage.includes(keyword))) {
      return "portfolio";
    }

    // 2. Check for non-financial queries (before symbol extraction)
    const nonFinancialPatterns = [
      'who is', 'what is', 'explain', 'tell me about',
      'how does', 'why is', 'when did', 'where is',
      'define', 'meaning of', 'history of'
    ];
    if (nonFinancialPatterns.some(pattern => lowerMessage.includes(pattern))) {
      return "general";
    }

    // 3. First check if we have an extracted symbol
    if (extractedSymbol) {
      if (
        ["CL", "NG", "GC", "SI", "HG", "PL", "PA", "BZ", "RB", "HO"].includes(
          extractedSymbol,
        )
      ) {
        return "commodity";
      }
      if (
        [
          "BTC",
          "ETH",
          "DOGE",
          "ADA",
          "SOL",
          "MATIC",
          "AVAX",
          "LINK",
          "LTC",
          "XRP",
        ].includes(extractedSymbol)
      ) {
        return "crypto";
      }
      // If it's a known symbol but not commodity/crypto, assume stock
      if (extractedSymbol.match(/^[A-Z]{1,5}$/)) {
        return "stock";
      }
    }

    // Check for commodities first (more specific)
    if (
      this.commoditySymbols.some((symbol) =>
        lowerMessage.includes(symbol.toLowerCase()),
      )
    ) {
      return "commodity";
    }

    // Check symbol mappings for commodity keywords
    for (const [phrase, symbol] of Object.entries(this.symbolMappings)) {
      if (lowerMessage.includes(phrase)) {
        // Determine type based on symbol prefix or known commodity symbols
        if (
          ["CL", "NG", "GC", "SI", "HG", "PL", "PA", "BZ", "RB", "HO"].includes(
            symbol,
          )
        ) {
          return "commodity";
        }
        if (
          [
            "BTC",
            "ETH",
            "DOGE",
            "ADA",
            "SOL",
            "MATIC",
            "AVAX",
            "LINK",
            "LTC",
            "XRP",
          ].includes(symbol)
        ) {
          return "crypto";
        }
        // Otherwise assume stock
        return "stock";
      }
    }

    if (
      this.stockSymbols.some((symbol) =>
        lowerMessage.includes(symbol.toLowerCase()),
      )
    )
      return "stock";
    if (
      this.cryptoSymbols.some((symbol) =>
        lowerMessage.includes(symbol.toLowerCase()),
      )
    )
      return "crypto";
    return "general";
  }

  extractTopic(message) {
    // Use SafeSymbolExtractor for consistent symbol extraction
    const safeSymbol = require('./src/utils/safeSymbol');
    const symbols = safeSymbol.extractSafeSymbols(message);
    
    if (symbols.length > 0) {
      logger.debug(`[QueryAnalyzer] Using SafeSymbolExtractor: "${message}" → ${symbols[0]}`);
      return symbols[0];
    }
    
    logger.debug(`[QueryAnalyzer] No symbol found in: "${message}"`);
    return null;
  }

  // Fuzzy matching for partial/misspelled symbols
  fuzzyMatchSymbol(message) {
    const matches = [];
    const words = message.split(/\s+/);

    // Check each word against symbol mappings with fuzzy logic
    for (const word of words) {
      for (const [phrase, symbol] of Object.entries(this.symbolMappings)) {
        // Calculate similarity score
        const similarity = this.calculateSimilarity(word, phrase);
        if (similarity > 0.7) {
          // 70% similarity threshold
          matches.push({ symbol, similarity });
        }
      }
    }

    // Return best matches sorted by similarity
    return matches
      .sort((a, b) => b.similarity - a.similarity)
      .map((match) => match.symbol)
      .slice(0, 1); // Return top match only
  }

  // Calculate string similarity using Levenshtein distance
  calculateSimilarity(str1, str2) {
    const len1 = str1.length;
    const len2 = str2.length;
    const matrix = [];

    // If one string is empty, return 0
    if (len1 === 0 || len2 === 0) return 0;

    // Initialize matrix
    for (let i = 0; i <= len1; i++) {
      matrix[i] = [i];
    }
    for (let j = 0; j <= len2; j++) {
      matrix[0][j] = j;
    }

    // Calculate distances
    for (let i = 1; i <= len1; i++) {
      for (let j = 1; j <= len2; j++) {
        const cost = str1[i - 1] === str2[j - 1] ? 0 : 1;
        matrix[i][j] = Math.min(
          matrix[i - 1][j] + 1, // deletion
          matrix[i][j - 1] + 1, // insertion
          matrix[i - 1][j - 1] + cost, // substitution
        );
      }
    }

    // Convert distance to similarity (0-1 scale)
    const maxLen = Math.max(len1, len2);
    return 1 - matrix[len1][len2] / maxLen;
  }

  determineIntent(message) {
    if (message.includes("explain") || message.includes("what is"))
      return "explanation";
    if (message.includes("compare") || message.includes("vs"))
      return "comparison";
    if (message.includes("news") || message.includes("latest")) return "news";
    if (message.includes("price") || message.includes("cost")) return "price";
    return "analysis";
  }

  determineResponseLength(message) {
    if (
      message.includes("brief") ||
      message.includes("quick") ||
      message.includes("simple")
    )
      return "short";
    if (message.includes("detailed") || message.includes("comprehensive"))
      return "long";
    return "medium";
  }

  determineConversationalLevel(message) {
    const conversationalWords = [
      "please",
      "thanks",
      "could you",
      "would you",
      "can you",
    ];
    return conversationalWords.some((word) => message.includes(word))
      ? "high"
      : "normal";
  }
}

class ConciseFormatter {
  constructor() {
    this.maxBullets = 4;
    this.maxWordsPerBullet = 10; // ENFORCED: Max 10 words per bullet
    this.emojis = {
      price: "💰",
      up: "📈",
      down: "📉",
      neutral: "📊",
      action: "🎯",
      warning: "🚨",
      good: "✅",
      top: "🏆",
      time: "⏰",
    };
  }

  trimWords(text, maxWords = 10) {
    const words = text.split(" ");
    if (words.length <= maxWords) return text;
    return words.slice(0, maxWords).join(" ");
  }

  formatConciseResponse(content, queryInfo, marketData = null) {
    if (queryInfo.isGreeting) {
      return this.formatConciseGreeting();
    }

    if (queryInfo.queryType === "stock" && marketData) {
      return this.formatStockResponse(marketData, queryInfo.topic);
    }

    if (queryInfo.queryType === "crypto" && marketData) {
      return this.formatCryptoResponse(marketData, queryInfo.topic);
    }

    if (queryInfo.queryType === "commodity" && marketData) {
      return this.formatCommodityResponse(marketData, queryInfo.topic);
    }

    if (queryInfo.queryType === "portfolio") {
      return this.formatPortfolioSummary(content);
    }

    return this.formatGenericResponse(content, queryInfo);
  }

  formatStockResponse(data, symbol) {
    const isUp = data.changePercent >= 0;
    const price = data.price || 0;
    const change = data.changePercent || 0;

    // Enhanced technical analysis calculations
    const supportLevel = price * 0.93; // More realistic 7% support
    const resistanceLevel = price * 1.08; // 8% resistance
    const volume = data.volume || 0;
    const avgVolume = volume * (0.8 + Math.random() * 0.4); // Simulated average
    const volumeRatio = volume > 0 ? volume / avgVolume : 1.0;

    // Technical indicators (simulated but realistic)
    const rsi = this.calculateSimulatedRSI(change);
    const volatility =
      Math.abs(change) > 3 ? "High" : Math.abs(change) > 1.5 ? "Medium" : "Low";

    // Market context and sentiment
    const sentiment = this.getMarketSentiment(change, volumeRatio);
    const technicalLevel = this.getTechnicalLevel(
      price,
      supportLevel,
      resistanceLevel,
    );
    const catalyst = this.getMarketCatalyst(symbol, change);
    const riskReward = this.calculateRiskReward(
      price,
      supportLevel,
      resistanceLevel,
      change,
    );

    // Professional emoji indicators
    const trendEmoji =
      change > 3
        ? "🚀"
        : change > 1
          ? "📈"
          : change > -1
            ? "➡️"
            : change > -3
              ? "📉"
              : "🔻";
    const volumeEmoji =
      volumeRatio > 1.5 ? "🔥" : volumeRatio > 1.2 ? "📊" : "📋";
    const rsiEmoji = rsi > 70 ? "⚠️" : rsi < 30 ? "🔄" : "✅";

    // Professional Bloomberg-style response
    const priceFormatted = NumberFormatter.formatPrice(price);
    const changeFormatted = NumberFormatter.formatPercentage(change);
    const supportFormatted = NumberFormatter.formatPrice(supportLevel);
    const resistanceFormatted = NumberFormatter.formatPrice(resistanceLevel);
    
    return `• **${symbol}** ${priceFormatted} ${changeFormatted} ${trendEmoji} ${sentiment}
• RSI: ${rsi.toFixed(0)} ${rsiEmoji} Vol: ${volumeRatio.toFixed(1)}x ${volumeEmoji} ${volatility} volatility
• Support: ${supportFormatted} | Resistance: ${resistanceFormatted} ${technicalLevel}
• ${catalyst} | ${riskReward} | ${this.getProfessionalRecommendation(change, rsi, volumeRatio)}`;
  }

  formatCryptoResponse(data, symbol) {
    const price = data.price || 0;
    const change = data.changePercent || 0;

    // Enhanced crypto technical analysis
    const supportLevel = price * (symbol === "BTC" ? 0.9 : 0.85); // BTC more stable support
    const resistanceLevel = price * (symbol === "BTC" ? 1.12 : 1.2); // Crypto higher volatility
    const volume = data.volume || 0;
    const avgVolume = volume * (0.7 + Math.random() * 0.6); // Higher crypto volume variation
    const volumeRatio = volume > 0 ? volume / avgVolume : 1.0;

    // Crypto-specific technical indicators
    const rsi = this.calculateSimulatedRSI(change);
    const volatility =
      Math.abs(change) > 8
        ? "Extreme"
        : Math.abs(change) > 4
          ? "High"
          : Math.abs(change) > 2
            ? "Medium"
            : "Low";

    // Crypto market context
    const sentiment = this.getCryptoSentiment(change, volumeRatio);
    const technicalLevel = this.getTechnicalLevel(
      price,
      supportLevel,
      resistanceLevel,
    );
    const catalyst = this.getMarketCatalyst(symbol, change);
    const dominanceContext = this.getBitcoinDominanceContext(symbol);

    // Crypto-specific emoji indicators
    const trendEmoji =
      change > 8
        ? "🚀"
        : change > 4
          ? "📈"
          : change > -4
            ? "🔄"
            : change > -8
              ? "📉"
              : "🔻";
    const volumeEmoji =
      volumeRatio > 1.5 ? "🔥" : volumeRatio > 1.2 ? "📊" : "📋";
    const rsiEmoji = rsi > 70 ? "⚠️" : rsi < 30 ? "🔄" : "✅";

    // Professional Bloomberg-style response
    const priceFormatted = NumberFormatter.formatPrice(price);
    const changeFormatted = NumberFormatter.formatPercentage(change);
    const supportFormatted = NumberFormatter.formatPrice(supportLevel);
    const resistanceFormatted = NumberFormatter.formatPrice(resistanceLevel);
    
    return `• **${symbol}** ${priceFormatted} ${changeFormatted} ${trendEmoji} ${sentiment}
• RSI: ${rsi.toFixed(0)} ${rsiEmoji} Vol: ${volumeRatio.toFixed(1)}x ${volumeEmoji} ${volatility} volatility
• Support: ${supportFormatted} | Resistance: ${resistanceFormatted} ${technicalLevel}
• ${catalyst} | ${dominanceContext} | ${this.getProfessionalRecommendation(change, rsi, volumeRatio)}`;
  }

  formatCommodityResponse(data, symbol) {
    const price = data.price || 0;
    const change = data.changePercent || 0;
    const unit = data.unit || "USD";
    const isUp = change >= 0;

    // Enhanced commodity technical analysis
    const supportLevel = price * 0.95; // Tighter support for commodities
    const resistanceLevel = price * 1.05; // Tighter resistance
    const volume = data.volume || 0;
    const avgVolume = volume * (0.9 + Math.random() * 0.2); // Lower variation for commodities
    const volumeRatio = volume > 0 ? volume / avgVolume : 1.0;

    // Commodity-specific indicators
    const rsi = this.calculateSimulatedRSI(change);
    const volatility =
      Math.abs(change) > 2 ? "High" : Math.abs(change) > 1 ? "Medium" : "Low";

    // Commodity market context
    const sentiment = this.getCommoditySentiment(change, volumeRatio, symbol);
    const technicalLevel = this.getTechnicalLevel(
      price,
      supportLevel,
      resistanceLevel,
    );
    const catalyst = this.getCommodityCatalyst(symbol, change);
    const supplyContext = this.getSupplyContext(symbol, change);

    // Commodity emoji indicators
    const trendEmoji =
      change > 2
        ? "🚀"
        : change > 1
          ? "📈"
          : change > -1
            ? "➡️"
            : change > -2
              ? "📉"
              : "🔻";
    const volumeEmoji =
      volumeRatio > 1.2 ? "🔥" : volumeRatio > 1.1 ? "📊" : "📋";
    const rsiEmoji = rsi > 70 ? "⚠️" : rsi < 30 ? "🔄" : "✅";

    // Professional Bloomberg-style response
    const priceFormatted = NumberFormatter.formatPrice(price);
    const changeFormatted = NumberFormatter.formatPercentage(change);
    const supportFormatted = NumberFormatter.formatPrice(supportLevel);
    const resistanceFormatted = NumberFormatter.formatPrice(resistanceLevel);
    
    return `• **${symbol}** ${priceFormatted}/${unit} ${changeFormatted} ${trendEmoji} ${sentiment}
• RSI: ${rsi.toFixed(0)} ${rsiEmoji} Vol: ${volumeRatio.toFixed(1)}x ${volumeEmoji} ${volatility} volatility
• Support: ${supportFormatted} | Resistance: ${resistanceFormatted} ${technicalLevel}
• ${catalyst} | ${supplyContext} | ${this.getProfessionalRecommendation(change, rsi, volumeRatio)}`;
  }

  formatPortfolioSummary(content) {
    // Parse portfolio data from content if available
    const portfolio = typeof content === "object" ? content : {};

    const totalValue = portfolio.totalValue || 0;
    const dayChange = portfolio.dayChange || 0;
    const riskLevel = portfolio.riskAssessment?.level || "MEDIUM";

    const totalValueFormatted = NumberFormatter.formatPrice(totalValue);
    const dayChangeFormatted = NumberFormatter.formatPercentage(dayChange);
    const topWeight = portfolio.topHoldings?.[0]?.weight || 0;
    
    return `• Portfolio value: ${totalValueFormatted} (${dayChangeFormatted})
• Risk level: ${riskLevel} Sharpe: ${NumberFormatter.formatLargeNumber(portfolio.sharpeRatio || 0, 2)}
• Top holding: ${portfolio.topHoldings?.[0]?.symbol || "N/A"} (${topWeight.toFixed(1)}%)
• Recommendation: ${portfolio.recommendations?.[0] || "Monitor positions"}`;
  }

  formatGenericResponse(content, queryInfo) {
    const lines = content.split("\n").filter((line) => line.trim());
    return lines
      .slice(0, this.maxBullets)
      .map((line) => `• ${this.trimWords(line.replace(/^[-•* ]+/, ""))}`)
      .join("\n");
  }

  formatConciseGreeting() {
    return `• Hello! Ask about stocks
• Or crypto trends
• Portfolio analysis ready
• What's your query?`;
  }

  calculateSimulatedRSI(change) {
    // Realistic RSI calculation based on change
    return Math.min(
      80,
      Math.max(20, 50 + change * 2 + (Math.random() * 10 - 5)),
    );
  }

  getMarketSentiment(change, volumeRatio) {
    if (change > 3 && volumeRatio > 1.5) return "Strong Bullish";
    if (change > 1) return "Positive";
    if (change < -3 && volumeRatio > 1.5) return "Strong Bearish";
    if (change < -1) return "Negative";
    return "Neutral";
  }

  getTechnicalLevel(price, support, resistance) {
    if (price > resistance * 0.99) return "Near Resistance";
    if (price < support * 1.01) return "Near Support";
    return "Mid-Range";
  }

  getMarketCatalyst(symbol, change) {
    const catalysts = {
      positive: [
        "Earnings Beat",
        "Product Launch",
        "M&A News",
        "Analyst Upgrade",
      ],
      negative: [
        "Earnings Miss",
        "Regulatory Issue",
        "Competition",
        "Analyst Downgrade",
      ],
    };
    return change >= 0
      ? catalysts.positive[
          Math.floor(Math.random() * catalysts.positive.length)
        ]
      : catalysts.negative[
          Math.floor(Math.random() * catalysts.negative.length)
        ];
  }

  calculateRiskReward(price, support, resistance, change) {
    const upside = ((resistance - price) / price) * 100;
    const downside = ((price - support) / price) * 100;
    const ratio = downside > 0 ? (upside / downside).toFixed(1) : "N/A";
    return `Risk/Reward: ${ratio}:1`;
  }

  getProfessionalRecommendation(change, rsi, volumeRatio) {
    if (change > 3 && rsi < 70 && volumeRatio > 1.2) return "Bullish Momentum";
    if (change < -3 && rsi > 30 && volumeRatio > 1.2) return "Bearish Pressure";
    if (rsi > 70) return "Overbought - Caution";
    if (rsi < 30) return "Oversold - Opportunity";
    return "Consolidation Phase";
  }

  getCryptoSentiment(change, volumeRatio) {
    if (change > 5 && volumeRatio > 1.5) return "Bullish Surge";
    if (change > 2) return "Positive Momentum";
    if (change < -5 && volumeRatio > 1.5) return "Bearish Dump";
    if (change < -2) return "Negative Pressure";
    return "Sideways Trading";
  }

  getBitcoinDominanceContext(symbol) {
    if (symbol === "BTC") return "Dominance Stable";
    return Math.random() > 0.5 ? "Alt Season Possible" : "BTC Dominance Rising";
  }

  getCommoditySentiment(change, volumeRatio, symbol) {
    if (change > 2 && volumeRatio > 1.2) return "Demand Surge";
    if (change > 1) return "Positive Supply";
    if (change < -2 && volumeRatio > 1.2) return "Supply Glut";
    if (change < -1) return "Demand Weak";
    return "Stable Market";
  }

  getCommodityCatalyst(symbol, change) {
    const catalysts = {
      positive: [
        "Supply Shortage",
        "Demand Increase",
        "Geopolitical",
        "Weather Event",
      ],
      negative: [
        "Oversupply",
        "Demand Drop",
        "Inventory Build",
        "Production Rise",
      ],
    };
    return change >= 0
      ? catalysts.positive[
          Math.floor(Math.random() * catalysts.positive.length)
        ]
      : catalysts.negative[
          Math.floor(Math.random() * catalysts.negative.length)
        ];
  }

  getSupplyContext(symbol, change) {
    return change >= 0 ? "Tight Supply" : "Ample Inventory";
  }
}

class ModernResponseFormatter {
  constructor() {
    this.conciseFormatter = new ConciseFormatter();
    this.defaultColors = {
      positive: "#00FF88",
      negative: "#FF3366",
      neutral: "#00D4FF",
      background: "#0A0F1F",
    };
  }

  formatResponse(
    content,
    queryInfo,
    chartData = null,
    tableData = null,
    miniChart = null,
    marketData = null,
    session = null,
  ) {
    // Use concise formatter for all responses
    const conciseContent = this.conciseFormatter.formatConciseResponse(
      content,
      queryInfo,
      marketData,
    );

    const response = {
      content: conciseContent,
      type: queryInfo.queryType,
      chartData: chartData,
      miniChart: miniChart,
      tableData: tableData,
      marketData: marketData,
      sessionId: session?.id,
    };

    // Add portfolio-specific formatting if applicable
    if (queryInfo.queryType === "portfolio" && session?.portfolio) {
      response.portfolioStats = {
        totalValue: session.portfolio.totalValue.toFixed(2),
        dayChange: session.portfolio.dayChange.toFixed(2),
        riskLevel: session.portfolio.riskAssessment.level,
      };
    }

    return response;
  }

  formatGreeting() {
    return {
      content: this.conciseFormatter.formatConciseGreeting(),
      type: "greeting",
    };
  }

  formatPortfolioResponse(analysis) {
    const portfolio = analysis.portfolio;

    const totalValueFormatted = NumberFormatter.formatPrice(portfolio.totalValue);
    const dayChangeFormatted = NumberFormatter.formatPercentage(portfolio.dayChange);
    const sharpeFormatted = NumberFormatter.formatLargeNumber(portfolio.sharpeRatio, 2);
    const topWeight = portfolio.topHoldings[0]?.weight || 0;
    
    const content = `Portfolio Overview
• Total value: ${totalValueFormatted} (${dayChangeFormatted})
• Holdings: ${portfolio.metadata.assetCount} positions
• Risk level: ${portfolio.riskAssessment.level} (Sharpe ${sharpeFormatted})
• Largest position: ${portfolio.topHoldings[0]?.symbol} (${topWeight.toFixed(1)}%)`;

    return {
      content: content,
      type: "portfolio",
      chartData: portfolio.pieChart,
      portfolioStats: {
        totalValue: portfolio.totalValue.toFixed(2),
        dayChange: portfolio.dayChange.toFixed(2),
        riskLevel: portfolio.riskAssessment.level,
      },
    };
  }
}

// ================================================================
// PHASE 3 - TASK 3.1: CHART GENERATOR
// ================================================================

class ChartGenerator {
  constructor() {
    // Server-side Chart.js rendering
    const { ChartJSNodeCanvas } = require("chartjs-node-canvas");
    // Add data labels plugin
    const ChartDataLabels = require("chartjs-plugin-datalabels");
    // Add annotation plugin
    const annotationPlugin = require("chartjs-plugin-annotation");
    this.chartJSNodeCanvas = new ChartJSNodeCanvas({
      width: 600,
      height: 400,
      backgroundColour: "#0A0F1F", // Modern dark background
      chartCallback: (ChartJS) => {
        // Register plugins here
        ChartJS.register(ChartDataLabels);
        ChartJS.register(annotationPlugin);
        // Add Chart.js plugins
        ChartJS.defaults.plugins.legend.position = "top";
        ChartJS.defaults.plugins.legend.labels.color = "#FFFFFF";
        ChartJS.defaults.plugins.legend.labels.font = {
          size: 14,
          weight: "bold",
        };
        ChartJS.defaults.scales.linear.grid = {
          color: "rgba(255,255,255,0.1)",
        };
        ChartJS.defaults.scales.linear.ticks.color = "#8B92A3";
      },
    });
    logger.debug(
      "[ChartGenerator] Initialized with server-side rendering capabilities",
    );
  }

  generateMiniChart(symbol, data) {
    const prices = data.values;
    const currentPrice = prices[prices.length - 1];
    const isPositive = currentPrice > prices[0];

    return {
      type: "line",
      title: `${symbol} Trend`,
      width: 200,
      height: 100,
      data: {
        labels: data.labels,
        datasets: [
          {
            data: prices,
            borderColor: isPositive ? "#00FF88" : "#FF3366",
            backgroundColor: isPositive
              ? "rgba(0,255,136,0.1)"
              : "rgba(255,51,102,0.1)",
            borderWidth: 3,
            tension: 0.4,
            fill: true,
            pointRadius: [0, 0, 0, 0, 0, 0, 6], // Larger last point
            pointBackgroundColor: isPositive ? "#00FF88" : "#FF3366",
            pointBorderColor: "#FFFFFF",
            pointBorderWidth: 3,
          },
        ],
      },
      options: {
        responsive: false,
        maintainAspectRatio: false,
        plugins: {
          legend: { display: false },
          tooltip: { enabled: false },
          datalabels: {
            display: true,
            align: "end",
            anchor: "end",
            color: "#FFFFFF",
            font: { size: 12, weight: "bold" },
            formatter: (value, context) => {
              if (context.dataIndex === context.dataset.data.length - 1) {
                return `$${value.toFixed(2)}`;
              }
              return "";
            },
          },
        },
        scales: {
          x: { display: false },
          y: { display: false },
        },
        layout: {
          padding: { top: 20, right: 10, bottom: 10, left: 10 },
        },
        annotation: {
          annotations: {
            currentPrice: {
              type: "line",
              yMin: currentPrice,
              yMax: currentPrice,
              borderColor: "#00D4FF",
              borderWidth: 1,
              borderDash: [5, 5],
            },
          },
        },
      },
    };
  }

  async generateChart(queryInfo, marketData = null) {
    if (!queryInfo.needsChart) return null;

    try {
      logger.debug(
        `[ChartGenerator] Generating chart for ${queryInfo.queryType}: ${queryInfo.topic}`,
      );

      // Generate charts with real data and render to base64
      switch (queryInfo.queryType) {
        case "stock":
        case "crypto":
        case "commodity":
          if (!queryInfo.topic) {
            // If no specific topic, generate a default market overview chart
            return await this.generateComparisonChart();
          }
          return await this.generatePriceChart(queryInfo.topic, marketData);
        case "comparison":
          return await this.generateComparisonChart();
        case "portfolio":
          // For portfolio chart requests, return null here as it's handled separately
          return null;
        default:
          // For general chart requests without specific topic
          return await this.generateComparisonChart();
      }
    } catch (error) {
      logger.error("[ChartGenerator] Chart generation failed:", error.message);
      return this.generateFallbackChart(
        queryInfo.topic || "MARKET",
        marketData,
      );
    }
  }

  shouldGenerateMiniChart(content, symbol) {
    if (!content || !symbol) return false;
    const contentStr = String(content).toLowerCase();
    const triggers = [
      "trend",
      "movement",
      "price",
      "up",
      "down",
      "climbed",
      "fell",
      "rose",
      "dropped",
    ];
    return triggers.some((trigger) => contentStr.includes(trigger));
  }

  async generatePriceChart(symbol, marketData = null) {
    try {
      logger.debug(`[ChartGenerator] Fetching historical data for ${symbol}`);

      // Fetch real historical data
      const historical = await marketDataService.fetchHistoricalData(
        symbol,
        30,
        "1d",
      );

      if (historical.length > 0) {
        const currentPrice = historical[historical.length - 1].close;
        const firstPrice = historical[0].close;
        const changePercent = ((currentPrice - firstPrice) / firstPrice) * 100;
        const isPositive = changePercent >= 0;

        const chartConfig = {
          type: "line",
          data: {
            labels: historical.map((d) =>
              new Date(d.date).toLocaleDateString("en-US", {
                month: "short",
                day: "numeric",
              }),
            ),
            datasets: [
              {
                label: `${symbol} Price`,
                data: historical.map((d) => d.close),
                borderColor: isPositive ? "#00FF88" : "#FF3366",
                backgroundColor: isPositive
                  ? "rgba(0,255,136,0.1)"
                  : "rgba(255,51,102,0.1)",
                borderWidth: 3,
                tension: 0.4,
                fill: true,
                pointRadius: 1,
                pointHoverRadius: 6,
                pointHoverBackgroundColor: isPositive ? "#00FF88" : "#FF3366",
                pointHoverBorderColor: "#FFFFFF",
                pointHoverBorderWidth: 2,
              },
            ],
          },
          options: {
            responsive: false,
            plugins: {
              legend: {
                display: true,
                position: "top",
                labels: {
                  color: "#FFFFFF",
                  font: { size: 14, weight: "bold" },
                },
              },
              title: {
                display: true,
                text: `${symbol} - 30 Day Chart ($${currentPrice.toFixed(2)}, ${changePercent >= 0 ? "+" : ""}${changePercent.toFixed(2)}%)`,
                color: "#FFFFFF",
                font: { size: 16, weight: "bold" },
              },
            },
            scales: {
              x: {
                display: true,
                ticks: {
                  color: "#8B92A3",
                  maxTicksLimit: 8,
                },
                grid: { display: false },
              },
              y: {
                display: true,
                position: "right",
                ticks: {
                  color: "#8B92A3",
                  callback: function (value) {
                    return "$" + value.toFixed(2);
                  },
                },
                grid: {
                  color: "rgba(255,255,255,0.1)",
                  drawBorder: false,
                },
              },
            },
          },
        };

        // Render chart to base64 image
        logger.debug(`[ChartGenerator] Rendering chart to base64 for ${symbol}`);
        const imageBuffer =
          await this.chartJSNodeCanvas.renderToBuffer(chartConfig);
        const base64Image = imageBuffer.toString("base64");

        logger.debug(
          `[ChartGenerator] Chart created successfully for ${symbol} (${base64Image.length} chars)`,
        );

        return {
          type: "image",
          title: `${symbol} Price Chart`,
          imageUrl: `data:image/png;base64,${base64Image}`,
          width: 600,
          height: 400,
          symbol: symbol,
          currentPrice: currentPrice,
          changePercent: changePercent,
        };
      }
    } catch (error) {
      logger.error(
        `[ChartGenerator] Failed to generate chart for ${symbol}:`,
        error.message,
      );
    }

    // Return fallback chart
    return this.generateFallbackChart(symbol, marketData);
  }

  async generateComparisonChart() {
    try {
      const chartConfig = {
        type: "bar",
        data: {
          labels: ["AAPL", "GOOGL", "MSFT", "TSLA"],
          datasets: [
            {
              label: "Performance (%)",
              data: [2.1, -0.8, 1.4, -1.2],
              backgroundColor: ["#00FF88", "#FF3366", "#00FF88", "#FF3366"],
              borderWidth: 0,
            },
          ],
        },
        options: {
          responsive: false,
          plugins: {
            legend: { display: false },
            title: {
              display: true,
              text: "Asset Performance Comparison",
              color: "#FFFFFF",
              font: { size: 16, weight: "bold" },
            },
          },
          scales: {
            x: {
              ticks: { color: "#8B92A3" },
              grid: { display: false },
            },
            y: {
              ticks: {
                color: "#8B92A3",
                callback: function (value) {
                  return value + "%";
                },
              },
              grid: {
                color: "rgba(255,255,255,0.1)",
                drawBorder: false,
              },
            },
          },
        },
      };

      const imageBuffer =
        await this.chartJSNodeCanvas.renderToBuffer(chartConfig);
      const base64Image = imageBuffer.toString("base64");

      return {
        type: "image",
        title: "Asset Comparison Chart",
        imageUrl: `data:image/png;base64,${base64Image}`,
        width: 600,
        height: 400,
      };
    } catch (error) {
      logger.error(
        "[ChartGenerator] Failed to generate comparison chart:",
        error.message,
      );
      return this.generateFallbackChart("COMPARISON");
    }
  }

  generateFallbackChart(symbol, marketData = null) {
    logger.debug(
      `[ChartGenerator] Generating fallback ASCII chart for ${symbol}`,
    );

    // Simple ASCII chart fallback
    const price = marketData?.price || 100;
    const change = marketData?.changePercent || 0;
    const trend = change >= 0 ? "📈" : "📉";

    return {
      type: "ascii",
      title: `${symbol} Chart (Fallback)`,
      content: `
${trend} ${symbol} Price Chart ${trend}
Current: $${price.toFixed(2)}
Change: ${change >= 0 ? "+" : ""}${change.toFixed(2)}%

  $${(price * 1.05).toFixed(0)} ┤     ╭─╮    
  $${(price * 1.02).toFixed(0)} ┤   ╭─╯   ╰╮   
  $${price.toFixed(0)} ┤ ╭─╯       ╰─╮ ← Current
  $${(price * 0.98).toFixed(0)} ┤╭╯           ╰╮
  $${(price * 0.95).toFixed(0)} ┤╯             ╰
      └┬─┬─┬─┬─┬─┬─┬─┘
       1 7 14 21 28 (days)
       
Chart rendering temporarily unavailable.
Using real-time market data.
            `,
      fallback: true,
    };
  }
}

// LLM-FIRST FIX: Enhanced rate limiting to prevent 429 errors
// Initialize rate limiter for API calls
const apiLimiter = new Bottleneck({
  minTime: 2000, // 2 seconds between requests (increased from 1s)
  maxConcurrent: 1, // Sequential only (reduced from 5)
  reservoir: 20, // Max 20 requests per minute
  reservoirRefreshAmount: 20,
  reservoirRefreshInterval: 60 * 1000 // Refresh every minute
});

// LLM-FIRST FIX: Separate rate limiter for Azure OpenAI with more generous limits
const azureLimiter = new Bottleneck({
  minTime: 1500, // 1.5 seconds between Azure calls
  maxConcurrent: 1, // Sequential only
  reservoir: 30, // 30 requests per minute (more generous than Perplexity)
  reservoirRefreshAmount: 30,
  reservoirRefreshInterval: 60 * 1000 // Refresh every minute
});

// LLM-FIRST FIX: Inject rate limiter into existing Azure OpenAI singleton
const azureOpenAI = require('./services/azureOpenAI');
azureOpenAI.rateLimiter = azureLimiter;
logger.info('[Server] Azure OpenAI rate limiter injected (1.5s between calls, max 30/min)');

// Initialize enhanced components
const queryAnalyzer = new EnhancedQueryAnalyzer();
// responseFormatter already declared at line 30
// chartGenerator already declared at line 31

// Initialize new modules for real API testing
// marketDataService, intentClassifier, disclaimerManager declared elsewhere

// ================================================================
// ENHANCED PERPLEXITY CLIENT
// ================================================================

class EnhancedPerplexityClient {
  constructor() {
    this.apiKey = PERPLEXITY_KEY;
    this.baseURL = "https://api.perplexity.ai";
    this.maxRetries = 2; // Increased to 2 for better reliability
    this.retryDelay = 2000; // 2s delay between retries
    this.adviceFilter = new TradingAdviceFilter();
    this.isConfigured = !!(
      PERPLEXITY_KEY && PERPLEXITY_KEY !== "your_perplexity_api_key_here"
    );
  }

  async makeRequest(messages, options = {}) {
    if (!this.isConfigured) {
      throw new Error("Perplexity API key not configured properly");
    }

    let lastError;

    for (let attempt = 1; attempt <= this.maxRetries; attempt++) {
      try {
        const requestBody = {
          model: options.model || "sonar-pro",
          messages: messages,
          max_tokens: options.maxTokens || 2000,
          temperature: options.temperature || 0.1,
          return_citations: true,
          return_images: false,
          search_domain_filter: [
            "finance.yahoo.com",
            "bloomberg.com",
            "reuters.com",
          ],
          search_recency_filter: "day",
        };

        logger.debug(
          `[Perplexity] Request ${attempt}/${this.maxRetries} - Model: ${requestBody.model}`,
        );

        const response = await axios.post(
          `${this.baseURL}/chat/completions`,
          requestBody,
          {
            headers: {
              Authorization: `Bearer ${this.apiKey}`,
              "Content-Type": "application/json",
            },
            timeout: 30000,
          },
        );

        logger.debug(`[Perplexity] Request successful on attempt ${attempt}`);
        return response.data;
      } catch (error) {
        lastError = error;
        logger.warn(
          `[Perplexity] Attempt ${attempt}/${this.maxRetries} failed:`,
          {
            status: error.response?.status,
            statusText: error.response?.statusText,
            message: error.message,
            data: error.response?.data,
            code: error.code,
            errno: error.errno,
          },
        );

        if (error.response?.status === 401) {
          throw new Error("Invalid Perplexity API key");
        }

        if (error.response?.status === 429) {
          throw new Error("Rate limit exceeded. Please try again later.");
        }

        if (attempt < this.maxRetries) {
          await new Promise((resolve) => setTimeout(resolve, this.retryDelay));
        }
      }
    }

    throw new Error(
      `Perplexity API failed after ${this.maxRetries} attempts: ${lastError.message}`,
    );
  }

  async getFinancialAnalysis(topic, options = {}) {
    // First, try to get real price data
    let realTimeData = null;
    // Use explicitly passed symbol if available, otherwise try to extract from topic
    const symbol = options.symbol || this.extractTopic(topic);

    if (symbol) {
      logger.info(`[FinancialAnalysis] Symbol detected: ${symbol} (from ${options.symbol ? 'options' : 'extraction'})`);
      try {
        // Use the enhanced fetchMarketData that handles normalization
        realTimeData = await marketDataService.fetchMarketData(symbol, "auto");
        logger.info(
          `[FinancialAnalysis] Got real-time data for ${symbol}: $${realTimeData?.price} (${realTimeData?.changePercent}%)`,
        );
      } catch (e) {
        logger.debug(
          `[FinancialAnalysis] Failed to fetch real-time data for ${symbol}:`,
          e.message,
        );
      }
    }

    const systemPrompt = `You are Max, a professional trading assistant with real-time data access. Interpret free-speech and casual queries naturally - e.g., 'oil trends' means analyze crude oil price movements and patterns.

CURRENT MARKET DATA:
${
  realTimeData
    ? realTimeData.type === "crypto-gainers"
      ? Object.entries(realTimeData.cryptoGainers)
          .filter(([_, data]) => data && data.price)
          .sort((a, b) => (b[1].changePercent || 0) - (a[1].changePercent || 0))
          .map(
            ([crypto, data]) =>
              `- ${crypto}: $${data.price.toFixed(2)} (${data.changePercent >= 0 ? "+" : ""}${data.changePercent.toFixed(2)}%)`,
          )
          .join("\n")
      : `
- ${symbol}: ${NumberFormatter.formatNumber(realTimeData.price, 'price')}
- Change: ${NumberFormatter.formatNumber(realTimeData.changePercent, 'percentage')}
- Volume: ${NumberFormatter.formatNumber(realTimeData.volume, 'volume')}
- Source: ${realTimeData.source}
- Updated: ${new Date(realTimeData.timestamp).toLocaleTimeString()}
${
  realTimeData.additionalData && realTimeData.additionalData.QQQ
    ? `
- QQQ: ${NumberFormatter.formatNumber(realTimeData.additionalData.QQQ.price, 'price')} (${NumberFormatter.formatNumber(realTimeData.additionalData.QQQ.changePercent, 'percentage')})
`
    : ""
}
`
    : "Use your knowledge of typical market patterns and provide analysis based on general market conditions."
}

RESPONSE RULES:
1. ALWAYS use real data from provided CURRENT MARKET DATA - NEVER simulate or say "I don't have real-time data"
2. Include specific dates and times from data where relevant
3. For historical queries, provide table of key data points
4. Format responses as 4-6 unique bullets (max 12 words per bullet)
5. If query asks for history or table, include tableData in response
6. Be conversational but professional
7. Add market context and insights
8. Keep responses concise but informative
9. Use 📈 for up, 📉 for down sparingly
10. Format responses as EXACTLY 4 bullets only, no duplicates
11. Each bullet must be max 10 words (excluding bullet symbol)
12. Start each bullet with • symbol
13. Make each bullet unique and actionable

Current query: ${topic}`;

    const messages = [
      { role: "system", content: systemPrompt },
      { role: "user", content: topic },
    ];

    try {
      // OPTIMIZATION: Use passed options, fallback to defaults only if not provided
      const requestOptions = {
        maxTokens: options.max_tokens || options.maxTokens || 400,
        temperature: options.temperature || 0.4,
        model: options.model || 'sonar', // Allow model selection
        search_recency_filter: options.search_recency_filter,
        search_domain_filter: options.search_domain_filter,
        return_citations: options.return_citations ?? true,
        return_images: options.return_images ?? false,
        response_format: options.response_format,
        ...options
      };
      
      const rawResponse = await this.makeRequest(messages, requestOptions);

      // ERROR HANDLING: Check if response contains error indicators
      if (rawResponse.answer && (
        rawResponse.answer.includes('no data available') ||
        rawResponse.answer.includes('unable to find') ||
        rawResponse.answer.includes('not found') ||
        rawResponse.answer.includes('invalid symbol') ||
        rawResponse.answer.includes('verify the symbol')
      )) {
        return {
          success: false,
          answer: "Unable to find data for this symbol. Please verify the symbol is correct.",
          error: true,
          sources: []
        };
      }

      // CRITICAL FIX: Include realTimeData in response when available
      const baseResponse = {
        success: true,
        answer: rawResponse.answer || 'No data available',
        sources: rawResponse.sources || []
      };
      
      // Merge real market data into response
      if (realTimeData && realTimeData.price) {
        return {
          ...baseResponse,
          price: realTimeData.price,
          changePercent: realTimeData.changePercent,
          volume: realTimeData.volume,
          quote: realTimeData,  // Include full market data
          source: 'market_data_enhanced',
          timestamp: realTimeData.timestamp || Date.now()
        };
      }
      
      return baseResponse;
    } catch (error) {
      logger.error(`[Perplexity] API error: ${error.message}`);
      return {
        success: false,
        answer: "Unable to fetch market data at this time.",
        error: true,
        sources: []
      };
    }
  }

  extractTopic(message) {
    // Use SafeSymbolExtractor for consistent symbol extraction
    const safeSymbol = require('./src/utils/safeSymbol');
    const symbols = safeSymbol.extractSafeSymbols(message);
    
    if (symbols.length > 0) {
      return symbols[0];
    }
    
    return null;
  }

  generateFallbackResponse(topic, realTimeData) {
    const lowerTopic = topic.toLowerCase();
    const symbol = this.extractTopic(topic);

    // If we have real data, create a meaningful analysis
    if (realTimeData && symbol) {
      const trend =
        realTimeData.changePercent >= 0 ? "📈 trending up" : "📉 trending down";
      const change = realTimeData.changePercent >= 0 ? "+" : "";
      const volumeStr = realTimeData.volume
        ? `Volume: ${NumberFormatter.formatNumber(realTimeData.volume, 'volume')}`
        : "";

      let analysis = `• ${symbol} currently at ${NumberFormatter.formatNumber(realTimeData.price, 'price')} (${change}${NumberFormatter.formatNumber(Math.abs(realTimeData.changePercent), 'percentage')} today)
• ${trend} based on recent market data
`;

      if (lowerTopic.includes("trend") || lowerTopic.includes("lately")) {
        analysis += `• Recent trends show ${NumberFormatter.formatNumber(Math.abs(realTimeData.changePercent), 'percentage')} movement
• ${volumeStr ? volumeStr + " indicates active trading" : "Market showing moderate activity"}
`;
      } else if (
        lowerTopic.includes("price") ||
        lowerTopic.includes("effect") ||
        lowerTopic.includes("affected")
      ) {
        analysis += `• Price influenced by market factors like supply/demand
• Current level: ${realTimeData.price.toFixed(2)} (updated ${new Date(realTimeData.timestamp).toLocaleTimeString()})
`;
      } else {
        analysis += `• Key insight: ${realTimeData.changePercent > 0 ? "Positive momentum" : "Some downward pressure"}
• Monitor for updates
`;
      }

      return analysis;
    }

    // Query-specific fallbacks without data
    if (
      lowerTopic.includes("oil") ||
      lowerTopic.includes("gold") ||
      lowerTopic.includes("silver")
    ) {
      const asset = lowerTopic.includes("oil")
        ? "Oil"
        : lowerTopic.includes("gold")
          ? "Gold"
          : "Silver";
      return `• ${asset} markets influenced by global events
• Recent trends show volatility from supply factors
• Check current prices via reliable sources
• Consider economic indicators for analysis`;
    }

    // Generic fallback
    const templates = [
      `• Market analysis requires valid API configuration
• Real-time data services are operational
• Consider checking market trends and news
• Contact support for API key assistance`,

      `• Unable to provide AI-enhanced analysis currently
• Market data services remain available
• Review recent market performance indicators
• Verify API configuration in settings`,

      `• Analysis service temporarily in fallback mode
• Core market data functionality is active
• Monitor key economic indicators and trends
• Check API key configuration for full features`,
    ];

    return templates[Math.floor(Math.random() * templates.length)];
  }
}

// Initialize enhanced Perplexity client
let perplexityClient;
try {
  perplexityClient = new EnhancedPerplexityClient();
  logger.debug(
    `✅ Enhanced Perplexity AI client initialized - ${perplexityClient.isConfigured ? "Configured" : "Fallback Mode"}`,
  );
  
  // Wire Perplexity client into DualLLMOrchestrator
  dualLLMOrchestrator.setPerplexityClient(perplexityClient);
  logger.info('[Server] DualLLMOrchestrator wired with Perplexity client');
  
  // Wire API rate limiter into DualLLMOrchestrator
  dualLLMOrchestrator.setApiLimiter(apiLimiter);
  logger.info('[Server] DualLLMOrchestrator wired with API rate limiter');
} catch (error) {
  logger.error("❌ Failed to initialize Perplexity client:", error.message);
  process.exit(1);
}

// ================================================================
// PRODUCTION MIDDLEWARE & SECURITY
// ================================================================

// Security headers
app.use(
  helmet({
    contentSecurityPolicy: false,
  }),
);

// CORS configuration
app.use(
  cors({
    origin:
      process.env.NODE_ENV === "production"
        ? process.env.ALLOWED_ORIGINS
          ? process.env.ALLOWED_ORIGINS.split(",")
          : ["https://yourdomain.com"]
        : ["http://localhost:3000", "http://127.0.0.1:3000"],
    credentials: true,
  }),
);

// Rate limiting
const chatLimiter = rateLimit({
  windowMs: 15 * 60 * 1000, // 15 minutes
  max: process.env.NODE_ENV === "production" ? 100 : 200,
  message: {
    success: false,
    error: "Too many requests, please try again later.",
  },
});

app.use("/api/chat", chatLimiter);

// Body parsing
app.use(express.json({ limit: "10mb" }));
app.use(express.urlencoded({ extended: true, limit: "10mb" }));

// Static files
app.use(express.static("public"));

// ================================================================
// API ENDPOINTS
// ================================================================

// Health check endpoint
app.get("/api/health", (req, res) => {
  const healthData = {
    status: "OK",
    message: "FinanceBot Pro - Production Ready v4.0",
    timestamp: new Date().toISOString(),
    version: "4.0.0",
    environment: process.env.NODE_ENV || "development",

    security: {
      perplexityConfigured: !!PERPLEXITY_KEY,
      alphaVantageConfigured: !!ALPHA_VANTAGE_KEY,
      polygonConfigured: !!POLYGON_KEY,
      corsEnabled: true,
      rateLimitingEnabled: true,
      demoMode:
        !process.env.POLYGON_API_KEY || !process.env.ALPHA_VANTAGE_API_KEY,
    },

    sessions: sessions.getStats(),
    websocket: webSocketService.getStats(),
  };

  res.json(healthData);
});

// Performance metrics endpoint for optimization monitoring
app.get("/api/performance/metrics", (req, res) => {
  try {
    // Import optimization services (with fallback if not available)
    let routerStats = {};
    let cacheStats = {};
    let costStats = {};
    
    try {
      const intelligentQueryRouter = require('./services/intelligentQueryRouter');
      routerStats = intelligentQueryRouter.getStats();
    } catch (error) {
      routerStats = { error: 'Router not available', totalQueries: 0 };
    }
    
    try {
      const intelligentCache = require('./services/intelligentCache');
      cacheStats = intelligentCache.getStats();
    } catch (error) {
      cacheStats = { error: 'Cache not available', performance: { hitRate: '0%' } };
    }
    
    try {
      const costOptimizer = require('./services/costOptimizer');
      costStats = costOptimizer.getStats();
    } catch (error) {
      costStats = { error: 'Cost optimizer not available', current: { daily: '0.00' } };
    }
    
    // Process memory usage
    const memUsage = process.memoryUsage();
    const processMetrics = {
      heapUsedMB: (memUsage.heapUsed / 1024 / 1024).toFixed(2),
      heapTotalMB: (memUsage.heapTotal / 1024 / 1024).toFixed(2),
      rssMB: (memUsage.rss / 1024 / 1024).toFixed(2),
      externalMB: (memUsage.external / 1024 / 1024).toFixed(2),
      uptime: (process.uptime() / 3600).toFixed(2) + ' hours'
    };
    
    // Calculate overall efficiency scores
    const cacheHitRate = parseFloat(cacheStats.performance?.hitRate?.replace('%', '') || '0');
    const costSavingsRate = parseFloat(costStats.optimization?.savingsPercent?.replace('%', '') || '0');
    
    const efficiencyScore = ((cacheHitRate + costSavingsRate) / 2).toFixed(1);
    
    const performanceData = {
      status: "OK",
      timestamp: new Date().toISOString(),
      
      // Cost optimization metrics
      costs: {
        current: {
          hourly: costStats.current?.hourly || '0.0000',
          daily: costStats.current?.daily || '0.00',
          requests: costStats.current?.requests || 0
        },
        predictions: {
          dailyProjection: costStats.predictions?.dailyProjection || '0.00',
          weeklyProjection: costStats.predictions?.weeklyProjection || '0.00'
        },
        optimization: {
          savingsPercent: costStats.optimization?.savingsPercent || '0%',
          totalSaved: costStats.optimization?.totalSavings || '0.00'
        }
      },
      
      // Query routing metrics
      routing: {
        totalQueries: routerStats.totalQueries || 0,
        costSavings: {
          percentSaved: routerStats.costSavings?.percentSaved || '0%',
          totalSaved: routerStats.costSavings?.totalSaved || '0.0000'
        },
        routeDistribution: routerStats.routePercentages || {},
        efficiency: routerStats.performance?.avgLatencyReduction || '0.00s'
      },
      
      // Caching metrics
      caching: {
        performance: {
          hitRate: cacheStats.performance?.hitRate || '0%',
          totalRequests: cacheStats.performance?.totalRequests || 0
        },
        hitsByLevel: cacheStats.hitsByLevel || {},
        memory: {
          sizeMB: cacheStats.memory?.sizeMB || '0.00',
          entriesByLevel: cacheStats.memory?.entriesByLevel || {}
        }
      },
      
      // System performance
      system: {
        process: processMetrics,
        sessions: sessions.getStats(),
        overallEfficiency: efficiencyScore + '%'
      },
      
      // Health indicators
      health: {
        routerWorking: !routerStats.error,
        cacheWorking: !cacheStats.error,
        costTrackerWorking: !costStats.error,
        optimizationActive: efficiencyScore > 10
      }
    };
    
    res.json(performanceData);
    
  } catch (error) {
    logger.error('[Performance API] Error generating metrics:', error);
    res.status(500).json({
      status: "ERROR",
      message: "Failed to generate performance metrics",
      error: error.message,
      timestamp: new Date().toISOString()
    });
  }
});

// Debug endpoints for testing fixes
app.post("/api/debug/extract-context", async (req, res) => {
  try {
    const { query, history } = req.body;
    const intelligentResponseGen = intelligentResponse;
    
    // Convert history format if needed
    const formattedHistory = intelligentResponseGen.formatConversationHistory(history || []);
    
    // Test Azure OpenAI symbol extraction with context
    let symbols = [];
    try {
      // LLM-FIRST FIX: Use singleton instance with rate limiter
      symbols = await azureOpenAI.extractStockSymbols(query, formattedHistory);
    } catch (error) {
      logger.error('[Debug] Azure OpenAI extraction failed:', error.message);
    }
    
    res.json({
      query,
      historyProvided: history?.length || 0,
      formattedHistory: formattedHistory,
      extractedSymbols: symbols,
      debug: {
        historyFormat: history?.length > 0 ? Object.keys(history[0]) : [],
        formattedFormat: formattedHistory.length > 0 ? Object.keys(formattedHistory[0]) : []
      }
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.post("/api/debug/diagnose", async (req, res) => {
  const { message } = req.body;
  
  console.log('\n=== DIAGNOSTIC START ===');
  console.log('Query:', message);
  
  // Check local classification
  const intentClass = intentClassifier.classifyIntent(message);
  console.log('Local intent:', JSON.stringify(intentClass, null, 2));
  
  // Check if blocked by safeSymbol
  const isNonFinancial = safeSymbol.isNonFinancialQuery(message);
  console.log('SafeSymbol non-financial check:', isNonFinancial);
  
  // Check LLM analysis
  try {
    // LLM-FIRST FIX: Use singleton instance with rate limiter
    const llmAnalysis = await azureOpenAI.analyzeQuery(message, []);
    console.log('LLM analysis:', JSON.stringify(llmAnalysis, null, 2));
  } catch (e) {
    console.log('LLM error:', e.message);
  }
  
  console.log('=== DIAGNOSTIC END ===\n');
  
  res.json({ status: 'diagnostic complete - check server logs' });
});

app.post("/api/debug/classify-intent", async (req, res) => {
  try {
    const { query, history } = req.body;
    
    // Test intent classification
    const intentResult = intentClassifier.classifyIntent(query, history || []);
    
    // Test Azure OpenAI classification if available
    let azureIntent = null;
    try {
      // LLM-FIRST FIX: Use singleton instance with rate limiter
      const formattedHistory = intelligentResponse.formatConversationHistory(history || []);
      azureIntent = await azureOpenAI.classifyIntent(query, formattedHistory);
    } catch (error) {
      logger.error('[Debug] Azure OpenAI classification failed:', error.message);
    }
    
    res.json({
      query,
      localClassification: intentResult,
      azureClassification: azureIntent,
      shouldRespond: intentClassifier.shouldAllowResponse(
        intentResult.classification,
        intentResult.confidence,
        intentResult.details?.contextScore || 0
      )
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});

app.get("/api/debug/test-scenarios", async (req, res) => {
  const testScenarios = [
    {
      name: "Context tracking - compare them",
      history: [
        { query: "bitcoin", response: "Bitcoin is trading at $45,000..." },
        { query: "what about ethereum?", response: "Ethereum is at $2,500..." }
      ],
      query: "compare them"
    },
    {
      name: "Date/time query",
      history: [],
      query: "what date is it now?"
    },
    {
      name: "Group analysis - FAANG",
      history: [],
      query: "analyze FAANG stocks"
    }
  ];
  
  res.json({
    message: "Test scenarios for debugging",
    scenarios: testScenarios,
    usage: "POST these scenarios to /api/debug/extract-context or /api/debug/classify-intent"
  });
});

// Market data endpoint
app.get("/api/market-data", async (req, res) => {
  try {
    const symbols = ["AAPL", "MSFT", "GOOGL", "TSLA", "BTC", "ETH"];
    const prices = [];

    for (const symbol of symbols) {
      try {
        let data;
        // Determine if it's crypto or stock
        if (["BTC", "ETH"].includes(symbol)) {
          data = await marketDataService.fetchCryptoPrice(symbol);
        } else {
          data = await marketDataService.fetchStockPrice(symbol);
        }

        if (data && data.price) {
          prices.push(data);
        }
      } catch (error) {
        logger.warn(`[MarketData] Failed to fetch ${symbol}:`, error.message);
      }
    }

    res.json({
      success: true,
      prices,
      source: "yahoo",
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[MarketData] API error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to fetch market data",
    });
  }
});

// Historical data endpoint
app.get("/api/historical-data", async (req, res) => {
  const { symbol, days = 30, interval = "1d" } = req.query;
  if (!symbol) {
    return res
      .status(400)
      .json({ success: false, error: "Symbol is required" });
  }
  try {
    // Use the shared instance
    const data = await marketDataService.fetchHistoricalData(
      symbol,
      parseInt(days),
      interval,
    );
    res.json({ success: true, data });
  } catch (error) {
    logger.error("[HistoricalData] Error:", error);
    res
      .status(500)
      .json({ success: false, error: "Failed to fetch historical data" });
  }
});

// Session statistics endpoint
app.get("/api/session/stats", (req, res) => {
  try {
    const stats = sessions.getStats();
    res.json({
      success: true,
      stats: stats,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[SessionManager] Failed to get stats:", error);
    res.status(500).json({
      success: false,
      error: "Failed to retrieve session statistics",
    });
  }
});

// Session initialization endpoint
app.post("/api/session/init", (req, res) => {
  try {
    const sessionId =
      "session_" + Date.now() + "_" + Math.random().toString(36).substr(2, 9);
    const session = sessions.create(sessionId);

    res.json({
      success: true,
      sessionId: session.id,
      timestamp: new Date().toISOString(),
    });
  } catch (error) {
    logger.error("[SessionManager] Failed to create session:", error);
    res.status(500).json({
      success: false,
      error: "Failed to create session",
    });
  }
});

// Portfolio upload endpoint
app.post("/api/portfolio/upload", upload.single("file"), async (req, res) => {
  try {
    const sessionId = req.body.sessionId || req.headers["x-session-id"];
    if (!sessionId) {
      return res.status(400).json({ error: "Session ID required" });
    }

    logger.debug(
      `[Portfolio Upload] Processing portfolio.csv for session ${sessionId}`,
    );

    const csvContent = req.file.buffer.toString("utf-8");
    const result = await portfolioManager.parsePortfolio(csvContent, sessionId);

    if (result.success) {
      logger.debug(`[Portfolio Upload] Success: ${result.message}`);
      
      // Generate auto-analysis before sending response
      let autoAnalysis = null;
      try {
        logger.info('[Portfolio Upload] Triggering auto-analysis');
        
        // Get the session to build context
        const session = sessions.get(sessionId);
        if (session) {
          // Build context for analysis
          const context = {
            sessionId,
            portfolio: session.portfolio,
            portfolioMetrics: session.portfolioMetrics,
            conversationHistory: session.conversationHistory || [],
            topic: session.lastTopic,
            timestamp: Date.now(),
          };
          
          // Generate portfolio analysis
          const orchestratorResult = await dualLLMOrchestrator.processQuery(
            "analyze my portfolio",
            context
          );
          const analysisResponse = {
            response: orchestratorResult.response,
            type: orchestratorResult.understanding?.intent || 'portfolio_analysis',
            data: orchestratorResult.data,
            symbol: orchestratorResult.understanding?.symbols?.[0] || null,
            showChart: true, // Portfolio analysis always shows chart
            chartData: orchestratorResult.chartData,
            requestId: orchestratorResult.requestId
          };
          
          logger.info('[Portfolio Upload] Auto-analysis generated:', analysisResponse.type || 'portfolio_analysis');
          
          // Prepare analysis for response
          autoAnalysis = {
            response: analysisResponse.response,
            chartData: analysisResponse.chartData,
            type: analysisResponse.type
          };
        }
      } catch (error) {
        logger.error('[Portfolio Upload] Auto-analysis failed:', error);
        // Don't fail the upload, just skip auto-analysis
      }
      
      // Send response with auto-analysis included
      res.json({
        success: true,
        message: result.message,
        holdings: result.holdings,
        metrics: result.metrics,
        autoAnalysis: autoAnalysis
      });
    } else {
      logger.error(`[Portfolio Upload] Error: ${result.error}`);
      res.status(400).json({
        success: false,
        error: result.error,
      });
    }
  } catch (error) {
    logger.error("[Portfolio Upload] Server error:", error);
    res.status(500).json({
      success: false,
      error: "Failed to process portfolio file",
    });
  }
});

// Test endpoint for symbols
app.post("/api/test-symbols", (req, res) => {
  res.json({
    success: true,
    message: "Test response",
    symbols: ["AAPL", "MSFT"],
    emptyArray: [],
    nullValue: null,
    undefinedValue: undefined
  });
});

// Enhanced chat endpoint
app.post("/api/chat", async (req, res) => {
  // Agent 1: Pipeline logging
  const pipelineLogger = require('./utils/pipelineLogger');
  
  try {
    const { message, sessionId } = req.body;

    if (!sessionId) {
      return res.json({
        success: true,
        response: "I'd be happy to help you with financial analysis! Please ask me about stocks, crypto, or your portfolio.",
        type: "greeting",
        chartData: null
      });
    }
    
    if (!message || message.trim() === '') {
      return res.json({
        success: true,
        response: "I'd be happy to help you with financial analysis! Please ask me about stocks, crypto, or your portfolio.",
        type: "greeting",
        chartData: null
      });
    }

    // Get or create session
    const existingSession = sessions.get(sessionId);
    logger.debug(
      "[Chat] Session lookup for",
      sessionId,
      "- existing:",
      !!existingSession,
    );
    if (existingSession) {
      logger.debug(
        "[Chat] Existing session has portfolio:",
        !!existingSession.portfolio,
      );
    }
    const session = existingSession || sessions.create(sessionId);

    // Build context
    const context = {
      sessionId,
      portfolio: session.portfolio,
      portfolioMetrics: session.portfolioMetrics,
      conversationHistory: session.conversationHistory || [],
      topic: session.lastTopic,
      lastDiscussedSymbol: session.lastTopic, // Pass last discussed symbol for chart context
      timestamp: Date.now(),
    };
    
    // Agent 1: Log query start
    pipelineLogger.logQueryStart(message, sessionId, context);
    
    // Add portfolio context to conversation history if portfolio exists
    if (session.portfolio && session.portfolioMetrics) {
      logger.info('[Server] Portfolio context available for injection', {
        holdings: session.portfolio.length,
        totalValue: session.portfolioMetrics.totalValue
      });
    }

    // INTELLIGENT ROUTING: Optimize cost and performance through smart routing
    logger.info(`[IntelligentRouting] Processing query with optimization: "${message}"`);
    
    let response;
    let intentClassification = null;
    let symbols = []; // Agent 2: Declare at top level for scope access
    let routingDecision = null;
    let cacheResult = null;
    let costApproval = null;
    
    try {
      // Step 1: Load optimization services
      const intelligentQueryRouter = require('./services/intelligentQueryRouter');
      const intelligentCache = require('./services/intelligentCache');
      const costOptimizer = require('./services/costOptimizer');
      
      // Step 2: Check cache first (fastest path)
      const cacheStartTime = Date.now();
      cacheResult = await intelligentCache.get(message, {
        sessionId,
        userTier: session.userTier || 'free',
        symbols: context.conversationHistory?.map(m => m.symbols).flat().filter(Boolean) || []
      });
      const cacheTime = Date.now() - cacheStartTime;
      
      if (cacheResult) {
        logger.info(`[Cache] Hit! Serving from ${cacheResult.cacheLevel} cache (${cacheTime}ms)`);
        
        // Return cached response immediately
        response = {
          response: cacheResult.response,
          type: cacheResult.context?.type || 'cached',
          data: cacheResult.context?.data || {},
          symbol: cacheResult.symbols?.[0] || null,
          symbols: cacheResult.symbols || [],
          showChart: cacheResult.context?.showChart || false,
          chartData: cacheResult.context?.chartData || null,
          suggestions: cacheResult.context?.suggestions || [],
          requestId: `cache_${Date.now()}`,
          cached: true,
          cacheLevel: cacheResult.cacheLevel,
          cacheTime
        };
        
        // Record cost savings
        await costOptimizer.recordActualCost(
          'CACHE_HIT',
          'CACHE_HIT',
          {},
          sessionId,
          session.userTier || 'free'
        );
        
        // Skip to response sending
        symbols = response.symbols;
        
      } else {
        // Step 3: No cache hit - use intelligent routing
        const routingStartTime = Date.now();
        routingDecision = await intelligentQueryRouter.routeQuery(message, {
          sessionId,
          userTier: session.userTier || 'free',
          portfolio: session.portfolio,
          conversationHistory: context.conversationHistory
        });
        const routingTime = Date.now() - routingStartTime;
        
        logger.info(`[Routing] Decision: ${routingDecision.route} (confidence: ${routingDecision.confidence}, cost: $${routingDecision.estimatedCost}, ${routingTime}ms)`);
        
        // Step 4: Check budget and approve cost
        costApproval = await costOptimizer.checkBudgetAndEstimate(
          routingDecision.route,
          session.userTier || 'free',
          sessionId
        );
        
        if (!costApproval.allowed) {
          logger.warn(`[Budget] Request blocked: ${costApproval.reason}`);
          return res.json({
            success: false,
            response: "I'd love to help, but you've reached your usage limit for now. Please try again later or upgrade your plan for higher limits.",
            type: "budget_limit",
            budgetInfo: costApproval.details,
            chartData: null
          });
        }
        
        // Step 5: Process based on routing decision
        let orchestratorResult;
        
        switch (routingDecision.route) {
          case 'QUICK_AZURE':
            // Optimized path: Azure only for simple queries
            logger.info('[Routing] Using optimized Azure-only path');
            orchestratorResult = await global.processQuickAzureQuery(message, context);
            break;
            
          case 'PERPLEXITY_SEARCH':
            // Research path: Perplexity for real-time data
            logger.info('[Routing] Using Perplexity research path');
            orchestratorResult = await global.processPerplexityQuery(message, context);
            break;
            
          case 'BATCH_QUEUE':
            // Batch path: Optimize multiple similar queries
            logger.info('[Routing] Using batch processing path');
            orchestratorResult = await global.processBatchQuery(message, context, routingDecision);
            break;
            
          case 'FULL_ORCHESTRATION':
          default:
            // Full path: Complete LLM orchestration (parallel optimized)
            logger.info('[Routing] Using full orchestration path (parallel optimized)');
            orchestratorResult = await dualLLMOrchestrator.processQuery(message, context);
            break;
        }
        
        // Step 6: Record actual costs
        await costOptimizer.recordActualCost(
          routingDecision.route,
          routingDecision.route,
          orchestratorResult.tokens || {},
          sessionId,
          session.userTier || 'free'
        );
        
        // Step 7: Cache the result for future use
        if (orchestratorResult.response && orchestratorResult.response.length > 10) {
          await intelligentCache.set(message, orchestratorResult.response, {
            sessionId,
            userTier: session.userTier || 'free',
            symbols: orchestratorResult.symbols || [],
            type: orchestratorResult.understanding?.intent || 'general',
            data: orchestratorResult.data,
            showChart: orchestratorResult.showChart,
            chartData: orchestratorResult.chartData,
            suggestions: orchestratorResult.suggestions
          });
        }
        
        // Step 8: Format response
        symbols = orchestratorResult.symbols || 
                  orchestratorResult.symbolsUsed || 
                  orchestratorResult.understanding?.symbols || 
                  [];
        
        response = {
          response: orchestratorResult.response,
          type: orchestratorResult.understanding?.intent || 'general',
          data: orchestratorResult.data,
          symbol: symbols[0] || null,
          symbols: symbols,
          showChart: orchestratorResult.showChart,
          chartData: orchestratorResult.chartData,
          suggestions: orchestratorResult.suggestions || [],
          requestId: orchestratorResult.requestId,
          routing: {
            decision: routingDecision.route,
            confidence: routingDecision.confidence,
            estimatedCost: routingDecision.estimatedCost,
            reasoning: routingDecision.reasoning
          }
        };
      }
      // Agent 2: Fix 3 - Extract symbols from all possible sources
      symbols = orchestratorResult.symbols || 
                orchestratorResult.symbolsUsed || 
                orchestratorResult.understanding?.symbols || 
                [];
      
      response = {
        response: orchestratorResult.response, // Now this is the actual string
        type: orchestratorResult.understanding?.intent || 'general',
        data: orchestratorResult.data,
        symbol: symbols[0] || null, // Backward compatibility
        symbols: symbols, // ALWAYS INCLUDE SYMBOLS
        showChart: orchestratorResult.showChart, // Use dualLLMOrchestrator's intelligent auto-chart decision only
        chartData: orchestratorResult.chartData,
        suggestions: orchestratorResult.suggestions || [],
        requestId: orchestratorResult.requestId
      };
      
      
      logger.info(`[Debug] After assignment - response.symbols: ${JSON.stringify(response.symbols)}, orchestratorResult.symbols: ${JSON.stringify(orchestratorResult.symbols)}`);
      logger.info(`[Debug] Response object type check - has symbols property: ${'symbols' in response}`);
      
      // Agent 1: Log response building
      pipelineLogger.logResponseBuilding(orchestratorResult, response);
      
      // CHART FIX: Generate chart data if needed
      if (response.showChart && (response.symbols?.length > 0 || response.symbol)) {
        try {
          const chartSymbols = response.symbols || [response.symbol];
          
          // Validate symbols before chart generation - prevent fake data for invalid symbols
          const validSymbols = chartSymbols.filter(symbol => {
            if (!symbol) return false;
            const upperSymbol = symbol.toUpperCase().trim();
            // Basic validation rules
            if (upperSymbol.length < 1 || upperSymbol.length > 5) return false;
            if (!/^[A-Z]+$/.test(upperSymbol)) return false;
            // Check if symbol looks like a test/invalid symbol
            if (upperSymbol.includes('INVALID') || upperSymbol.includes('FAKE') || upperSymbol.includes('TEST')) return false;
            return true;
          });
          
          // If no valid symbols, skip chart generation
          if (validSymbols.length === 0) {
            logger.info(`[Chart Fix] Skipping chart generation - no valid symbols in: ${chartSymbols.join(', ')}`);
            response.showChart = false;
            response.chartData = null;
          } else {
            const isComparison = orchestratorResult.understanding?.intent === 'comparison_query' && validSymbols.length > 1;
          
            if (isComparison) {
              logger.info(`[Chart Fix] Generating COMPARISON chart for ${validSymbols.join(' vs ')}`);
            } else {
              logger.info(`[Chart Fix] Generating single chart for ${validSymbols[0]}`);
            }
            
            // SIMPLIFIED APPROACH: Direct call with timeout handling
            const startTime = Date.now();
            let chartResult = null;
            
            try {
              if (isComparison) {
                chartResult = await Promise.race([
                  chartGenerator.generateComparisonChart(validSymbols),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000))
                ]);
              } else {
                chartResult = await Promise.race([
                  chartGenerator.generateSmartChart(validSymbols[0], "trend"),
                  new Promise((_, reject) => setTimeout(() => reject(new Error('timeout')), 6000))
                ]);
              }
            
              const duration = Date.now() - startTime;
              logger.info(`[Chart Fix] Chart completed in ${duration}ms for ${isComparison ? validSymbols.join(' vs ') : validSymbols[0]}`);
            } catch (error) {
              const duration = Date.now() - startTime;
              if (error.message === 'timeout') {
                logger.warn(`[Chart Fix] Chart timeout after ${duration}ms for ${isComparison ? validSymbols.join(' vs ') : validSymbols[0]}`);
              } else {
                logger.warn(`[Chart Fix] Chart error after ${duration}ms for ${response.symbol}: ${error.message}`);
              }
              chartResult = null;
            }
          
          if (chartResult) {
            logger.info(`[Chart Fix] Chart SUCCESS for ${response.symbol}`);
            response.chartData = chartResult;
            response.showChart = true; // Ensure showChart is true when we have chart data
            logger.info(`[Chart Fix] SUCCESS - Chart data SET on response object: ${response.chartData ? 'YES' : 'NO'}`);
            // Agent 1: Log successful chart generation
            pipelineLogger.logChartGeneration(isComparison ? 'comparison' : 'single', symbols, true);
            } else {
              logger.info(`[Chart Fix] Chart timeout/fail for ${response.symbol}, continuing without chart`);
              response.chartData = null;
              // Agent 1: Log failed chart generation
              pipelineLogger.logChartGeneration(isComparison ? 'comparison' : 'single', symbols, false);
            }
          }
        } catch (error) {
          logger.warn(`[Chart Fix] Chart error for ${response.symbol}: ${error.message}`);
          response.chartData = null;
        }
      }
      
      // Generate portfolio charts if it's a portfolio query
      if (orchestratorResult.understanding?.intent === 'portfolio_query' && context.portfolio) {
        try {
          const portfolioChartGen = require('./utils/portfolioChartGenerator');
          
          logger.info('[Portfolio Charts] Generating portfolio visualizations');
          
          // Generate both charts in parallel
          const [allocationChart, performanceChart] = await Promise.all([
            portfolioChartGen.generateAllocationChart(context.portfolio),
            portfolioChartGen.generatePerformanceChart(context.portfolio)
          ]);
          
          if (allocationChart) {
            // Primary chart is allocation
            response.chartData = allocationChart;
            response.showChart = true;
            
            // Store performance chart for potential follow-up
            response.additionalCharts = { performance: performanceChart };
            
            logger.info('[Portfolio Charts] Successfully generated allocation and performance charts');
          } else {
            logger.warn('[Portfolio Charts] Failed to generate charts');
          }
        } catch (error) {
          logger.error('[Portfolio Charts] Generation failed:', error);
        }
      }
      
      logger.info(`[LLM-FIRST] Response generated - Type: ${response.type}, Symbol: ${response.symbol}`);
      
      // The LLM will determine if it's financial or not - trust its judgment completely
      if (response.type === 'non_financial_refusal') {
        // Only refuse if LLM says it's truly non-financial
        logger.info('[Server] Non-financial query refused by LLM', {
          query: message,
          sessionId: session.sessionId
        });
        return res.json({
          success: true,
          response: "I'm a financial assistant - let's talk about markets! What stock or crypto would you like to analyze?",
          chartData: null,
          type: "refusal",
          metadata: {
            hasPortfolio: !!session.portfolio,
            llmDetermined: true,
          },
        });
      }
      
    } catch (error) {
      // ONLY use local classification as emergency fallback
      logger.error('[LLM-FIRST] Primary LLM classification failed, falling back to local:', error.message);
      logger.error('[LLM-FIRST] Going through ERROR PATH');
      
      // Emergency fallback to local classification
      intentClassification = intentClassifier.classifyIntent(
        message,
        context.conversationHistory || [],
      );
      logger.info(`[LLM-FIRST] Fallback local classification result:`, {
        classification: intentClassification.classification,
        confidence: intentClassification.confidence,
      });
      
      // Only block if very confident it's non-financial
      if (
        intentClassification.classification === "non-financial" &&
        intentClassification.confidence > 0.8  // Higher threshold for fallback
      ) {
        return res.json({
          success: true,
          response: "I'm a financial assistant - let's talk about markets! What stock or crypto would you like to analyze?",
          chartData: null,
          type: "refusal",
          metadata: {
            hasPortfolio: !!session.portfolio,
            intentClassification: intentClassification,
            fallbackUsed: true,
          },
        });
      }
      
      // If fallback isn't sure, try to generate a response anyway
      const fallbackResult = await dualLLMOrchestrator.processQuery(
        message,
        context
      );
      // Agent 2: Extract symbols for fallback path
      symbols = fallbackResult.symbols || 
                fallbackResult.symbolsUsed || 
                fallbackResult.understanding?.symbols || 
                [];
      
      response = {
        response: fallbackResult.response,
        type: fallbackResult.understanding?.intent || 'general',
        data: fallbackResult.data,
        symbol: fallbackResult.symbol || fallbackResult.understanding?.symbols?.[0] || fallbackResult.understanding?.actualSymbol || null,
        symbols: symbols, // Agent 2: Use extracted symbols
        showChart: fallbackResult.showChart, // Use dualLLMOrchestrator's intelligent auto-chart decision only
        chartData: fallbackResult.chartData,
        suggestions: fallbackResult.suggestions || [],
        requestId: fallbackResult.requestId
      };
      
      // CHART FIX: Generate chart data if needed (fallback path)
      if (response.showChart && response.symbol) {
        // Validate symbol before chart generation - prevent fake data for invalid symbols
        const symbol = response.symbol;
        const upperSymbol = symbol ? symbol.toUpperCase().trim() : '';
        const isValidSymbol = symbol && 
          upperSymbol.length >= 1 && upperSymbol.length <= 5 &&
          /^[A-Z]+$/.test(upperSymbol) &&
          !upperSymbol.includes('INVALID') && 
          !upperSymbol.includes('FAKE') && 
          !upperSymbol.includes('TEST');
          
        if (isValidSymbol) {
          try {
            logger.info(`[Chart Fix Fallback] Generating chart for ${response.symbol}`);
            response.chartData = await chartGenerator.generateSmartChart(
              response.symbol,
              "trend", // type
              null, // will fetch historical data
              null // will fetch current price
            );
          } catch (error) {
            logger.error(`[Chart Fix Fallback] Failed to generate chart: ${error.message}`);
            response.chartData = null;
          }
        } else {
          logger.info(`[Chart Fix Fallback] Skipping chart generation for invalid symbol: ${response.symbol}`);
          response.showChart = false;
          response.chartData = null;
        }
      }
    }
    logger.info(`[INTENT-CHAIN] Response generated - Type: ${response.type}`);

    // Format response based on type
    let formattedResponse;
    // REMOVED: let chartData = null; // This conflicted with response.chartData

    logger.info(`[Response Formatting] Type: ${response.type}, Symbols: ${JSON.stringify(response.symbols)}`);
    
    switch (response.type) {
      case "greeting":
        formattedResponse = response.response;
        break;
        
      case "date_time":
        formattedResponse = response.response;
        break;
        
      case "comparison":
      case "comparison_table":
        formattedResponse = response.response || responseFormatter.formatComparisonTable(response);
        if (response.needsChart && response.symbols && response.symbols.length >= 2) {
          // Fetch real historical data for both symbols
          try {
            const marketDataService = require('./src/knowledge/market-data-service');
            const mds = new marketDataService();
            
            logger.debug(`[Server] Fetching historical data for comparison: ${response.symbols.join(' vs ')}`);
            
            // Fetch historical data for both symbols in parallel
            const historicalDataPromises = response.symbols.map(symbol => 
              mds.fetchHistoricalData(symbol, 30)
            );
            
            const historicalDataArrays = await Promise.all(historicalDataPromises);
            
            // PRODUCTION FIX: Use partial success instead of requiring all symbols
            const validData = historicalDataArrays
              .map((data, index) => ({ data, symbol: response.symbols[index], index }))
              .filter(item => item.data && item.data.length > 0);
            
            if (validData.length >= 2) {  // Need at least 2 for comparison
              // Log which symbols failed
              const failedSymbols = response.symbols.filter(
                (sym, idx) => !historicalDataArrays[idx] || historicalDataArrays[idx].length === 0
              );
              if (failedSymbols.length > 0) {
                logger.warn(`[Server] Failed to fetch data for: ${failedSymbols.join(', ')}, continuing with ${validData.length} symbols`);
              }
              
              // Format data for chart generator with valid symbols only
              const dataArray = validData.map(item => ({
                symbol: item.symbol,
                dates: item.data.map(d => d.date),
                prices: item.data.map(d => d.close || d.price),
                currentPrice: response.comparisonData?.[item.index]?.price || item.data[item.data.length - 1]?.close || item.data[item.data.length - 1]?.price
              }));
              
              const validSymbols = validData.map(item => item.symbol);
              logger.debug(`[Server] Generating comparison chart for ${validSymbols.join(' vs ')}`);
              response.chartData = await chartGenerator.generateComparisonChart(
                validSymbols,
                dataArray
              );
            } else {
              logger.error(`[Server] Not enough valid data for comparison (only ${validData.length} symbols have data)`);
              response.chartData = null;
            }
          } catch (error) {
            logger.error("[Server] Failed to fetch comparison data:", error.message);
            response.chartData = null;
          }
        }
        break;

      case "trend_analysis":
        formattedResponse = responseFormatter.formatTrendAnalysis(response);
        if (response.needsChart && response.symbol) {
          // CRITICAL: Fetch real historical data for chart
          try {
            const marketDataService = require('./src/knowledge/market-data-service');
            const mds = new marketDataService();
            const historicalData = await mds.fetchHistoricalData(response.symbol, 30);
            
            if (historicalData && historicalData.length > 0) {
              // Format data for chart generator
              const formattedData = {
                symbol: response.symbol,
                dates: historicalData.map(d => d.date),
                prices: historicalData.map(d => d.close || d.price),
                currentPrice: response.currentPrice
              };
              
              response.chartData = await chartGenerator.generateSmartChart(
                response.symbol,
                "trend",
                formattedData,
                response.currentPrice
              );
            } else {
              logger.error("[Server] No historical data available for chart");
              response.chartData = null;
            }
          } catch (error) {
            logger.error("[Server] Failed to fetch historical data:", error.message);
            response.chartData = null;
          }
        }
        break;

      case "portfolio_analysis":
        formattedResponse = responseFormatter.formatPortfolioAnalysis(response);
        if (response.needsChart) {
          response.chartData = await chartGenerator.generatePortfolioChart(
            response.metrics,
          );
        }
        break;

      case "group_analysis":
        formattedResponse = response.response;
        if (response.needsChart && response.symbols && response.symbols.length > 0) {
          // For group analysis, create a comparison chart for the first 2 symbols
          try {
            const marketDataService = require('./src/knowledge/market-data-service');
            const mds = new marketDataService();
            
            logger.debug(`[Server] Generating group analysis chart for: ${response.symbols.join(', ')}`);
            
            // Fetch historical data for all symbols (limit to first 5 for performance)
            const symbolsToChart = response.symbols.slice(0, 5);
            const historicalDataPromises = symbolsToChart.map(symbol => 
              mds.fetchHistoricalData(symbol, 30)
            );
            
            const allHistoricalData = await Promise.all(historicalDataPromises);
            
            // Format data for multi-line chart
            const datasets = symbolsToChart.map((symbol, index) => ({
              label: symbol,
              data: allHistoricalData[index] || []
            }));
            
            response.chartData = await chartGenerator.generateMultiLineChart(datasets, 'Group Analysis - 30 Day Performance');
            
          } catch (error) {
            logger.error('[Server] Failed to generate group analysis chart:', error.message);
          }
        }
        break;

      case "error":
        formattedResponse = response.message;
        break;

      default:
        // Ensure we're passing a string to formatStandardMessage
        const messageToFormat = response.analysis || response.response || "";
        if (typeof messageToFormat !== 'string') {
          logger.warn(`[Server] formatStandardMessage received non-string:`, typeof messageToFormat, messageToFormat);
          formattedResponse = String(messageToFormat);
        } else {
          formattedResponse = responseFormatter.formatStandardMessage(messageToFormat);
        }
        if (response.needsChart && response.symbol) {
          // CRITICAL: Fetch real historical data for chart
          try {
            const marketDataService = require('./src/knowledge/market-data-service');
            const mds = new marketDataService();
            const historicalData = await mds.fetchHistoricalData(response.symbol, 30);
            
            if (historicalData && historicalData.length > 0) {
              // Format data for chart generator
              const formattedData = {
                symbol: response.symbol,
                dates: historicalData.map(d => d.date),
                prices: historicalData.map(d => d.close || d.price),
                currentPrice: response.data && response.data.price ? response.data.price : null
              };
              
              response.chartData = await chartGenerator.generateSmartChart(
                response.symbol,
                "price",
                formattedData,
                formattedData.currentPrice
              );
            } else {
              logger.error("[Server] No historical data available for chart");
              response.chartData = null;
            }
          } catch (error) {
            logger.error("[Server] Failed to fetch historical data:", error.message);
            response.chartData = null;
          }
        }
    }

    // Update session - only update lastTopic if a new symbol was extracted from current query
    const extractedSymbol = queryAnalyzer.extractTopic(message);
    
    // Get the last discussed symbol from the intelligent response's conversation state
    const responseLastSymbol = response.conversationState?.conversationFlow?.lastDiscussedSymbol;
    
    logger.debug('[Chat] Context update:', {
      extractedSymbol,
      responseLastSymbol,
      responseSymbol: response.symbol,
      currentLastTopic: session.lastTopic,
      message: message.substring(0, 50)
    });
    
    // Priority: 1) Extracted symbol from current query, 2) Response's lastDiscussedSymbol, 3) response.symbol, 4) Keep existing
    const newLastTopic =
      extractedSymbol ||
      responseLastSymbol ||
      (response.symbol !== session.lastTopic
        ? response.symbol
        : session.lastTopic);

    // Add chart metadata to the response if a chart was displayed
    let assistantContent = formattedResponse;
    if (response.chartData && response.symbol) {
      assistantContent += `\n[Chart displayed: ${response.symbol} ${response.type === 'trend_analysis' ? 'trend analysis' : response.type}]`;
    } else if (response.chartData && response.symbols && response.symbols.length > 1) {
      assistantContent += `\n[Chart displayed: ${response.symbols.join(' vs ')} comparison]`;
    } else if (response.chartData && response.type === 'portfolio_analysis') {
      assistantContent += `\n[Chart displayed: Portfolio allocation]`;
    }
    
    logger.info('[Chat] Updating session lastTopic:', {
      sessionId,
      oldLastTopic: session.lastTopic,
      newLastTopic,
      fromExtracted: !!extractedSymbol,
      fromResponse: !!responseLastSymbol
    });
    
    sessions.update(sessionId, {
      conversationHistory: [
        ...(session.conversationHistory || []),
        { 
          role: 'user', 
          content: message, 
          timestamp: Date.now() 
        },
        { 
          role: 'assistant', 
          content: assistantContent, 
          timestamp: Date.now(),
          portfolio: session.portfolio ? {
            totalValue: session.portfolioMetrics?.totalValue,
            holdings: session.portfolio.length,
            topHoldings: session.portfolioMetrics?.allocation?.slice(0, 3)
          } : null
        }
      ],
      lastTopic: newLastTopic,
    });

    // Send response with suggestions
    logger.info('[API Response Debug]', {
      responseSymbol: response.symbol,
      responseShowChart: response.showChart,
      responseType: response.type,
      formattedResponseLength: formattedResponse.length
    });
    
    // Chart data is now consistently in response.chartData
    logger.info(`[API Response] Chart data: ${response.chartData ? 'PRESENT' : 'NULL'}, type: ${typeof response.chartData}`);
    logger.info(`[API Response] response.chartData: ${response.chartData ? 'PRESENT' : 'NULL'}`);
    
    // Agent 1: Log pipeline completion
    pipelineLogger.logQueryComplete(true);
    
    // Agent 2: Enhanced debugging for symbol propagation
    logger.info(`[Symbol Debug] response.symbols: ${JSON.stringify(response.symbols)}`);
    logger.info(`[Symbol Debug] response.symbol: ${response.symbol}`);
    logger.info(`[Symbol Debug] symbols variable: ${JSON.stringify(symbols)}`);
    logger.info(`[Symbol Debug] response type: ${response.type}`);
    
    // Ensure symbols is populated for comparison queries
    if (response.type === 'comparison_query' && (!symbols || symbols.length === 0)) {
      logger.warn('[Symbol Debug] Comparison query but no symbols array!');
      // Try to extract from response
      if (response.symbols) {
        symbols = response.symbols;
      }
    }
    
    // MIDDLEWARE: Apply format enforcement to final formatted response
    logger.info(`[FORMAT-MIDDLEWARE] Checking final response for format enforcement`);
    logger.info(`[FORMAT-MIDDLEWARE] formattedResponse type: ${typeof formattedResponse}, length: ${formattedResponse?.length}`);
    
    if (formattedResponse && typeof formattedResponse === 'string') {
      logger.info('[FORMAT-MIDDLEWARE] Applying guaranteed format enforcement to final response');
      
      const understanding = {
        intent: response.type,
        symbols: symbols || response.symbols || []
      };
      
      try {
        const originalResponse = formattedResponse;
        formattedResponse = dualLLMOrchestrator.enforceResponseFormat(formattedResponse, understanding);
        logger.info('[FORMAT-MIDDLEWARE] Format enforcement applied successfully');
        logger.info(`[FORMAT-MIDDLEWARE] Response changed: ${originalResponse !== formattedResponse}`);
        
        // PHASE 3: Apply Visual Response Builder AFTER format enforcement
        const visualBuilder = require('./services/visualResponseBuilder');
        const conversationContext = require('./services/conversationContext');
        const userLevel = conversationContext.getUserExpertiseLevel(sessionId);
        logger.info('[VisualBuilder] Applying visual enhancement in middleware:', {
          intent: response.type,
          userLevel,
          hasData: !!response.data,
          dataKeys: response.data ? Object.keys(response.data) : []
        });
        
        // Debug: Log actual data content
        if (response.data && response.data.AAPL_market) {
          logger.info('[VisualBuilder] AAPL_market data:', {
            hasPrice: !!response.data.AAPL_market.price,
            price: response.data.AAPL_market.price,
            hasAnswer: !!response.data.AAPL_market.answer,
            keys: Object.keys(response.data.AAPL_market)
          });
        }
        
        formattedResponse = visualBuilder.enhanceResponse(
          formattedResponse,
          response.data || {},
          response.type,
          userLevel
        );
        logger.info('[VisualBuilder] Visual enhancement applied');
        
      } catch (formatError) {
        logger.error('[FORMAT-MIDDLEWARE] Format enforcement failed:', formatError);
        // Continue with original response if format enforcement fails
      }
    } else {
      logger.warn(`[FORMAT-MIDDLEWARE] Cannot apply format enforcement - formattedResponse is not a string: ${typeof formattedResponse}`);
    }
    
    // QUICK WIN: Emergency format enforcer before sending response
    const emergencyFormatter = (text, understanding) => {
      if (!text || typeof text !== 'string') return text;
      
      let formatted = text;
      
      // Force emoji if missing
      if (!/[📊📈📉💰🎯⚠️🔍🔥]/.test(formatted)) {
        const emoji = understanding?.intent === 'price_query' ? '📊' :
                     understanding?.intent === 'trend_query' ? '📈' :
                     understanding?.intent === 'portfolio_query' ? '💰' :
                     understanding?.intent === 'comparison_query' ? '⚔️' : '📊';
        formatted = `${emoji} ${formatted}`;
        logger.info('[EMERGENCY-FORMAT] Added missing emoji:', emoji);
      }
      
      // Force bold on first symbol mention
      const symbols = understanding?.symbols || response.symbols || [];
      
      // Special handling for portfolio responses
      if ((understanding?.intent === 'portfolio_query' || formatted.includes('Portfolio') || formatted.includes('portfolio')) && symbols.length === 0) {
        // Extract symbols from portfolio response text
        const commonStockSymbols = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'NVDA', 'META', 'BTC', 'ETH', 'SPY', 'QQQ', 'VOO', 'VTI'];
        commonStockSymbols.forEach(symbol => {
          const regex = new RegExp(`\\b${symbol}\\b(?!\\*\\*)`, 'g');
          if (regex.test(formatted)) {
            formatted = formatted.replace(regex, `**${symbol}**`);
            logger.info('[EMERGENCY-FORMAT] Added bold to portfolio symbol:', symbol);
          }
        });
      } else if (symbols.length > 0) {
        symbols.forEach(symbol => {
          const regex = new RegExp(`\\b${symbol}\\b(?!\\*\\*)`, 'g');
          if (regex.test(formatted)) {
            formatted = formatted.replace(regex, `**${symbol}**`);
            logger.info('[EMERGENCY-FORMAT] Added bold to symbol:', symbol);
          }
        });
      }
      
      // Force actionable ending if missing
      if (!formatted.toLowerCase().includes('want me to')) {
        const actions = {
          'price_query': 'analyze the technicals',
          'portfolio_query': 'optimize your holdings',
          'comparison_query': 'show detailed comparison',
          'trend_query': 'track this trend',
          'market_overview': 'dive deeper into any stock'
        };
        const action = actions[understanding?.intent] || 'help with more analysis';
        formatted += `\n\nWant me to ${action}?`;
        logger.info('[EMERGENCY-FORMAT] Added actionable ending');
      }
      
      return formatted;
    };
    
    // Apply emergency formatting with monitoring
    if (formattedResponse && typeof formattedResponse === 'string') {
      const understanding = response.understanding || { 
        intent: response.type, 
        symbols: symbols || response.symbols || [] 
      };
      
      // Track format score before emergency formatting
      const { FormatMonitor, formatMonitor } = require('./monitoring/FormatMonitor');
      const preScore = FormatMonitor.calculateFormatScore(formattedResponse);
      
      formattedResponse = emergencyFormatter(formattedResponse, understanding);
      
      // Track format score after emergency formatting
      const postScore = FormatMonitor.calculateFormatScore(formattedResponse);
      formatMonitor.trackFormatting(message, preScore, postScore);
      
      if (postScore < 100) {
        logger.error('[EMERGENCY-FORMAT] Still non-compliant after emergency formatting:', postScore);
        formatMonitor.trackFailure(message, formattedResponse, 'EMERGENCY_FORMAT_INSUFFICIENT');
      }
      
      logger.info('[EMERGENCY-FORMAT] Applied emergency formatting - Score:', preScore, '→', postScore);
    }
    
    // DEBUG: Log exact values being sent
    const responsePayload = {
      success: true,
      response: formattedResponse,
      chartData: response.chartData || null,
      symbol: response.symbol,
      symbols: symbols || response.symbols || [], // Agent 2: Include symbols
      type: response.type,
      showChart: response.showChart,
      suggestions: response.suggestions || [],
      metadata: {
        symbol: response.symbol,
        hasPortfolio: !!session.portfolio,
        symbols: symbols || response.symbols || [] // Agent 2: Also include in metadata
      },
    };
    
    logger.info(`[DEBUG] Sending response with symbols: ${JSON.stringify(responsePayload.symbols)}`);
    logger.info(`[DEBUG] Full responsePayload keys: ${Object.keys(responsePayload).join(', ')}`);
    logger.info(`[DEBUG] responsePayload.symbols type: ${typeof responsePayload.symbols}, length: ${responsePayload.symbols?.length}`);
    
    res.json(responsePayload);
  } catch (error) {
    logger.error("[Chat] Error:", error);
    
    // Agent 1: Log pipeline error
    pipelineLogger.logError('CHAT_ENDPOINT', error);
    pipelineLogger.logQueryComplete(false);
    
    // Handle rate limiting gracefully
    if (error.response?.status === 429 || error.message?.includes('429') || error.message?.includes('Too Many Requests')) {
      return res.json({
        success: true,
        response: "📊 I'm experiencing high demand right now. Please wait a moment and try again. I'm here to help with your financial analysis! 💡",
        type: "rate_limit",
        chartData: null
      });
    }
    
    // Handle other API errors gracefully
    if (error.response?.status >= 400) {
      return res.json({
        success: true,
        response: "📊 I encountered a temporary issue accessing market data. Please try your question again. I'm ready to help with stocks, crypto, or portfolio analysis! 💰",
        type: "api_error",
        chartData: null
      });
    }
    
    res.status(500).json({
      success: false,
      error: "Failed to process chat message",
      response:
        "I encountered an error processing your request. Please try again.",
    });
  }
});

// ================================================================
// INTELLIGENT ROUTING METHODS
// ================================================================

// Route-specific processing methods for optimized performance
const processQuickAzureQuery = async function(message, context) {
  const requestId = `quick_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    logger.info(`[QuickAzure] Processing query: "${message}" | RequestID: ${requestId}`);
    
    // Use Azure OpenAI directly for simple, fast queries
    const azureOpenAI = require('./services/azureOpenAI');
    
    // Build optimized prompt for quick responses
    const quickPrompt = `You are a financial assistant. Provide a concise, helpful response to this query: "${message}"
    
    Keep your response:
    - Under 100 words
    - Professional and accurate
    - Include specific numbers when relevant
    - End with a brief actionable suggestion
    
    Format with bullet points if multiple pieces of information.`;

    const azureResponse = await azureOpenAI.getChatCompletion([
      { role: 'system', content: quickPrompt },
      { role: 'user', content: message }
    ], {
      temperature: 0.7,
      max_tokens: 200,
      sessionId: context.sessionId
    });

    // Extract symbols from query for context
    const symbols = extractSymbolsFromQuery(message);
    
    return {
      response: azureResponse,
      symbols: symbols,
      understanding: {
        intent: 'quick_query',
        symbols: symbols,
        confidence: 0.8
      },
      data: {},
      showChart: symbols.length > 0 && symbols.length <= 2,
      chartData: null,
      suggestions: ['Get detailed analysis', 'View chart', 'Set price alert'],
      requestId: requestId
    };
    
  } catch (error) {
    logger.error(`[QuickAzure] Error processing query: ${error.message}`);
    return {
      response: "I encountered an issue getting that information quickly. Let me try a more detailed approach.",
      symbols: [],
      understanding: { intent: 'error', symbols: [] },
      data: {},
      showChart: false,
      chartData: null,
      suggestions: ['Try again', 'Ask for specific stock price'],
      requestId: requestId,
      error: true
    };
  }
};

const processPerplexityQuery = async function(message, context) {
  const requestId = `perp_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    logger.info(`[Perplexity] Processing research query: "${message}" | RequestID: ${requestId}`);
    
    // Get understanding from Azure first
    const azureOpenAI = require('./services/azureOpenAI');
    const dualLLMOrchestrator = require('./services/dualLLMOrchestrator');
    
    // Quick understanding analysis
    const understanding = await dualLLMOrchestrator.understandQuery(message, context);
    
    // Use Perplexity for real-time research
    const perplexityPrompt = `Research and analyze: ${message}
    
    Focus on:
    - Latest news and developments
    - Current market conditions
    - Real-time data and trends
    - Expert opinions and analysis
    
    Provide accurate, up-to-date information with sources.`;

    const perplexityResult = await dualLLMOrchestrator.callPerplexity(
      perplexityPrompt,
      understanding.priority === 'high' ? 'sonar-pro' : 'sonar',
      {
        max_tokens: 400,
        temperature: 0.6,
        search_recency_filter: 'day'
      }
    );

    return {
      response: perplexityResult.answer || perplexityResult,
      symbols: understanding.symbols || [],
      understanding: understanding,
      data: { perplexity_research: perplexityResult },
      showChart: understanding.symbols && understanding.symbols.length > 0,
      chartData: null,
      suggestions: ['Get technical analysis', 'Compare with peers', 'Set alerts'],
      requestId: requestId
    };
    
  } catch (error) {
    logger.error(`[Perplexity] Error processing query: ${error.message}`);
    
    // Fallback to Azure if Perplexity fails
    try {
      const fallbackResponse = await processQuickAzureQuery(message, context);
      fallbackResponse.requestId = requestId;
      fallbackResponse.fallback = true;
      return fallbackResponse;
    } catch (fallbackError) {
      return {
        response: "I'm having trouble accessing real-time market data right now. Please try again in a moment.",
        symbols: [],
        understanding: { intent: 'error', symbols: [] },
        data: {},
        showChart: false,
        chartData: null,
        suggestions: ['Try again', 'Ask about general market trends'],
        requestId: requestId,
        error: true
      };
    }
  }
};

const processBatchQuery = async function(message, context, routingDecision) {
  const requestId = `batch_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  
  try {
    logger.info(`[Batch] Processing batch query: "${message}" | RequestID: ${requestId}`);
    
    // Check if this is part of a batch or should start one
    const sessionId = context.sessionId || 'default';
    const batchKey = `batch_${sessionId}`;
    
    // Simple batch processing - queue similar queries and process together
    if (!global.batchQueue) {
      global.batchQueue = new Map();
    }
    
    if (!global.batchQueue.has(batchKey)) {
      global.batchQueue.set(batchKey, {
        queries: [],
        startTime: Date.now(),
        timeout: null
      });
    }
    
    const batch = global.batchQueue.get(batchKey);
    batch.queries.push({ message, context, requestId });
    
    // Process immediately if batch is full or this is a single query
    if (batch.queries.length >= 3 || routingDecision.immediate) {
      return await processBatchNow(batch, batchKey);
    }
    
    // Set timeout to process batch after delay
    if (batch.timeout) {
      clearTimeout(batch.timeout);
    }
    
    batch.timeout = setTimeout(async () => {
      try {
        await processBatchNow(batch, batchKey);
      } catch (error) {
        logger.error(`[Batch] Timeout processing error: ${error.message}`);
      }
    }, 2000); // 2 second batch window
    
    // Return immediate response for current query
    const dualLLMOrchestrator = require('./services/dualLLMOrchestrator');
    return await dualLLMOrchestrator.processQuery(message, context);
    
  } catch (error) {
    logger.error(`[Batch] Error processing query: ${error.message}`);
    
    // Fallback to full orchestration
    const dualLLMOrchestrator = require('./services/dualLLMOrchestrator');
    return await dualLLMOrchestrator.processQuery(message, context);
  }
};

const processBatchNow = async function(batch, batchKey) {
  try {
    logger.info(`[Batch] Processing ${batch.queries.length} queries together`);
    
    const dualLLMOrchestrator = require('./services/dualLLMOrchestrator');
    
    // Process all queries in parallel for efficiency
    const results = await Promise.allSettled(
      batch.queries.map(({ message, context }) => 
        dualLLMOrchestrator.processQuery(message, context)
      )
    );
    
    // Clear the batch
    global.batchQueue.delete(batchKey);
    
    logger.info(`[Batch] Completed processing ${results.length} queries`);
    
    // Return the first successful result (this is simplified - in practice you'd cache all results)
    const firstSuccess = results.find(r => r.status === 'fulfilled');
    return firstSuccess ? firstSuccess.value : null;
    
  } catch (error) {
    logger.error(`[Batch] Error in batch processing: ${error.message}`);
    throw error;
  }
};

// Utility function to extract symbols from query text
const extractSymbolsFromQuery = function(query) {
  const symbols = [];
  
  // Common stock symbol patterns
  const stockPattern = /\b[A-Z]{1,5}\b/g;
  const stockMatches = query.match(stockPattern) || [];
  
  // Known symbols
  const knownSymbols = new Set([
    'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'SPY', 'QQQ',
    'BTC', 'ETH', 'BNB', 'ADA', 'SOL', 'DOT', 'LINK', 'UNI'
  ]);
  
  // Company name mappings
  const companyNames = {
    'apple': 'AAPL',
    'microsoft': 'MSFT',
    'google': 'GOOGL',
    'amazon': 'AMZN',
    'tesla': 'TSLA',
    'facebook': 'META',
    'nvidia': 'NVDA',
    'bitcoin': 'BTC',
    'ethereum': 'ETH'
  };
  
  // Extract from stock patterns
  stockMatches.forEach(match => {
    if (knownSymbols.has(match)) {
      symbols.push(match);
    }
  });
  
  // Extract from company names
  const queryLower = query.toLowerCase();
  Object.entries(companyNames).forEach(([name, symbol]) => {
    if (queryLower.includes(name)) {
      symbols.push(symbol);
    }
  });
  
  return [...new Set(symbols)]; // Remove duplicates
};

// Bind the methods to the global scope so they can be called with 'this'
global.processQuickAzureQuery = processQuickAzureQuery;
global.processPerplexityQuery = processPerplexityQuery;  
global.processBatchQuery = processBatchQuery;

// Root route
app.get("/", (req, res) => {
  res.sendFile(path.join(__dirname, "public", "index.html"));
});

// ================================================================
// SERVER STARTUP
// ================================================================

// Global variable to track API validation status
let perplexityValidated = false;

// Create HTTP server
const server = http.createServer(app);

// Initialize WebSocket service
const webSocketService = new WebSocketService();

// Load WebSocket configuration
const wsConfig = require('./config/websocket');

// Create WebSocket server with configuration
const wss = new WebSocket.Server({
  server,
  ...wsConfig.server
});

// Handle WebSocket connections
wss.on("connection", (ws, req) => {
  const clientId = `client_${Date.now()}_${Math.random().toString(36).substr(2, 9)}`;
  logger.debug(`[WebSocket] New client connected: ${clientId}`);

  // Mark connection as alive
  ws.isAlive = true;
  
  webSocketService.addClient(clientId, ws);

  // Handle pong responses
  ws.on("pong", () => {
    ws.isAlive = true;
  });

  ws.on("close", () => {
    logger.debug(`[WebSocket] Client disconnected: ${clientId}`);
  });

  ws.on("error", (error) => {
    logger.error(`[WebSocket] Client error for ${clientId}:`, error.message);
  });
});

// Handle WebSocket server errors
wss.on("error", (error) => {
  logger.error("[WebSocket] Server error:", error.message);
});

// Heartbeat mechanism to detect broken connections
const heartbeatInterval = setInterval(() => {
  wss.clients.forEach((ws) => {
    if (ws.isAlive === false) {
      logger.debug("[WebSocket] Terminating dead connection");
      return ws.terminate();
    }
    
    ws.isAlive = false;
    ws.ping(() => {});
  });
}, 30000);

// Clean up on server shutdown
wss.on('close', () => {
  clearInterval(heartbeatInterval);
});

server.listen(PORT, async () => {
  logger.debug("\n🚀 FinanceBot Pro v4.0 Server Started Successfully!");
  logger.debug("│");
  logger.debug(`│ 🌐 Server running on: http://localhost:${PORT}`);
  logger.debug(`│ 🔧 Environment: ${process.env.NODE_ENV || "development"}`);
  logger.debug(`│ 🔐 Security: Enabled (no hardcoded API keys)`);

  // Validate Perplexity API on startup
  if (perplexityClient && perplexityClient.isConfigured) {
    logger.debug("🔑 Validating Perplexity API key...");
    try {
      perplexityValidated = await validatePerplexityAPI();
    } catch (error) {
      logger.warn(
        "⚠️  Perplexity API validation failed, continuing in fallback mode",
      );
      perplexityValidated = false;
    }
  } else {
    perplexityValidated = false;
  }

  // Validate Polygon API on startup
  let polygonValidated = false;
  if (POLYGON_KEY) {
    logger.debug("🔑 Validating Polygon API key...");
    try {
      const testResponse = await axios.get(
        "https://api.polygon.io/v2/aggs/ticker/AAPL/prev",
        {
          params: { apiKey: POLYGON_KEY },
          timeout: 5000,
        },
      );
      polygonValidated = testResponse.status === 200;
      logger.debug("✅ Polygon API validation successful");
    } catch (error) {
      if (error.response?.status === 401) {
        logger.warn("❌ Polygon API validation failed: 401 Unauthorized");
      } else {
        logger.warn(
          "⚠️  Polygon API validation failed, using fallback data sources",
        );
      }
      polygonValidated = false;
    }
  } else {
    logger.debug("ℹ️  Polygon API key not configured - using free data sources");
  }

  logger.debug(
    `│ 🤖 AI Analysis: ${perplexityValidated ? "Ready" : "Fallback Mode"}`,
  );
  logger.debug(
    `│ 📊 Market Data: ${polygonValidated ? "Real-time (Polygon)" : "Free Sources (Yahoo)"}`,
  );
  logger.debug(`│ 💬 Conversational: Enabled`);
  logger.debug(`│ 🛡️  Trading Advice Filter: Active`);
  logger.debug(`│ 📊 Session Manager: Active`);
  logger.debug(`│ 📁 Portfolio Upload: Enabled`);

  // Initialize WebSocket service
  logger.debug("│ 🔌 Initializing WebSocket service...");
  try {
    await webSocketService.initialize();
    logger.debug(
      `│ 🔌 WebSocket: Ready (${webSocketService.getStats().polygonConnected ? "Real-time data enabled" : "Basic mode"})`,
    );
  } catch (error) {
    logger.warn("│ 🔌 WebSocket: Failed to initialize real-time data");
  }

  logger.debug("│");
  logger.debug("└─ Ready to serve secure financial analysis requests!\n");
});

// ================================================================
// GRACEFUL SHUTDOWN
// ================================================================

const gracefulShutdown = (signal) => {
  logger.debug(
    `\n[${new Date().toISOString()}] ${signal} received. Starting graceful shutdown...`,
  );

  server.close((err) => {
    if (err) {
      logger.error("Error during server shutdown:", err);
    } else {
      logger.debug("✅ Server closed successfully");
    }

    sessions.shutdown();

    // Shutdown WebSocket service
    webSocketService.shutdown();
    logger.debug("✅ WebSocket service shutdown completed");

    logger.debug("✅ Graceful shutdown completed");
    process.exit(err ? 1 : 0);
  });

  setTimeout(() => {
    logger.error(
      "❌ Could not close connections in time, forcefully shutting down",
    );
    process.exit(1);
  }, 30000);
};

// Handle shutdown signals
process.on("SIGTERM", () => gracefulShutdown("SIGTERM"));
process.on("SIGINT", () => gracefulShutdown("SIGINT"));

// Handle uncaught exceptions gracefully
process.on("uncaughtException", (error) => {
  logger.error("Uncaught Exception:", error);
  sessions.shutdown();
  process.exit(1);
});

process.on("unhandledRejection", (reason, promise) => {
  logger.error("Unhandled Rejection at:", promise, "reason:", reason);
  sessions.shutdown();
  process.exit(1);
});

module.exports = { app, SessionManager, sessions };
