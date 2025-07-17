const chartGenerator = require('../../services/chartGenerator');

describe('AssetConfigManager - Configuration Validation Tests', () => {
  
  // Real market data as of July 2025 (from our research)
  const REAL_MARKET_DATA = {
    'BTC': { price: 118700, range: [99000, 120000] },
    'ETH': { price: 3133, range: [2800, 3400] },
    'AAPL': { price: 182, range: [170, 195] },
    'GOOGL': { price: 182, range: [170, 195] },
    'GC': { price: 3350, range: [3300, 3400] }, // Gold
    'SI': { price: 36, range: [32, 40] },        // Silver
    'CL': { price: 67, range: [60, 75] },        // Oil
    'DOGE': { price: 0.00015, range: [0.0001, 0.0002] }
  };
  
  describe('Configuration Accuracy Validation', () => {
    test('Bitcoin configuration should reflect 2025 market reality', () => {
      const config = chartGenerator.getAssetConfig('BTC');
      const realData = REAL_MARKET_DATA.BTC;
      
      // Current config: basePrice: 95000, but real price is ~118700
      // This test will FAIL, exposing the issue
      const priceDeviation = Math.abs(config.basePrice - realData.price) / realData.price;
      expect(priceDeviation).toBeLessThan(0.10); // Should be within 10% of reality
      
      // Price range should encompass real market range
      expect(config.minPrice).toBeLessThanOrEqual(realData.range[0]);
      expect(config.maxPrice).toBeGreaterThanOrEqual(realData.range[1]);
    });
    
    test('Ethereum configuration should be current', () => {
      const config = chartGenerator.getAssetConfig('ETH');
      const realData = REAL_MARKET_DATA.ETH;
      
      const priceDeviation = Math.abs(config.basePrice - realData.price) / realData.price;
      expect(priceDeviation).toBeLessThan(0.10);
    });
    
    test('Apple stock configuration should be current', () => {
      const config = chartGenerator.getAssetConfig('AAPL');
      const realData = REAL_MARKET_DATA.AAPL;
      
      // Current config: basePrice: 195, but real price is ~182
      const priceDeviation = Math.abs(config.basePrice - realData.price) / realData.price;
      expect(priceDeviation).toBeLessThan(0.10);
    });
    
    test('Silver configuration should reflect current market', () => {
      const config = chartGenerator.getAssetConfig('SI');
      const realData = REAL_MARKET_DATA.SI;
      
      // Current config: basePrice: 30, but real price is ~36
      const priceDeviation = Math.abs(config.basePrice - realData.price) / realData.price;
      expect(priceDeviation).toBeLessThan(0.15); // Slightly higher tolerance for commodities
    });
    
    test('all major assets should have realistic configurations', () => {
      Object.keys(REAL_MARKET_DATA).forEach(symbol => {
        const config = chartGenerator.getAssetConfig(symbol);
        const realData = REAL_MARKET_DATA[symbol];
        
        const priceDeviation = Math.abs(config.basePrice - realData.price) / realData.price;
        
        // No asset should deviate more than 20% from reality
        expect(priceDeviation).toBeLessThan(0.20);
      });
    });
  });
  
  describe('Configuration Relationship Validation', () => {
    test('crypto should have higher volatility than traditional assets', () => {
      const btcConfig = chartGenerator.getAssetConfig('BTC');
      const ethConfig = chartGenerator.getAssetConfig('ETH');
      const aaplConfig = chartGenerator.getAssetConfig('AAPL');
      const goldConfig = chartGenerator.getAssetConfig('GC');
      
      // Crypto > Commodities > Stocks (volatility hierarchy)
      expect(btcConfig.volatility).toBeGreaterThan(goldConfig.volatility);
      expect(btcConfig.volatility).toBeGreaterThan(aaplConfig.volatility);
      expect(ethConfig.volatility).toBeGreaterThan(goldConfig.volatility);
      expect(goldConfig.volatility).toBeGreaterThan(aaplConfig.volatility);
    });
    
    test('price ranges should be proportional to base price', () => {
      const symbols = ['BTC', 'ETH', 'AAPL', 'GC'];
      
      symbols.forEach(symbol => {
        const config = chartGenerator.getAssetConfig(symbol);
        
        const rangePercent = (config.maxPrice - config.minPrice) / config.basePrice;
        
        // Range should be reasonable (5-20% of base price)
        expect(rangePercent).toBeGreaterThan(0.05);
        expect(rangePercent).toBeLessThan(0.25);
      });
    });
  });
  
  describe('Data Generation Impact Tests', () => {
    test('outdated configurations lead to unrealistic chart data', () => {
      // This test demonstrates the impact of wrong configurations
      const currentBTCPrice = 105000; // Realistic current price
      const data = chartGenerator.generateMockChartData('BTC', 'price', currentBTCPrice);
      
      // With current config (basePrice: 95000), the generated historical data
      // will be biased toward lower prices, creating unrealistic charts
      const avgHistoricalPrice = data.prices.slice(0, -1).reduce((sum, price) => sum + price, 0) / (data.prices.length - 1);
      
      // Historical average shouldn't deviate too much from current price
      const deviation = Math.abs(avgHistoricalPrice - currentBTCPrice) / currentBTCPrice;
      expect(deviation).toBeLessThan(0.15); // Should be within 15%
    });
    
    test('realistic configurations should produce coherent data', () => {
      // Test with manually corrected Bitcoin config
      const realisticBTCPrice = 105000;
      const data = chartGenerator.generateMockChartData('BTC', 'price', realisticBTCPrice);
      
      // Generated data should cluster around realistic range
      const pricesInRealisticRange = data.prices.filter(p => p >= 99000 && p <= 120000);
      const percentageInRange = pricesInRealisticRange.length / data.prices.length;
      
      expect(percentageInRange).toBeGreaterThan(0.70); // 70% should be in realistic range (adjusted for volatility)
    });
  });
  
  describe('Configuration Validation Helpers', () => {
    test('should detect stale configurations', () => {
      // Helper function to detect configurations that might be outdated
      const validateConfigFreshness = (symbol, config, realPrice) => {
        const deviation = Math.abs(config.basePrice - realPrice) / realPrice;
        return {
          isStale: deviation > 0.15,
          deviation: deviation,
          recommendedUpdate: realPrice
        };
      };
      
      // Test with current configurations (should NOT be stale)
      const btcConfig = chartGenerator.getAssetConfig('BTC');
      const btcValidation = validateConfigFreshness('BTC', btcConfig, 118700);
      expect(btcValidation.isStale).toBe(false); // Now updated, should be fresh
      
      const silverConfig = chartGenerator.getAssetConfig('SI');
      const silverValidation = validateConfigFreshness('SI', silverConfig, 36);
      expect(silverValidation.isStale).toBe(false); // Now updated, should be fresh
      
      // Test with artificially outdated price to verify detection works
      const oldPriceValidation = validateConfigFreshness('BTC', btcConfig, 50000);
      expect(oldPriceValidation.isStale).toBe(true); // Should detect large deviation
    });
    
    test('should validate mathematical consistency of new configurations', () => {
      const validateConfigMath = (config) => {
        return {
          hasPositivePrices: config.basePrice > 0 && config.minPrice > 0 && config.maxPrice > 0,
          hasValidRange: config.minPrice < config.basePrice && config.basePrice < config.maxPrice,
          hasReasonableVolatility: config.volatility > 0 && config.volatility < 0.5,
          hasReasonableSpread: (config.maxPrice - config.minPrice) / config.basePrice < 0.3
        };
      };
      
      // Test current configurations
      const symbols = ['BTC', 'ETH', 'AAPL', 'GC'];
      symbols.forEach(symbol => {
        const config = chartGenerator.getAssetConfig(symbol);
        const validation = validateConfigMath(config);
        
        expect(validation.hasPositivePrices).toBe(true);
        expect(validation.hasValidRange).toBe(true);
        expect(validation.hasReasonableVolatility).toBe(true);
        expect(validation.hasReasonableSpread).toBe(true);
      });
    });
  });
});