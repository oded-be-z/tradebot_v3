const DisclaimerManager = require('../guardrails/disclaimer-manager');

describe('DisclaimerManager', () => {
    let manager;

    beforeEach(() => {
        manager = new DisclaimerManager();
    });

    describe('analyzeContent', () => {
        test('should detect investment advice language', () => {
            const content = "You should buy AAPL stock now";
            const analysis = manager.analyzeContent(content);
            
            expect(analysis.requiredDisclaimers).toContain('investment_advice');
            expect(analysis.riskLevel).toBe('low');
        });

        test('should detect crypto content', () => {
            const content = "Bitcoin is a great cryptocurrency investment";
            const analysis = manager.analyzeContent(content);
            
            expect(analysis.requiredDisclaimers).toContain('crypto');
            expect(analysis.riskLevel).toBe('high');
        });

        test('should detect penny stock content', () => {
            const content = "This penny stock could explode";
            const analysis = manager.analyzeContent(content);
            
            expect(analysis.requiredDisclaimers).toContain('penny_stocks');
            expect(analysis.riskLevel).toBe('high');
        });

        test('should detect options and futures content', () => {
            const content = "Options trading can be profitable";
            const analysis = manager.analyzeContent(content);
            
            expect(analysis.requiredDisclaimers).toContain('options_futures');
            expect(analysis.riskLevel).toBe('high');
        });

        test('should detect leverage content', () => {
            const content = "Using margin can amplify returns";
            const analysis = manager.analyzeContent(content);
            
            expect(analysis.requiredDisclaimers).toContain('leverage');
            expect(analysis.riskLevel).toBe('high');
        });

        test('should detect price data', () => {
            const content = "AAPL is trading at $150.25";
            const analysis = manager.analyzeContent(content);
            
            expect(analysis.requiredDisclaimers).toContain('price_data');
        });

        test('should detect market timing content', () => {
            const content = "The best time to buy is now";
            const analysis = manager.analyzeContent(content);
            
            expect(analysis.requiredDisclaimers).toContain('market_timing');
        });

        test('should detect tax implications content', () => {
            const content = "Consider the tax implications of this trade";
            const analysis = manager.analyzeContent(content);
            
            expect(analysis.requiredDisclaimers).toContain('tax_implications');
        });

        test('should add general disclaimer for financial content without specific risks', () => {
            const content = "Stock markets can be volatile";
            const analysis = manager.analyzeContent(content);
            
            expect(analysis.requiredDisclaimers).toContain('general');
        });
    });

    describe('addDisclaimers', () => {
        test('should add start disclaimers at the beginning', () => {
            const content = "Buy this stock now";
            const disclaimers = ['investment_advice'];
            
            const result = manager.addDisclaimers(content, disclaimers);
            
            expect(result).toMatch(/^🚨.*Important.*not investment advice/);
            expect(result).toContain(content);
        });

        test('should add end disclaimers at the end', () => {
            const content = "AAPL price is $150";
            const disclaimers = ['price_data'];
            
            const result = manager.addDisclaimers(content, disclaimers);
            
            expect(result).toContain(content);
            expect(result).toMatch(/Price data may be delayed.*$/);
        });

        test('should add multiple disclaimers correctly', () => {
            const content = "Bitcoin trading advice";
            const disclaimers = ['crypto', 'investment_advice'];
            
            const result = manager.addDisclaimers(content, disclaimers);
            
            expect(result).toContain('Crypto Warning');
            expect(result).toContain('Important');
            expect(result).toContain(content);
        });

        test('should return original content if no disclaimers needed', () => {
            const content = "Market analysis";
            const result = manager.addDisclaimers(content, []);
            
            expect(result).toBe(content);
        });
    });

    describe('risk assessment methods', () => {
        test('should detect high-risk terms', () => {
            expect(manager.containsHighRiskTerms('penny stock trading')).toBe(true);
            expect(manager.containsHighRiskTerms('cryptocurrency investment')).toBe(true);
            expect(manager.containsHighRiskTerms('options trading')).toBe(true);
            expect(manager.containsHighRiskTerms('apple stock')).toBe(false);
        });

        test('should detect crypto terms', () => {
            expect(manager.containsCryptoTerms('bitcoin price')).toBe(true);
            expect(manager.containsCryptoTerms('ethereum trading')).toBe(true);
            expect(manager.containsCryptoTerms('blockchain technology')).toBe(true);
            expect(manager.containsCryptoTerms('stock market')).toBe(false);
        });

        test('should detect advice language', () => {
            expect(manager.containsAdviceLanguage('you should buy')).toBe(true);
            expect(manager.containsAdviceLanguage('i recommend selling')).toBe(true);
            expect(manager.containsAdviceLanguage('my suggestion is')).toBe(true);
            expect(manager.containsAdviceLanguage('stock price is')).toBe(false);
        });

        test('should detect price data', () => {
            expect(manager.containsPriceData('price is $100')).toBe(true);
            expect(manager.containsPriceData('AAPL at 150.50')).toBe(true);
            expect(manager.containsPriceData('market analysis')).toBe(false);
        });
    });

    describe('processResponse', () => {
        test('should process high-risk crypto advice', () => {
            const content = "You should definitely buy Bitcoin now";
            const result = manager.processResponse(content);
            
            expect(result.disclaimersAdded).toContain('crypto');
            expect(result.disclaimersAdded).toContain('investment_advice');
            expect(result.riskLevel).toBe('high');
            expect(result.skipped).toBe(false);
            expect(result.content).toContain('Crypto Warning');
        });

        test('should process price data with minimal disclaimers', () => {
            const content = "AAPL is trading at $150";
            const result = manager.processResponse(content);
            
            expect(result.disclaimersAdded).toContain('price_data');
            expect(result.riskLevel).toBe('low');
            expect(result.content).toContain('Price data may be delayed');
        });

        test('should respect user preferences for minimal disclaimers', () => {
            const content = "Stock market information";
            const preferences = { minimalDisclaimers: true };
            const result = manager.processResponse(content, 'general', preferences);
            
            expect(result.skipped).toBe(true);
            expect(result.reason).toBe('User preferences or low risk');
        });

        test('should always add disclaimers for high-risk content regardless of preferences', () => {
            const content = "You must buy this penny stock with leverage";
            const preferences = { disableDisclaimers: true };
            const result = manager.processResponse(content, 'general', preferences);
            
            expect(result.skipped).toBe(false);
            expect(result.riskLevel).toBe('high');
        });
    });

    describe('content type identification', () => {
        test('should identify advice content', () => {
            expect(manager.identifyContentType('you should buy this')).toBe('advice');
        });

        test('should identify price data content', () => {
            expect(manager.identifyContentType('price is $100')).toBe('price_data');
        });

        test('should identify analysis content', () => {
            expect(manager.identifyContentType('technical analysis shows')).toBe('analysis');
        });

        test('should identify news content', () => {
            expect(manager.identifyContentType('latest news about')).toBe('news');
        });

        test('should default to general for unclear content', () => {
            expect(manager.identifyContentType('some random text')).toBe('general');
        });
    });

    describe('risk level assessment', () => {
        test('should assess high risk correctly', () => {
            expect(manager.assessRiskLevel('cryptocurrency options trading')).toBe('high');
            expect(manager.assessRiskLevel('penny stock leverage')).toBe('high');
        });

        test('should assess medium risk correctly', () => {
            expect(manager.assessRiskLevel('growth stock momentum trading')).toBe('medium');
        });

        test('should assess low risk correctly', () => {
            expect(manager.assessRiskLevel('blue chip dividend stock')).toBe('low');
        });
    });

    describe('utility methods', () => {
        test('should provide disclaimer stats', () => {
            const stats = manager.getDisclaimerStats();
            
            expect(stats.totalDisclaimers).toBeGreaterThan(0);
            expect(stats.riskLevels).toContain('high');
            expect(stats.riskLevels).toContain('medium');
            expect(stats.riskLevels).toContain('low');
            expect(stats.lastUpdated).toBeDefined();
        });

        test('should create custom disclaimers', () => {
            const custom = manager.getCustomDisclaimer('warning', 'Custom warning text');
            
            expect(custom.type).toBe('custom');
            expect(custom.text).toBe('Custom warning text');
            expect(custom.severity).toBe('medium');
            expect(custom.timestamp).toBeDefined();
        });
    });

    describe('edge cases', () => {
        test('should handle empty content', () => {
            const analysis = manager.analyzeContent('');
            expect(analysis.requiredDisclaimers).toHaveLength(0);
        });

        test('should handle content with multiple risk factors', () => {
            const content = "Day trading cryptocurrency options with leverage";
            const analysis = manager.analyzeContent(content);
            
            expect(analysis.requiredDisclaimers.length).toBeGreaterThan(1);
            expect(analysis.riskLevel).toBe('high');
        });

        test('should handle mixed financial and non-financial content', () => {
            const content = "AAPL stock price and today's weather";
            const analysis = manager.analyzeContent(content);
            
            expect(analysis.requiredDisclaimers).toContain('price_data');
            expect(analysis.contentType).toBe('price_data');
        });
    });
});