class SafeSymbolExtractor {
  constructor() {
    // Common English words that should NEVER be tickers
    this.stopWords = new Set([
      'who', 'what', 'when', 'where', 'why', 'how', 'can', 'could', 'would', 'should',
      'will', 'shall', 'may', 'might', 'must', 'ought', 'need', 'dare', 'used',
      'the', 'a', 'an', 'and', 'or', 'but', 'if', 'then', 'else', 'when', 'while',
      'is', 'are', 'was', 'were', 'been', 'being', 'have', 'has', 'had', 'having',
      'do', 'does', 'did', 'doing', 'make', 'makes', 'made', 'making', 'get', 'gets',
      'got', 'getting', 'go', 'goes', 'went', 'going', 'come', 'comes', 'came', 'coming',
      'i', 'me', 'my', 'mine', 'myself', 'you', 'your', 'yours', 'yourself', 'he', 'him',
      'his', 'himself', 'she', 'her', 'hers', 'herself', 'it', 'its', 'itself', 'we',
      'us', 'our', 'ours', 'ourselves', 'they', 'them', 'their', 'theirs', 'themselves',
      'this', 'that', 'these', 'those', 'which', 'whose', 'whom', 'all', 'each', 'every',
      'some', 'any', 'no', 'none', 'few', 'many', 'much', 'more', 'most', 'less', 'least',
      'tell', 'ask', 'help', 'show', 'give', 'take', 'put', 'bring', 'send', 'find',
      'trump', 'biden', 'obama', 'clinton', 'bush', 'reagan', 'carter', 'ford',
      'upgrade', 'improve', 'optimize', 'rebalance', 'analyze', 'review', 'check',
      'with', 'about', 'from', 'into', 'over', 'under', 'above', 'below', 'between',
      'price', 'stock', 'market', 'trading', 'trade', 'buy', 'sell', 'hold', 'long',
      'short', 'call', 'put', 'option', 'future', 'bond', 'fund', 'index', 'etf',
      'ceo', 'cfo', 'coo', 'company', 'corp', 'inc', 'ltd', 'llc', 'best', 'worst',
      'good', 'bad', 'high', 'low', 'open', 'close', 'volume', 'shares', 'percent',
      // Critical additions to fix the bug
      'chart', 'graph', 'trend', 'display', 'analysis', 'data', 'info', 'report',
      // Fix "what's happening" bug
      'whats', 'happening', 'doing', 'saying', 'happening', 'going', 'on'
    ]);

    // Valid ticker patterns
    this.validTickerPattern = /^[A-Z]{1,5}$/;
    
    // Natural language to symbol mappings
    this.naturalLanguageMap = {
      // Cryptocurrencies
      'bitcoin': 'BTC',
      'ethereum': 'ETH',
      'dogecoin': 'DOGE',
      'litecoin': 'LTC',
      'cardano': 'ADA',
      'solana': 'SOL',
      'polkadot': 'DOT',
      'chainlink': 'LINK',
      'uniswap': 'UNI',
      'avalanche': 'AVAX',
      'binance': 'BNB',
      'ripple': 'XRP',
      'polygon': 'MATIC',
      
      // Commodities
      'gold': 'GC',
      'silver': 'SI',
      'oil': 'CL',
      'crude': 'CL',
      'gas': 'NG',
      'naturalgas': 'NG',
      'natural gas': 'NG',
      'copper': 'HG',
      'platinum': 'PL',
      'palladium': 'PA',
      'wheat': 'ZW',
      'corn': 'ZC',
      'soybeans': 'ZS',
      'soybean': 'ZS',
      'coffee': 'KC',
      'sugar': 'SB',
      
      // Major stocks
      'apple': 'AAPL',
      'microsoft': 'MSFT',
      'google': 'GOOGL',
      'amazon': 'AMZN',
      'tesla': 'TSLA',
      'nvidia': 'NVDA',
      'meta': 'META',
      'facebook': 'META',
      'netflix': 'NFLX',
      'adobe': 'ADBE',
      'berkshire': 'BRK.B',
      'jpmorgan': 'JPM',
      'jp morgan': 'JPM',
      'visa': 'V'
    };

    // Known valid tickers (top 500 most traded)
    this.knownTickers = new Set([
      'AAPL', 'MSFT', 'AMZN', 'GOOGL', 'META', 'TSLA', 'NVDA', 'JPM', 'JNJ', 'V',
      'UNH', 'HD', 'PG', 'MA', 'DIS', 'BAC', 'ADBE', 'CMCSA', 'NFLX', 'XOM',
      'VZ', 'INTC', 'WMT', 'CVX', 'T', 'CRM', 'ABT', 'PFE', 'KO', 'CSCO',
      'PEP', 'TMO', 'AVGO', 'MRK', 'ABBV', 'NKE', 'LLY', 'ORCL', 'ACN', 'DHR',
      'MDT', 'MCD', 'TXN', 'HON', 'COST', 'UNP', 'BMY', 'NEE', 'LIN', 'UPS',
      'AMGN', 'CVS', 'AMT', 'LOW', 'SBUX', 'IBM', 'RTX', 'QCOM', 'BA', 'GS',
      'CAT', 'CHTR', 'BLK', 'INTU', 'DE', 'SPGI', 'MDLZ', 'MMM', 'GILD', 'NOW',
      'ISRG', 'AMD', 'AXP', 'TGT', 'MO', 'PLD', 'USB', 'SYK', 'CI', 'BKNG',
      'BDX', 'TJX', 'GE', 'COP', 'CL', 'MS', 'C', 'DUK', 'NOC', 'CB',
      'SO', 'ZTS', 'ANTM', 'SHW', 'CSX', 'PNC', 'ITW', 'SCHW', 'WM', 'FIS',
      // Crypto
      'BTC', 'ETH', 'BNB', 'XRP', 'ADA', 'DOGE', 'SOL', 'DOT', 'MATIC', 'SHIB',
      'TRX', 'AVAX', 'UNI', 'ATOM', 'LTC', 'LINK', 'NEAR', 'BCH', 'ALGO', 'XLM',
      // Commodities (official futures symbols)
      'GC', 'SI', 'CL', 'NG', 'HG', 'PL', 'PA', 'ZC', 'ZS', 'ZW', 'KC', 'SB'
    ]);

    // Phrases that indicate portfolio intent
    this.portfolioIndicators = [
      'portfolio', 'holdings', 'positions', 'investments', 'allocation',
      'diversify', 'rebalance', 'optimize', 'upgrade', 'improve',
      'my stocks', 'my investments', 'my assets', 'my portfolio'
    ];
  }

  isValidTicker(symbol) {
    if (!symbol || typeof symbol !== 'string') return false;
    
    const upperSymbol = symbol.toUpperCase().trim();
    
    // Check stopwords first (case-insensitive)
    if (this.stopWords.has(symbol.toLowerCase())) {
      console.log(`[SafeSymbol] Rejected '${symbol}' - common word`);
      return false;
    }
    
    // Check pattern
    if (!this.validTickerPattern.test(upperSymbol)) {
      console.log(`[SafeSymbol] Rejected '${symbol}' - invalid pattern`);
      return false;
    }
    
    // Length check
    if (upperSymbol.length < 1 || upperSymbol.length > 5) {
      console.log(`[SafeSymbol] Rejected '${symbol}' - invalid length`);
      return false;
    }
    
    // For 1-2 letter symbols, must be in known list
    if (upperSymbol.length <= 2 && !this.knownTickers.has(upperSymbol)) {
      console.log(`[SafeSymbol] Rejected '${symbol}' - unknown short ticker`);
      return false;
    }
    
    // For 3+ letter symbols, check if it's a common word
    if (upperSymbol.length >= 3) {
      const lowerSymbol = upperSymbol.toLowerCase();
      if (this.stopWords.has(lowerSymbol)) {
        console.log(`[SafeSymbol] Rejected '${symbol}' - common word as ticker`);
        return false;
      }
    }
    
    console.log(`[SafeSymbol] Accepted '${symbol}' as valid ticker`);
    return true;
  }

  extractSafeSymbols(text) {
    if (!text) return [];
    
    const symbols = [];
    const words = text.split(/\s+/);
    
    for (const word of words) {
      // Remove common punctuation including apostrophes, but keep $
      // This handles "what's" → "whats"
      const cleaned = word.replace(/[.,!?;:()[\]{}''"]/g, '');
      
      // Check for $SYMBOL format
      if (cleaned.startsWith('$')) {
        const symbol = cleaned.substring(1);
        if (this.isValidTicker(symbol)) {
          symbols.push(symbol.toUpperCase());
        }
      }
      // Check for natural language mappings first
      else if (this.naturalLanguageMap[cleaned.toLowerCase()]) {
        const mappedSymbol = this.naturalLanguageMap[cleaned.toLowerCase()];
        console.log(`[SafeSymbol] Mapped '${cleaned}' to '${mappedSymbol}'`);
        symbols.push(mappedSymbol);
      }
      // Check for plain symbol
      else if (this.isValidTicker(cleaned)) {
        symbols.push(cleaned.toUpperCase());
      }
    }
    
    return [...new Set(symbols)]; // Remove duplicates
  }

  detectPortfolioIntent(text) {
    if (!text) return false;
    
    const lowerText = text.toLowerCase();
    
    // Check for portfolio indicators
    for (const indicator of this.portfolioIndicators) {
      if (lowerText.includes(indicator)) {
        console.log(`[SafeSymbol] Portfolio intent detected: '${indicator}'`);
        return true;
      }
    }
    
    // Check for action + portfolio patterns
    const portfolioPatterns = [
      /\b(help|assist|advise|guide).{0,20}(portfolio|investments?|holdings?)/i,
      /\b(improve|upgrade|optimize|rebalance|diversify).{0,20}(portfolio|investments?|holdings?|stocks?)/i,
      /\b(analyze|review|check|assess|evaluate).{0,20}(portfolio|investments?|holdings?)/i,
      /\bmy\s+(portfolio|investments?|holdings?|stocks?|positions?)/i,
      /\b(portfolio|investment).{0,20}(advice|recommendation|strategy|help)/i
    ];
    
    for (const pattern of portfolioPatterns) {
      if (pattern.test(text)) {
        console.log(`[SafeSymbol] Portfolio pattern matched: ${pattern}`);
        return true;
      }
    }
    
    return false;
  }

  isNonFinancialQuery(text) {
    if (!text) return false;
    
    const lowerText = text.toLowerCase();
    
    // Hard negative patterns - definitely not financial
    const nonFinancialPatterns = [
      /^(who|what|when|where)\s+is\s+(?!.*(stock|price|trading|market))/i,
      /\b(recipe|cook|food|weather|movie|music|book|game|sport)/i,
      /\b(president|politician|celebrity|actor|singer|athlete)/i,
      /\b(define|explain|meaning of)\s+(?!.*(stock|market|trading|financial))/i
    ];
    
    for (const pattern of nonFinancialPatterns) {
      if (pattern.test(lowerText)) {
        console.log(`[SafeSymbol] Non-financial query detected: ${pattern}`);
        return true;
      }
    }
    
    return false;
  }
}

module.exports = new SafeSymbolExtractor();