const axios = require('axios');

class MarketDataService {
    constructor() {
        this.cache = new Map();
        this.CACHE_DURATION = 60000; // 1 minute
    }

    async fetchStockPrice(symbol) {
        const cacheKey = `stock:${symbol.toUpperCase()}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.data;
        }

        try {
            // Try Polygon API first
            const response = await axios.get(`https://api.polygon.io/v2/aggs/ticker/${symbol}/prev`, {
                params: {
                    apikey: process.env.POLYGON_API_KEY
                }
            });

            const data = {
                symbol: symbol.toUpperCase(),
                price: response.data.results?.[0]?.c || null,
                timestamp: Date.now(),
                source: 'polygon'
            };

            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error(`Error fetching from Polygon for ${symbol}:`, error.message);
            
            // Try Alpha Vantage as backup if Polygon fails (401 error or other issues)
            if (error.response?.status === 401 || !process.env.POLYGON_API_KEY) {
                console.log(`Trying Alpha Vantage backup for ${symbol}`);
                return this.fetchStockPriceFromAlphaVantage(symbol);
            }
            
            return {
                symbol: symbol.toUpperCase(),
                price: null,
                error: 'Unable to fetch current price',
                timestamp: Date.now()
            };
        }
    }

    async fetchStockPriceFromAlphaVantage(symbol) {
        try {
            const response = await axios.get(`https://www.alphavantage.co/query`, {
                params: {
                    function: 'GLOBAL_QUOTE',
                    symbol: symbol,
                    apikey: process.env.ALPHA_VANTAGE_API_KEY
                }
            });

            const quote = response.data['Global Quote'];
            const data = {
                symbol: symbol.toUpperCase(),
                price: quote ? parseFloat(quote['05. price']) : null,
                timestamp: Date.now(),
                source: 'alphavantage'
            };

            this.cache.set(`stock:${symbol.toUpperCase()}`, {
                data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error(`Error fetching from Alpha Vantage for ${symbol}:`, error.message);
            return {
                symbol: symbol.toUpperCase(),
                price: null,
                error: 'Unable to fetch current price from backup source',
                timestamp: Date.now()
            };
        }
    }

    async fetchCryptoPrice(symbol) {
        const cacheKey = `crypto:${symbol.toUpperCase()}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.data;
        }

        try {
            // Using CoinGecko free API
            const response = await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
                params: {
                    ids: this.getCoinGeckoId(symbol),
                    vs_currencies: 'usd',
                    include_last_updated_at: true
                }
            });

            const coinId = this.getCoinGeckoId(symbol);
            const coinData = response.data[coinId];

            const price = coinData?.usd || null;
            
            // Validate Bitcoin price (should be between $20k-$200k)
            if (symbol.toUpperCase() === 'BTC' && price && (price < 20000 || price > 200000)) {
                console.warn(`[MarketData] Bitcoin price ${price} seems unrealistic, rejecting`);
                return {
                    symbol: symbol.toUpperCase(),
                    price: null,
                    error: 'Price validation failed - unrealistic value',
                    timestamp: Date.now()
                };
            }

            const data = {
                symbol: symbol.toUpperCase(),
                price: price,
                timestamp: Date.now(),
                source: 'coingecko'
            };

            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error(`Error fetching crypto price for ${symbol}:`, error.message);
            return {
                symbol: symbol.toUpperCase(),
                price: null,
                error: 'Unable to fetch current price',
                timestamp: Date.now()
            };
        }
    }

    getCoinGeckoId(symbol) {
        const symbolMap = {
            'BTC': 'bitcoin',
            'ETH': 'ethereum',
            'ADA': 'cardano',
            'DOT': 'polkadot',
            'SOL': 'solana',
            'MATIC': 'polygon',
            'AVAX': 'avalanche-2',
            'LINK': 'chainlink',
            'UNI': 'uniswap',
            'AAVE': 'aave'
        };
        return symbolMap[symbol.toUpperCase()] || symbol.toLowerCase();
    }

    async fetchMultiplePrices(symbols, type = 'stock') {
        const promises = symbols.map(symbol => 
            type === 'crypto' ? this.fetchCryptoPrice(symbol) : this.fetchStockPrice(symbol)
        );
        return Promise.all(promises);
    }

    clearCache() {
        this.cache.clear();
    }

    getCacheSize() {
        return this.cache.size;
    }
}

module.exports = MarketDataService;