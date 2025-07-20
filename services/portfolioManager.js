const Papa = require("papaparse");
const MarketDataService = require("../src/knowledge/market-data-service");

class PortfolioManager {
  constructor() {
    console.log("[PortfolioManager] Initialized");
    // Import sessions dynamically to avoid circular dependencies
    this.sessions = null;
    this.marketDataService = new MarketDataService();
  }

  // Initialize sessions reference
  initializeSessions(sessionsInstance) {
    this.sessions = sessionsInstance;
  }

  async parsePortfolio(csvContent, sessionId) {
    try {
      return new Promise((resolve) => {
        Papa.parse(csvContent, {
          header: true,
          dynamicTyping: true,
          skipEmptyLines: true,
          transformHeader: (header) =>
            header.trim().toLowerCase().replace(/\s+/g, "_"),
          complete: async (results) => {
            try {
              // Validate required columns with more flexible checking
              const fields = results.meta.fields || [];
              const hasSymbol = fields.some(
                (field) =>
                  field.includes("symbol") ||
                  field.includes("ticker") ||
                  field.includes("stock"),
              );
              const hasShares = fields.some(
                (field) =>
                  field.includes("shares") ||
                  field.includes("quantity") ||
                  field.includes("amount"),
              );

              if (!hasSymbol) {
                throw new Error(
                  `📁 I see your file but need a symbol column! Use: 'symbol', 'ticker', or 'stock' as your header. Example: symbol,shares,purchase_price`,
                );
              }

              if (!hasShares) {
                throw new Error(
                  `📁 I see your file but need a shares column! Use: 'shares', 'quantity', or 'amount' as your header. Example: symbol,shares,purchase_price`,
                );
              }

              // Map various column names to standard format with better edge case handling
              const holdings = results.data
                .map((row) => {
                  // Handle empty rows
                  if (!row || typeof row !== "object") return null;

                  const symbol = (row.symbol || row.ticker || row.stock || "")
                    .toString()
                    .trim();
                  const shares = parseFloat(
                    row.shares || row.quantity || row.amount || 0,
                  );
                  const price = parseFloat(
                    row.purchase_price || row.purchaseprice || row.cost || row.price || 0,
                  );

                  // Validate symbol format (basic check for valid stock symbols)
                  if (!symbol || symbol.length < 1 || symbol.length > 10)
                    return null;

                  // Validate shares are positive
                  if (isNaN(shares) || shares <= 0) return null;

                  // Clean up symbol (remove special characters, ensure uppercase)
                  const cleanSymbol = symbol
                    .replace(/[^A-Za-z0-9]/g, "")
                    .toUpperCase();

                  return {
                    symbol: cleanSymbol,
                    shares: shares,
                    purchasePrice: isNaN(price) ? 0 : price,
                    currentPrice: null,
                    value: null,
                    change: null,
                    changePercent: null,
                  };
                })
                .filter((h) => h !== null);

              if (holdings.length === 0) {
                throw new Error("📁 I couldn't find any valid holdings in your file. Make sure you have valid stock symbols and positive share amounts. Need help with the format?");
              }

              // Fetch current prices
              await this.updatePortfolioPrices(holdings);

              // Calculate metrics
              const metrics = this.calculatePortfolioMetrics(holdings);

              // Store in session (when available)
              try {
                // Only try to update session if sessions is available (when running in server context)
                if (this.sessions && this.sessions.update) {
                  console.log(
                    "[Portfolio] Storing portfolio in session:",
                    sessionId,
                  );
                  this.sessions.update(sessionId, {
                    portfolio: holdings,
                    portfolioMetrics: metrics,
                    portfolioUploadTime: Date.now(),
                  });
                  console.log("[Portfolio] Session updated successfully");
                } else {
                  console.log(
                    "[Portfolio] Sessions not available:",
                    !!this.sessions,
                    this.sessions ? !!this.sessions.update : "no sessions",
                  );
                }
              } catch (error) {
                // Session update failed, but continue - this is expected in test mode
                console.log("[Portfolio] Session update skipped (test mode)");
              }

              resolve({
                success: true,
                holdings: holdings,
                metrics: metrics,
                message: `🎉 Great! I've loaded your ${holdings.length} holdings worth $${parseFloat(metrics.totalValue).toLocaleString()}. Here's what stands out...`,
              });
            } catch (error) {
              resolve({
                success: false,
                error: error.message,
              });
            }
          },
          error: (error) => {
            resolve({
              success: false,
              error: `CSV parsing error: ${error.message}`,
            });
          },
        });
      });
    } catch (error) {
      console.error("[Portfolio] Parse error:", error);
      return {
        success: false,
        error: `Portfolio parsing failed: ${error.message}`,
      };
    }
  }

  async updatePortfolioPrices(holdings) {
    const pricePromises = holdings.map(async (holding) => {
      try {
        const data = await this.marketDataService.fetchMarketData(holding.symbol, "auto");
        if (data && data.price) {
          holding.currentPrice = data.price;
          holding.value = holding.shares * data.price;
          holding.change =
            holding.value - holding.shares * holding.purchasePrice;
          holding.changePercent = (
            ((data.price - holding.purchasePrice) / holding.purchasePrice) *
            100
          ).toFixed(2);
        }
      } catch (error) {
        console.log(`[Portfolio] Couldn't find current price for ${holding.symbol} - this might be delisted or incorrect symbol`);
      }
    });

    await Promise.all(pricePromises);
  }

  calculatePortfolioMetrics(holdings) {
    const validHoldings = holdings.filter((h) => h.value > 0);
    const totalValue = validHoldings.reduce((sum, h) => sum + h.value, 0);
    const totalCost = validHoldings.reduce(
      (sum, h) => sum + h.shares * (h.purchasePrice || 0),
      0,
    );

    // Handle edge cases for division by zero
    const totalGainPercent =
      totalCost > 0
        ? (((totalValue - totalCost) / totalCost) * 100).toFixed(2)
        : "0";

    // Ensure we have valid holdings for performer calculations
    const topPerformer =
      validHoldings.length > 0
        ? validHoldings.reduce((best, h) => {
            const currentPercent = parseFloat(h.changePercent || 0);
            const bestPercent = parseFloat(best?.changePercent || -Infinity);
            return currentPercent > bestPercent ? h : best;
          }, null)
        : null;

    const worstPerformer =
      validHoldings.length > 0
        ? validHoldings.reduce((worst, h) => {
            const currentPercent = parseFloat(h.changePercent || 0);
            const worstPercent = parseFloat(worst?.changePercent || Infinity);
            return currentPercent < worstPercent ? h : worst;
          }, null)
        : null;

    return {
      totalValue: totalValue.toFixed(2),
      totalCost: totalCost.toFixed(2),
      totalGain: (totalValue - totalCost).toFixed(2),
      totalGainPercent: totalGainPercent,
      holdings: validHoldings.length,
      topPerformer: topPerformer,
      worstPerformer: worstPerformer,
      allocation: validHoldings
        .map((h) => ({
          symbol: h.symbol,
          value: h.value,
          percent:
            totalValue > 0 ? ((h.value / totalValue) * 100).toFixed(2) : "0",
        }))
        .sort((a, b) => b.value - a.value),
    };
  }

  getPortfolioSummary(sessionId) {
    console.log(
      "[Portfolio] getPortfolioSummary called for session:",
      sessionId,
    );

    if (!this.sessions) {
      console.log("[Portfolio] No sessions available");
      return null;
    }

    const session = this.sessions.get(sessionId);
    console.log("[Portfolio] Session found:", !!session);
    if (session) {
      console.log("[Portfolio] Session has portfolio:", !!session.portfolio);
      console.log("[Portfolio] Session keys:", Object.keys(session));
    }

    if (!session || !session.portfolio) {
      return null;
    }

    return {
      holdings: session.portfolio,
      metrics: session.portfolioMetrics,
      lastUpdate: session.portfolioUploadTime,
    };
  }
}

module.exports = new PortfolioManager();
