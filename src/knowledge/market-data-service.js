const axios = require('axios');
const yahooFinance = require('yahoo-finance2').default;
const ForexService = require('../data/forex-service');
const CommoditiesService = require('../data/commodities-service');

class MarketDataService {
    constructor() {
        this.cache = new Map();
        this.CACHE_DURATION = 30000; // 30 seconds for faster responses
        this.forexService = new ForexService();
        this.commoditiesService = new CommoditiesService();
        
        // Request coalescing to prevent duplicate API calls
        this.pendingRequests = new Map();
        
        // Optimize cache duration based on market hours
        this.updateCacheDuration();
        setInterval(() => this.updateCacheDuration(), 60000); // Update every minute
    }
    
    updateCacheDuration() {
        const now = new Date();
        const hour = now.getUTCHours();
        const day = now.getUTCDay();
        
        // Market hours (UTC): 14:30 - 21:00 weekdays
        const isMarketHours = day >= 1 && day <= 5 && hour >= 14 && hour <= 21;
        
        // Shorter cache during market hours for more real-time data
        this.CACHE_DURATION = isMarketHours ? 15000 : 60000; // 15s vs 60s
    }

    async retryRequest(fn, maxRetries = 3, delay = 1000) {
        for (let attempt = 1; attempt <= maxRetries; attempt++) {
            try {
                return await fn();
            } catch (error) {
                if (attempt === maxRetries) throw error;
                await new Promise(resolve => setTimeout(resolve, delay * attempt));
            }
        }
    }

    async fetchStockPrice(symbol) {
        const upperSymbol = symbol.toUpperCase();
        const cacheKey = `stock:${upperSymbol}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.data;
        }
        
        // Check if there's already a pending request for this symbol (request coalescing)
        if (this.pendingRequests.has(cacheKey)) {
            return this.pendingRequests.get(cacheKey);
        }
        
        // Create a new request promise and store it
        const requestPromise = this._fetchStockPriceInternal(upperSymbol, cacheKey);
        this.pendingRequests.set(cacheKey, requestPromise);
        
        try {
            const result = await requestPromise;
            return result;
        } finally {
            // Clean up pending request
            this.pendingRequests.delete(cacheKey);
        }
    }
    
    async _fetchStockPriceInternal(upperSymbol, cacheKey) {

        // TRY 1: Polygon (best real-time data)
        if (process.env.POLYGON_API_KEY) {
            try {
                const response = await this.retryRequest(async () => {
                    return await axios.get(
                        `https://api.polygon.io/v2/aggs/ticker/${upperSymbol}/prev`,
                        { 
                            params: { apiKey: process.env.POLYGON_API_KEY },
                            timeout: 10000
                        }
                    );
                });
                
                if (response.data.results?.[0]) {
                    const result = response.data.results[0];
                    const changePercent = ((result.c - (result.pc || result.c)) / (result.pc || result.c)) * 100;
                    
                    // Validate non-zero change
                    if (changePercent === 0 && result.c === result.pc) {
                        console.log(`[MarketData] Polygon returned 0% change for ${upperSymbol}, trying secondary source`);
                        throw new Error('Zero change detected');
                    }
                    
                    const data = {
                        symbol: upperSymbol,
                        price: result.c, // Close price
                        open: result.o,
                        high: result.h,
                        low: result.l,
                        volume: result.v,
                        previousClose: result.pc || result.c,
                        change: result.c - (result.pc || result.c),
                        changePercent: changePercent,
                        timestamp: Date.now(),
                        source: 'polygon'
                    };
                    this.cache.set(cacheKey, { data, timestamp: Date.now() });
                    return data;
                }
            } catch (e) {
                console.log(`Polygon failed for ${upperSymbol}: ${e.message}, trying Yahoo...`);
            }
        }

        // TRY 2: Yahoo Finance
        try {
            const quote = await this.retryRequest(async () => {
                return await yahooFinance.quote(upperSymbol);
            });
            if (quote && quote.regularMarketPrice) {
                let changePercent = quote.regularMarketChangePercent;
                let change = quote.regularMarketChange;
                
                // Use historical data if daily change is 0
                if (changePercent === 0) {
                    // Try to calculate from historical data
                    try {
                        const endDate = new Date();
                        const startDate = new Date();
                        startDate.setDate(startDate.getDate() - 2); // Get 2 days of data
                        
                        const hist = await this.retryRequest(async () => {
                            return await yahooFinance.chart(upperSymbol, {
                                period1: startDate,
                                period2: endDate,
                                interval: '1d'
                            }, { validateResult: false }); // Skip validation for historical
                        });
                        
                        if (hist.quotes && hist.quotes.length >= 2) {
                            const latest = hist.quotes[hist.quotes.length - 1];
                            const previous = hist.quotes[hist.quotes.length - 2];
                            change = latest.close - previous.close;
                            changePercent = (change / previous.close) * 100;
                            console.log(`[MarketData] Calculated change from historical: ${changePercent.toFixed(2)}%`);
                        }
                    } catch (histError) {
                        console.log(`[MarketData] Failed to get historical data: ${histError.message}`);
                    }
                }
                
                const data = {
                    symbol: upperSymbol,
                    price: quote.regularMarketPrice,
                    open: quote.regularMarketOpen,
                    high: quote.regularMarketDayHigh,
                    low: quote.regularMarketDayLow,
                    volume: quote.regularMarketVolume,
                    previousClose: quote.regularMarketPreviousClose,
                    change: change,
                    changePercent: changePercent,
                    timestamp: Date.now(),
                    source: 'yahoo'
                };
                this.cache.set(cacheKey, { data, timestamp: Date.now() });
                return data;
            }
        } catch (e) {
            console.log(`Yahoo failed for ${upperSymbol}: ${e.message}, trying Alpha Vantage...`);
        }

        // TRY 3: Alpha Vantage
        if (process.env.ALPHA_VANTAGE_API_KEY) {
            try {
                const response = await this.retryRequest(async () => {
                    return await axios.get('https://www.alphavantage.co/query', {
                        params: {
                            function: 'GLOBAL_QUOTE',
                            symbol: upperSymbol,
                            apikey: process.env.ALPHA_VANTAGE_API_KEY
                        },
                        timeout: 10000
                    });
                });
                
                const quote = response.data['Global Quote'];
                if (quote && quote['05. price']) {
                    const data = {
                        symbol: upperSymbol,
                        price: parseFloat(quote['05. price']),
                        open: parseFloat(quote['02. open']),
                        high: parseFloat(quote['03. high']),
                        low: parseFloat(quote['04. low']),
                        volume: parseInt(quote['06. volume']),
                        previousClose: parseFloat(quote['08. previous close']),
                        change: parseFloat(quote['09. change']),
                        changePercent: parseFloat(quote['10. change percent'].replace('%', '')),
                        timestamp: Date.now(),
                        source: 'alphavantage'
                    };
                    this.cache.set(cacheKey, { data, timestamp: Date.now() });
                    return data;
                }
            } catch (e) {
                console.error(`Alpha Vantage failed for ${upperSymbol}: ${e.message}. All APIs failed.`);
            }
        }

        // Final fallback: return simulated realistic data as a last resort
        console.log(`[MarketData] All APIs failed for ${upperSymbol}, using realistic simulation`);
        const basePrice = this.getSimulatedBasePrice(upperSymbol);
        if (basePrice) {
            const changePercent = (Math.random() - 0.5) * 10; // -5% to +5%
            const change = basePrice * (changePercent / 100);
            
            return {
                symbol: upperSymbol,
                price: basePrice,
                open: basePrice * (1 - (Math.random() * 0.02)),
                high: basePrice * (1 + (Math.random() * 0.03)),
                low: basePrice * (1 - (Math.random() * 0.03)),
                volume: Math.floor(Math.random() * 10000000),
                previousClose: basePrice - change,
                change: change,
                changePercent: changePercent,
                timestamp: Date.now(),
                source: 'simulated',
                note: 'Real-time data temporarily unavailable'
            };
        }
        
        return { 
            symbol: upperSymbol, 
            price: null, 
            error: `Unable to retrieve ${upperSymbol} data from primary sources. Symbol may be invalid or temporarily unavailable.`,
            timestamp: Date.now(),
            source: 'error'
        };
    }


    async fetchCryptoPrice(symbol) {
        const upperSymbol = symbol.toUpperCase();
        const cacheKey = `crypto:${upperSymbol}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.data;
        }
        
        // For crypto, try CoinGecko first (more reliable for prices)
        try {
            const response = await this.retryRequest(async () => {
                return await axios.get(`https://api.coingecko.com/api/v3/simple/price`, {
                    params: {
                        ids: this.getCoinGeckoId(symbol),
                        vs_currencies: 'usd',
                        include_24hr_change: 'true',
                        include_24hr_vol: 'true',
                        include_last_updated_at: 'true'
                    },
                    timeout: 10000
                });
            });

            const coinId = this.getCoinGeckoId(symbol);
            const coinData = response.data[coinId];

            const price = coinData?.usd || null;
            
            // Add realistic price validation
            if (upperSymbol === 'BTC' && price && (price < 20000 || price > 200000)) {
                console.warn(`[MarketData] Bitcoin price ${price} outside realistic range (20K-200K), trying next source`);
                throw new Error('Unrealistic price');
            }
            
            const changePercent = coinData?.usd_24h_change || 0;
            const volume = coinData?.usd_24h_vol || 0;
            
            const data = {
                symbol: upperSymbol,
                price: price,
                change: price ? (price * (changePercent / 100)) : 0,
                changePercent: changePercent,
                volume: volume,
                timestamp: Date.now(),
                source: 'coingecko'
            };

            this.cache.set(cacheKey, {
                data,
                timestamp: Date.now()
            });

            return data;
        } catch (error) {
            console.error(`[MarketData] CoinGecko failed for ${upperSymbol}: ${error.message}, trying Polygon...`);
        }

        // Fallback to Polygon
        if (process.env.POLYGON_API_KEY) {
            try {
                const polygonSymbol = `X:${upperSymbol}USD`;
                const response = await this.retryRequest(async () => {
                    return await axios.get(
                        `https://api.polygon.io/v2/aggs/ticker/${polygonSymbol}/prev`,
                        { params: { apiKey: process.env.POLYGON_API_KEY } }
                    );
                });
                
                if (response.data.results?.[0]) {
                    const result = response.data.results[0];
                    const data = {
                        symbol: upperSymbol,
                        price: result.c,
                        change: result.c - (result.pc || result.c),
                        changePercent: ((result.c - (result.pc || result.c)) / (result.pc || result.c)) * 100,
                        volume: result.v,
                        timestamp: Date.now(),
                        source: 'polygon'
                    };
                    this.cache.set(cacheKey, { data, timestamp: Date.now() });
                    return data;
                }
            } catch (e) {
                console.log(`Polygon crypto failed for ${upperSymbol}: ${e.message}, trying Yahoo...`);
            }
        }

        // Try Yahoo Finance for crypto
        try {
            const yahooSymbol = `${upperSymbol}-USD`;
            const quote = await this.retryRequest(async () => {
                return await yahooFinance.quote(yahooSymbol);
            });
            if (quote && quote.regularMarketPrice) {
                const data = {
                    symbol: upperSymbol,
                    price: quote.regularMarketPrice,
                    open: quote.regularMarketOpen,
                    high: quote.regularMarketDayHigh,
                    low: quote.regularMarketDayLow,
                    volume: quote.regularMarketVolume,
                    previousClose: quote.regularMarketPreviousClose,
                    change: quote.regularMarketChange,
                    changePercent: quote.regularMarketChangePercent,
                    timestamp: Date.now(),
                    source: 'yahoo'
                };
                this.cache.set(cacheKey, { data, timestamp: Date.now() });
                return data;
            }
        } catch (e) {
            console.log(`Yahoo crypto failed for ${upperSymbol}: ${e.message}`);
        }

        // Final fallback: return error with graceful message
        return {
            symbol: upperSymbol,
            price: null,
            error: `Unable to retrieve ${upperSymbol} data from primary sources. Symbol may be invalid or temporarily unavailable.`,
            timestamp: Date.now(),
            source: 'error'
        };
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

    async fetchForexRate(pair) {
        return await this.forexService.fetchForexRate(pair);
    }

    async fetchCommodityPrice(commodity) {
        const upperCommodity = commodity.toUpperCase();
        const cacheKey = `commodity:${upperCommodity}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.data;
        }
        
        const commodityInfo = this.commoditiesService.getCommodityInfo(upperCommodity);
        if (!commodityInfo) {
            return { error: `Unknown commodity: ${commodity}` };
        }
        
        // TRY 1: Yahoo Finance (reliable for spot prices)
        try {
            const yahooSymbol = commodityInfo.symbol;
            const quote = await this.retryRequest(async () => {
                return await yahooFinance.quote(yahooSymbol);
            });
            
            if (quote && quote.regularMarketPrice) {
                let changePercent = quote.regularMarketChangePercent;
                let change = quote.regularMarketChange;
                
                // If change is 0, calculate from historical
                if (changePercent === 0) {
                    try {
                        const endDate = new Date();
                        const startDate = new Date();
                        startDate.setDate(startDate.getDate() - 2);
                        
                        const hist = await this.retryRequest(async () => {
                            return await yahooFinance.chart(yahooSymbol, {
                                period1: startDate,
                                period2: endDate,
                                interval: '1d'
                            }, { validateResult: false });
                        });
                        
                        if (hist.quotes && hist.quotes.length >= 2) {
                            const latest = hist.quotes[hist.quotes.length - 1];
                            const previous = hist.quotes[hist.quotes.length - 2];
                            change = latest.close - previous.close;
                            changePercent = (change / previous.close) * 100;
                        }
                    } catch (histError) {
                        console.log(`[Commodities] Historical fallback failed: ${histError.message}`);
                    }
                }
                
                // Price validation for gold (typical range 1500-3000 USD/oz)
                if (upperCommodity === 'GC' && quote.regularMarketPrice) {
                    const price = quote.regularMarketPrice;
                    if (price < 1500 || price > 3000) {
                        console.warn(`[Commodities] Gold price ${price} outside realistic range (1500-3000), trying next source`);
                        throw new Error('Unrealistic price');
                    }
                }
                
                const data = {
                    symbol: upperCommodity,
                    name: commodityInfo.name,
                    price: quote.regularMarketPrice,
                    open: quote.regularMarketOpen,
                    high: quote.regularMarketDayHigh,
                    low: quote.regularMarketDayLow,
                    volume: quote.regularMarketVolume,
                    previousClose: quote.regularMarketPreviousClose,
                    change: change,
                    changePercent: changePercent,
                    unit: commodityInfo.unit,
                    timestamp: Date.now(),
                    source: 'yahoo'
                };
                this.cache.set(cacheKey, { data, timestamp: Date.now() });
                return data;
            }
        } catch (e) {
            console.log(`Yahoo failed for ${upperCommodity}: ${e.message}, trying Polygon...`);
        }
        
        // TRY 2: Polygon (for futures data)
        if (process.env.POLYGON_API_KEY && commodityInfo.polygon) {
            try {
                const response = await this.retryRequest(async () => {
                    return await axios.get(
                        `https://api.polygon.io/v2/aggs/ticker/${commodityInfo.polygon}/prev`,
                        { params: { apiKey: process.env.POLYGON_API_KEY } }
                    );
                });
                
                if (response.data.results?.[0]) {
                    const result = response.data.results[0];
                    const changePercent = ((result.c - (result.pc || result.c)) / (result.pc || result.c)) * 100;
                    
                    const data = {
                        symbol: upperCommodity,
                        name: commodityInfo.name,
                        price: result.c,
                        open: result.o,
                        high: result.h,
                        low: result.l,
                        volume: result.v,
                        change: result.c - (result.pc || result.c),
                        changePercent: changePercent,
                        unit: commodityInfo.unit,
                        timestamp: Date.now(),
                        source: 'polygon'
                    };
                    this.cache.set(cacheKey, { data, timestamp: Date.now() });
                    return data;
                }
            } catch (e) {
                console.log(`Polygon failed for ${upperCommodity}: ${e.message}, trying alternatives...`);
            }
        }
        
        // Final fallback: return error
        return {
            symbol: upperCommodity,
            price: null,
            error: `Unable to retrieve ${commodityInfo.name} data from primary sources.`,
            timestamp: Date.now(),
            source: 'error'
        };
    }

    async fetchMultiplePrices(symbols, type = 'stock') {
        const promises = symbols.map(symbol => {
            switch (type) {
                case 'crypto':
                    return this.fetchCryptoPrice(symbol);
                case 'forex':
                    return this.fetchForexRate(symbol);
                case 'commodity':
                    return this.fetchCommodityPrice(symbol);
                default:
                    return this.fetchStockPrice(symbol);
            }
        });
        return Promise.all(promises);
    }

    async fetchMarketData(symbol, type = 'auto') {
        // Normalize symbol first to handle full names like "BITCOIN"
        const normalizedSymbol = this.normalizeSymbol(symbol);
        const upperSymbol = normalizedSymbol.toUpperCase();
        
        // Auto-detect type if not specified
        if (type === 'auto') {
            type = this.detectAssetType(upperSymbol);
        }
        
        console.log(`[MarketData] Fetching ${type} data for ${symbol} (normalized: ${upperSymbol})`);
        
        switch (type) {
            case 'crypto':
                return await this.fetchCryptoPrice(upperSymbol);
            case 'forex':
                return await this.fetchForexRate(upperSymbol);
            case 'commodity':
                return await this.fetchCommodityPrice(upperSymbol);
            default:
                return await this.fetchStockPrice(upperSymbol);
        }
    }

    detectAssetType(symbol) {
        // Normalize symbol first
        const normalizedSymbol = this.normalizeSymbol(symbol);
        
        // Detect forex pairs
        if (symbol.includes('/') || symbol.includes('USD') || symbol.includes('EUR') || symbol.includes('GBP')) {
            return 'forex';
        }
        
        // Detect crypto (expanded list)
        const cryptoSymbols = [
            'BTC', 'ETH', 'ADA', 'DOT', 'SOL', 'MATIC', 'AVAX', 'LINK', 'UNI', 'AAVE', 'DOGE',
            'LTC', 'XRP', 'BCH', 'BNB', 'ATOM', 'ALGO', 'VET', 'FIL', 'ICP', 'THETA'
        ];
        if (cryptoSymbols.includes(normalizedSymbol)) {
            return 'crypto';
        }
        
        // Detect commodities - Check normalized symbol first (highest priority)
        const commoditySymbols = [
            // Futures symbols (normalized results)
            'GC', 'SI', 'CL', 'NG', 'HG', 'PL', 'PA', 'BZ', 'RB', 'HO',
            // Agricultural commodities
            'ZC', 'ZS', 'ZW', 'KC', 'SB', 'CT', 'CC', 'OJ',
            // Livestock
            'LE', 'GF', 'HE'
        ];
        if (commoditySymbols.includes(normalizedSymbol)) {
            return 'commodity';
        }
        
        // Check original symbol for commodity keywords
        const commodityKeywords = [
            'GOLD', 'SILVER', 'OIL', 'COPPER', 'WHEAT', 'CORN', 'COFFEE', 'SUGAR', 'COTTON', 
            'OPEC', 'BRENT', 'WTI', 'CRUDE', 'NATURAL_GAS', 'GAS', 'PLATINUM', 'PALLADIUM'
        ];
        if (commodityKeywords.some(keyword => symbol.toUpperCase().includes(keyword))) {
            return 'commodity';
        }
        
        // Default to stock
        return 'stock';
    }

    clearCache() {
        this.cache.clear();
        this.forexService.clearCache();
        this.commoditiesService.clearCache();
    }

    getCacheSize() {
        return {
            total: this.cache.size + this.forexService.getCacheSize() + this.commoditiesService.getCacheSize(),
            stocks: this.cache.size,
            forex: this.forexService.getCacheSize(),
            commodities: this.commoditiesService.getCacheSize()
        };
    }

    normalizeSymbol(symbol) {
        if (!symbol || typeof symbol !== 'string') return symbol;
        
        const upperSymbol = symbol.toUpperCase();
        
        // Common full name to symbol mappings
        const nameToSymbol = {
            'BITCOIN': 'BTC',
            'ETHEREUM': 'ETH',
            'DOGECOIN': 'DOGE',
            'CARDANO': 'ADA',
            'SOLANA': 'SOL',
            'POLYGON': 'MATIC',
            'AVALANCHE': 'AVAX',
            'CHAINLINK': 'LINK',
            'UNISWAP': 'UNI',
            'AAVE': 'AAVE',
            'APPLE': 'AAPL',
            'MICROSOFT': 'MSFT',
            'GOOGLE': 'GOOGL',
            'AMAZON': 'AMZN',
            'TESLA': 'TSLA',
            'META': 'META',
            'NVIDIA': 'NVDA',
            'NETFLIX': 'NFLX',
            // Commodity mappings - Oil & Energy
            'OIL': 'CL',
            'CRUDE': 'CL',
            'CRUDE OIL': 'CL',
            'WTI': 'CL',
            'WTI CRUDE': 'CL',
            'WEST TEXAS': 'CL',
            'BRENT': 'BZ',
            'BRENT CRUDE': 'BZ',
            'GAS': 'NG',
            'NATURAL GAS': 'NG',
            'GASOLINE': 'RB',
            'HEATING OIL': 'HO',
            'OPEC': 'CL', // Map OPEC to crude oil
            
            // Precious Metals
            'GOLD': 'GC',
            'SILVER': 'SI',
            'PLATINUM': 'PL',
            'PALLADIUM': 'PA',
            'COPPER': 'HG'
        };
        
        return nameToSymbol[upperSymbol] || upperSymbol;
    }
    
    getSimulatedBasePrice(symbol) {
        // Realistic base prices for common symbols (as of 2025)
        const basePrices = {
            // Stocks
            'AAPL': 195.50,
            'MSFT': 425.75,
            'GOOGL': 155.25,
            'AMZN': 185.50,
            'TSLA': 245.75,
            'META': 515.25,
            'NVDA': 885.50,
            'NFLX': 485.25,
            'DIS': 115.50,
            'JPM': 205.75,
            'BAC': 35.50,
            'WMT': 165.25,
            'PG': 155.50,
            'KO': 62.75,
            
            // Crypto
            'BTC': 95000,
            'ETH': 3500,
            'ADA': 0.95,
            'DOT': 8.50,
            'SOL': 185.50,
            'MATIC': 0.85,
            'AVAX': 38.50,
            'LINK': 15.25,
            'UNI': 12.50,
            'DOGE': 0.35,
            
            // ETFs
            'SPY': 585.50,
            'QQQ': 500.25,
            'IWM': 225.50,
            'DIA': 435.75
        };
        
        return basePrices[symbol] || null;
    }

    async fetchHistoricalData(symbol, days = 30, interval = '1d', type = 'auto') {
        const upperSymbol = symbol.toUpperCase();
        const cacheKey = `historical:${upperSymbol}:${days}:${interval}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.data;
        }
        
        // Auto-detect type if not specified
        if (type === 'auto') {
            type = this.detectAssetType(upperSymbol);
        }
        
        console.log(`[MarketData] Fetching historical ${type} data for ${upperSymbol}`);
        
        const endDate = new Date();
        const startDate = new Date(endDate);
        startDate.setDate(startDate.getDate() - days);
        
        let historical = [];
        
        // First, try Polygon for commodities and crypto
        if (process.env.POLYGON_API_KEY && (type === 'commodity' || type === 'crypto')) {
            try {
                let polygonTicker;
                if (type === 'commodity') {
                    const commodityInfo = this.commoditiesService.getCommodityInfo(upperSymbol);
                    polygonTicker = commodityInfo?.polygon;
                } else if (type === 'crypto') {
                    polygonTicker = `X:${upperSymbol}USD`;
                }
                
                if (polygonTicker) {
                    const response = await this.retryRequest(async () => {
                        return await axios.get(
                            `https://api.polygon.io/v2/aggs/ticker/${polygonTicker}/range/1/day/${startDate.toISOString().split('T')[0]}/${endDate.toISOString().split('T')[0]}`,
                            {
                                params: {
                                    apiKey: process.env.POLYGON_API_KEY,
                                    adjusted: true,
                                    sort: 'asc'
                                },
                                timeout: 10000
                            }
                        );
                    });
                    
                    if (response.data.results && response.data.results.length > 0) {
                        historical = response.data.results.map(r => ({
                            date: new Date(r.t).toISOString().split('T')[0],
                            close: r.c,
                            high: r.h,
                            low: r.l,
                            open: r.o,
                            volume: r.v
                        }));
                        
                        if (historical.length > 0) {
                            this.cache.set(cacheKey, { data: historical, timestamp: Date.now() });
                            return historical;
                        }
                    }
                }
            } catch (error) {
                console.log(`[MarketData] Polygon historical failed for ${upperSymbol}: ${error.message}, falling back to Yahoo`);
            }
        }
        
        // Fallback to Yahoo with validation disabled
        try {
            let yahooSymbol = upperSymbol;
            if (type === 'commodity') {
                const commodityInfo = this.commoditiesService.getCommodityInfo(upperSymbol);
                yahooSymbol = commodityInfo?.symbol || `${upperSymbol}=F`;
            } else if (type === 'crypto') {
                yahooSymbol = `${upperSymbol}-USD`;
            }
            
            const chart = await this.retryRequest(async () => {
                return await yahooFinance.chart(yahooSymbol, {
                    period1: startDate,
                    period2: endDate,
                    interval: interval
                }, { validateResult: false }); // Skip schema validation
            });
            
            if (chart.quotes && chart.quotes.length > 0) {
                historical = chart.quotes.map(q => ({
                    date: q.date,
                    close: q.close,
                    high: q.high,
                    low: q.low,
                    open: q.open,
                    volume: q.volume
                }));
                
                this.cache.set(cacheKey, { data: historical, timestamp: Date.now() });
                return historical;
            }
        } catch (error) {
            console.error(`[MarketData] Historical fetch failed for ${upperSymbol}: ${error.message}`);
        }
        
        // If all fail, return empty array
        return [];
    }
}

module.exports = MarketDataService;