class DisclaimerManager {
    constructor() {
        this.disclaimers = {
            general: {
                text: "⚠️ **Disclaimer**: This information is for educational purposes only and should not be considered as financial advice. Always consult with a qualified financial advisor before making any investment decisions.",
                severity: 'medium',
                placement: 'end'
            },
            
            investment_advice: {
                text: "🚨 **Important**: This is not investment advice. Past performance does not guarantee future results. All investments carry risk, including potential loss of principal. Please consult with a licensed financial advisor before making investment decisions.",
                severity: 'high',
                placement: 'start'
            },
            
            price_data: {
                text: "📊 **Note**: Price data may be delayed and should be verified with official sources. Market conditions can change rapidly.",
                severity: 'low',
                placement: 'end'
            },
            
            crypto: {
                text: "⚡ **Crypto Warning**: Cryptocurrency investments are highly volatile and speculative. Digital assets can lose value rapidly and are not insured by government agencies. Only invest what you can afford to lose completely.",
                severity: 'high',
                placement: 'start'
            },
            
            penny_stocks: {
                text: "⚠️ **High Risk**: Penny stocks are extremely volatile and risky investments. They often lack liquidity and can be subject to manipulation. Exercise extreme caution.",
                severity: 'high',
                placement: 'start'
            },
            
            options_futures: {
                text: "⚠️ **Derivatives Warning**: Options and futures are complex financial instruments that can result in significant losses. They are not suitable for all investors and require substantial knowledge and experience.",
                severity: 'high',
                placement: 'start'
            },
            
            market_timing: {
                text: "⏰ **Market Timing**: Attempting to time the market is extremely difficult and often unsuccessful. Dollar-cost averaging and long-term investing are generally recommended strategies.",
                severity: 'medium',
                placement: 'end'
            },
            
            leverage: {
                text: "⚠️ **Leverage Risk**: Leveraged investments can amplify both gains and losses. You can lose more than your initial investment. Use leverage only if you fully understand the risks.",
                severity: 'high',
                placement: 'start'
            },
            
            tax_implications: {
                text: "💰 **Tax Considerations**: Investment decisions can have significant tax implications. Consult with a tax professional to understand how investments may affect your tax situation.",
                severity: 'medium',
                placement: 'end'
            },
            
            regulatory: {
                text: "📋 **Regulatory Notice**: Investment recommendations and analysis are subject to regulatory oversight. This bot is not a registered investment advisor and cannot provide personalized investment advice.",
                severity: 'medium',
                placement: 'end'
            }
        };

        this.riskKeywords = {
            high_risk: ['penny stock', 'cryptocurrency', 'crypto', 'bitcoin', 'options', 'futures', 'leverage', 'margin', 'short selling', 'day trading'],
            medium_risk: ['growth stock', 'small cap', 'emerging market', 'sector rotation', 'momentum trading'],
            advice_terms: ['should buy', 'should sell', 'recommend', 'suggestion', 'advice', 'what to buy', 'when to sell']
        };
    }

    analyzeContent(content, queryType = 'general') {
        const lowerContent = content.toLowerCase();
        const requiredDisclaimers = [];

        // Check for investment advice language
        if (this.containsAdviceLanguage(lowerContent)) {
            requiredDisclaimers.push('investment_advice');
        }

        // Check for high-risk investments
        if (this.containsHighRiskTerms(lowerContent)) {
            if (this.containsCryptoTerms(lowerContent)) {
                requiredDisclaimers.push('crypto');
            }
            if (this.containsPennyStockTerms(lowerContent)) {
                requiredDisclaimers.push('penny_stocks');
            }
            if (this.containsDerivativeTerms(lowerContent)) {
                requiredDisclaimers.push('options_futures');
            }
            if (this.containsLeverageTerms(lowerContent)) {
                requiredDisclaimers.push('leverage');
            }
        }

        // Check for specific content types
        if (this.containsPriceData(lowerContent)) {
            requiredDisclaimers.push('price_data');
        }

        if (this.containsMarketTimingContent(lowerContent)) {
            requiredDisclaimers.push('market_timing');
        }

        if (this.containsTaxContent(lowerContent)) {
            requiredDisclaimers.push('tax_implications');
        }

        // Add general disclaimer if none specific found
        if (requiredDisclaimers.length === 0 && this.isFinancialContent(lowerContent)) {
            requiredDisclaimers.push('general');
        }

        return {
            requiredDisclaimers,
            riskLevel: this.assessRiskLevel(lowerContent),
            contentType: this.identifyContentType(lowerContent)
        };
    }

    addDisclaimers(content, requiredDisclaimers, options = {}) {
        if (!requiredDisclaimers || requiredDisclaimers.length === 0) {
            return content;
        }

        let modifiedContent = content;
        const startDisclaimers = [];
        const endDisclaimers = [];

        // Sort disclaimers by placement
        for (const disclaimerType of requiredDisclaimers) {
            const disclaimer = this.disclaimers[disclaimerType];
            if (disclaimer) {
                if (disclaimer.placement === 'start') {
                    startDisclaimers.push(disclaimer.text);
                } else {
                    endDisclaimers.push(disclaimer.text);
                }
            }
        }

        // Add start disclaimers
        if (startDisclaimers.length > 0) {
            modifiedContent = startDisclaimers.join('\n\n') + '\n\n' + modifiedContent;
        }

        // Add end disclaimers
        if (endDisclaimers.length > 0) {
            modifiedContent = modifiedContent + '\n\n' + endDisclaimers.join('\n\n');
        }

        return modifiedContent;
    }

    containsAdviceLanguage(content) {
        const adviceTerms = [
            'should buy', 'should sell', 'i recommend', 'you should',
            'my advice', 'suggestion is', 'i suggest', 'you need to',
            'must buy', 'must sell', 'definitely buy', 'definitely sell'
        ];
        return adviceTerms.some(term => content.includes(term));
    }

    containsHighRiskTerms(content) {
        return this.riskKeywords.high_risk.some(term => content.includes(term));
    }

    containsCryptoTerms(content) {
        const cryptoTerms = ['cryptocurrency', 'crypto', 'bitcoin', 'ethereum', 'blockchain', 'defi', 'nft'];
        return cryptoTerms.some(term => content.includes(term));
    }

    containsPennyStockTerms(content) {
        const pennyTerms = ['penny stock', 'otc stock', 'pink sheet'];
        return pennyTerms.some(term => content.includes(term));
    }

    containsDerivativeTerms(content) {
        const derivativeTerms = ['options', 'futures', 'derivatives', 'calls', 'puts'];
        return derivativeTerms.some(term => content.includes(term));
    }

    containsLeverageTerms(content) {
        const leverageTerms = ['leverage', 'margin', 'leveraged', 'short selling'];
        return leverageTerms.some(term => content.includes(term));
    }

    containsPriceData(content) {
        return content.includes('price') || content.includes('$') || /\d+\.\d{2}/.test(content);
    }

    containsMarketTimingContent(content) {
        const timingTerms = ['when to buy', 'when to sell', 'market timing', 'best time'];
        return timingTerms.some(term => content.includes(term));
    }

    containsTaxContent(content) {
        const taxTerms = ['tax', 'taxes', 'capital gains', 'tax implications'];
        return taxTerms.some(term => content.includes(term));
    }

    isFinancialContent(content) {
        const financialTerms = ['stock', 'investment', 'market', 'portfolio', 'trading'];
        return financialTerms.some(term => content.includes(term));
    }

    assessRiskLevel(content) {
        if (this.containsHighRiskTerms(content)) return 'high';
        if (this.riskKeywords.medium_risk.some(term => content.includes(term))) return 'medium';
        return 'low';
    }

    identifyContentType(content) {
        if (this.containsAdviceLanguage(content)) return 'advice';
        if (this.containsPriceData(content)) return 'price_data';
        if (content.includes('analysis')) return 'analysis';
        if (content.includes('news')) return 'news';
        return 'general';
    }

    processResponse(content, queryType = 'general', userPreferences = {}) {
        // Analyze content for required disclaimers
        const analysis = this.analyzeContent(content, queryType);
        
        // Check user preferences for disclaimer display
        const shouldAddDisclaimers = this.shouldAddDisclaimers(
            analysis.riskLevel, 
            userPreferences
        );

        if (!shouldAddDisclaimers) {
            return {
                content: content,
                disclaimersAdded: [],
                riskLevel: analysis.riskLevel,
                contentType: analysis.contentType,
                skipped: true,
                reason: 'User preferences or low risk'
            };
        }

        // Add appropriate disclaimers
        const processedContent = this.addDisclaimers(
            content, 
            analysis.requiredDisclaimers,
            userPreferences
        );

        return {
            content: processedContent,
            disclaimersAdded: analysis.requiredDisclaimers,
            riskLevel: analysis.riskLevel,
            contentType: analysis.contentType,
            skipped: false,
            originalLength: content.length,
            processedLength: processedContent.length
        };
    }

    shouldAddDisclaimers(riskLevel, userPreferences = {}) {
        // Always add disclaimers for high-risk content
        if (riskLevel === 'high') return true;
        
        // Check user preferences
        if (userPreferences.disableDisclaimers === true) return false;
        if (userPreferences.minimalDisclaimers === true && riskLevel === 'low') return false;
        
        return true; // Default to adding disclaimers
    }

    getCustomDisclaimer(type, text) {
        return {
            type: 'custom',
            text: text,
            severity: 'medium',
            placement: 'end',
            timestamp: new Date().toISOString()
        };
    }

    getDisclaimerStats() {
        return {
            totalDisclaimers: Object.keys(this.disclaimers).length,
            riskLevels: ['low', 'medium', 'high'],
            placements: ['start', 'end'],
            lastUpdated: new Date().toISOString()
        };
    }
}

module.exports = DisclaimerManager;