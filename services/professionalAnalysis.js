// Professional Analysis - Simple data pass-through (no templates)
const NumberFormatter = require('../utils/numberFormatter');

class ProfessionalAnalysisGenerator {
  constructor() {
    console.log('[ProfessionalAnalysis] Initialized');
  }

  generateAnalysis(symbol, data, type) {
    // Simple data formatting - let Azure OpenAI handle the actual analysis
    const price = NumberFormatter.formatPrice(data.price);
    const change = NumberFormatter.formatPriceChange(data.changePercent, data.price);
    
    // Just return basic market data - no templates
    return `${symbol} price: ${price}, ${change.text} ${change.amount} (${NumberFormatter.formatNumber(Math.abs(data.changePercent), 'percentage')}). Volume: ${NumberFormatter.formatNumber(data.volume, 'volume')}.`;
  }

  // Simplified methods that just return data
  generateCryptoAnalysis(symbol, data) {
    return this.generateAnalysis(symbol, data);
  }

  generateCommodityAnalysis(symbol, data) {
    return this.generateAnalysis(symbol, data);
  }

  generateStockAnalysis(symbol, data) {
    return this.generateAnalysis(symbol, data);
  }

  generateStandardAnalysis(symbol, data) {
    return this.generateAnalysis(symbol, data);
  }

  // Handle capability-aware responses when asked about longer timeframes
  generateCapabilityAwareResponse(symbol, timeframe) {
    if (timeframe.includes('year') || timeframe.includes('annual') || timeframe.includes('long-term')) {
      return `Data timeframe: 30 days for ${symbol}.`;
    }
    return null;
  }

  // Utility methods
  detectAssetType(symbol) {
    const cryptoSymbols = ['BTC', 'ETH', 'BNB', 'SOL', 'ADA', 'XRP', 'DOGE', 'MATIC', 'AVAX', 'LINK'];
    const commoditySymbols = ['GC', 'SI', 'CL', 'NG', 'HG', 'ZW', 'ZC', 'ZS', 'KC', 'SB'];
    
    if (cryptoSymbols.includes(symbol)) return 'crypto';
    if (commoditySymbols.includes(symbol)) return 'commodity';
    return 'stock';
  }

  formatMicroPrice(price) {
    if (price < 0.01) {
      return `$${price.toFixed(6)}`;
    } else if (price < 1) {
      return `$${price.toFixed(4)}`;
    } else if (price < 10) {
      return `$${price.toFixed(3)}`;
    } else {
      return `$${price.toFixed(2)}`;
    }
  }

  calculateRSI(changePercent) {
    // Simplified RSI approximation
    const normalizedChange = Math.max(-10, Math.min(10, changePercent));
    return 50 + (normalizedChange * 5);
  }
}

module.exports = new ProfessionalAnalysisGenerator();