const safeSymbol = require('../utils/safeSymbol');

describe('SafeSymbolExtractor', () => {
  describe('isValidTicker', () => {
    test('rejects common words as tickers', () => {
      expect(safeSymbol.isValidTicker('WHO')).toBe(false);
      expect(safeSymbol.isValidTicker('CAN')).toBe(false);
      expect(safeSymbol.isValidTicker('TELL')).toBe(false);
      expect(safeSymbol.isValidTicker('HELP')).toBe(false);
      expect(safeSymbol.isValidTicker('WILL')).toBe(false);
      expect(safeSymbol.isValidTicker('SHOULD')).toBe(false);
      expect(safeSymbol.isValidTicker('TRUMP')).toBe(false);
      expect(safeSymbol.isValidTicker('BIDEN')).toBe(false);
    });

    test('accepts valid stock tickers', () => {
      expect(safeSymbol.isValidTicker('AAPL')).toBe(true);
      expect(safeSymbol.isValidTicker('MSFT')).toBe(true);
      expect(safeSymbol.isValidTicker('GOOGL')).toBe(true);
      expect(safeSymbol.isValidTicker('META')).toBe(true);
      expect(safeSymbol.isValidTicker('TSLA')).toBe(true);
    });

    test('accepts valid crypto symbols', () => {
      expect(safeSymbol.isValidTicker('BTC')).toBe(true);
      expect(safeSymbol.isValidTicker('ETH')).toBe(true);
      expect(safeSymbol.isValidTicker('DOGE')).toBe(true);
      expect(safeSymbol.isValidTicker('ADA')).toBe(true);
    });

    test('accepts valid commodity symbols', () => {
      expect(safeSymbol.isValidTicker('GC')).toBe(true);
      expect(safeSymbol.isValidTicker('SI')).toBe(true);
      expect(safeSymbol.isValidTicker('CL')).toBe(true);
      expect(safeSymbol.isValidTicker('NG')).toBe(true);
    });

    test('rejects invalid patterns', () => {
      expect(safeSymbol.isValidTicker('123')).toBe(false);
      expect(safeSymbol.isValidTicker('A1B')).toBe(false);
      expect(safeSymbol.isValidTicker('ABC-DEF')).toBe(false);
      expect(safeSymbol.isValidTicker('TOOLONG')).toBe(false);
      expect(safeSymbol.isValidTicker('')).toBe(false);
      expect(safeSymbol.isValidTicker(null)).toBe(false);
      expect(safeSymbol.isValidTicker(undefined)).toBe(false);
    });

    test('rejects unknown short tickers', () => {
      expect(safeSymbol.isValidTicker('XX')).toBe(false);
      expect(safeSymbol.isValidTicker('YY')).toBe(false);
      expect(safeSymbol.isValidTicker('ZZ')).toBe(false);
    });

    test('case insensitive for stopwords', () => {
      expect(safeSymbol.isValidTicker('who')).toBe(false);
      expect(safeSymbol.isValidTicker('Who')).toBe(false);
      expect(safeSymbol.isValidTicker('WHO')).toBe(false);
      expect(safeSymbol.isValidTicker('can')).toBe(false);
      expect(safeSymbol.isValidTicker('Can')).toBe(false);
      expect(safeSymbol.isValidTicker('CAN')).toBe(false);
    });
  });

  describe('extractSafeSymbols', () => {
    test('extracts valid symbols with $ prefix', () => {
      const result = safeSymbol.extractSafeSymbols('Check $AAPL and $MSFT prices');
      expect(result).toEqual(['AAPL', 'MSFT']);
    });

    test('extracts valid plain symbols', () => {
      const result = safeSymbol.extractSafeSymbols('AAPL MSFT GOOGL analysis');
      expect(result).toEqual(['AAPL', 'MSFT', 'GOOGL']);
    });

    test('filters out common words', () => {
      const result = safeSymbol.extractSafeSymbols('WHO is the CEO of AAPL?');
      expect(result).toEqual(['AAPL']);
      expect(result).not.toContain('WHO');
    });

    test('handles mixed valid and invalid symbols', () => {
      const result = safeSymbol.extractSafeSymbols('CAN you help me with AAPL and TELL me about MSFT?');
      expect(result).toEqual(['AAPL', 'MSFT']);
      expect(result).not.toContain('CAN');
      expect(result).not.toContain('TELL');
    });

    test('removes duplicates', () => {
      const result = safeSymbol.extractSafeSymbols('AAPL AAPL MSFT AAPL');
      expect(result).toEqual(['AAPL', 'MSFT']);
    });

    test('handles empty input', () => {
      expect(safeSymbol.extractSafeSymbols('')).toEqual([]);
      expect(safeSymbol.extractSafeSymbols(null)).toEqual([]);
      expect(safeSymbol.extractSafeSymbols(undefined)).toEqual([]);
    });

    test('handles punctuation correctly', () => {
      const result = safeSymbol.extractSafeSymbols('AAPL, MSFT; GOOGL! What about BTC?');
      expect(result).toEqual(['AAPL', 'MSFT', 'GOOGL', 'BTC']);
    });
  });

  describe('detectPortfolioIntent', () => {
    test('detects portfolio keywords', () => {
      expect(safeSymbol.detectPortfolioIntent('show me my portfolio')).toBe(true);
      expect(safeSymbol.detectPortfolioIntent('analyze my holdings')).toBe(true);
      expect(safeSymbol.detectPortfolioIntent('check my investments')).toBe(true);
      expect(safeSymbol.detectPortfolioIntent('what are my positions?')).toBe(true);
    });

    test('detects portfolio action patterns', () => {
      expect(safeSymbol.detectPortfolioIntent('can u help me upgrade my portfolio?')).toBe(true);
      expect(safeSymbol.detectPortfolioIntent('improve my investments')).toBe(true);
      expect(safeSymbol.detectPortfolioIntent('rebalance my holdings')).toBe(true);
      expect(safeSymbol.detectPortfolioIntent('optimize my portfolio')).toBe(true);
      expect(safeSymbol.detectPortfolioIntent('diversify my stocks')).toBe(true);
    });

    test('detects advice seeking patterns', () => {
      expect(safeSymbol.detectPortfolioIntent('give me portfolio advice')).toBe(true);
      expect(safeSymbol.detectPortfolioIntent('investment recommendations please')).toBe(true);
      expect(safeSymbol.detectPortfolioIntent('what investment strategy should I use?')).toBe(true);
    });

    test('does not detect non-portfolio queries', () => {
      expect(safeSymbol.detectPortfolioIntent('who is trump?')).toBe(false);
      expect(safeSymbol.detectPortfolioIntent('what is the weather?')).toBe(false);
      expect(safeSymbol.detectPortfolioIntent('AAPL stock price')).toBe(false);
      expect(safeSymbol.detectPortfolioIntent('bitcoin trends')).toBe(false);
    });

    test('case insensitive detection', () => {
      expect(safeSymbol.detectPortfolioIntent('PORTFOLIO analysis')).toBe(true);
      expect(safeSymbol.detectPortfolioIntent('My INVESTMENTS need help')).toBe(true);
      expect(safeSymbol.detectPortfolioIntent('REBALANCE my holdings')).toBe(true);
    });
  });

  describe('isNonFinancialQuery', () => {
    test('detects "who is" questions about people', () => {
      expect(safeSymbol.isNonFinancialQuery('who is trump?')).toBe(true);
      expect(safeSymbol.isNonFinancialQuery('who is biden?')).toBe(true);
      expect(safeSymbol.isNonFinancialQuery('who is the president?')).toBe(true);
      expect(safeSymbol.isNonFinancialQuery('who is elon musk?')).toBe(true);
    });

    test('detects non-financial topics', () => {
      expect(safeSymbol.isNonFinancialQuery('what is the weather today?')).toBe(true);
      expect(safeSymbol.isNonFinancialQuery('tell me a recipe for cookies')).toBe(true);
      expect(safeSymbol.isNonFinancialQuery('what movie should I watch?')).toBe(true);
      expect(safeSymbol.isNonFinancialQuery('how to cook pasta?')).toBe(true);
    });

    test('does not flag financial queries', () => {
      expect(safeSymbol.isNonFinancialQuery('who is the CEO of AAPL?')).toBe(false);
      expect(safeSymbol.isNonFinancialQuery('what is the stock price?')).toBe(false);
      expect(safeSymbol.isNonFinancialQuery('bitcoin trading strategies')).toBe(false);
      expect(safeSymbol.isNonFinancialQuery('market analysis')).toBe(false);
    });

    test('allows financial "who is" questions', () => {
      expect(safeSymbol.isNonFinancialQuery('who is the best stock to buy?')).toBe(false);
      expect(safeSymbol.isNonFinancialQuery('who is trading AAPL?')).toBe(false);
      expect(safeSymbol.isNonFinancialQuery('who is the market maker?')).toBe(false);
    });

    test('detects celebrity/politician references', () => {
      expect(safeSymbol.isNonFinancialQuery('tell me about the president')).toBe(true);
      expect(safeSymbol.isNonFinancialQuery('celebrity news')).toBe(true);
      expect(safeSymbol.isNonFinancialQuery('politician scandal')).toBe(true);
    });

    test('handles empty input', () => {
      expect(safeSymbol.isNonFinancialQuery('')).toBe(false);
      expect(safeSymbol.isNonFinancialQuery(null)).toBe(false);
      expect(safeSymbol.isNonFinancialQuery(undefined)).toBe(false);
    });
  });

  describe('Integration scenarios', () => {
    test('Critical Issue A: "who is trump?" should not extract WHO', () => {
      expect(safeSymbol.isNonFinancialQuery('who is trump?')).toBe(true);
      expect(safeSymbol.extractSafeSymbols('who is trump?')).toEqual([]);
      expect(safeSymbol.detectPortfolioIntent('who is trump?')).toBe(false);
    });

    test('Critical Issue B: "can u help me upgrade my portfolio?" should detect portfolio intent', () => {
      expect(safeSymbol.isNonFinancialQuery('can u help me upgrade my portfolio?')).toBe(false);
      expect(safeSymbol.detectPortfolioIntent('can u help me upgrade my portfolio?')).toBe(true);
      expect(safeSymbol.extractSafeSymbols('can u help me upgrade my portfolio?')).toEqual([]);
    });

    test('Complex query with mixed elements', () => {
      const query = 'can you help me with my portfolio and tell me about AAPL?';
      expect(safeSymbol.detectPortfolioIntent(query)).toBe(true);
      expect(safeSymbol.extractSafeSymbols(query)).toEqual(['AAPL']);
      expect(safeSymbol.isNonFinancialQuery(query)).toBe(false);
    });

    test('Financial query with problematic words', () => {
      const query = 'what is the current price of AAPL stock?';
      expect(safeSymbol.extractSafeSymbols(query)).toEqual(['AAPL']);
      expect(safeSymbol.isNonFinancialQuery(query)).toBe(false);
    });
  });
});