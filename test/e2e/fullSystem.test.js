const request = require('supertest');
const app = require('../../server');

describe('Complete System E2E Tests', () => {
  let sessionId;
  
  beforeAll(async () => {
    // Initialize session
    const res = await request(app)
      .post('/api/session/init')
      .expect(200);
    sessionId = res.body.sessionId;
  });
  
  describe('Issue A: Ticker Extraction Safety', () => {
    test('should NOT interpret "who is trump?" as WHO ticker', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'who is trump?', sessionId })
        .expect(200);
      
      expect(res.body.response).not.toContain('WHO');
      expect(res.body.response).not.toContain('$');
      expect(res.body.response).toContain('focus exclusively on financial');
      expect(res.body.type).toBe('refusal');
    });
    
    test('should NOT interpret "can u help" as CAN ticker', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'can u help me upgrade my portfolio?', sessionId })
        .expect(200);
      
      expect(res.body.response).not.toContain('CAN is currently trading');
      expect(res.body.response).not.toContain('$');
      expect(res.body.response).toContain('portfolio');
      expect(res.body.type).toBe('portfolio_analysis');
    });

    test('should NOT interpret "tell me about" as TELL ticker', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'tell me about the weather', sessionId })
        .expect(200);
      
      expect(res.body.response).not.toContain('TELL is currently trading');
      expect(res.body.response).not.toContain('$');
      expect(res.body.response).toContain('focus exclusively on financial');
      expect(res.body.type).toBe('refusal');
    });

    test('should NOT interpret "help me" as HELP ticker', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'help me understand the market', sessionId })
        .expect(200);
      
      expect(res.body.response).not.toContain('HELP is currently trading');
      expect(res.body.response).not.toContain('$');
      expect(res.body.type).not.toBe('standard_analysis');
    });

    test('should handle legitimate ticker requests correctly', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'AAPL analysis', sessionId })
        .expect(200);
      
      expect(res.body.response).toContain('AAPL');
      expect(res.body.response).toContain('$');
      expect(res.body.type).toBe('standard_analysis');
    });
  });
  
  describe('Issue B: Portfolio Intent Detection', () => {
    test('should detect portfolio upgrade request', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'upgrade my portfolio', sessionId })
        .expect(200);
      
      expect(res.body.response).toContain('portfolio');
      expect(res.body.type).toBe('portfolio_analysis');
    });
    
    test('should handle rebalance request', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'help me rebalance my investments', sessionId })
        .expect(200);
      
      expect(res.body.response).toContain('portfolio');
      expect(res.body.response).not.toContain('HELP is currently trading');
      expect(res.body.type).toBe('portfolio_analysis');
    });

    test('should detect diversification intent', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'diversify my holdings', sessionId })
        .expect(200);
      
      expect(res.body.response).toContain('portfolio');
      expect(res.body.type).toBe('portfolio_analysis');
    });

    test('should detect portfolio optimization intent', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'optimize my investment portfolio', sessionId })
        .expect(200);
      
      expect(res.body.response).toContain('portfolio');
      expect(res.body.type).toBe('portfolio_analysis');
    });
  });
  
  describe('Issue C: Consistent Guardrail Messaging', () => {
    test('should give consistent non-financial response', async () => {
      const queries = [
        'what is the weather?',
        'tell me a recipe',
        'who won the game?',
        'what movie should I watch?'
      ];
      
      const responses = [];
      for (const query of queries) {
        const res = await request(app)
          .post('/api/chat')
          .send({ message: query, sessionId })
          .expect(200);
        responses.push(res.body.response);
      }
      
      // All should contain similar guardrail message
      const expectedMessage = 'I focus exclusively on financial markets and investing. I can help you with stock analysis, market trends, portfolio optimization, or investment strategies. What financial topic would you like to explore?';
      
      responses.forEach(response => {
        expect(response).toBe(expectedMessage);
      });
    });

    test('should maintain consistent message for celebrity queries', async () => {
      const queries = [
        'who is trump?',
        'tell me about biden',
        'what about elon musk?'
      ];
      
      for (const query of queries) {
        const res = await request(app)
          .post('/api/chat')
          .send({ message: query, sessionId })
          .expect(200);
        
        expect(res.body.response).toContain('focus exclusively on financial');
        expect(res.body.type).toBe('refusal');
      }
    });
  });
  
  describe('Visual Formatting Issues', () => {
    test('should NOT contain markdown bold formatting', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'analyze AAPL', sessionId })
        .expect(200);
      
      expect(res.body.response).not.toContain('**');
      expect(res.body.response).not.toMatch(/\*\*.*?\*\*/);
    });
    
    test('should NOT contain markdown italic formatting', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'MSFT trends', sessionId })
        .expect(200);
      
      expect(res.body.response).not.toMatch(/\*[^*]+\*/);
    });

    test('should NOT contain markdown headers', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'compare AAPL vs MSFT', sessionId })
        .expect(200);
      
      expect(res.body.response).not.toMatch(/^#+\s+/m);
    });
    
    test('should format volume correctly without dollar signs', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'NVDA volume', sessionId })
        .expect(200);
      
      expect(res.body.response).toMatch(/\d+\.?\d*[MBK]?\s+(shares|contracts)/);
      expect(res.body.response).not.toMatch(/\$\d+\.?\d*[MBK]?\s+(shares|contracts)/);
    });
  });
  
  describe('Chart Generation', () => {
    test('should generate real chart for trend analysis', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'show me bitcoin price chart', sessionId })
        .expect(200);
      
      expect(res.body.chartData).toBeDefined();
      expect(res.body.chartData.type).toBe('chart_data');
      expect(res.body.chartData.imageUrl).toMatch(/^data:image\/png;base64,/);
      expect(res.body.chartData.imageUrl.length).toBeGreaterThan(1000); // Real image should be substantial
    });
    
    test('should generate comparison chart', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'compare AAPL vs MSFT with chart', sessionId })
        .expect(200);
      
      expect(res.body.chartData).toBeDefined();
      expect(res.body.chartData.title).toContain('AAPL vs MSFT');
      expect(res.body.chartData.imageUrl).toMatch(/^data:image\/png;base64,/);
    });

    test('should generate portfolio chart when available', async () => {
      // First upload a portfolio
      const portfolioData = 'symbol,shares,purchase_price\nAAPL,100,150\nMSFT,50,300\nGOOGL,25,2000';
      
      const uploadRes = await request(app)
        .post('/api/upload-portfolio')
        .attach('portfolio', Buffer.from(portfolioData), 'portfolio.csv')
        .field('sessionId', sessionId)
        .expect(200);
      
      // Then request portfolio analysis
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'show my portfolio chart', sessionId })
        .expect(200);
      
      if (res.body.chartData) {
        expect(res.body.chartData.type).toBe('chart_data');
        expect(res.body.chartData.imageUrl).toMatch(/^data:image\/png;base64,/);
      }
    });
  });

  describe('Symbol Extraction Edge Cases', () => {
    test('should handle mixed case common words', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'WHO is the best trader?', sessionId })
        .expect(200);
      
      expect(res.body.response).not.toContain('WHO is currently trading');
      expect(res.body.type).toBe('refusal');
    });

    test('should handle sentence with valid ticker', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'Can you analyze AAPL stock?', sessionId })
        .expect(200);
      
      expect(res.body.response).toContain('AAPL');
      expect(res.body.response).not.toContain('CAN is currently trading');
      expect(res.body.type).toBe('standard_analysis');
    });

    test('should handle dollar-prefixed symbols', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'What about $AAPL?', sessionId })
        .expect(200);
      
      expect(res.body.response).toContain('AAPL');
      expect(res.body.type).toBe('standard_analysis');
    });

    test('should reject short unknown tickers', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'XX stock price', sessionId })
        .expect(200);
      
      expect(res.body.response).not.toContain('XX is currently trading');
      expect(res.body.type).not.toBe('standard_analysis');
    });
  });

  describe('Response Type Consistency', () => {
    test('should return proper response types', async () => {
      const testCases = [
        { message: 'hello', expectedType: 'greeting' },
        { message: 'who is trump?', expectedType: 'refusal' },
        { message: 'AAPL analysis', expectedType: 'standard_analysis' },
        { message: 'compare AAPL vs MSFT', expectedType: 'comparison_table' },
        { message: 'my portfolio', expectedType: 'portfolio_analysis' },
        { message: 'bitcoin trends', expectedType: 'trend_analysis' }
      ];
      
      for (const testCase of testCases) {
        const res = await request(app)
          .post('/api/chat')
          .send({ message: testCase.message, sessionId })
          .expect(200);
        
        expect(res.body.type).toBe(testCase.expectedType);
      }
    });
  });

  describe('Data Integrity', () => {
    test('should not leak session data between requests', async () => {
      // Create a new session
      const newSessionRes = await request(app)
        .post('/api/session/init')
        .expect(200);
      const newSessionId = newSessionRes.body.sessionId;
      
      // Both sessions should be independent
      const res1 = await request(app)
        .post('/api/chat')
        .send({ message: 'analyze AAPL', sessionId })
        .expect(200);
      
      const res2 = await request(app)
        .post('/api/chat')
        .send({ message: 'analyze MSFT', sessionId: newSessionId })
        .expect(200);
      
      expect(res1.body.response).toContain('AAPL');
      expect(res2.body.response).toContain('MSFT');
      expect(res1.body.response).not.toContain('MSFT');
      expect(res2.body.response).not.toContain('AAPL');
    });
  });

  describe('Error Handling', () => {
    test('should handle missing sessionId', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'test' })
        .expect(400);
      
      expect(res.body.error).toBe('Message and sessionId required');
    });

    test('should handle empty message', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: '', sessionId })
        .expect(400);
      
      expect(res.body.error).toBe('Message and sessionId required');
    });

    test('should handle invalid symbols gracefully', async () => {
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'INVALIDTICKER123', sessionId })
        .expect(200);
      
      // Should either reject or handle gracefully
      expect(res.body.success).toBe(true);
    });
  });

  describe('Performance and Reliability', () => {
    test('should respond within reasonable time', async () => {
      const startTime = Date.now();
      
      const res = await request(app)
        .post('/api/chat')
        .send({ message: 'AAPL price', sessionId })
        .expect(200);
      
      const endTime = Date.now();
      const responseTime = endTime - startTime;
      
      expect(responseTime).toBeLessThan(10000); // Should respond within 10 seconds
      expect(res.body.success).toBe(true);
    });

    test('should handle concurrent requests', async () => {
      const promises = [];
      
      for (let i = 0; i < 5; i++) {
        promises.push(
          request(app)
            .post('/api/chat')
            .send({ message: `AAPL analysis ${i}`, sessionId })
            .expect(200)
        );
      }
      
      const results = await Promise.all(promises);
      
      results.forEach(res => {
        expect(res.body.success).toBe(true);
        expect(res.body.response).toContain('AAPL');
      });
    });
  });
});