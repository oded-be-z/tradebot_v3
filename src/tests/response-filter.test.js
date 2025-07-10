const ResponseFilter = require('../guardrails/response-filter');

describe('ResponseFilter', () => {
    let filter;

    beforeEach(() => {
        filter = new ResponseFilter();
    });

    describe('shouldBlockResponse', () => {
        test('should block non-financial queries with high confidence', () => {
            const result = filter.shouldBlockResponse(
                "What's the weather like?", 
                'non-financial', 
                0.8
            );
            
            expect(result.block).toBe(true);
            expect(result.reason).toBe('Non-financial topic detected');
        });

        test('should block ambiguous queries with low confidence', () => {
            const result = filter.shouldBlockResponse(
                "I need help", 
                'ambiguous', 
                0.3
            );
            
            expect(result.block).toBe(true);
            expect(result.reason).toBe('Query unclear or not finance-related');
        });

        test('should allow financial queries with sufficient confidence', () => {
            const result = filter.shouldBlockResponse(
                "What's AAPL stock price?", 
                'financial', 
                0.8
            );
            
            expect(result.block).toBe(false);
            expect(result.reason).toBe('Allowed topic');
        });

        test('should allow greetings', () => {
            const result = filter.shouldBlockResponse(
                "Hello there", 
                'greeting', 
                0.9
            );
            
            expect(result.block).toBe(false);
            expect(result.reason).toBe('Allowed topic');
        });

        test('should block uncertain cases by default', () => {
            const result = filter.shouldBlockResponse(
                "Something unclear", 
                'financial', 
                0.4
            );
            
            expect(result.block).toBe(true);
            expect(result.reason).toBe('Uncertain relevance to financial topics');
        });
    });

    describe('generateRefusalMessage', () => {
        test('should generate appropriate refusal for non-financial queries', () => {
            const message = filter.generateRefusalMessage(
                "What's the weather?", 
                'non-financial', 
                'Non-financial topic detected'
            );
            
            expect(message.type).toBe('refusal');
            expect(message.message).toContain('financial');
            expect(message.message).toContain('not able to help with non-financial topics');
            expect(message.originalQuery).toBe("What's the weather?");
        });

        test('should generate appropriate refusal for ambiguous queries', () => {
            const message = filter.generateRefusalMessage(
                "I need help", 
                'ambiguous', 
                'Query unclear'
            );
            
            expect(message.type).toBe('refusal');
            expect(message.message).toContain('clearly related to financial markets');
        });

        test('should include suggestions in refusal messages', () => {
            const message = filter.generateRefusalMessage(
                "Tell me a joke", 
                'non-financial', 
                'Non-financial topic'
            );
            
            expect(message.message).toMatch(/stock|market|investment|analysis/i);
        });

        test('should include timestamp', () => {
            const message = filter.generateRefusalMessage(
                "Random query", 
                'non-financial', 
                'Test reason'
            );
            
            expect(message.timestamp).toBeDefined();
            expect(new Date(message.timestamp)).toBeInstanceOf(Date);
        });
    });

    describe('filterResponse', () => {
        test('should not filter appropriate financial responses', () => {
            const response = "AAPL is currently trading at $150. The stock has shown strong performance this quarter.";
            const result = filter.filterResponse(response, "What's AAPL price?", 'financial');
            
            expect(result.filtered).toBe(false);
            expect(result.filteredResponse).toBe(response);
        });

        test('should filter responses with non-financial content', () => {
            const response = "Here's a great recipe for apple pie that you should try!";
            const result = filter.filterResponse(response, "Tell me about apples", 'non-financial');
            
            expect(result.filtered).toBe(true);
            expect(result.reason).toBe('Response contained non-financial content');
        });

        test('should add disclaimers to investment advice', () => {
            const response = "You should definitely buy AAPL stock now!";
            const result = filter.filterResponse(response, "Should I buy AAPL?", 'financial');
            
            expect(result.filtered).toBe(true);
            expect(result.filteredResponse).toContain('Disclaimer');
            expect(result.reason).toBe('Added investment disclaimer');
        });
    });

    describe('containsNonFinancialContent', () => {
        test('should detect cooking content', () => {
            const response = "Here's a recipe for cooking chicken";
            expect(filter.containsNonFinancialContent(response)).toBe(true);
        });

        test('should detect weather content', () => {
            const response = "The weather today is sunny and warm";
            expect(filter.containsNonFinancialContent(response)).toBe(true);
        });

        test('should detect health/medical content', () => {
            const response = "You should see a doctor for medical advice";
            expect(filter.containsNonFinancialContent(response)).toBe(true);
        });

        test('should not flag financial content as non-financial', () => {
            const response = "Apple stock is performing well in the market";
            expect(filter.containsNonFinancialContent(response)).toBe(false);
        });
    });

    describe('containsInvestmentAdvice', () => {
        test('should detect strong buy recommendations', () => {
            const responses = [
                "You should buy this stock immediately",
                "I recommend buying AAPL now",
                "You must invest in Tesla",
                "Definitely buy Microsoft shares"
            ];

            responses.forEach(response => {
                expect(filter.containsInvestmentAdvice(response)).toBe(true);
            });
        });

        test('should detect strong sell recommendations', () => {
            const responses = [
                "You should sell all your shares",
                "I recommend selling Tesla stock",
                "Definitely sell before it crashes"
            ];

            responses.forEach(response => {
                expect(filter.containsInvestmentAdvice(response)).toBe(true);
            });
        });

        test('should detect guarantee language', () => {
            const responses = [
                "This stock is guaranteed to rise",
                "You can't lose with this investment",
                "This will definitely make money"
            ];

            responses.forEach(response => {
                expect(filter.containsInvestmentAdvice(response)).toBe(true);
            });
        });

        test('should not flag educational content', () => {
            const responses = [
                "Apple stock has been performing well recently",
                "Many investors consider diversification important",
                "The stock market can be volatile"
            ];

            responses.forEach(response => {
                expect(filter.containsInvestmentAdvice(response)).toBe(false);
            });
        });
    });

    describe('validateFinancialQuery', () => {
        test('should validate queries with financial terms', () => {
            const query = "What's the stock price of Apple?";
            const result = filter.validateFinancialQuery(query);
            
            expect(result.isValid).toBe(true);
            expect(result.hasFinancialTerms).toBe(true);
        });

        test('should validate queries with stock symbols', () => {
            const query = "AAPL trading volume";
            const result = filter.validateFinancialQuery(query);
            
            expect(result.isValid).toBe(true);
            expect(result.hasStockSymbols).toBe(true);
        });

        test('should validate queries with price mentions', () => {
            const query = "Is $150 a good entry point?";
            const result = filter.validateFinancialQuery(query);
            
            expect(result.isValid).toBe(true);
            expect(result.hasPrices).toBe(true);
        });

        test('should invalidate non-financial queries', () => {
            const query = "What's the weather today?";
            const result = filter.validateFinancialQuery(query);
            
            expect(result.isValid).toBe(false);
            expect(result.hasFinancialTerms).toBe(false);
            expect(result.hasStockSymbols).toBe(false);
        });

        test('should calculate relevance score', () => {
            const query1 = "AAPL stock price analysis"; // Should have high score
            const query2 = "Hello there"; // Should have low score
            
            const result1 = filter.validateFinancialQuery(query1);
            const result2 = filter.validateFinancialQuery(query2);
            
            expect(result1.score).toBeGreaterThan(result2.score);
        });
    });

    describe('formatRefusalForChat', () => {
        test('should format refusal data for chat interface', () => {
            const refusalData = {
                type: 'refusal',
                message: 'I can only help with financial topics',
                originalQuery: 'What is the weather?',
                classification: 'non-financial',
                reason: 'Non-financial topic detected',
                timestamp: new Date().toISOString()
            };

            const formatted = filter.formatRefusalForChat(refusalData);
            
            expect(formatted.role).toBe('assistant');
            expect(formatted.content).toBe(refusalData.message);
            expect(formatted.type).toBe('refusal');
            expect(formatted.metadata).toBeDefined();
            expect(formatted.metadata.originalQuery).toBe('What is the weather?');
        });
    });

    describe('addInvestmentDisclaimer', () => {
        test('should add disclaimer to response', () => {
            const response = "Tesla stock looks promising";
            const withDisclaimer = filter.addInvestmentDisclaimer(response);
            
            expect(withDisclaimer).toContain(response);
            expect(withDisclaimer).toContain('Disclaimer');
            expect(withDisclaimer).toContain('not financial advice');
        });

        test('should maintain original response content', () => {
            const response = "Market analysis shows positive trends";
            const withDisclaimer = filter.addInvestmentDisclaimer(response);
            
            expect(withDisclaimer).toContain(response);
        });
    });
});