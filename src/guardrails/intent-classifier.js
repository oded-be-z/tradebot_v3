class IntentClassifier {
    constructor() {
        this.financialKeywords = [
            // Stock/Investment terms
            'stock', 'stocks', 'share', 'shares', 'equity', 'securities',
            'investment', 'invest', 'investing', 'investor', 'portfolio',
            'trading', 'trade', 'trader', 'buy', 'sell', 'purchase',
            'market', 'markets', 'exchange', 'nasdaq', 'nyse', 'dow',
            
            // Financial metrics
            'price', 'prices', 'value', 'valuation', 'worth',
            'dividend', 'dividends', 'earnings', 'revenue', 'profit', 'loss',
            'pe ratio', 'p/e', 'market cap', 'capitalization',
            'volume', 'volatility', 'beta', 'alpha',
            
            // Market conditions
            'bull', 'bear', 'rally', 'correction', 'crash', 'bubble',
            'support', 'resistance', 'breakout', 'trend', 'momentum',
            'oversold', 'overbought', 'dip', 'surge', 'spike',
            
            // Analysis types
            'analysis', 'analyze', 'technical', 'fundamental',
            'chart', 'charts', 'indicator', 'indicators',
            'moving average', 'rsi', 'macd', 'bollinger',
            
            // Cryptocurrency
            'crypto', 'cryptocurrency', 'bitcoin', 'ethereum', 'blockchain',
            'defi', 'nft', 'altcoin', 'stablecoin', 'mining',
            
            // Financial instruments
            'etf', 'mutual fund', 'bond', 'bonds', 'options', 'futures',
            'derivatives', 'commodity', 'commodities', 'forex',
            
            // Financial institutions
            'bank', 'broker', 'brokerage', 'hedge fund', 'pension',
            'insurance', 'credit', 'loan', 'mortgage', 'debt',
            
            // Economic terms
            'economy', 'economic', 'inflation', 'deflation', 'recession',
            'gdp', 'interest rate', 'federal reserve', 'fed', 'treasury'
        ];

        this.nonFinancialKeywords = [
            // Personal/Social
            'weather', 'recipe', 'cooking', 'food', 'restaurant',
            'movie', 'music', 'song', 'book', 'game', 'sport',
            'travel', 'vacation', 'hotel', 'flight',
            
            // Technology (non-financial)
            'programming', 'code', 'software', 'hardware', 'computer',
            'internet', 'website', 'app', 'mobile', 'android', 'ios',
            
            // Health/Medical
            'health', 'medical', 'doctor', 'hospital', 'medicine',
            'symptom', 'disease', 'treatment', 'therapy',
            
            // Education
            'school', 'university', 'education', 'learning', 'study',
            'homework', 'exam', 'test', 'grade', 'course',
            
            // General
            'help', 'how to', 'what is', 'where is', 'when is',
            'joke', 'funny', 'story', 'news' // news can be financial, handled separately
        ];

        this.stockSymbolPattern = /\b[A-Z]{1,5}\b|\$[A-Z]{1,5}/g;
        this.cryptoPattern = /\b(BTC|ETH|ADA|DOT|SOL|MATIC|AVAX|LINK|UNI|AAVE)\b/gi;
        this.pricePattern = /\$?\d+(?:\.\d{2})?(?:\s?(?:dollars?|usd|cents?))?/gi;
    }

    classifyIntent(text) {
        const normalizedText = text.toLowerCase();
        const words = normalizedText.split(/\s+/);
        
        let financialScore = 0;
        let nonFinancialScore = 0;
        let totalWords = words.length;

        // Check for financial keywords
        for (const keyword of this.financialKeywords) {
            if (normalizedText.includes(keyword)) {
                financialScore += keyword.split(' ').length; // Multi-word terms get higher weight
            }
        }

        // Check for non-financial keywords
        for (const keyword of this.nonFinancialKeywords) {
            if (normalizedText.includes(keyword)) {
                nonFinancialScore += keyword.split(' ').length;
            }
        }

        // Check for stock symbols
        const stockMatches = text.match(this.stockSymbolPattern);
        if (stockMatches) {
            financialScore += stockMatches.length * 2; // Higher weight for symbols
        }

        // Check for crypto symbols
        const cryptoMatches = text.match(this.cryptoPattern);
        if (cryptoMatches) {
            financialScore += cryptoMatches.length * 2;
        }

        // Check for price mentions
        const priceMatches = text.match(this.pricePattern);
        if (priceMatches) {
            financialScore += priceMatches.length;
        }

        // Normalize scores
        const maxScore = Math.max(financialScore, nonFinancialScore, 1);
        const financialConfidence = financialScore / maxScore;
        const nonFinancialConfidence = nonFinancialScore / maxScore;

        // Determine classification
        let classification;
        let confidence;

        if (financialScore > nonFinancialScore) {
            classification = 'financial';
            confidence = Math.min(financialConfidence, 1.0);
        } else if (nonFinancialScore > financialScore) {
            classification = 'non-financial';
            confidence = Math.min(nonFinancialConfidence, 1.0);
        } else {
            classification = 'ambiguous';
            confidence = 0.5;
        }

        // Boost confidence for clear financial indicators
        if (stockMatches || cryptoMatches || priceMatches) {
            if (classification === 'financial') {
                confidence = Math.min(confidence + 0.3, 1.0);
            }
        }

        // Special handling for edge cases
        if (this.isGreeting(normalizedText)) {
            classification = 'greeting';
            confidence = 0.9;
        }

        if (this.isQuestion(normalizedText) && classification === 'ambiguous') {
            // Generic questions default to non-financial unless clear financial context
            if (financialScore === 0) {
                classification = 'non-financial';
                confidence = 0.7;
            }
        }

        return {
            classification,
            confidence: Math.round(confidence * 100) / 100,
            financialScore,
            nonFinancialScore,
            details: {
                stockSymbols: stockMatches || [],
                cryptoSymbols: cryptoMatches || [],
                priceReferences: priceMatches || [],
                totalWords,
                isQuestion: this.isQuestion(normalizedText),
                isGreeting: this.isGreeting(normalizedText)
            }
        };
    }

    isGreeting(text) {
        const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
        return greetings.some(greeting => text.includes(greeting));
    }

    isQuestion(text) {
        return text.includes('?') || 
               text.startsWith('what') || 
               text.startsWith('how') || 
               text.startsWith('when') || 
               text.startsWith('where') || 
               text.startsWith('why') || 
               text.startsWith('who') ||
               text.startsWith('is') ||
               text.startsWith('can') ||
               text.startsWith('should') ||
               text.startsWith('would') ||
               text.startsWith('could');
    }

    getFinancialIntentType(text) {
        const normalizedText = text.toLowerCase();
        
        if (normalizedText.includes('price') || normalizedText.includes('cost') || normalizedText.includes('worth')) {
            return 'price_inquiry';
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

        if (normalizedText.includes('portfolio') || normalizedText.includes('allocation')) {
            return 'portfolio_management';
        }

        if (normalizedText.includes('dividend') || normalizedText.includes('earnings')) {
            return 'fundamental_data';
        }

        return 'general_financial';
    }

    shouldAllowResponse(classification, confidence) {
        // Allow financial queries with high confidence
        if (classification === 'financial' && confidence >= 0.6) {
            return { allow: true, reason: 'Financial query with sufficient confidence' };
        }

        // Allow greetings
        if (classification === 'greeting') {
            return { allow: true, reason: 'Greeting message' };
        }

        // Block non-financial queries
        if (classification === 'non-financial' && confidence >= 0.7) {
            return { allow: false, reason: 'Non-financial query detected' };
        }

        // Handle ambiguous cases
        if (classification === 'ambiguous' || confidence < 0.6) {
            return { allow: false, reason: 'Ambiguous or low-confidence query' };
        }

        return { allow: true, reason: 'Default allow' };
    }
}

module.exports = IntentClassifier;