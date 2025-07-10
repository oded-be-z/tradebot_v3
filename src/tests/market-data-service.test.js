const MarketDataService = require('../knowledge/market-data-service');

describe('MarketDataService', () => {
    let service;

    beforeEach(() => {
        service = new MarketDataService();
    });

    afterEach(() => {
        service.clearCache();
    });

    describe('fetchStockPrice', () => {
        test('should fetch stock price for valid symbol', async () => {
            const result = await service.fetchStockPrice('AAPL');
            
            expect(result).toHaveProperty('symbol', 'AAPL');
            expect(result).toHaveProperty('timestamp');
            expect(result).toHaveProperty('source');
            expect(typeof result.timestamp).toBe('number');
        });

        test('should handle invalid stock symbol gracefully', async () => {
            const result = await service.fetchStockPrice('INVALID');
            
            expect(result).toHaveProperty('symbol', 'INVALID');
            expect(result).toHaveProperty('error');
        });

        test('should normalize symbol to uppercase', async () => {
            const result = await service.fetchStockPrice('aapl');
            
            expect(result.symbol).toBe('AAPL');
        });

        test('should cache results for 1 minute', async () => {
            const firstCall = await service.fetchStockPrice('AAPL');
            const secondCall = await service.fetchStockPrice('AAPL');
            
            expect(firstCall.timestamp).toBe(secondCall.timestamp);
        });
    });

    describe('fetchCryptoPrice', () => {
        test('should fetch crypto price for Bitcoin', async () => {
            const result = await service.fetchCryptoPrice('BTC');
            
            expect(result).toHaveProperty('symbol', 'BTC');
            expect(result).toHaveProperty('timestamp');
            expect(result).toHaveProperty('source', 'coingecko');
        });

        test('should map crypto symbols correctly', () => {
            expect(service.getCoinGeckoId('BTC')).toBe('bitcoin');
            expect(service.getCoinGeckoId('ETH')).toBe('ethereum');
            expect(service.getCoinGeckoId('ADA')).toBe('cardano');
        });

        test('should handle unknown crypto symbols', async () => {
            const result = await service.fetchCryptoPrice('UNKNOWN');
            
            expect(result).toHaveProperty('symbol', 'UNKNOWN');
            expect(result).toHaveProperty('error');
        });
    });

    describe('fetchMultiplePrices', () => {
        test('should fetch multiple stock prices', async () => {
            const symbols = ['AAPL', 'MSFT', 'GOOGL'];
            const results = await service.fetchMultiplePrices(symbols, 'stock');
            
            expect(results).toHaveLength(3);
            expect(results[0]).toHaveProperty('symbol', 'AAPL');
            expect(results[1]).toHaveProperty('symbol', 'MSFT');
            expect(results[2]).toHaveProperty('symbol', 'GOOGL');
        });

        test('should fetch multiple crypto prices', async () => {
            const symbols = ['BTC', 'ETH'];
            const results = await service.fetchMultiplePrices(symbols, 'crypto');
            
            expect(results).toHaveLength(2);
            expect(results[0]).toHaveProperty('symbol', 'BTC');
            expect(results[1]).toHaveProperty('symbol', 'ETH');
        });
    });

    describe('cache management', () => {
        test('should track cache size', async () => {
            expect(service.getCacheSize()).toBe(0);
            
            await service.fetchStockPrice('AAPL');
            expect(service.getCacheSize()).toBe(1);
            
            await service.fetchCryptoPrice('BTC');
            expect(service.getCacheSize()).toBe(2);
        });

        test('should clear cache completely', async () => {
            await service.fetchStockPrice('AAPL');
            await service.fetchCryptoPrice('BTC');
            
            expect(service.getCacheSize()).toBeGreaterThan(0);
            
            service.clearCache();
            expect(service.getCacheSize()).toBe(0);
        });
    });
});