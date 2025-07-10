const IntentClassifier = require('../guardrails/intent-classifier');

describe('IntentClassifier', () => {
    let classifier;

    beforeEach(() => {
        classifier = new IntentClassifier();
    });

    describe('classifyIntent', () => {
        test('should classify financial queries correctly', () => {
            const queries = [
                "What's Intel stock price?",
                "INTC price today",
                "Intel trading at?",
                "Show me Intel Corp stock",
                "$INTC current price"
            ];

            queries.forEach(query => {
                const result = classifier.classifyIntent(query);
                expect(result.classification).toBe('financial');
                expect(result.confidence).toBeGreaterThan(0.6);
            });
        });

        test('should classify crypto queries as financial', () => {
            const queries = [
                "Bitcoin price",
                "BTC trend",
                "Ethereum market cap",
                "Crypto market today"
            ];

            queries.forEach(query => {
                const result = classifier.classifyIntent(query);
                expect(result.classification).toBe('financial');
                expect(result.confidence).toBeGreaterThan(0.6);
            });
        });

        test('should classify financial concept queries', () => {
            const queries = [
                "What is P/E ratio?",
                "Explain options trading",
                "What are futures?",
                "Define market cap"
            ];

            queries.forEach(query => {
                const result = classifier.classifyIntent(query);
                expect(result.classification).toBe('financial');
                expect(result.confidence).toBeGreaterThan(0.5);
            });
        });

        test('should refuse non-financial queries', () => {
            const queries = [
                "I need relationship advice",
                "What should I eat for health?",
                "Legal question about contracts",
                "Personal advice about life"
            ];

            queries.forEach(query => {
                const result = classifier.classifyIntent(query);
                expect(result.classification).toBe('non-financial');
                expect(result.confidence).toBeGreaterThan(0.5);
            });
        });

        test('should handle edge cases', () => {
            const testCases = [
                { query: "Intl stock", expected: 'financial' }, // misspelling
                { query: "btc $", expected: 'financial' }, // informal
                { query: "aapl?", expected: 'financial' } // minimal
            ];

            testCases.forEach(({ query, expected }) => {
                const result = classifier.classifyIntent(query);
                expect(result.classification).toBe(expected);
            });
        });

        test('should identify greetings', () => {
            const greetings = [
                "Hello",
                "Hi there",
                "Good morning",
                "Hey"
            ];

            greetings.forEach(greeting => {
                const result = classifier.classifyIntent(greeting);
                expect(result.classification).toBe('greeting');
                expect(result.confidence).toBeGreaterThan(0.8);
            });
        });

        test('should boost confidence for clear financial indicators', () => {
            const result1 = classifier.classifyIntent("What is investing?");
            const result2 = classifier.classifyIntent("What is $AAPL price?");
            
            expect(result2.confidence).toBeGreaterThan(result1.confidence);
        });
    });

    describe('getFinancialIntentType', () => {
        test('should identify price inquiries', () => {
            const queries = [
                "What's AAPL price?",
                "How much does Tesla cost?",
                "What is Bitcoin worth?"
            ];

            queries.forEach(query => {
                const type = classifier.getFinancialIntentType(query);
                expect(type).toBe('price_inquiry');
            });
        });

        test('should identify buy intent', () => {
            const queries = [
                "Should I buy Apple stock?",
                "Is it good to purchase MSFT?"
            ];

            queries.forEach(query => {
                const type = classifier.getFinancialIntentType(query);
                expect(type).toBe('buy_intent');
            });
        });

        test('should identify sell intent', () => {
            const query = "When should I sell my Tesla shares?";
            const type = classifier.getFinancialIntentType(query);
            expect(type).toBe('sell_intent');
        });

        test('should identify analysis requests', () => {
            const queries = [
                "Can you analyze AAPL stock?",
                "Technical analysis of Bitcoin"
            ];

            queries.forEach(query => {
                const type = classifier.getFinancialIntentType(query);
                expect(type).toBe('analysis_request');
            });
        });

        test('should identify news requests', () => {
            const queries = [
                "Any news about Tesla?",
                "Latest updates on Apple"
            ];

            queries.forEach(query => {
                const type = classifier.getFinancialIntentType(query);
                expect(type).toBe('news_request');
            });
        });

        test('should identify comparisons', () => {
            const queries = [
                "Apple vs Microsoft stock",
                "Compare AAPL and MSFT"
            ];

            queries.forEach(query => {
                const type = classifier.getFinancialIntentType(query);
                expect(type).toBe('comparison');
            });
        });

        test('should identify portfolio management', () => {
            const queries = [
                "How should I allocate my portfolio?",
                "Portfolio management advice"
            ];

            queries.forEach(query => {
                const type = classifier.getFinancialIntentType(query);
                expect(type).toBe('portfolio_management');
            });
        });
    });

    describe('shouldAllowResponse', () => {
        test('should allow financial queries with high confidence', () => {
            const result = classifier.shouldAllowResponse('financial', 0.8);
            expect(result.allow).toBe(true);
        });

        test('should allow greetings', () => {
            const result = classifier.shouldAllowResponse('greeting', 0.9);
            expect(result.allow).toBe(true);
        });

        test('should block non-financial queries', () => {
            const result = classifier.shouldAllowResponse('non-financial', 0.8);
            expect(result.allow).toBe(false);
        });

        test('should block ambiguous queries', () => {
            const result = classifier.shouldAllowResponse('ambiguous', 0.4);
            expect(result.allow).toBe(false);
        });

        test('should block low-confidence financial queries', () => {
            const result = classifier.shouldAllowResponse('financial', 0.3);
            expect(result.allow).toBe(false);
        });
    });

    describe('helper methods', () => {
        test('should identify questions correctly', () => {
            expect(classifier.isQuestion("What is this?")).toBe(true);
            expect(classifier.isQuestion("How does it work?")).toBe(true);
            expect(classifier.isQuestion("Is this correct?")).toBe(true);
            expect(classifier.isQuestion("This is a statement")).toBe(false);
        });

        test('should identify greetings correctly', () => {
            expect(classifier.isGreeting("hello there")).toBe(true);
            expect(classifier.isGreeting("good morning")).toBe(true);
            expect(classifier.isGreeting("what is the price")).toBe(false);
        });
    });

    describe('details and metadata', () => {
        test('should provide detailed analysis', () => {
            const result = classifier.classifyIntent("What's $AAPL and $MSFT price today?");
            
            expect(result.details.stockSymbols).toContain('$AAPL');
            expect(result.details.stockSymbols).toContain('$MSFT');
            expect(result.details.isQuestion).toBe(true);
            expect(result.details.totalWords).toBeGreaterThan(0);
        });

        test('should track scores correctly', () => {
            const result = classifier.classifyIntent("I love Apple stock and Microsoft shares");
            
            expect(result.financialScore).toBeGreaterThan(0);
            expect(result.nonFinancialScore).toBeGreaterThanOrEqual(0);
        });
    });
});