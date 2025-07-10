const NLPProcessor = require('../knowledge/nlp-processor');
const IntentClassifier = require('../guardrails/intent-classifier');
const ResponseFilter = require('../guardrails/response-filter');
const DisclaimerManager = require('../guardrails/disclaimer-manager');
const KnowledgeBase = require('../knowledge/knowledge-base');
const MarketDataService = require('../knowledge/market-data-service');

describe('Integration Tests', () => {
    let nlp, classifier, filter, disclaimerManager, kb, marketData;

    beforeEach(() => {
        nlp = new NLPProcessor();
        classifier = new IntentClassifier();
        filter = new ResponseFilter();
        disclaimerManager = new DisclaimerManager();
        kb = new KnowledgeBase();
        marketData = new MarketDataService();
    });

    afterEach(() => {
        marketData.clearCache();
    });

    describe('Stock Price Query Flow', () => {
        test('should handle "What\'s Intel stock price?" end-to-end', async () => {
            const query = "What's Intel stock price?";
            
            // Step 1: Process query with NLP
            const nlpResult = nlp.processQuery(query);
            expect(nlpResult.symbols).toContain('INTC');
            expect(nlpResult.queryType).toBe('price_query');
            expect(nlpResult.isFinancial).toBe(true);
            
            // Step 2: Classify intent
            const intentResult = classifier.classifyIntent(query);
            expect(intentResult.classification).toBe('financial');
            expect(intentResult.confidence).toBeGreaterThan(0.6);
            
            // Step 3: Check if response should be allowed
            const allowResult = classifier.shouldAllowResponse(
                intentResult.classification, 
                intentResult.confidence
            );
            expect(allowResult.allow).toBe(true);
            
            // Step 4: Get stock info from knowledge base
            const stockInfo = kb.getStockInfo('INTC');
            expect(stockInfo.name).toBe('Intel Corporation');
            
            // Step 5: Mock response generation and disclaimer processing
            const mockResponse = `Intel Corporation (INTC) is currently trading at $45.32. The stock has been volatile recently with high volume.`;
            
            const disclaimerResult = disclaimerManager.processResponse(mockResponse);
            expect(disclaimerResult.disclaimersAdded).toContain('price_data');
            expect(disclaimerResult.content).toContain('Price data may be delayed');
        });

        test('should handle misspelled Intel query', () => {
            const query = "Intl stock price";
            
            const nlpResult = nlp.processQuery(query);
            expect(nlpResult.symbols).toContain('INTC');
            
            const intentResult = classifier.classifyIntent(query);
            expect(intentResult.classification).toBe('financial');
        });

        test('should handle minimal AAPL query', () => {
            const query = "aapl?";
            
            const nlpResult = nlp.processQuery(query);
            expect(nlpResult.symbols).toContain('AAPL');
            
            const intentResult = classifier.classifyIntent(query);
            expect(intentResult.classification).toBe('financial');
        });
    });

    describe('Crypto Query Flow', () => {
        test('should handle Bitcoin price query', () => {
            const query = "Bitcoin price";
            
            const nlpResult = nlp.processQuery(query);
            expect(nlpResult.symbols).toContain('BTC');
            
            const intentResult = classifier.classifyIntent(query);
            expect(intentResult.classification).toBe('financial');
            
            const cryptoInfo = kb.getCryptoInfo('BTC');
            expect(cryptoInfo.name).toBe('Bitcoin');
        });

        test('should handle informal BTC query', () => {
            const query = "btc $";
            
            const nlpResult = nlp.processQuery(query);
            expect(nlpResult.symbols).toContain('BTC');
            
            const intentResult = classifier.classifyIntent(query);
            expect(intentResult.classification).toBe('financial');
        });

        test('should add crypto disclaimers to crypto advice', () => {
            const mockResponse = "You should definitely buy Bitcoin now as it's going to the moon!";
            
            const disclaimerResult = disclaimerManager.processResponse(mockResponse);
            expect(disclaimerResult.disclaimersAdded).toContain('crypto');
            expect(disclaimerResult.disclaimersAdded).toContain('investment_advice');
            expect(disclaimerResult.content).toContain('Crypto Warning');
        });
    });

    describe('Financial Concepts Flow', () => {
        test('should handle P/E ratio question', () => {
            const query = "What is P/E ratio?";
            
            const nlpResult = nlp.processQuery(query);
            expect(nlpResult.financialTerms).toContain('pe ratio');
            
            const intentResult = classifier.classifyIntent(query);
            expect(intentResult.classification).toBe('financial');
            
            const definition = kb.getFinancialTermDefinition('pe ratio');
            expect(definition).toContain('Price-to-earnings');
        });

        test('should handle options trading explanation', () => {
            const query = "Explain options trading";
            
            const nlpResult = nlp.processQuery(query);
            expect(nlpResult.financialTerms).toContain('trading');
            
            const mockResponse = "Options are complex derivatives that give you the right to buy or sell stocks at specific prices.";
            
            const disclaimerResult = disclaimerManager.processResponse(mockResponse);
            expect(disclaimerResult.disclaimersAdded).toContain('options_futures');
        });
    });

    describe('Guardrail Flow - Blocking Non-Financial Queries', () => {
        test('should block relationship advice', () => {
            const query = "I need relationship advice";
            
            const intentResult = classifier.classifyIntent(query);
            expect(intentResult.classification).toBe('non-financial');
            
            const allowResult = classifier.shouldAllowResponse(
                intentResult.classification, 
                intentResult.confidence
            );
            expect(allowResult.allow).toBe(false);
            
            const blockResult = filter.shouldBlockResponse(
                query, 
                intentResult.classification, 
                intentResult.confidence
            );
            expect(blockResult.block).toBe(true);
            
            const refusal = filter.generateRefusalMessage(
                query, 
                intentResult.classification, 
                blockResult.reason
            );
            expect(refusal.message).toContain('financial');
            expect(refusal.message).toContain('not able to help');
        });

        test('should block health advice', () => {
            const query = "What should I eat for health?";
            
            const intentResult = classifier.classifyIntent(query);
            expect(intentResult.classification).toBe('non-financial');
            
            const allowResult = classifier.shouldAllowResponse(
                intentResult.classification, 
                intentResult.confidence
            );
            expect(allowResult.allow).toBe(false);
        });

        test('should allow greetings', () => {
            const query = "Hello";
            
            const intentResult = classifier.classifyIntent(query);
            expect(intentResult.classification).toBe('greeting');
            
            const allowResult = classifier.shouldAllowResponse(
                intentResult.classification, 
                intentResult.confidence
            );
            expect(allowResult.allow).toBe(true);
        });
    });

    describe('Complete Workflow Integration', () => {
        test('should process financial query from start to finish', async () => {
            const query = "What's Apple stock trading at and should I buy?";
            
            // 1. NLP Processing
            const nlpResult = nlp.processQuery(query);
            expect(nlpResult.symbols).toContain('AAPL');
            expect(nlpResult.queryType).toBe('buy_intent');
            
            // 2. Intent Classification
            const intentResult = classifier.classifyIntent(query);
            expect(intentResult.classification).toBe('financial');
            
            // 3. Authorization Check
            const allowResult = classifier.shouldAllowResponse(
                intentResult.classification, 
                intentResult.confidence
            );
            expect(allowResult.allow).toBe(true);
            
            // 4. Knowledge Base Lookup
            const stockInfo = kb.getStockInfo('AAPL');
            expect(stockInfo.name).toBe('Apple Inc.');
            
            // 5. Mock Market Data Fetch
            // In real implementation, this would be: await marketData.fetchStockPrice('AAPL')
            const mockPriceData = { symbol: 'AAPL', price: 150.25, timestamp: Date.now() };
            
            // 6. Response Generation (mocked)
            const mockResponse = `Apple Inc. (AAPL) is currently trading at $${mockPriceData.price}. As for whether you should buy, that depends on your investment goals and risk tolerance. Consider consulting with a financial advisor.`;
            
            // 7. Response Filtering
            const filterResult = filter.filterResponse(mockResponse, query, intentResult.classification);
            expect(filterResult.filtered).toBe(false); // Should not be filtered
            
            // 8. Disclaimer Processing
            const disclaimerResult = disclaimerManager.processResponse(mockResponse);
            expect(disclaimerResult.disclaimersAdded).toContain('price_data');
            expect(disclaimerResult.content).toContain('Price data may be delayed');
            
            // Final result should contain original response + disclaimers
            expect(disclaimerResult.content).toContain(mockResponse);
            expect(disclaimerResult.content).toContain('Disclaimer');
        });

        test('should block non-financial query completely', () => {
            const query = "What's the weather like today?";
            
            // 1. NLP Processing
            const nlpResult = nlp.processQuery(query);
            expect(nlpResult.isFinancial).toBe(false);
            
            // 2. Intent Classification
            const intentResult = classifier.classifyIntent(query);
            expect(intentResult.classification).toBe('non-financial');
            
            // 3. Authorization Check - Should fail here
            const allowResult = classifier.shouldAllowResponse(
                intentResult.classification, 
                intentResult.confidence
            );
            expect(allowResult.allow).toBe(false);
            
            // 4. Generate Refusal
            const refusal = filter.generateRefusalMessage(
                query, 
                intentResult.classification, 
                allowResult.reason
            );
            expect(refusal.type).toBe('refusal');
            expect(refusal.message).toContain('financial');
        });
    });

    describe('Error Handling Integration', () => {
        test('should handle unknown stock symbols gracefully', async () => {
            const query = "What's UNKNOWN stock price?";
            
            const nlpResult = nlp.processQuery(query);
            expect(nlpResult.symbols).toContain('UNKNOWN');
            
            const stockInfo = kb.getStockInfo('UNKNOWN');
            expect(stockInfo).toBeNull();
            
            // Market data service should handle unknown symbols
            const priceData = await marketData.fetchStockPrice('UNKNOWN');
            expect(priceData).toHaveProperty('error');
        });

        test('should handle empty queries', () => {
            const query = "";
            
            const nlpResult = nlp.processQuery(query);
            expect(nlpResult.symbols).toHaveLength(0);
            expect(nlpResult.isFinancial).toBe(false);
            
            const intentResult = classifier.classifyIntent(query);
            expect(intentResult.classification).not.toBe('financial');
        });
    });

    describe('Performance Integration', () => {
        test('should cache market data requests', async () => {
            const symbol = 'AAPL';
            
            // First request
            const start1 = Date.now();
            await marketData.fetchStockPrice(symbol);
            const time1 = Date.now() - start1;
            
            // Second request (should be cached)
            const start2 = Date.now();
            await marketData.fetchStockPrice(symbol);
            const time2 = Date.now() - start2;
            
            // Second request should be significantly faster
            expect(time2).toBeLessThan(time1);
            expect(marketData.getCacheSize()).toBe(1);
        });
    });
});