class IntentClassifier {
  constructor() {
    this.financialKeywords = [
      // Stock/Investment terms
      "stock",
      "stocks",
      "share",
      "shares",
      "equity",
      "securities",
      "investment",
      "invest",
      "investing",
      "investor",
      "portfolio",
      "trading",
      "trade",
      "trader",
      "buy",
      "sell",
      "purchase",
      "market",
      "markets",
      "exchange",
      "nasdaq",
      "nyse",
      "dow",

      // Financial metrics
      "price",
      "prices",
      "value",
      "valuation",
      "worth",
      "cost",
      "dividend",
      "dividends",
      "earnings",
      "revenue",
      "profit",
      "loss",
      "pe ratio",
      "p/e",
      "p/e ratio",
      "p e ratio",
      "market cap",
      "capitalization",
      "volume",
      "volatility",
      "beta",
      "alpha",

      // Market conditions
      "bull",
      "bear",
      "rally",
      "correction",
      "crash",
      "bubble",
      "support",
      "resistance",
      "breakout",
      "trend",
      "momentum",
      "oversold",
      "overbought",
      "dip",
      "surge",
      "spike",

      // Analysis types
      "analysis",
      "analyze",
      "technical",
      "fundamental",
      "chart",
      "charts",
      "indicator",
      "indicators",
      "moving average",
      "rsi",
      "macd",
      "bollinger",

      // Cryptocurrency (expanded)
      "crypto",
      "cryptocurrency",
      "bitcoin",
      "btc",
      "ethereum",
      "eth",
      "blockchain",
      "defi",
      "nft",
      "altcoin",
      "stablecoin",
      "mining",
      "dogecoin",
      "doge",
      "litecoin",
      "ltc",
      "ripple",
      "xrp",
      "cardano",
      "ada",
      "solana",
      "sol",
      "polygon",
      "matic",
      "avalanche",
      "avax",
      "chainlink",
      "link",
      "uniswap",
      "uni",
      "polkadot",
      "dot",
      "binance",
      "bnb",
      "tether",
      "usdt",
      "shiba",
      "shib",
      "coin",
      "coins",
      "token",
      "tokens",
      "wallet",
      "exchange",
      "coinbase",
      "binance",
      "kraken",
      "hodl",
      "pump",
      "dump",
      "moon",
      "lambo",
      "diamond hands",
      "to the moon",
      "hold",
      "hodling",
      "rekt",
      "fomo",

      // Financial instruments
      "etf",
      "mutual fund",
      "bond",
      "bonds",
      "options",
      "futures",
      "derivatives",
      "commodity",
      "commodities",
      "forex",

      // Forex trading
      "currency",
      "currencies",
      "exchange rate",
      "fx",
      "usd",
      "eur",
      "gbp",
      "jpy",
      "chf",
      "cad",
      "aud",
      "nzd",
      "dollar",
      "euro",
      "pound",
      "yen",
      "franc",
      "loonie",
      "aussie",
      "kiwi",
      "pair",
      "pairs",
      "eurusd",
      "gbpusd",
      "usdjpy",
      "usdchf",
      "usdcad",
      "audusd",
      "nzdusd",
      "major pairs",
      "minor pairs",
      "cross currency",
      "pip",
      "pips",
      "spread",

      // Commodities
      "gold",
      "silver",
      "platinum",
      "palladium",
      "copper",
      "oil",
      "crude",
      "brent",
      "wti",
      "natural gas",
      "gas",
      "energy",
      "metals",
      "precious metals",
      "wheat",
      "corn",
      "soybeans",
      "coffee",
      "sugar",
      "cotton",
      "agriculture",
      "agricultural",
      "livestock",
      "cattle",
      "cocoa",
      "rice",
      "oats",

      // Financial institutions
      "bank",
      "broker",
      "brokerage",
      "hedge fund",
      "pension",
      "insurance",
      "credit",
      "loan",
      "mortgage",
      "debt",

      // Economic terms
      "economy",
      "economic",
      "inflation",
      "deflation",
      "recession",
      "gdp",
      "interest rate",
      "federal reserve",
      "fed",
      "treasury",

      // Casual financial language
      "whats up with",
      "what about",
      "how did",
      "how is",
      "how are",
      "what happened to",
      "what happened with",
      "performance",
      "doing well",
      "doing bad",
      "going up",
      "going down",
      "last week",
      "last month",
      "this week",
      "this month",
      "today",
      "yesterday",
      "recent",
      "recently",
      "lately",
      "gains",
      "losses",
      "profit",
      "loss",
      "winner",
      "loser",
      "hot",
      "cold",
      "popular",
      "trending",
      "outperform",
      "underperform",
      "beat",
      "miss",
      "estimates",

      // Portfolio advice terms
      "rebalance",
      "rebalancing",
      "allocate",
      "allocation",
      "diversify",
      "diversification",
      "risk",
      "risky",
      "too risky",
      "risk tolerance",
      "should i buy",
      "should i sell",
      "should i invest",
      "what should i buy",
      "what should i sell",
      "where should i invest",
      "recommend",
      "recommendation",
      "advice",
      "suggest",
      "suggestion",
      "portfolio advice",
      "investment advice",

      // Question patterns for stock queries
      "hows",
      "how's",
      "whats",
      "what's",
      "how doing",
      "doing",
      "trading at",
      "currently",
      "current",
      "latest",
      "update",
      "status",
      "looking",
      "looks",
      "think about",
      "thoughts on",
      "opinion on",
      "worth buying",
      "worth selling",
      "worth it",
    ];

    this.nonFinancialKeywords = [
      // Cooking & Food (CRITICAL - must catch "teach me to make gluten free pizza")
      "recipe",
      "cooking",
      "cook",
      "bake",
      "baking",
      "food",
      "eat",
      "eating",
      "restaurant",
      "pizza",
      "gluten free",
      "gluten-free",
      "pasta",
      "bread",
      "meal",
      "dinner",
      "lunch",
      "breakfast",
      "kitchen",
      "ingredient",
      "ingredients",
      "flour",
      "sugar",
      "salt",
      "pepper",
      "spice",
      "spices",
      "sauce",
      "marinade",
      "grill",
      "grilling",
      "roast",
      "roasting",
      "fry",
      "frying",
      "boil",
      "boiling",
      "make food",
      "prepare food",
      "teach me to make",
      "how to make",
      "how to cook",
      "cooking tips",
      "cooking advice",
      "culinary",
      "chef",
      "cuisine",

      // Weather & Environment
      "weather",
      "temperature",
      "rain",
      "snow",
      "sun",
      "sunny",
      "cloudy",
      "storm",
      "forecast",
      "climate",
      "hot",
      "cold",
      "warm",
      "cool",
      "humidity",

      // Personal/Social
      "movie",
      "music",
      "song",
      "book",
      "game",
      "sport",
      "sports",
      "travel",
      "vacation",
      "hotel",
      "flight",
      "relationship",
      "dating",
      "personal",
      "life",
      "family",
      "friends",
      "social",
      "birthday",
      "party",
      "celebration",
      "wedding",
      "anniversary",
      "gift",
      "gifts",
      "guitar",
      "piano",
      "drums",
      "violin",
      "instrument",
      "instruments",
      "band",
      "orchestra",
      "concert",
      "performance",
      "sing",
      "singing",

      // Technology (non-financial)
      "programming",
      "code",
      "software",
      "hardware",
      "computer",
      "internet",
      "website",
      "app",
      "mobile",
      "android",
      "ios",
      "gaming",
      "video game",
      "video games",
      "technology news",

      // Health/Medical
      "health",
      "medical",
      "doctor",
      "hospital",
      "medicine",
      "symptom",
      "disease",
      "treatment",
      "therapy",
      "fitness",
      "exercise",
      "workout",
      "diet",
      "nutrition",
      "vitamin",
      "weight",
      "lose weight",
      "weight loss",
      "calories",
      "fat",
      "gym",
      "cardio",
      "muscle",
      "body",
      "healthy",

      // Education
      "school",
      "university",
      "education",
      "learning",
      "study",
      "homework",
      "exam",
      "test",
      "grade",
      "course",
      "class",
      "teacher",
      "professor",
      "student",
      "academic",

      // Math & Calculations (non-financial)
      "what is",
      "calculate",
      "math",
      "mathematics",
      "algebra",
      "geometry",
      "calculus",
      "equation",
      "formula",
      "solve",
      "add",
      "subtract",
      "multiply",
      "divide",
      "plus",
      "minus",
      "times",
      "divided by",
      "equals",
      "sum",
      "difference",

      // Legal (non-financial)
      "legal",
      "law",
      "lawyer",
      "attorney",
      "court",
      "lawsuit",
      "judge",
      "jury",
      "litigation",
      "criminal",
      "civil",

      // Entertainment
      "tv show",
      "television",
      "netflix",
      "comedy",
      "drama",
      "horror",
      "actor",
      "actress",
      "celebrity",
      "fashion",
      "beauty",
      "makeup",
      "best movies",
      "movies to watch",
      "film",
      "films",
      "cinema",
      "entertainment",
      "streaming",
      "movie recommendation",
      "movie recommendations",

      // General life topics
      "how to fix",
      "repair",
      "maintenance",
      "home improvement",
      "garden",
      "gardening",
      "pet",
      "pets",
      "animal",
      "animals",
      "car repair",
      "auto repair",
      "mechanical",
      "plumbing",
      "electrical",

      // Explicit non-financial patterns
      "joke",
      "funny",
      "story",
      "riddle",
      "poem",
      "creative writing",
      "art",
      "painting",
      "drawing",
      "photography",
      "design",
    ];

    this.stockSymbolPattern =
      /\$[A-Z]{1,5}\b|\b(?:aapl|msft|googl|tsla|amzn|meta|nvda|intc|amd|nflx|dis|jpm|bac|wmt|pg|ko|pfe|jnj|xom|cvx|ibm|csco|orcl|crm|adbe|pypl|zm|roku|spot|abnb|coin|hood|gme|amc|pltr|spce|lcid|rivn|apple|microsoft|tesla|amazon|facebook|nvidia|intel|netflix|disney|visa|mastercard|jpmorgan|walmart|pfizer|johnson|exxon|chevron|cisco|oracle|salesforce|adobe|paypal|zoom|spotify|airbnb|coinbase|robinhood|gamestop|palantir|lucid|rivian)\b/gi;
    this.cryptoPattern =
      /\b(BTC|ETH|ADA|DOT|SOL|MATIC|AVAX|LINK|UNI|AAVE|LTC|XRP|DOGE|BNB|USDT|USDC|SHIB|BITCOIN|ETHEREUM|LITECOIN|RIPPLE|CARDANO|SOLANA|POLKADOT|DOGECOIN|AVALANCHE|CHAINLINK|UNISWAP|POLYGON|BINANCE|TETHER|SHIBA|PEPE|FLOKI|BONK|WIF|POPCAT|MYRO|PONKE)\b/gi;
    this.pricePattern = /\$?\d+(?:\.\d{2})?(?:\s?(?:dollars?|usd|cents?))?/gi;
  }

  classifyIntent(text, conversationHistory = []) {
    const normalizedText = text.toLowerCase();
    const words = normalizedText.split(/\s+/);

    let financialScore = 0;
    let nonFinancialScore = 0;
    let totalWords = words.length;
    let keywordMatches = [];
    let contextScore = 0;

    // DEBUG: Log the query
    console.log(`[IntentClassifier] Analyzing: "${text}"`);

    // Check conversation history for context - IMPROVED WEIGHT
    if (conversationHistory && conversationHistory.length > 0) {
      contextScore = this.analyzeConversationContext(conversationHistory);
      if (contextScore > 0) {
        // Better context boost for follow-up questions
        const contextBoost = Math.min(contextScore * 0.5, 8); // Max boost of 8, more generous
        financialScore += contextBoost;
        keywordMatches.push(
          `context boost: +${contextBoost.toFixed(1)}`,
        );
        console.log(
          `[IntentClassifier] Context boost from history: +${contextBoost.toFixed(1)} (from context score ${contextScore})`,
        );
        
        // Special handling for ambiguous follow-up questions
        if (this.isFollowUpQuestion(normalizedText) && contextScore >= 5) {
          const followUpBoost = 5;
          financialScore += followUpBoost;
          keywordMatches.push(`follow-up question boost: +${followUpBoost}`);
          console.log(`[IntentClassifier] Follow-up question detected with strong context: +${followUpBoost}`);
        }
      }
    }

    // Enhanced natural language pattern detection
    const naturalLanguagePatterns = [
      // "What's up with X" patterns
      {
        pattern:
          /what'?s up with (oil|gold|silver|bitcoin|ethereum|apple|tesla|nvidia|microsoft)/i,
        boost: 5,
        type: "inquiry",
      },
      {
        pattern:
          /whats up with (oil|gold|silver|bitcoin|ethereum|apple|tesla|nvidia|microsoft)/i,
        boost: 5,
        type: "inquiry",
      },
      {
        pattern:
          /what about (oil|gold|silver|bitcoin|ethereum|apple|tesla|nvidia|microsoft)/i,
        boost: 4,
        type: "inquiry",
      },
      {
        pattern:
          /how is (oil|gold|silver|bitcoin|ethereum|apple|tesla|nvidia|microsoft)/i,
        boost: 4,
        type: "inquiry",
      },
      {
        pattern:
          /how's (oil|gold|silver|bitcoin|ethereum|apple|tesla|nvidia|microsoft)/i,
        boost: 4,
        type: "inquiry",
      },

      // "Teach me about X" patterns
      {
        pattern:
          /teach me about (oil|gold|silver|bitcoin|ethereum|apple|tesla|nvidia|microsoft|trading|investing)/i,
        boost: 6,
        type: "education",
      },
      {
        pattern:
          /tell me about (oil|gold|silver|bitcoin|ethereum|apple|tesla|nvidia|microsoft|trading|investing)/i,
        boost: 5,
        type: "education",
      },
      {
        pattern:
          /explain (oil|gold|silver|bitcoin|ethereum|apple|tesla|nvidia|microsoft|trading|investing)/i,
        boost: 5,
        type: "education",
      },
      {
        pattern:
          /what is (oil|gold|silver|bitcoin|ethereum|apple|tesla|nvidia|microsoft)/i,
        boost: 4,
        type: "education",
      },

      // "X trends" patterns
      {
        pattern:
          /(oil|gold|silver|bitcoin|ethereum|apple|tesla|nvidia|microsoft) trends?/i,
        boost: 5,
        type: "analysis",
      },
      {
        pattern:
          /(oil|gold|silver|bitcoin|ethereum|apple|tesla|nvidia|microsoft) analysis/i,
        boost: 5,
        type: "analysis",
      },
      {
        pattern:
          /(oil|gold|silver|bitcoin|ethereum|apple|tesla|nvidia|microsoft) performance/i,
        boost: 5,
        type: "analysis",
      },
      {
        pattern:
          /(oil|gold|silver|bitcoin|ethereum|apple|tesla|nvidia|microsoft) price/i,
        boost: 6,
        type: "price",
      },

      // Commodity specific patterns
      { pattern: /oil prices?/i, boost: 6, type: "price" },
      { pattern: /crude oil/i, boost: 5, type: "commodity" },
      { pattern: /gold prices?/i, boost: 6, type: "price" },
      { pattern: /silver prices?/i, boost: 6, type: "price" },

      // Stock specific patterns
      {
        pattern: /(tesla|apple|nvidia|microsoft) stock/i,
        boost: 6,
        type: "stock",
      },
      { pattern: /(aapl|tsla|nvda|msft) stock/i, boost: 6, type: "stock" },

      // Crypto specific patterns
      { pattern: /bitcoin vs ethereum/i, boost: 7, type: "comparison" },
      {
        pattern: /(bitcoin|ethereum|btc|eth) vs (bitcoin|ethereum|btc|eth)/i,
        boost: 7,
        type: "comparison",
      },
    ];

    // Check for natural language patterns
    for (const { pattern, boost, type } of naturalLanguagePatterns) {
      if (pattern.test(text)) {
        financialScore += boost;
        keywordMatches.push(`natural language: ${type}`);
        console.log(
          `[IntentClassifier] Natural language pattern matched: ${type} (+${boost})`,
        );
      }
    }

    // Special handling for common portfolio questions
    const portfolioPatterns = [
      /rebalance/i,
      /am i too risky/i,
      /where should i invest/i,
      /allocate.*portfolio/i,
      /portfolio.*allocation/i,
      /diversify/i,
      /risk assessment/i,
    ];

    if (portfolioPatterns.some((pattern) => pattern.test(text))) {
      console.log(`[IntentClassifier] Portfolio pattern detected`);
      financialScore += 10;
      keywordMatches.push("portfolio pattern");
    }

    // Special handling for single symbol queries like "AAPL?" or "msft?"
    if (totalWords === 1 && text.match(/^[A-Z]{2,5}\?*$/)) {
      return {
        classification: "financial",
        confidence: 0.95,
        financialScore: 10,
        nonFinancialScore: 0,
        details: {
          stockSymbols: [text.replace("?", "").toUpperCase()],
          cryptoSymbols: [],
          priceReferences: [],
          keywordMatches: ["single symbol query"],
          totalWords: 1,
          isQuestion: text.includes("?"),
          isGreeting: false,
          hasFinancialContext: true,
          hasTemporalContext: false,
        },
      };
    }

    // Check for financial keywords with better scoring
    for (const keyword of this.financialKeywords) {
      if (normalizedText.includes(keyword)) {
        const keywordLength = keyword.split(" ").length;
        // Multi-word terms get higher weight, crypto terms get bonus
        let weight = keywordLength;
        if (
          keyword.includes("bitcoin") ||
          keyword.includes("crypto") ||
          keyword.includes("btc") ||
          keyword.includes("ethereum") ||
          keyword.includes("eth") ||
          keyword.includes("coin") ||
          keyword.includes("whats up with") ||
          keyword.includes("what about") ||
          keyword.includes("how did") ||
          keyword.includes("performance") ||
          keyword.includes("hows") ||
          keyword.includes("what's") ||
          keyword.includes("doing")
        ) {
          weight += 2; // Bonus for crypto terms and casual language
        }
        // Commodity boost to prevent refusals on gold/silver/oil
        if (
          keyword.includes("gold") ||
          keyword.includes("silver") ||
          keyword.includes("oil") ||
          keyword.includes("crude") ||
          keyword.includes("brent") ||
          keyword.includes("wti") ||
          keyword.includes("natural gas") ||
          keyword.includes("platinum") ||
          keyword.includes("palladium") ||
          keyword.includes("copper") ||
          keyword.includes("wheat") ||
          keyword.includes("corn") ||
          keyword.includes("commodity") ||
          keyword.includes("commodities")
        ) {
          weight += 3; // Extra boost for commodities
        }
        financialScore += weight;
        keywordMatches.push(keyword);
      }
    }

    // Check for non-financial keywords with VERY HIGH penalty
    for (const keyword of this.nonFinancialKeywords) {
      // Use word boundaries to avoid matching substrings (e.g., "app" in "Apple")
      const regex = new RegExp(
        `\\b${keyword.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`,
        "gi",
      );
      if (regex.test(normalizedText)) {
        // CRITICAL: Give very high penalty to non-financial keywords
        const weight = keyword.split(" ").length * 10; // 10x multiplier for non-financial

        // Extra penalty for cooking/food terms
        if (
          keyword.includes("recipe") ||
          keyword.includes("cook") ||
          keyword.includes("pizza") ||
          keyword.includes("food") ||
          keyword.includes("make") ||
          keyword.includes("teach me") ||
          keyword.includes("gluten") ||
          keyword.includes("bake") ||
          keyword.includes("meal")
        ) {
          nonFinancialScore += weight * 5; // 50x total multiplier for cooking
        } else {
          nonFinancialScore += weight;
        }

        keywordMatches.push(`NON-FINANCIAL: ${keyword}`);
      }
    }

    // Check for stock symbols
    const stockMatches = text.match(this.stockSymbolPattern);
    if (stockMatches) {
      financialScore += stockMatches.length * 3; // Higher weight for symbols
    }

    // Check for crypto symbols with enhanced detection
    const cryptoMatches = text.match(this.cryptoPattern);
    if (cryptoMatches) {
      financialScore += cryptoMatches.length * 4; // Even higher weight for crypto
    }

    // Check for price mentions
    const priceMatches = text.match(this.pricePattern);
    if (priceMatches) {
      financialScore += priceMatches.length * 2;
    }

    // Context-aware scoring adjustments
    if (this.hasFinancialContext(normalizedText)) {
      financialScore += 3;
    }

    // Temporal context boosts (last week, this month, etc.)
    if (this.hasTemporalContext(normalizedText)) {
      financialScore += 2;
    }

    // Special patterns for "How's X doing?" type queries
    if (this.hasStockQueryPattern(normalizedText)) {
      financialScore += 4;
      keywordMatches.push("stock query pattern");
    }

    // Calculate confidence with improved algorithm
    const totalScore = financialScore + nonFinancialScore;
    let classification;
    let confidence;

    console.log(
      `[IntentClassifier] Scores - Financial: ${financialScore}, Non-Financial: ${nonFinancialScore}, Context: ${contextScore}`,
    );

    if (totalScore === 0) {
      classification = "ambiguous";
      confidence = 0.3;
    } else if (financialScore > nonFinancialScore) {
      classification = "financial";
      confidence = Math.min(financialScore / (totalScore + 1), 0.95);
    } else if (nonFinancialScore > financialScore) {
      classification = "non-financial";
      confidence = Math.min(nonFinancialScore / (totalScore + 1), 0.95);
    } else {
      classification = "ambiguous";
      confidence = 0.5;
    }

    // Lower ambiguous threshold if context score is high
    if (classification === "ambiguous" && contextScore > 5) {
      confidence = 0.5 + contextScore * 0.05; // Boost confidence based on context
    }

    // Boost confidence for strong financial indicators
    if (stockMatches || cryptoMatches || priceMatches) {
      if (classification === "financial") {
        confidence = Math.min(confidence + 0.25, 0.98);
      }
    }

    // Special handling for edge cases
    if (this.isGreeting(normalizedText)) {
      classification = "greeting";
      confidence = 0.9;
    }

    // Improve question handling
    if (this.isQuestion(normalizedText)) {
      if (classification === "ambiguous" && financialScore === 0) {
        classification = "non-financial";
        confidence = 0.7;
      } else if (classification === "financial" && financialScore >= 3) {
        confidence = Math.min(confidence + 0.1, 0.98);
      }
    }

    return {
      classification,
      confidence: Math.round(confidence * 100) / 100,
      financialScore,
      nonFinancialScore,
      details: {
        stockSymbols: stockMatches || [],
        cryptoSymbols: cryptoMatches || [],
        priceReferences: priceMatches || [],
        keywordMatches,
        totalWords,
        isQuestion: this.isQuestion(normalizedText),
        isGreeting: this.isGreeting(normalizedText),
        hasFinancialContext: this.hasFinancialContext(normalizedText),
        hasTemporalContext: this.hasTemporalContext(normalizedText),
        contextScore: contextScore,
      },
    };
  }

  isGreeting(text) {
    const greetings = [
      "hello",
      "hi",
      "hey",
      "good morning",
      "good afternoon",
      "good evening",
    ];
    // Only consider it a greeting if it's primarily a greeting, not if greeting words appear in other contexts
    return greetings.some(
      (greeting) =>
        text.trim().toLowerCase().startsWith(greeting) ||
        text.trim().toLowerCase() === greeting,
    );
  }

  isFollowUpQuestion(text) {
    const followUpPatterns = [
      "you sure",
      "are you sure",
      "really",
      "is that right",
      "correct",
      "true",
      "right",
      "exactly",
      "precisely",
      "accurate",
      "certain",
      "confident",
      "positive",
      "sure about that",
      "that accurate",
      "that correct",
      "that right",
      "that true",
      "confirm",
      "verify",
      "double check",
      "check again",
      "recheck",
      "make sure",
      "certain about",
      "confident in",
      "trust that",
      "believe that",
      "think that's",
      "seems right",
      "looks right",
      "sounds right",
      "feels right"
    ];
    
    return followUpPatterns.some(pattern => 
      text.toLowerCase().includes(pattern.toLowerCase())
    );
  }

  isQuestion(text) {
    return (
      text.includes("?") ||
      text.startsWith("what") ||
      text.startsWith("how") ||
      text.startsWith("when") ||
      text.startsWith("where") ||
      text.startsWith("why") ||
      text.startsWith("who") ||
      text.startsWith("is") ||
      text.startsWith("can") ||
      text.startsWith("should") ||
      text.startsWith("would") ||
      text.startsWith("could")
    );
  }

  hasFinancialContext(text) {
    const financialContextPatterns = [
      /\b(up|down|rise|fall|increase|decrease|gain|loss|drop|climb|surge|plunge|rally|crash)\b/gi,
      /\b(performance|performing|outperform|underperform|beat|miss|estimate|target)\b/gi,
      /\b(investment|trading|portfolio|market|stock|crypto|bitcoin|ethereum)\b/gi,
      /\b(buy|sell|hold|purchased|sold|bought)\b/gi,
    ];

    return financialContextPatterns.some((pattern) => pattern.test(text));
  }

  hasTemporalContext(text) {
    const temporalPatterns = [
      /\b(last|this|next|past|previous|recent|recently|lately|yesterday|today|tomorrow)\s+(week|month|year|quarter|day|days|weeks|months|years)\b/gi,
      /\b(week|month|year|quarter|day|days|weeks|months|years)\s+(ago|back)\b/gi,
      /\b(ytd|year to date|month to date|week to date)\b/gi,
      /\b(q1|q2|q3|q4|first quarter|second quarter|third quarter|fourth quarter)\b/gi,
    ];

    return temporalPatterns.some((pattern) => pattern.test(text));
  }

  hasStockQueryPattern(text) {
    const stockQueryPatterns = [
      /how('s|s| is) [a-z]+ doing/gi,
      /what('s| is) [a-z]+ (at|doing|trading)/gi,
      /(aapl|msft|googl|tsla|amzn|meta|nvda|bitcoin|ethereum|btc|eth) (price|doing|trading|cost|worth)/gi,
      /how('s|s| is) (the )?market/gi,
      /what('s| about) (the )?(price of|cost of)/gi,
      /(give me|show me|tell me) (the )?(price|cost|value) of/gi,
    ];

    return stockQueryPatterns.some((pattern) => pattern.test(text));
  }

  getFinancialIntentType(text) {
    const normalizedText = text.toLowerCase();

    if (
      normalizedText.includes("price") ||
      normalizedText.includes("cost") ||
      normalizedText.includes("worth")
    ) {
      return "price_inquiry";
    }

    if (normalizedText.includes("buy") || normalizedText.includes("purchase")) {
      return "buy_intent";
    }

    if (normalizedText.includes("sell")) {
      return "sell_intent";
    }

    if (
      normalizedText.includes("analysis") ||
      normalizedText.includes("analyze")
    ) {
      return "analysis_request";
    }

    if (normalizedText.includes("news") || normalizedText.includes("update")) {
      return "news_request";
    }

    if (normalizedText.includes("compare") || normalizedText.includes("vs")) {
      return "comparison";
    }

    if (
      normalizedText.includes("portfolio") ||
      normalizedText.includes("allocation")
    ) {
      return "portfolio_management";
    }

    if (
      normalizedText.includes("dividend") ||
      normalizedText.includes("earnings")
    ) {
      return "fundamental_data";
    }

    return "general_financial";
  }

  shouldAllowResponse(classification, confidence, contextScore = 0) {
    // STRICT FINANCIAL ONLY - Require 0.8 confidence threshold
    if (classification === "financial" && confidence >= 0.8) {
      return { allow: true, reason: "High-confidence financial query" };
    }

    if (classification === "greeting" && confidence >= 0.8) {
      return { allow: true, reason: "Clear greeting message" };
    }

    // Allow ambiguous queries only with very strong financial context
    if (
      classification === "ambiguous" &&
      contextScore >= 10 &&
      confidence >= 0.7
    ) {
      return {
        allow: true,
        reason: "Ambiguous query with very strong financial context",
      };
    }

    // BLOCK EVERYTHING ELSE - including low-confidence financial queries
    if (classification === "financial" && confidence < 0.8) {
      return {
        allow: false,
        reason: "Financial query but confidence below 0.8 threshold",
      };
    }

    return {
      allow: false,
      reason: "Non-financial or ambiguous query - strict financial-only policy",
    };
  }

  analyzeConversationContext(conversationHistory) {
    console.log(`[IntentClassifier] Analyzing conversation context. History length: ${conversationHistory?.length || 0}`);
    console.log(`[IntentClassifier] Conversation history:`, conversationHistory);
    
    if (!conversationHistory || conversationHistory.length === 0) return 0;

    let contextScore = 0;
    const recentMessages = conversationHistory.slice(-5); // Look at last 5 messages

    recentMessages.forEach((msg, index) => {
      const text = msg.query || msg.message || msg.content || "";
      const normalizedText = text.toLowerCase();
      
      console.log(`[IntentClassifier] Analyzing message ${index}: "${text}"`);

      // Check for financial keywords in history
      const financialMatches = this.financialKeywords.filter((keyword) =>
        normalizedText.includes(keyword),
      );

      // Check for stock/crypto symbols
      const hasStockSymbol = this.stockSymbolPattern.test(text);
      const hasCryptoSymbol = this.cryptoPattern.test(text);

      // Score based on recency and relevance
      const messageAge = index + 1; // More recent messages have lower age
      const recencyMultiplier = messageAge <= 2 ? 2 : 1; // Recent messages get 2x weight

      console.log(`[IntentClassifier] Message analysis - Financial matches: ${financialMatches.length}, Stock: ${hasStockSymbol}, Crypto: ${hasCryptoSymbol}, Age: ${messageAge}, Multiplier: ${recencyMultiplier}`);

      if (financialMatches.length > 0) {
        const matchScore = financialMatches.length * recencyMultiplier;
        contextScore += matchScore;
        console.log(`[IntentClassifier] Added ${matchScore} points for financial keywords: ${financialMatches.slice(0, 3).join(', ')}`);
      }
      if (hasStockSymbol) {
        const stockScore = 3 * recencyMultiplier;
        contextScore += stockScore;
        console.log(`[IntentClassifier] Added ${stockScore} points for stock symbols`);
      }
      if (hasCryptoSymbol) {
        const cryptoScore = 3 * recencyMultiplier;
        contextScore += cryptoScore;
        console.log(`[IntentClassifier] Added ${cryptoScore} points for crypto symbols`);
      }
    });

    console.log(`[IntentClassifier] Final context score: ${contextScore}`);
    return contextScore;
  }
}

module.exports = IntentClassifier;
