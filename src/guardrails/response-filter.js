class ResponseFilter {
    constructor() {
        this.blockedTopics = [
            'weather', 'recipes', 'cooking', 'movies', 'music', 'games',
            'sports', 'travel', 'health', 'medical', 'programming',
            'personal advice', 'relationships', 'politics', 'religion'
        ];

        this.allowedFinancialTopics = [
            'stocks', 'cryptocurrency', 'investing', 'trading', 'markets',
            'financial analysis', 'economic data', 'portfolio management',
            'risk management', 'financial education', 'market trends'
        ];

        this.politePhrases = [
            "I'm a financial assistant focused on helping with investment and market-related questions.",
            "I specialize in financial markets and investment topics.",
            "My expertise is in financial markets, stocks, and investment analysis.",
            "I'm designed to help with financial and investment-related queries."
        ];

        this.redirectSuggestions = [
            "Instead, I can help you with stock analysis, market trends, or investment strategies.",
            "I'd be happy to discuss stock prices, market analysis, or investment opportunities.",
            "Feel free to ask about any stocks, cryptocurrencies, or investment topics.",
            "I can assist with market data, financial analysis, or investment education."
        ];
    }

    shouldBlockResponse(query, classification, confidence) {
        // Block if clearly non-financial with high confidence
        if (classification === 'non-financial' && confidence >= 0.7) {
            return {
                block: true,
                reason: 'Non-financial topic detected',
                confidence: confidence
            };
        }

        // Block if ambiguous with low financial relevance
        if (classification === 'ambiguous' && confidence < 0.5) {
            return {
                block: true,
                reason: 'Query unclear or not finance-related',
                confidence: confidence
            };
        }

        // Allow greetings and financial queries
        if (classification === 'greeting' || 
            (classification === 'financial' && confidence >= 0.6)) {
            return {
                block: false,
                reason: 'Allowed topic',
                confidence: confidence
            };
        }

        // Default to blocking uncertain cases
        return {
            block: true,
            reason: 'Uncertain relevance to financial topics',
            confidence: confidence
        };
    }

    generateRefusalMessage(query, classification, reason) {
        const politePhrase = this.getRandomElement(this.politePhrases);
        const suggestion = this.getRandomElement(this.redirectSuggestions);

        let message = politePhrase;

        // Add specific guidance based on classification
        if (classification === 'non-financial') {
            message += " I'm not able to help with non-financial topics.";
        } else if (classification === 'ambiguous') {
            message += " I need questions to be clearly related to financial markets or investing.";
        }

        message += ` ${suggestion}`;

        return {
            type: 'refusal',
            message: message,
            originalQuery: query,
            classification: classification,
            reason: reason,
            timestamp: new Date().toISOString()
        };
    }

    filterResponse(response, query, classification) {
        // Check if response contains non-financial content
        const containsNonFinancial = this.containsNonFinancialContent(response);
        
        if (containsNonFinancial) {
            return {
                filtered: true,
                originalResponse: response,
                filteredResponse: this.generateRefusalMessage(query, classification, 'Response contained non-financial content'),
                reason: 'Non-financial content detected in response'
            };
        }

        // Check for inappropriate investment advice
        const containsAdvice = this.containsInvestmentAdvice(response);
        
        if (containsAdvice) {
            return {
                filtered: true,
                originalResponse: response,
                filteredResponse: this.addInvestmentDisclaimer(response),
                reason: 'Added investment disclaimer'
            };
        }

        return {
            filtered: false,
            originalResponse: response,
            filteredResponse: response,
            reason: 'No filtering required'
        };
    }

    containsNonFinancialContent(response) {
        const lowerResponse = response.toLowerCase();
        
        const nonFinancialIndicators = [
            'recipe', 'cooking', 'weather', 'movie', 'music', 'game',
            'sport', 'travel', 'health', 'medical', 'programming',
            'code', 'software', 'personal advice', 'relationship'
        ];

        return nonFinancialIndicators.some(indicator => 
            lowerResponse.includes(indicator)
        );
    }

    containsInvestmentAdvice(response) {
        const lowerResponse = response.toLowerCase();
        
        const adviceIndicators = [
            'you should buy', 'you should sell', 'i recommend buying',
            'i recommend selling', 'you must', 'you need to',
            'definitely buy', 'definitely sell', 'guaranteed',
            'sure thing', 'can\'t lose', 'will definitely'
        ];

        return adviceIndicators.some(indicator => 
            lowerResponse.includes(indicator)
        );
    }

    addInvestmentDisclaimer(response) {
        const disclaimer = "\n\n⚠️ **Important Disclaimer**: This is for informational purposes only and not financial advice. Always consult with a qualified financial advisor before making investment decisions.";
        return response + disclaimer;
    }

    validateFinancialQuery(query) {
        const lowerQuery = query.toLowerCase();
        
        // Check for explicit financial terms
        const financialTerms = [
            'stock', 'price', 'invest', 'trade', 'market', 'crypto',
            'bitcoin', 'ethereum', 'portfolio', 'dividend', 'earnings',
            'analysis', 'buy', 'sell', 'nasdaq', 'dow', 'sp500'
        ];

        const hasFinancialTerms = financialTerms.some(term => 
            lowerQuery.includes(term)
        );

        // Check for stock symbols
        const hasStockSymbols = /\b[A-Z]{1,5}\b|\$[A-Z]{1,5}/.test(query);

        // Check for price mentions
        const hasPrices = /\$?\d+(?:\.\d{2})?/.test(query);

        return {
            isValid: hasFinancialTerms || hasStockSymbols || hasPrices,
            hasFinancialTerms,
            hasStockSymbols,
            hasPrices,
            score: (hasFinancialTerms ? 1 : 0) + (hasStockSymbols ? 1 : 0) + (hasPrices ? 0.5 : 0)
        };
    }

    getRandomElement(array) {
        return array[Math.floor(Math.random() * array.length)];
    }

    formatRefusalForChat(refusalData) {
        return {
            role: 'assistant',
            content: refusalData.message,
            type: 'refusal',
            metadata: {
                originalQuery: refusalData.originalQuery,
                classification: refusalData.classification,
                reason: refusalData.reason,
                timestamp: refusalData.timestamp
            }
        };
    }

    logFilterAction(action, query, result) {
        const logEntry = {
            timestamp: new Date().toISOString(),
            action: action,
            query: query,
            result: result,
            type: 'response_filter'
        };

        // In a real implementation, this would go to a logging service
        console.log('[ResponseFilter]', JSON.stringify(logEntry));
        
        return logEntry;
    }

    getFilterStats() {
        // In a real implementation, this would return actual statistics
        return {
            totalQueries: 0,
            blockedQueries: 0,
            allowedQueries: 0,
            filterRate: 0,
            lastReset: new Date().toISOString()
        };
    }
}

module.exports = ResponseFilter;