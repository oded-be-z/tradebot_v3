/**
 * Commodities Trading Service
 * Handles precious metals, energy, and agricultural commodities
 */

const axios = require('axios');

class CommoditiesService {
    constructor() {
        this.cache = new Map();
        this.CACHE_DURATION = 300000; // 5 minutes (commodities change slower)
        
        // Commodities symbols mapping
        this.commodities = {
            // Precious Metals
            'GOLD': { symbol: 'GC=F', name: 'Gold', unit: 'oz', polygon: 'C:XAUUSD' },
            'GC': { symbol: 'GC=F', name: 'Gold', unit: 'oz', polygon: 'C:XAUUSD' },
            'SILVER': { symbol: 'SI=F', name: 'Silver', unit: 'oz', polygon: 'C:XAGUSD' },
            'SI': { symbol: 'SI=F', name: 'Silver', unit: 'oz', polygon: 'C:XAGUSD' },
            'PLATINUM': { symbol: 'PL=F', name: 'Platinum', unit: 'oz', polygon: 'C:XPTUSD' },
            'PL': { symbol: 'PL=F', name: 'Platinum', unit: 'oz', polygon: 'C:XPTUSD' },
            'PALLADIUM': { symbol: 'PA=F', name: 'Palladium', unit: 'oz', polygon: 'C:XPDUSD' },
            'PA': { symbol: 'PA=F', name: 'Palladium', unit: 'oz', polygon: 'C:XPDUSD' },
            
            // Energy
            'OIL': { symbol: 'CL=F', name: 'Crude Oil WTI', unit: 'barrel', polygon: 'C:USOIL' },
            'CL': { symbol: 'CL=F', name: 'Crude Oil WTI', unit: 'barrel', polygon: 'C:USOIL' },
            'CRUDE': { symbol: 'CL=F', name: 'Crude Oil WTI', unit: 'barrel', polygon: 'C:USOIL' },
            'WTI': { symbol: 'CL=F', name: 'Crude Oil WTI', unit: 'barrel', polygon: 'C:USOIL' },
            'OPEC': { symbol: 'CL=F', name: 'Crude Oil WTI (OPEC reference)', unit: 'barrel', polygon: 'C:USOIL' },
            'BRENT': { symbol: 'BZ=F', name: 'Brent Crude Oil', unit: 'barrel', polygon: 'C:UKOIL' },
            'BZ': { symbol: 'BZ=F', name: 'Brent Crude Oil', unit: 'barrel', polygon: 'C:UKOIL' },
            'NATURAL_GAS': { symbol: 'NG=F', name: 'Natural Gas', unit: 'MMBtu', polygon: 'C:NGAS' },
            'NG': { symbol: 'NG=F', name: 'Natural Gas', unit: 'MMBtu', polygon: 'C:NGAS' },
            'GAS': { symbol: 'NG=F', name: 'Natural Gas', unit: 'MMBtu', polygon: 'C:NGAS' },
            'HEATING_OIL': { symbol: 'HO=F', name: 'Heating Oil', unit: 'gallon', polygon: null },
            'HO': { symbol: 'HO=F', name: 'Heating Oil', unit: 'gallon', polygon: null },
            
            // Agricultural
            'WHEAT': { symbol: 'ZW=F', name: 'Wheat', unit: 'bushel', polygon: null },
            'ZW': { symbol: 'ZW=F', name: 'Wheat', unit: 'bushel', polygon: null },
            'CORN': { symbol: 'ZC=F', name: 'Corn', unit: 'bushel', polygon: null },
            'ZC': { symbol: 'ZC=F', name: 'Corn', unit: 'bushel', polygon: null },
            'SOYBEANS': { symbol: 'ZS=F', name: 'Soybeans', unit: 'bushel', polygon: null },
            'ZS': { symbol: 'ZS=F', name: 'Soybeans', unit: 'bushel', polygon: null },
            'SUGAR': { symbol: 'SB=F', name: 'Sugar', unit: 'lb', polygon: null },
            'SB': { symbol: 'SB=F', name: 'Sugar', unit: 'lb', polygon: null },
            'COFFEE': { symbol: 'KC=F', name: 'Coffee', unit: 'lb', polygon: null },
            'KC': { symbol: 'KC=F', name: 'Coffee', unit: 'lb', polygon: null },
            'COTTON': { symbol: 'CT=F', name: 'Cotton', unit: 'lb', polygon: null },
            'CT': { symbol: 'CT=F', name: 'Cotton', unit: 'lb', polygon: null },
            
            // Industrial Metals
            'COPPER': { symbol: 'HG=F', name: 'Copper', unit: 'lb', polygon: 'C:COPPER' },
            'HG': { symbol: 'HG=F', name: 'Copper', unit: 'lb', polygon: 'C:COPPER' },
            'ALUMINUM': { symbol: 'ALI=F', name: 'Aluminum', unit: 'ton', polygon: null },
            'ALI': { symbol: 'ALI=F', name: 'Aluminum', unit: 'ton', polygon: null },
            'ZINC': { symbol: 'ZNK=F', name: 'Zinc', unit: 'ton', polygon: null },
            'ZNK': { symbol: 'ZNK=F', name: 'Zinc', unit: 'ton', polygon: null }
        };
    }

    async fetchCommodityPrice(symbol) {
        const upperSymbol = symbol.toUpperCase();
        const cacheKey = `commodity:${upperSymbol}`;
        const cached = this.cache.get(cacheKey);
        
        if (cached && Date.now() - cached.timestamp < this.CACHE_DURATION) {
            return cached.data;
        }

        const commodity = this.commodities[upperSymbol];
        if (!commodity) {
            // Try to suggest similar commodities
            const suggestions = this.getSuggestions(upperSymbol);
            const errorMessage = suggestions.length > 0 
                ? `'${upperSymbol}' not found. Did you mean: ${suggestions.join(', ')}?`
                : `'${upperSymbol}' is not a supported commodity. Available: GOLD, SILVER, OIL, BRENT, WHEAT, CORN, etc.`;
                
            return {
                symbol: upperSymbol,
                price: null,
                error: errorMessage,
                suggestions: suggestions,
                timestamp: Date.now()
            };
        }

        // Try multiple data sources
        const result = await this.tryMultipleSources(upperSymbol, commodity);
        
        if (result.price) {
            this.cache.set(cacheKey, {
                data: result,
                timestamp: Date.now()
            });
        }
        
        return result;
    }

    async tryMultipleSources(symbol, commodity) {
        // Source 1: Polygon (for major commodities)
        if (process.env.POLYGON_API_KEY && commodity.polygon) {
            try {
                const polygonResult = await this.fetchFromPolygon(symbol, commodity);
                if (polygonResult.price) return polygonResult;
            } catch (e) {
                console.log(`[Commodities] Polygon failed for ${symbol}: ${e.message}, trying alternatives...`);
            }
        }

        // Source 2: Yahoo Finance (futures data)
        try {
            const yahooResult = await this.fetchFromYahoo(symbol, commodity);
            if (yahooResult.price) return yahooResult;
        } catch (e) {
            console.log(`[Commodities] Yahoo failed for ${symbol}: ${e.message}, trying alternatives...`);
        }

        // Source 3: Alpha Vantage (if available)
        if (process.env.ALPHA_VANTAGE_API_KEY) {
            try {
                const alphaResult = await this.fetchFromAlphaVantage(symbol, commodity);
                if (alphaResult.price) return alphaResult;
            } catch (e) {
                console.log(`[Commodities] Alpha Vantage failed for ${symbol}: ${e.message}, trying free sources...`);
            }
        }

        // Source 4: Free commodity APIs
        try {
            const freeResult = await this.fetchFromFreeAPIs(symbol, commodity);
            if (freeResult.price) return freeResult;
        } catch (e) {
            console.log(`[Commodities] Free APIs failed for ${symbol}: ${e.message}`);
        }

        return {
            symbol: symbol,
            name: commodity.name,
            price: null,
            error: 'All commodity data sources failed',
            timestamp: Date.now()
        };
    }

    async fetchFromPolygon(symbol, commodity) {
        const response = await axios.get(
            `https://api.polygon.io/v2/aggs/ticker/${commodity.polygon}/prev`,
            { 
                params: { apiKey: process.env.POLYGON_API_KEY },
                timeout: 10000
            }
        );

        if (response.data.results?.[0]) {
            const result = response.data.results[0];
            return {
                symbol: symbol,
                name: commodity.name,
                price: result.c, // Close price
                open: result.o,
                high: result.h,
                low: result.l,
                volume: result.v,
                change: result.c - (result.pc || result.c),
                changePercent: ((result.c - (result.pc || result.c)) / (result.pc || result.c)) * 100,
                unit: commodity.unit,
                timestamp: Date.now(),
                source: 'polygon'
            };
        }
        
        throw new Error('No data from Polygon');
    }

    async fetchFromYahoo(symbol, commodity) {
        // Use yahoo-finance2 for futures data
        const yahooFinance = require('yahoo-finance2').default;
        
        try {
            const quote = await yahooFinance.quote(commodity.symbol);
            if (quote && quote.regularMarketPrice) {
                return {
                    symbol: symbol,
                    name: commodity.name,
                    price: quote.regularMarketPrice,
                    open: quote.regularMarketOpen,
                    high: quote.regularMarketDayHigh,
                    low: quote.regularMarketDayLow,
                    volume: quote.regularMarketVolume,
                    previousClose: quote.regularMarketPreviousClose,
                    change: quote.regularMarketChange,
                    changePercent: quote.regularMarketChangePercent,
                    unit: commodity.unit,
                    timestamp: Date.now(),
                    source: 'yahoo'
                };
            }
        } catch (e) {
            // Fallback for specific commodities
            if (symbol === 'GOLD' || symbol === 'SILVER' || symbol === 'GC' || symbol === 'SI') {
                return await this.fetchPreciousMetalsFromYahoo(symbol, commodity);
            }
        }
        
        throw new Error('No data from Yahoo Finance');
    }

    async fetchPreciousMetalsFromYahoo(symbol, commodity) {
        // Special handling for precious metals using currency pairs
        const yahooFinance = require('yahoo-finance2').default;
        
        let yahooSymbol;
        if (symbol === 'GOLD' || symbol === 'GC') {
            yahooSymbol = 'GC=F'; // Gold futures
        } else if (symbol === 'SILVER' || symbol === 'SI') {
            yahooSymbol = 'SI=F'; // Silver futures
        }
        
        if (yahooSymbol) {
            const quote = await yahooFinance.quote(yahooSymbol);
            if (quote && quote.regularMarketPrice) {
                return {
                    symbol: symbol,
                    name: commodity.name,
                    price: quote.regularMarketPrice,
                    open: quote.regularMarketOpen,
                    high: quote.regularMarketDayHigh,
                    low: quote.regularMarketDayLow,
                    change: quote.regularMarketChange,
                    changePercent: quote.regularMarketChangePercent,
                    unit: commodity.unit,
                    timestamp: Date.now(),
                    source: 'yahoo'
                };
            }
        }
        
        throw new Error('No precious metals data from Yahoo');
    }

    async fetchFromAlphaVantage(symbol, commodity) {
        // Alpha Vantage has limited commodity support
        if (symbol === 'OIL' || symbol === 'WTI' || symbol === 'CRUDE' || symbol === 'CL') {
            const response = await axios.get('https://www.alphavantage.co/query', {
                params: {
                    function: 'WTI',
                    interval: 'daily',
                    apikey: process.env.ALPHA_VANTAGE_API_KEY
                },
                timeout: 10000
            });

            const data = response.data.data;
            if (data && data.length > 0) {
                const latest = data[0];
                return {
                    symbol: symbol,
                    name: commodity.name,
                    price: parseFloat(latest.value),
                    unit: commodity.unit,
                    timestamp: Date.now(),
                    source: 'alphavantage'
                };
            }
        } else if (symbol === 'BRENT' || symbol === 'BZ') {
            const response = await axios.get('https://www.alphavantage.co/query', {
                params: {
                    function: 'BRENT',
                    interval: 'daily',
                    apikey: process.env.ALPHA_VANTAGE_API_KEY
                },
                timeout: 10000
            });

            const data = response.data.data;
            if (data && data.length > 0) {
                const latest = data[0];
                return {
                    symbol: symbol,
                    name: commodity.name,
                    price: parseFloat(latest.value),
                    unit: commodity.unit,
                    timestamp: Date.now(),
                    source: 'alphavantage'
                };
            }
        }
        
        throw new Error('No data from Alpha Vantage');
    }

    async fetchFromFreeAPIs(symbol, commodity) {
        // For precious metals, try metals-api.com (free tier)
        if (['GOLD', 'SILVER', 'PLATINUM', 'PALLADIUM', 'GC', 'SI', 'PL', 'PA'].includes(symbol)) {
            try {
                const metalSymbol = (symbol === 'GOLD' || symbol === 'GC') ? 'XAU' : 
                                  (symbol === 'SILVER' || symbol === 'SI') ? 'XAG' : 
                                  (symbol === 'PLATINUM' || symbol === 'PL') ? 'XPT' : 'XPD';
                
                const response = await axios.get(
                    `https://api.metals.live/v1/spot/${metalSymbol}`,
                    { timeout: 10000 }
                );

                if (response.data && response.data.price) {
                    return {
                        symbol: symbol,
                        name: commodity.name,
                        price: response.data.price,
                        unit: commodity.unit,
                        timestamp: Date.now(),
                        source: 'metals-live'
                    };
                }
            } catch (e) {
                console.log(`[Commodities] Metals API failed for ${symbol}: ${e.message}`);
            }
        }
        
        throw new Error('No data from free APIs');
    }

    async fetchMultipleCommodities(symbols) {
        const promises = symbols.map(symbol => this.fetchCommodityPrice(symbol));
        return Promise.all(promises);
    }

    getSupportedCommodities() {
        return Object.keys(this.commodities);
    }

    getCommodityInfo(symbol) {
        return this.commodities[symbol.toUpperCase()];
    }

    clearCache() {
        this.cache.clear();
    }

    getCacheSize() {
        return this.cache.size;
    }
    
    getSuggestions(symbol) {
        const upperSymbol = symbol.toUpperCase();
        const suggestions = [];
        const commodityKeys = Object.keys(this.commodities);
        
        // Check for partial matches
        for (const key of commodityKeys) {
            if (key.includes(upperSymbol) || upperSymbol.includes(key)) {
                suggestions.push(key);
            }
        }
        
        // Check for common misspellings
        if (upperSymbol === 'OILS' || upperSymbol === 'CRUDE OIL') {
            suggestions.push('OIL', 'BRENT', 'WTI', 'CL', 'BZ');
        }
        if (upperSymbol === 'NATURAL GAS' || upperSymbol === 'NATGAS') {
            suggestions.push('NATURAL_GAS', 'GAS', 'NG');
        }
        if (upperSymbol === 'PRECIOUS METALS') {
            suggestions.push('GOLD', 'SILVER', 'PLATINUM', 'GC', 'SI', 'PL');
        }
        
        // Remove duplicates
        return [...new Set(suggestions)].slice(0, 3);
    }
}

module.exports = CommoditiesService;