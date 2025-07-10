class NLPProcessor {
    constructor() {
        this.companyToSymbol = {
            'apple': 'AAPL',
            'microsoft': 'MSFT',
            'google': 'GOOGL',
            'alphabet': 'GOOGL',
            'amazon': 'AMZN',
            'meta': 'META',
            'facebook': 'META',
            'tesla': 'TSLA',
            'nvidia': 'NVDA',
            'intel': 'INTC',
            'amd': 'AMD',
            'netflix': 'NFLX',
            'paypal': 'PYPL',
            'visa': 'V',
            'mastercard': 'MA',
            'walmart': 'WMT',
            'johnson & johnson': 'JNJ',
            'procter & gamble': 'PG',
            'coca cola': 'KO',
            'pepsi': 'PEP',
            'disney': 'DIS',
            'boeing': 'BA',
            'caterpillar': 'CAT',
            'goldman sachs': 'GS',
            'jpmorgan': 'JPM',
            'bank of america': 'BAC',
            'wells fargo': 'WFC',
            'berkshire hathaway': 'BRK.B'
        };

        this.cryptoNames = {
            'bitcoin': 'BTC',
            'ethereum': 'ETH',
            'cardano': 'ADA',
            'polkadot': 'DOT',
            'solana': 'SOL',
            'polygon': 'MATIC',
            'avalanche': 'AVAX',
            'chainlink': 'LINK',
            'uniswap': 'UNI',
            'aave': 'AAVE'
        };

        this.commonMisspellings = {
            'appl': 'AAPL',
            'microsft': 'MSFT',
            'googl': 'GOOGL',
            'amazn': 'AMZN',
            'teslla': 'TSLA',
            'nvdia': 'NVDA',
            'intell': 'INTC',
            'netflx': 'NFLX',
            'bitcon': 'BTC',
            'etherum': 'ETH',
            'etherem': 'ETH'
        };
    }

    extractSymbols(text) {
        const symbols = [];
        const normalizedText = text.toLowerCase();

        // Extract symbols with $ prefix
        const dollarSymbols = text.match(/\$([A-Z]{1,5})/g);
        if (dollarSymbols) {
            symbols.push(...dollarSymbols.map(s => s.substring(1)));
        }

        // Extract standalone symbols (2-5 uppercase letters)
        const standaloneSymbols = text.match(/\b[A-Z]{2,5}\b/g);
        if (standaloneSymbols) {
            symbols.push(...standaloneSymbols);
        }

        // Extract company names
        for (const [company, symbol] of Object.entries(this.companyToSymbol)) {
            if (normalizedText.includes(company)) {
                symbols.push(symbol);
            }
        }

        // Extract crypto names
        for (const [cryptoName, symbol] of Object.entries(this.cryptoNames)) {
            if (normalizedText.includes(cryptoName)) {
                symbols.push(symbol);
            }
        }

        // Handle misspellings
        for (const [misspelling, correct] of Object.entries(this.commonMisspellings)) {
            if (normalizedText.includes(misspelling)) {
                symbols.push(correct);
            }
        }

        return [...new Set(symbols)]; // Remove duplicates
    }

    normalizeSymbol(input) {
        const normalized = input.toUpperCase().replace(/^\$/, '');
        
        // Check if it's a misspelling
        const corrected = this.commonMisspellings[normalized.toLowerCase()];
        if (corrected) {
            return corrected;
        }

        // Check if it's a company name
        const symbol = this.companyToSymbol[input.toLowerCase()];
        if (symbol) {
            return symbol;
        }

        // Check if it's a crypto name
        const crypto = this.cryptoNames[input.toLowerCase()];
        if (crypto) {
            return crypto;
        }

        return normalized;
    }

    detectFinancialTerms(text) {
        const financialTerms = [
            'stock', 'stocks', 'share', 'shares', 'price', 'prices',
            'trading', 'trade', 'buy', 'sell', 'market', 'portfolio',
            'investment', 'invest', 'dividend', 'earnings', 'revenue',
            'profit', 'loss', 'bull', 'bear', 'volatility', 'volume',
            'crypto', 'cryptocurrency', 'bitcoin', 'ethereum', 'blockchain',
            'rally', 'dip', 'correction', 'resistance', 'support',
            'analysis', 'technical', 'fundamental', 'valuation', 'pe ratio',
            'market cap', 'ipo', 'etf', 'mutual fund', 'options', 'futures'
        ];

        const normalizedText = text.toLowerCase();
        const foundTerms = financialTerms.filter(term => 
            normalizedText.includes(term)
        );

        return foundTerms;
    }

    identifyQueryType(text) {
        const normalizedText = text.toLowerCase();
        
        if (normalizedText.includes('price') || normalizedText.includes('cost') || normalizedText.includes('worth')) {
            return 'price_query';
        }
        
        if (normalizedText.includes('buy') || normalizedText.includes('purchase')) {
            return 'buy_intent';
        }
        
        if (normalizedText.includes('sell')) {
            return 'sell_intent';
        }
        
        if (normalizedText.includes('analysis') || normalizedText.includes('analyze')) {
            return 'analysis_request';
        }
        
        if (normalizedText.includes('news') || normalizedText.includes('update')) {
            return 'news_request';
        }
        
        if (normalizedText.includes('compare') || normalizedText.includes('vs')) {
            return 'comparison';
        }

        return 'general_inquiry';
    }

    extractPriceTargets(text) {
        // Extract price mentions like "$150", "150 dollars", etc.
        const priceRegex = /\$?(\d+(?:\.\d{2})?)\s?(?:dollars?|usd|$)/gi;
        const matches = text.match(priceRegex);
        
        if (matches) {
            return matches.map(match => {
                const price = parseFloat(match.replace(/[^\d.]/g, ''));
                return price;
            });
        }
        
        return [];
    }

    cleanText(text) {
        return text
            .replace(/[^\w\s$.-]/g, ' ') // Keep alphanumeric, spaces, $, ., -
            .replace(/\s+/g, ' ')        // Normalize whitespace
            .trim();
    }

    processQuery(text) {
        const cleanedText = this.cleanText(text);
        
        return {
            originalText: text,
            cleanedText: cleanedText,
            symbols: this.extractSymbols(cleanedText),
            financialTerms: this.detectFinancialTerms(cleanedText),
            queryType: this.identifyQueryType(cleanedText),
            priceTargets: this.extractPriceTargets(cleanedText),
            isFinancial: this.detectFinancialTerms(cleanedText).length > 0 || this.extractSymbols(cleanedText).length > 0
        };
    }
}

module.exports = NLPProcessor;