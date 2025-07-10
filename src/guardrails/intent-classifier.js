class IntentClassifier {
    constructor() {
        this.financialKeywords = [
            // Stock/Investment terms
            'stock', 'stocks', 'share', 'shares', 'equity', 'securities',
            'investment', 'invest', 'investing', 'investor', 'portfolio',
            'trading', 'trade', 'trader', 'buy', 'sell', 'purchase',
            'market', 'markets', 'exchange', 'nasdaq', 'nyse', 'dow',
            
            // Financial metrics
            'price', 'prices', 'value', 'valuation', 'worth', 'cost',
            'dividend', 'dividends', 'earnings', 'revenue', 'profit', 'loss',
            'pe ratio', 'p/e', 'p/e ratio', 'p e ratio', 'market cap', 'capitalization',
            'volume', 'volatility', 'beta', 'alpha',
            
            // Market conditions
            'bull', 'bear', 'rally', 'correction', 'crash', 'bubble',
            'support', 'resistance', 'breakout', 'trend', 'momentum',
            'oversold', 'overbought', 'dip', 'surge', 'spike',
            
            // Analysis types
            'analysis', 'analyze', 'technical', 'fundamental',
            'chart', 'charts', 'indicator', 'indicators',
            'moving average', 'rsi', 'macd', 'bollinger',
            
            // Cryptocurrency (expanded)
            'crypto', 'cryptocurrency', 'bitcoin', 'btc', 'ethereum', 'eth',
            'blockchain', 'defi', 'nft', 'altcoin', 'stablecoin', 'mining',
            'dogecoin', 'doge', 'litecoin', 'ltc', 'ripple', 'xrp',
            'cardano', 'ada', 'solana', 'sol', 'polygon', 'matic',
            'avalanche', 'avax', 'chainlink', 'link', 'uniswap', 'uni',
            'polkadot', 'dot', 'binance', 'bnb', 'tether', 'usdt',
            'shiba', 'shib', 'coin', 'coins', 'token', 'tokens',
            'wallet', 'exchange', 'coinbase', 'binance', 'kraken',
            'hodl', 'pump', 'dump', 'moon', 'lambo', 'diamond hands',
            'to the moon', 'hold', 'hodling', 'rekt', 'fomo',
            
            // Financial instruments
            'etf', 'mutual fund', 'bond', 'bonds', 'options', 'futures',
            'derivatives', 'commodity', 'commodities', 'forex',
            
            // Financial institutions
            'bank', 'broker', 'brokerage', 'hedge fund', 'pension',
            'insurance', 'credit', 'loan', 'mortgage', 'debt',
            
            // Economic terms
            'economy', 'economic', 'inflation', 'deflation', 'recession',
            'gdp', 'interest rate', 'federal reserve', 'fed', 'treasury',
            
            // Casual financial language
            'whats up with', 'what about', 'how did', 'how is', 'how are',
            'what happened to', 'what happened with', 'performance',
            'doing well', 'doing bad', 'going up', 'going down',
            'last week', 'last month', 'this week', 'this month',
            'today', 'yesterday', 'recent', 'recently', 'lately',
            'gains', 'losses', 'profit', 'loss', 'winner', 'loser',
            'hot', 'cold', 'popular', 'trending', 'outperform',
            'underperform', 'beat', 'miss', 'estimates'
        ];

        this.nonFinancialKeywords = [
            // Investment advice (should be refused)
            'should i buy', 'should i sell', 'should i invest', 'what should i buy',
            'what should i sell', 'recommend buying', 'recommend selling',
            'is it good to buy', 'is it good to sell', 'investment advice',
            
            // Personal/Social
            'weather', 'recipe', 'cooking', 'food', 'eat', 'eating', 'restaurant',
            'movie', 'music', 'song', 'book', 'game', 'sport',
            'travel', 'vacation', 'hotel', 'flight', 'relationship', 'dating',
            'personal', 'advice', 'life', 'family', 'friends', 'social',
            
            // Technology (non-financial)
            'programming', 'code', 'software', 'hardware', 'computer',
            'internet', 'website', 'app', 'mobile', 'android', 'ios',
            
            // Health/Medical
            'health', 'medical', 'doctor', 'hospital', 'medicine',
            'symptom', 'disease', 'treatment', 'therapy',
            
            // Education
            'school', 'university', 'education', 'learning', 'study',
            'homework', 'exam', 'test', 'grade', 'course',
            
            // Legal
            'legal', 'law', 'lawyer', 'attorney', 'court', 'contract', 'contracts',
            'lawsuit', 'judge', 'jury', 'litigation',
            
            // General
            'help', 'how to', 'what is', 'where is', 'when is',
            'joke', 'funny', 'story', 'news' // news can be financial, handled separately
        ];

        this.stockSymbolPattern = /\$[A-Z]{1,5}\b|\b(?:aapl|msft|googl|tsla|amzn|meta|nvda|intc|amd|nflx|dis|jpm|bac|wmt|pg|ko|pfe|jnj|xom|cvx|ibm|csco|orcl|crm|adbe|pypl|zm|roku|spot|abnb|coin|hood|gme|amc|pltr|spce|lcid|rivn|apple|microsoft|tesla|amazon|facebook|nvidia|intel|netflix|disney|visa|mastercard|jpmorgan|walmart|pfizer|johnson|exxon|chevron|cisco|oracle|salesforce|adobe|paypal|zoom|spotify|airbnb|coinbase|robinhood|gamestop|palantir|lucid|rivian)\b/gi;
        this.cryptoPattern = /\b(BTC|ETH|ADA|DOT|SOL|MATIC|AVAX|LINK|UNI|AAVE|LTC|XRP|DOGE|BNB|USDT|USDC|SHIB|ATOM|ALGO|XLM|VET|THETA|FTM|NEAR|SAND|MANA|CRO|APE|IMX|GMX|COMP|SUSHI|CAKE|ALPHA|RUNE|LUNA|UST|WBTC|WETH|DAI|BUSD|TUSD|FRAX|LUSD|SUSD|GUSD|USDP|EURS|EURT|XAUT|PAXG|AMPL|YFI|MKR|SNX|CRV|BAL|LEND|AAVE|COMP|SUSHI|UNI|INCH|ZRX|LRC|MATIC|QUICK|GHST|KLIMA|BOBA|MOVR|GLMR|ASTR|SDN|KAR|PHA|CLVR|RMRK|CHAOS|USDY|WBTC|WETH|WSOL|WAVAX|WFTM|WMATIC|WBNB|WCRO|WONE|WGLMR|WMOVR|WASTR|WKLAY|WMETIS|WROSE|WDOGE|WTLOS|WIOTX|WTRX|WEOS|WTAO|WHALE|ORCA|RAY|SRM|FIDA|MEDIA|ROPE|SLIM|STEP|SUNNY|SABER|TULIP|LARIX|APRICOT|FRANCIUM|SOLEND|MANGO|DRIFT|ZETA|HXRO|BONFIDA|SERUM|SONAR|ATLAS|POLIS|STAR|OXAI|COPE|MAPS|SAMO|NINJA|SLRS|MNGO|MEAN|JET|GRAPE|GST|GMT|BONK|MYRO|WIF|POPCAT|PONKE|PEPE|FLOKI|BABYDOGE|SAFEMOON|ELONGATE|CUMROCKET|HOKK|KISHU|DOGELON|AKITA|SHIBA|LEASH|BONE|RYOSHI|JACY|SAITAMA|MONONOKE|KUMA|ELON|BABY|MOON|SAFEMARS|PITBULL|FOXGIRL|CATGIRL|WAIFU|DOGE|BITCOIN|ETHEREUM|LITECOIN|RIPPLE|CARDANO|SOLANA|POLKADOT|DOGECOIN|AVALANCHE|CHAINLINK|UNISWAP|POLYGON|BINANCE|TETHER|SHIBA|PEPE|FLOKI|BONK|WIF|POPCAT|MYRO|PONKE|TRUMP|BODEN|TREMP|MAGA|BIDEN|HILLARY|BERNIE|YANG|TULSI|WARREN|HARRIS|NEWSOM|DESANTIS|CRUZ|RUBIO|SCOTT|HALEY|VIVEK|RONPAUL|LIBERTARIAN|CONSTITUTION|GREEN|REFORM|PIRATE|COMMUNIST|SOCIALIST|ANARCHIST|FASCIST|NATIONALIST|POPULIST|PROGRESSIVE|CONSERVATIVE|LIBERAL|MODERATE|CENTRIST|INDEPENDENT|DEMOCRAT|REPUBLICAN|LIBERTARIAN|CONSTITUTION|GREEN|REFORM|PIRATE|COMMUNIST|SOCIALIST|ANARCHIST|FASCIST|NATIONALIST|POPULIST|PROGRESSIVE|CONSERVATIVE|LIBERAL|MODERATE|CENTRIST|INDEPENDENT|DEMOCRAT|REPUBLICAN)\b/gi;
        this.pricePattern = /\$?\d+(?:\.\d{2})?(?:\s?(?:dollars?|usd|cents?))?/gi;
    }

    classifyIntent(text) {
        const normalizedText = text.toLowerCase();
        const words = normalizedText.split(/\s+/);
        
        let financialScore = 0;
        let nonFinancialScore = 0;
        let totalWords = words.length;
        let keywordMatches = [];

        // Check for financial keywords with better scoring
        for (const keyword of this.financialKeywords) {
            if (normalizedText.includes(keyword)) {
                const keywordLength = keyword.split(' ').length;
                // Multi-word terms get higher weight, crypto terms get bonus
                let weight = keywordLength;
                if (keyword.includes('bitcoin') || keyword.includes('crypto') || keyword.includes('btc') || 
                    keyword.includes('ethereum') || keyword.includes('eth') || keyword.includes('coin') ||
                    keyword.includes('whats up with') || keyword.includes('what about') || 
                    keyword.includes('how did') || keyword.includes('performance')) {
                    weight += 2; // Bonus for crypto terms and casual language
                }
                financialScore += weight;
                keywordMatches.push(keyword);
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
            financialScore += stockMatches.length * 3; // Higher weight for symbols
        }

        // Check for crypto symbols with enhanced detection
        const cryptoMatches = text.match(this.cryptoPattern);
        if (cryptoMatches) {
            financialScore += cryptoMatches.length * 4; // Even higher weight for crypto
        }

        // Check for price mentions
        const priceMatches = text.match(this.pricePattern);
        if (priceMatches) {
            financialScore += priceMatches.length * 2;
        }

        // Context-aware scoring adjustments
        if (this.hasFinancialContext(normalizedText)) {
            financialScore += 3;
        }

        // Temporal context boosts (last week, this month, etc.)
        if (this.hasTemporalContext(normalizedText)) {
            financialScore += 2;
        }

        // Calculate confidence with improved algorithm
        const totalScore = financialScore + nonFinancialScore;
        let classification;
        let confidence;

        if (totalScore === 0) {
            classification = 'ambiguous';
            confidence = 0.3;
        } else if (financialScore > nonFinancialScore) {
            classification = 'financial';
            confidence = Math.min(financialScore / (totalScore + 1), 0.95);
        } else if (nonFinancialScore > financialScore) {
            classification = 'non-financial';
            confidence = Math.min(nonFinancialScore / (totalScore + 1), 0.95);
        } else {
            classification = 'ambiguous';
            confidence = 0.5;
        }

        // Boost confidence for strong financial indicators
        if (stockMatches || cryptoMatches || priceMatches) {
            if (classification === 'financial') {
                confidence = Math.min(confidence + 0.25, 0.98);
            }
        }

        // Special handling for edge cases
        if (this.isGreeting(normalizedText)) {
            classification = 'greeting';
            confidence = 0.9;
        }

        // Improve question handling
        if (this.isQuestion(normalizedText)) {
            if (classification === 'ambiguous' && financialScore === 0) {
                classification = 'non-financial';
                confidence = 0.7;
            } else if (classification === 'financial' && financialScore >= 3) {
                confidence = Math.min(confidence + 0.1, 0.98);
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
                keywordMatches,
                totalWords,
                isQuestion: this.isQuestion(normalizedText),
                isGreeting: this.isGreeting(normalizedText),
                hasFinancialContext: this.hasFinancialContext(normalizedText),
                hasTemporalContext: this.hasTemporalContext(normalizedText)
            }
        };
    }

    isGreeting(text) {
        const greetings = ['hello', 'hi', 'hey', 'good morning', 'good afternoon', 'good evening'];
        // Only consider it a greeting if it's primarily a greeting, not if greeting words appear in other contexts
        return greetings.some(greeting => text.trim().toLowerCase().startsWith(greeting) || text.trim().toLowerCase() === greeting);
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

    hasFinancialContext(text) {
        const financialContextPatterns = [
            /\b(up|down|rise|fall|increase|decrease|gain|loss|drop|climb|surge|plunge|rally|crash)\b/gi,
            /\b(performance|performing|outperform|underperform|beat|miss|estimate|target)\b/gi,
            /\b(investment|trading|portfolio|market|stock|crypto|bitcoin|ethereum)\b/gi,
            /\b(buy|sell|hold|purchased|sold|bought)\b/gi
        ];
        
        return financialContextPatterns.some(pattern => pattern.test(text));
    }

    hasTemporalContext(text) {
        const temporalPatterns = [
            /\b(last|this|next|past|previous|recent|recently|lately|yesterday|today|tomorrow)\s+(week|month|year|quarter|day|days|weeks|months|years)\b/gi,
            /\b(week|month|year|quarter|day|days|weeks|months|years)\s+(ago|back)\b/gi,
            /\b(ytd|year to date|month to date|week to date)\b/gi,
            /\b(q1|q2|q3|q4|first quarter|second quarter|third quarter|fourth quarter)\b/gi
        ];
        
        return temporalPatterns.some(pattern => pattern.test(text));
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