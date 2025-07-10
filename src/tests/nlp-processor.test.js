const NLPProcessor = require('../knowledge/nlp-processor');

describe('NLPProcessor', () => {
    let processor;

    beforeEach(() => {
        processor = new NLPProcessor();
    });

    describe('extractSymbols', () => {
        test('should extract symbols with $ prefix', () => {
            const text = "What's $AAPL and $MSFT price?";
            const symbols = processor.extractSymbols(text);
            
            expect(symbols).toContain('AAPL');
            expect(symbols).toContain('MSFT');
        });

        test('should extract standalone symbols', () => {
            const text = "INTC and NVDA are both tech stocks";
            const symbols = processor.extractSymbols(text);
            
            expect(symbols).toContain('INTC');
            expect(symbols).toContain('NVDA');
        });

        test('should extract company names', () => {
            const text = "Apple and Microsoft stocks";
            const symbols = processor.extractSymbols(text);
            
            expect(symbols).toContain('AAPL');
            expect(symbols).toContain('MSFT');
        });

        test('should extract crypto names', () => {
            const text = "Bitcoin and ethereum prices";
            const symbols = processor.extractSymbols(text);
            
            expect(symbols).toContain('BTC');
            expect(symbols).toContain('ETH');
        });

        test('should handle misspellings', () => {
            const text = "Whats appl stock price?";
            const symbols = processor.extractSymbols(text);
            
            expect(symbols).toContain('AAPL');
        });

        test('should remove duplicates', () => {
            const text = "Apple AAPL $AAPL apple stock";
            const symbols = processor.extractSymbols(text);
            
            const aaplCount = symbols.filter(s => s === 'AAPL').length;
            expect(aaplCount).toBe(1);
        });
    });

    describe('normalizeSymbol', () => {
        test('should normalize stock symbols', () => {
            expect(processor.normalizeSymbol('$AAPL')).toBe('AAPL');
            expect(processor.normalizeSymbol('aapl')).toBe('AAPL');
            expect(processor.normalizeSymbol('AAPL')).toBe('AAPL');
        });

        test('should handle company names', () => {
            expect(processor.normalizeSymbol('apple')).toBe('AAPL');
            expect(processor.normalizeSymbol('microsoft')).toBe('MSFT');
            expect(processor.normalizeSymbol('intel')).toBe('INTC');
        });

        test('should handle crypto names', () => {
            expect(processor.normalizeSymbol('bitcoin')).toBe('BTC');
            expect(processor.normalizeSymbol('ethereum')).toBe('ETH');
        });

        test('should correct misspellings', () => {
            expect(processor.normalizeSymbol('appl')).toBe('AAPL');
            expect(processor.normalizeSymbol('microsft')).toBe('MSFT');
            expect(processor.normalizeSymbol('intell')).toBe('INTC');
        });
    });

    describe('detectFinancialTerms', () => {
        test('should detect stock-related terms', () => {
            const text = "I want to buy stocks and check my portfolio";
            const terms = processor.detectFinancialTerms(text);
            
            expect(terms).toContain('buy');
            expect(terms).toContain('stocks');
            expect(terms).toContain('portfolio');
        });

        test('should detect crypto terms', () => {
            const text = "Bitcoin and cryptocurrency market analysis";
            const terms = processor.detectFinancialTerms(text);
            
            expect(terms).toContain('bitcoin');
            expect(terms).toContain('cryptocurrency');
            expect(terms).toContain('market');
            expect(terms).toContain('analysis');
        });

        test('should detect trading terms', () => {
            const text = "Technical analysis shows bullish trend with high volume";
            const terms = processor.detectFinancialTerms(text);
            
            expect(terms).toContain('technical');
            expect(terms).toContain('analysis');
            expect(terms).toContain('bull');
            expect(terms).toContain('volume');
        });
    });

    describe('identifyQueryType', () => {
        test('should identify price queries', () => {
            expect(processor.identifyQueryType("What's AAPL price?")).toBe('price_query');
            expect(processor.identifyQueryType("How much does Tesla cost?")).toBe('price_query');
            expect(processor.identifyQueryType("What is Bitcoin worth?")).toBe('price_query');
        });

        test('should identify buy intent', () => {
            expect(processor.identifyQueryType("Should I buy Apple stock?")).toBe('buy_intent');
            expect(processor.identifyQueryType("Is it good to purchase MSFT?")).toBe('buy_intent');
        });

        test('should identify sell intent', () => {
            expect(processor.identifyQueryType("When should I sell my Tesla shares?")).toBe('sell_intent');
        });

        test('should identify analysis requests', () => {
            expect(processor.identifyQueryType("Can you analyze AAPL stock?")).toBe('analysis_request');
            expect(processor.identifyQueryType("Technical analysis of Bitcoin")).toBe('analysis_request');
        });

        test('should identify news requests', () => {
            expect(processor.identifyQueryType("Any news about Tesla?")).toBe('news_request');
            expect(processor.identifyQueryType("Latest updates on Apple")).toBe('news_request');
        });

        test('should identify comparisons', () => {
            expect(processor.identifyQueryType("Apple vs Microsoft stock")).toBe('comparison');
            expect(processor.identifyQueryType("Compare AAPL and MSFT")).toBe('comparison');
        });
    });

    describe('extractPriceTargets', () => {
        test('should extract dollar amounts', () => {
            const text = "I think AAPL will reach $200 soon";
            const prices = processor.extractPriceTargets(text);
            
            expect(prices).toContain(200);
        });

        test('should extract multiple price targets', () => {
            const text = "Support at $150, resistance at $180 dollars";
            const prices = processor.extractPriceTargets(text);
            
            expect(prices).toContain(150);
            expect(prices).toContain(180);
        });

        test('should handle decimal prices', () => {
            const text = "Target price is $125.50";
            const prices = processor.extractPriceTargets(text);
            
            expect(prices).toContain(125.5);
        });
    });

    describe('processQuery', () => {
        test('should process Intel stock query correctly', () => {
            const result = processor.processQuery("What's Intel stock price?");
            
            expect(result.symbols).toContain('INTC');
            expect(result.financialTerms).toContain('stock');
            expect(result.financialTerms).toContain('price');
            expect(result.queryType).toBe('price_query');
            expect(result.isFinancial).toBe(true);
        });

        test('should handle misspelled Intel query', () => {
            const result = processor.processQuery("Intl stock price");
            
            expect(result.symbols).toContain('INTC');
            expect(result.isFinancial).toBe(true);
        });

        test('should process Bitcoin query', () => {
            const result = processor.processQuery("BTC trend analysis");
            
            expect(result.symbols).toContain('BTC');
            expect(result.financialTerms).toContain('analysis');
            expect(result.isFinancial).toBe(true);
        });

        test('should process minimal query', () => {
            const result = processor.processQuery("aapl?");
            
            expect(result.symbols).toContain('AAPL');
            expect(result.isFinancial).toBe(true);
        });

        test('should identify non-financial queries', () => {
            const result = processor.processQuery("What's the weather today?");
            
            expect(result.symbols).toHaveLength(0);
            expect(result.financialTerms).toHaveLength(0);
            expect(result.isFinancial).toBe(false);
        });
    });
});