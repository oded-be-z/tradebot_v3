const axios = require('axios');
const logger = require('../utils/logger');
require('dotenv').config();
// Agent 1: Pipeline logging
const pipelineLogger = require('../utils/pipelineLogger');

class AzureOpenAIService {
  constructor(rateLimiter = null) {
    // Extract deployment and construct proper endpoint
    const baseEndpoint = process.env.AZURE_OPENAI_BASE_URL || 'https://brn-azai.cognitiveservices.azure.com';
    this.deployment = process.env.AZURE_OPENAI_DEPLOYMENT || 'gpt-4o';
    this.apiVersion = process.env.AZURE_OPENAI_API_VERSION || '2024-10-21';
    
    // Construct endpoint in proper format
    this.endpoint = process.env.AZURE_OPENAI_ENDPOINT || 
      `${baseEndpoint}/openai/deployments/${this.deployment}/chat/completions?api-version=${this.apiVersion}`;
    
    this.apiKey = process.env.AZURE_OPENAI_KEY;
    this.timeout = 10000; // 10 second timeout
    this.maxRetries = 2;
    
    // LLM-FIRST FIX: Accept rate limiter for controlled API calls
    this.rateLimiter = rateLimiter;
    
    if (!this.apiKey) {
      logger.warn('[AzureOpenAI] No API key found in AZURE_OPENAI_KEY environment variable');
    }
    
    logger.info('[AzureOpenAI] Service initialized');
    logger.info('[AzureOpenAI] Endpoint:', this.endpoint);
    logger.info('[AzureOpenAI] Using API version:', this.apiVersion);
    logger.info('[AzureOpenAI] Deployment:', this.deployment);
    if (this.rateLimiter) {
      logger.info('[AzureOpenAI] Rate limiter configured');
    }
  }

  // LLM-FIRST FIX: Increased temperature from 0.1 to 0.7 for better creativity
  async makeRequest(messages, temperature = 0.7, maxTokens = 500) {
    const startTime = Date.now();
    let lastError = null;
    
    // LLM-FIRST: Warn about low temperatures that may produce lifeless responses
    if (temperature < 0.5) {
      logger.warn(`[LLM-FIRST] Low temperature detected: ${temperature} - this may produce lifeless responses`);
    }
    
    // Validate messages array
    if (!Array.isArray(messages) || messages.length === 0) {
      throw new Error('[AzureOpenAI] Invalid messages array: must be non-empty array');
    }
    
    // Validate each message has required fields
    for (const msg of messages) {
      if (!msg.role || !msg.content) {
        logger.error('[AzureOpenAI] Invalid message format:', msg);
        throw new Error('[AzureOpenAI] Each message must have role and content properties');
      }
      if (!['system', 'user', 'assistant'].includes(msg.role)) {
        logger.error('[AzureOpenAI] Invalid role:', msg.role);
        throw new Error(`[AzureOpenAI] Invalid role: ${msg.role}. Must be system, user, or assistant`);
      }
    }
    
    for (let retry = 0; retry <= this.maxRetries; retry++) {
      try {
        const requestBody = {
          messages,
          temperature,
          max_tokens: maxTokens,
          top_p: 0.95,
          frequency_penalty: 0,
          presence_penalty: 0
          // Note: 'model' parameter not needed as it's in the deployment URL
        };
        
        // Log request details for debugging
        logger.debug(`[AzureOpenAI] Making request to: ${this.endpoint}`);
        logger.debug(`[AzureOpenAI] API Key present:`, !!this.apiKey);
        logger.debug(`[AzureOpenAI] Number of messages:`, messages.length);
        logger.debug(`[AzureOpenAI] Request body: ${JSON.stringify(requestBody, null, 2)}`);
        
        // LLM-FIRST FIX: Use rate limiter if available to prevent 429 errors
        const response = await (this.rateLimiter 
          ? this.rateLimiter.schedule(() => axios.post(
              this.endpoint,
              requestBody,
              {
                headers: {
                  'api-key': this.apiKey,
                  'Content-Type': 'application/json'
                },
                timeout: this.timeout
              }
            ))
          : axios.post(
              this.endpoint,
              requestBody,
              {
                headers: {
                  'api-key': this.apiKey,
                  'Content-Type': 'application/json'
                },
                timeout: this.timeout
              }
            )
        );

        const latency = Date.now() - startTime;
        logger.debug(`[AzureOpenAI] Request completed in ${latency}ms`);
        
        return response.data.choices[0].message.content;
      } catch (error) {
        lastError = error;
        
        // Enhanced error logging
        logger.error(`[AzureOpenAI] Request failed (attempt ${retry + 1}/${this.maxRetries + 1}):`, error.message);
        logger.error('[AzureOpenAI] Full error:', error.response?.data || error.message);
        logger.error('[AzureOpenAI] Error status:', error.response?.status);
        logger.error('[AzureOpenAI] Failed request body:', JSON.stringify({
          messages,
          temperature,
          max_tokens: maxTokens,
          top_p: 0.95,
          frequency_penalty: 0,
          presence_penalty: 0
        }, null, 2));
        
        // Log specific Azure OpenAI error details
        if (error.response?.data?.error) {
          logger.error('[AzureOpenAI] Azure error details:', JSON.stringify(error.response.data.error, null, 2));
          
          // Handle content filter errors specifically
          if (error.response.data.error.code === 'content_filter') {
            logger.warn('[AzureOpenAI] Content filter triggered - will retry with simplified prompt');
            // Don't retry with same prompt - it will fail again
            throw new Error('CONTENT_FILTER_ERROR');
          }
        }
        
        if (retry < this.maxRetries) {
          await new Promise(resolve => setTimeout(resolve, 1000 * (retry + 1)));
        }
      }
    }
    
    throw lastError;
  }

  async classifyIntent(query, conversationHistory = []) {
    try {
      // Add debug logging
      logger.info(`[AzureOpenAI] Classifying intent for query: "${query}"`);
      
      const systemPrompt = `You are Max, a friendly financial assistant. Classify the user's query into one of these categories while being mindful of their intent and emotional state:

CRITICAL PRIORITY RULES:
1. If the query contains ANY of these patterns, IMMEDIATELY return "date_time_query":
   - "what date" (in any form)
   - "what time" (in any form)
   - "current date"
   - "current time"
   - "today's date"
   - "what day"
   - ANY question explicitly asking about date or time

2. IGNORE any stock symbols that might match date/time words (DATE, TIME, NOW, DAY)

Examples that MUST return "date_time_query":
- "what date is it now?" → date_time_query
- "what time is it?" → date_time_query
- "what's today's date?" → date_time_query
- "current time please" → date_time_query
- "tell me what date it is" → date_time_query

ONLY AFTER checking for date/time, classify into these categories:
- stock_query: Questions about specific stocks, prices, or market data
- comparison_query: Comparing two or more stocks/assets
- trend_query: Questions about trends, forecasts, or historical movements
- portfolio_query: Questions about portfolio analysis or optimization
- general_question: Non-financial questions

Respond with ONLY the category name, nothing else.`;

      const conversationContext = conversationHistory.slice(-4).map(msg => 
        `${msg.role}: ${msg.content}`
      ).join('\n');

      const userMessage = conversationContext 
        ? `Recent conversation:\n${conversationContext}\n\nCurrent query: ${query}`
        : query;

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ];

      // LLM-FIRST FIX: Temperature 0.7 for natural classification
      const intent = await this.makeRequest(messages, 0.7, 20);
      const cleanIntent = intent.trim().toLowerCase().replace(/['"]/g, '');
      
      logger.info(`[AzureOpenAI] Query: "${query}" classified as: ${cleanIntent}`);
      
      // Fallback pattern matching for date/time queries
      const dateTimePatterns = [
        /what\s+(date|time|day)\s+(is\s+it)?/i,
        /what['']?s\s+(the\s+)?(date|time|day)/i,
        /current\s+(date|time)/i,
        /today['']?s\s+date/i,
        /tell\s+me\s+(the\s+)?(date|time)/i
      ];
      
      if (dateTimePatterns.some(pattern => pattern.test(query))) {
        logger.info(`[AzureOpenAI] Fallback pattern matched for date/time query: "${query}"`);
        return 'date_time_query';
      }
      
      return cleanIntent;
    } catch (error) {
      logger.error('[AzureOpenAI] Intent classification failed:', error.message);
      return null; // Will trigger fallback
    }
  }

  async extractStockSymbols(query, conversationHistory = []) {
    try {
      const systemPrompt = `You are a stock symbol extractor. Extract stock symbols from the user's query.

Rules:
1. For explicit symbols (AAPL, MSFT, BTC), extract them
2. For company names, convert to symbols (Apple → AAPL, Microsoft → MSFT)
3. For "them", "these", "those" - look at conversation history for recently mentioned symbols
4. For commodities: oil → CL, gold → GC, silver → SI, natural gas → NG, nat gas → NG
   IMPORTANT: NEVER use XAU or XAG - always use GC for gold and SI for silver
5. For crypto: bitcoin → BTC, ethereum → ETH

IMPORTANT INDEX/ETF MAPPINGS:
- "S&P 500", "S&P", "SP500" → SPY
- "Nasdaq", "nasdaq 100", "nasdaq index" → QQQ  
- "Dow Jones", "Dow", "DJIA", "dow jones index" → DIA
- "Russell 2000" → IWM
- "VIX", "volatility index" → VXX
- "Total market", "total stock market" → VTI

STOCK GROUP MAPPINGS:
- "FAANG" or "FAANG stocks" → META,AAPL,AMZN,NFLX,GOOGL
- "MAMAA" → META,AAPL,MSFT,AMZN,GOOGL
- "tech stocks" or "technology stocks" or "tech sector" → AAPL,MSFT,GOOGL,AMZN,META,NVDA,TSLA,INTC,AMD,CRM,ORCL,ADBE
- "tech stocks comparison" → AAPL,MSFT,GOOGL,AMZN,META,NVDA (return top 6 for comparison)
- "semiconductor stocks" or "chip stocks" → NVDA,AMD,INTC,QCOM,AVGO,MU,TSM,ASML
- "AI stocks" or "artificial intelligence stocks" → NVDA,MSFT,GOOGL,META,CRM,PLTR,AI,PATH
- "EV stocks" or "electric vehicle stocks" → TSLA,RIVN,LCID,NIO,LI,XPEV,FSR,GOEV
- "bank stocks" or "banking stocks" or "financial stocks" → JPM,BAC,WFC,C,GS,MS,USB,PNC,TFC,COF
- "crypto" or "crypto market" or "cryptocurrency" → BTC,ETH,BNB,SOL,ADA,XRP,DOGE,AVAX
- "energy stocks" or "oil stocks" → XOM,CVX,COP,OXY,SLB,HAL,BKR,MPC
- "retail stocks" → AMZN,WMT,HD,COST,TGT,LOW,TJX,ROST
- "healthcare stocks" or "pharma stocks" → JNJ,UNH,PFE,ABBV,TMO,ABT,CVS,LLY

CRITICAL COMMODITY RULES:
- Gold: ALWAYS return "GC", NEVER "XAU", "GOLD", or "XAUUSD"
- Silver: ALWAYS return "SI", NEVER "XAG", "SILVER", or "XAGUSD"
- Oil: ALWAYS return "CL", NEVER "WTI" or "BRENT"

Return ONLY a comma-separated list of symbols (e.g., "AAPL,MSFT") or "NONE" if no symbols found.`;

      const conversationContext = conversationHistory.slice(-6).map(msg => 
        `${msg.role}: ${msg.content}`
      ).join('\n');

      const userMessage = conversationContext 
        ? `Recent conversation:\n${conversationContext}\n\nCurrent query: ${query}`
        : query;

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ];

      // LLM-FIRST FIX: Temperature 0.7 for symbol extraction
      const response = await this.makeRequest(messages, 0.7, 50);
      const cleanResponse = response.trim().toUpperCase();
      
      if (cleanResponse === 'NONE' || !cleanResponse) {
        logger.debug(`[AzureOpenAI] No symbols extracted from: "${query}"`);
        return [];
      }

      const symbols = cleanResponse.split(',').map(s => s.trim()).filter(s => s);
      logger.debug(`[AzureOpenAI] Extracted symbols: ${symbols.join(', ')} from: "${query}"`);
      return symbols;
    } catch (error) {
      logger.error('[AzureOpenAI] Symbol extraction failed:', error.message);
      return []; // Will trigger fallback
    }
  }

  async shouldGenerateChart(query, queryType) {
    try {
      // Some query types always need charts
      if (['comparison_query', 'trend_query', 'portfolio_query'].includes(queryType)) {
        return true;
      }

      const systemPrompt = `Does this financial query need a chart visualization? 
Query: "${query}"

Respond with only "YES" or "NO".`;

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: query }
      ];

      // LLM-FIRST FIX: Temperature 0.7 for chart decision
      const response = await this.makeRequest(messages, 0.7, 10);
      const needsChart = response.trim().toUpperCase() === 'YES';
      
      logger.debug(`[AzureOpenAI] Chart needed for "${query}": ${needsChart}`);
      return needsChart;
    } catch (error) {
      logger.error('[AzureOpenAI] Chart determination failed:', error.message);
      // Default based on keywords
      return query.toLowerCase().match(/chart|graph|trend|compare|visual/);
    }
  }

  // Pre-generation validation to ensure prompts will prevent banned phrases
  validatePromptConfiguration(queryType, systemPrompt) {
    const validation = {
      isValid: true,
      issues: [],
      warnings: []
    };
    
    // Check system prompt includes banned phrases list
    const requiredBannedPhrases = [
      'let me know',
      'feel free',
      'I\'m here to',
      'Want me to',
      'Curious about',
      'Should I',
      'Would you like',
      'Interested in'
    ];
    
    const promptLower = systemPrompt.toLowerCase();
    const missingBannedPhrases = requiredBannedPhrases.filter(phrase => 
      !promptLower.includes(phrase.toLowerCase())
    );
    
    if (missingBannedPhrases.length > 0) {
      validation.warnings.push(`System prompt missing banned phrases: ${missingBannedPhrases.join(', ')}`);
    }
    
    // Check for guidelines section
    if (!promptLower.includes('important guidelines')) {
      validation.issues.push('System prompt missing guidelines section');
      validation.isValid = false;
    }
    
    // Check for NO QUESTIONS directive
    if (!promptLower.includes('no questions')) {
      validation.issues.push('System prompt missing NO QUESTIONS directive');
      validation.isValid = false;
    }
    
    // Validate temperature settings
    const criticalTypes = ['greeting', 'portfolio_analysis', 'portfolio_query'];
    if (criticalTypes.includes(queryType)) {
      logger.debug(`[AzureOpenAI] Validation: ${queryType} requires ZERO temperature`);
    }
    
    // Log validation results
    if (!validation.isValid) {
      logger.error('[AzureOpenAI] Prompt validation failed:', validation);
    } else if (validation.warnings.length > 0) {
      logger.warn('[AzureOpenAI] Prompt validation warnings:', validation.warnings);
    }
    
    return validation;
  }

  async enhanceResponse(rawData, queryType, originalQuery, conversationHistory = [], portfolioContext = null, conversationState = null) {
    try {
      logger.debug(`[AzureOpenAI] enhanceResponse called with queryType: ${queryType}, query: ${originalQuery}`);
      
      // LLM-FIRST FIX: Use consistent temperature 0.7 for all query types
      // This allows the LLM to be more creative and natural
      let temperature = 0.7; // Higher temperature for better creativity
      
      // No more query-type specific temperatures - trust the LLM!
      // Previously we used 0.0-0.2 which made responses robotic
      
      // Dynamic token limits for concise responses
      const tokenLimits = {
        'greeting': 100,              // ~50-80 chars
        'price_query': 100,           // ~100-150 chars  
        'comparison': 200,            // ~200-300 chars
        'comparison_query': 200,      // ~200-300 chars
        'portfolio_analysis': 300,    // ~300-400 chars max
        'portfolio_query': 300,       // ~300-400 chars max
        'trend_query': 150,           // ~150-200 chars
        'trend_analysis': 150,        // ~150-200 chars
        'general_response': 150,      // ~150-200 chars
        'date_time_query': 50,        // ~50 chars
        'company_info': 150,          // ~150 chars
        'standard_analysis': 150,     // ~150-200 chars
        'investment_advice': 150,     // ~150-200 chars
        'default': 150                // ~150 chars
      };
      
      const maxTokens = tokenLimits[queryType] || tokenLimits['default'];
      logger.debug(`[AzureOpenAI] Using temperature ${temperature} and max_tokens ${maxTokens} for queryType: ${queryType}`);
      
      // For simple date/time responses, don't enhance
      if (queryType === 'date_time_query') {
        return rawData;
      }

      // Build comprehensive portfolio context if available
      let portfolioPrompt = '';
      if (portfolioContext && portfolioContext.portfolio && portfolioContext.portfolioMetrics) {
        const holdings = portfolioContext.portfolio.map(h => {
          const allocation = portfolioContext.portfolioMetrics.allocation.find(a => a.symbol === h.symbol);
          return `- ${h.symbol}: ${h.shares} shares (${allocation?.percent || '0'}% of portfolio, worth $${h.currentPrice.toFixed(2)} each, ${h.changePercent >= 0 ? '+' : ''}${h.changePercent}% ${h.changePercent >= 0 ? 'gain' : 'loss'})`;
        }).join('\n');
        
        portfolioPrompt = `User has this portfolio:
${holdings}
Total value: $${portfolioContext.portfolioMetrics.totalValue.toLocaleString()}
Total return: ${portfolioContext.portfolioMetrics.totalGainPercent >= 0 ? '+' : ''}${portfolioContext.portfolioMetrics.totalGainPercent}%

`;
      }

      // Special handling for portfolio analysis
      const isPortfolioQuery = queryType === 'portfolio_query' || 
                              originalQuery.toLowerCase().includes('portfolio') ||
                              originalQuery.toLowerCase().includes('holdings') ||
                              originalQuery.toLowerCase().includes('my investments') ||
                              (portfolioContext && originalQuery.toLowerCase().includes('my'));

      // Build conversation memory context
      let memoryContext = '';
      if (conversationState) {
        memoryContext = '\n\nCONVERSATION CONTEXT:\n';
        
        // Last discussed symbol and topic
        if (conversationState.conversationFlow?.lastDiscussedSymbol) {
          memoryContext += `- Last discussed: ${conversationState.conversationFlow.lastDiscussedSymbol}\n`;
          memoryContext += `- Previous topic: "${conversationState.conversationFlow.lastDiscussedTopic}"\n`;
        }
        
        // Charts shown
        if (conversationState.conversationFlow?.shownCharts && conversationState.conversationFlow.shownCharts.size > 0) {
          memoryContext += `- Charts shown: ${Array.from(conversationState.conversationFlow.shownCharts).join(', ')}\n`;
        }
        
        // Discussed symbols with details
        const discussedSymbols = Object.entries(conversationState.discussedSymbols);
        if (discussedSymbols.length > 0) {
          memoryContext += '\nDETAILED HISTORY:\n';
          discussedSymbols.forEach(([symbol, info]) => {
            memoryContext += `- ${symbol}: Price $${info.priceDiscussed}`;
            if (info.chartShown) memoryContext += ', chart shown';
            if (info.analysisGiven) memoryContext += `, ${info.analysisGiven} analysis`;
            memoryContext += '\n';
          });
        }
        
        memoryContext += `\nCAPABILITIES: You have ${conversationState.capabilities.historicalDataDays} days of historical data.\n`;
        memoryContext += '\nUSE THIS CONTEXT: If user says "trend", "longer term", "more info" - assume they mean about ' + 
                        (conversationState.conversationFlow?.lastDiscussedSymbol || 'the last discussed topic') + '.';
      }
      
      // ULTRA STRICT FORMATTING PROMPT
      const ULTRA_STRICT_PROMPT = `SYSTEM CRITICAL: You are Max, FinanceBot Pro premium assistant.${memoryContext}

⚠️ MANDATORY COMPLIANCE CHECKLIST - YOUR RESPONSE WILL BE REJECTED UNLESS IT HAS ALL:

□ 1. Start with emoji: 📊 (prices) 📈 (trends) 💰 (portfolio) 🎯 (analysis) ⚔️ (comparison)
□ 2. Make ALL stock symbols **BOLD** (e.g., **AAPL**, **BTC**, **MSFT**)
□ 3. Include at least ONE bullet point using • character
□ 4. End with EXACTLY: "Want me to [specific action]?"
□ 5. Keep main response under 150 characters

VALID RESPONSE TEMPLATE:
📊 **{SYMBOL}** trading at $[PRICE], [CHANGE]% [EMOJI]
• [KEY_INSIGHT]
• [TECHNICAL_SIGNAL]
Want me to [SPECIFIC_ACTION]?

EXAMPLES OF COMPLIANT RESPONSES:
✓ "📊 **AAPL** at $180.25, up 2.3% 📈\\n• Volume: 58M (above avg)\\n• RSI: 68 (overbought)\\nWant me to set price alerts?"
✓ "💰 Portfolio up 12.5% ($45,230) 📈\\n• **NVDA** leading (+45%)\\n• **CASH** too high (40%)\\nWant me to suggest rebalancing?"
✓ "📈 **BTC** broke $45K resistance 🔥\\n• Next target: $47K\\n• Support: $43.5K\\nWant me to analyze the trend?"

INVALID RESPONSES (WILL BE REJECTED):
❌ "AAPL is at $180" (missing emoji, bold, bullets, proper ending)
❌ "The stock is up. Let me know..." (wrong format entirely)
❌ Any response without ALL 5 checkboxes checked

PENALTY: Non-compliant responses will be automatically reformatted.`;
      
      const systemPrompt = isPortfolioQuery ? 
        ULTRA_STRICT_PROMPT + `\n\nPortfolio context: ${portfolioPrompt}\nFocus on their actual holdings with specific percentages and recommendations.` :
        ULTRA_STRICT_PROMPT + `\n\n${portfolioPrompt ? 'The user has a portfolio that you should consider when responding.' : ''}`;

      // Validate prompt configuration
      const validation = this.validatePromptConfiguration(queryType, systemPrompt);
      if (!validation.isValid) {
        logger.error(`[AzureOpenAI] Critical prompt validation failure for ${queryType}`);
      }

      // Check if a chart was recently shown
      let chartContext = '';
      if (conversationHistory && conversationHistory.length > 0) {
        const recentChart = conversationHistory.slice(-3).find(msg => 
          msg.role === 'assistant' && 
          msg.content && 
          msg.content.includes('[Chart displayed:')
        );
        
        if (recentChart && originalQuery.toLowerCase().includes('chart')) {
          const chartMatch = recentChart.content.match(/\[Chart displayed: ([^\]]+)\]/);
          if (chartMatch) {
            chartContext = `\n\nContext: A chart for ${chartMatch[1]} was recently displayed.`;
          }
        }
      }
      
      const userMessage = portfolioPrompt ? 
        `${portfolioPrompt}User asks: "${originalQuery}"${chartContext}

Answer in 1-2 short sentences (under 150 chars total). Be specific about their holdings.` :
        `Query: "${originalQuery}"
Data: ${JSON.stringify(rawData, null, 2)}${chartContext}

Answer in 1-2 short sentences (under 150 chars total). Be direct and helpful.`;

      // Build messages array with full conversation history
      const messages = [
        { role: "system", content: systemPrompt }
      ];
      
      // Add conversation history if available
      if (conversationHistory && conversationHistory.length > 0) {
        // Include only last 3 messages to avoid content filter issues
        const recentHistory = conversationHistory.slice(-3).map(msg => {
          // Clean up chart metadata before sending to API
          if (msg.role === 'assistant' && msg.content) {
            const cleanContent = msg.content.replace(/\n\[Chart displayed:[^\]]+\]/g, '');
            return { ...msg, content: cleanContent };
          }
          return msg;
        });
        messages.push(...recentHistory);
      }
      
      // Add current query
      messages.push({ role: "user", content: userMessage });
      
      // Add debug logging
      logger.debug(`[AzureOpenAI] Enhancing response with conversation history: ${conversationHistory.length} messages`);
      logger.debug(`[AzureOpenAI] Enhancing response with portfolio context: ${!!portfolioPrompt}`);

      const enhanced = await this.makeRequest(messages, temperature, maxTokens);
      
      // Enforce brevity and remove banned phrases
      const cleanedResponse = this.enforceResponseBrevity(enhanced, queryType);
      
      logger.debug(`[AzureOpenAI] Response enhanced with personality for query type: ${queryType}`);
      return cleanedResponse;
    } catch (error) {
      logger.error('[AzureOpenAI] Response enhancement failed:', error.message);
      
      // If content filter error, try with simplified approach
      if (error.message === 'CONTENT_FILTER_ERROR') {
        logger.warn('[AzureOpenAI] Attempting simplified response generation');
        try {
          // Create a minimal prompt without conversation history
          const simplifiedMessages = [
            { 
              role: "system", 
              content: "You are Max, a financial advisor. Keep responses brief and factual. No questions at the end."
            },
            { 
              role: "user", 
              content: `${originalQuery}\nData: ${JSON.stringify(rawData)}\nRespond in 1-2 sentences.`
            }
          ];
          
          // LLM-FIRST FIX: Temperature 0.7 even for fallback
          const fallbackResponse = await this.makeRequest(simplifiedMessages, 0.7, 100);
          return this.enforceResponseBrevity(fallbackResponse, queryType);
        } catch (fallbackError) {
          logger.error('[AzureOpenAI] Fallback also failed:', fallbackError.message);
          // Return a safe local response
          if (rawData && typeof rawData === 'string') {
            return rawData.substring(0, 150);
          }
          return "Market data available. Please try again.";
        }
      }
      
      return rawData; // Return original if enhancement fails
    }
  }

  async resolveAmbiguity(query, possibleInterpretations) {
    try {
      const systemPrompt = `The user query "${query}" is ambiguous. It could mean:
${possibleInterpretations.map((p, i) => `${i + 1}. ${p}`).join('\n')}

Generate a clarifying question to ask the user. Be brief and specific.`;

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: "Generate clarification question" }
      ];

      // LLM-FIRST FIX: Temperature 0.7 for comparisons
      const response = await this.makeRequest(messages, 0.7, 100);
      return response.trim();
    } catch (error) {
      logger.error('[AzureOpenAI] Ambiguity resolution failed:', error.message);
      return `Did you mean ${possibleInterpretations.join(' or ')}?`;
    }
  }

  // NEW COMPREHENSIVE ANALYZER - THE PRIMARY BRAIN OF THE SYSTEM
  async analyzeQuery(query, conversationHistory = [], conversationState = null) {
    // Build memory context for analysis
    let memoryContext = '';
    if (conversationState && conversationState.discussedSymbols) {
      const symbols = Object.keys(conversationState.discussedSymbols);
      if (symbols.length > 0) {
        memoryContext = `\nREMEMBER: Already discussed ${symbols.join(', ')} in this conversation.`;
      }
    }
    
    // CRITICAL: Add last discussed symbol context for vague queries
    if (conversationState && conversationState.conversationFlow && conversationState.conversationFlow.lastDiscussedSymbol) {
      memoryContext += `\nLAST DISCUSSED SYMBOL: ${conversationState.conversationFlow.lastDiscussedSymbol}`;
      memoryContext += `\nIMPORTANT: For vague queries like "what's the trend?", "should I buy?", "show me more", ALWAYS refer to ${conversationState.conversationFlow.lastDiscussedSymbol}`;
    }
    
    const systemPrompt = `You are Max, a warm and helpful financial assistant. Analyze queries and return JSON while understanding the user's emotional context and needs. Be friendly and conversational while maintaining accuracy.${memoryContext}

CRITICAL VAGUE QUERY HANDLING:
If the query is vague (like "what's the trend?", "should I buy?", "how is it doing?") and does NOT explicitly mention a specific symbol, you MUST return an empty symbols array []. DO NOT infer symbols from conversation history for vague queries. The system handles context automatically.

Important classification rules:

1. Greetings are part of financial service:
   - "hi", "hello", "hey" → isFinancial: true, intent: "greeting"
   - "good morning", "good afternoon", "good evening" → isFinancial: true, intent: "greeting"
   - "hi!", "hello!", "hey there" → isFinancial: true, intent: "greeting"
   - "howdy", "greetings", "yo" → isFinancial: true, intent: "greeting"
   - These are conversation starters, NOT non-financial queries!

2. HELP/CAPABILITY QUERIES ARE FINANCIAL SERVICES
   - "what can you do?" → isFinancial: true, intent: "help_query"
   - "help" → isFinancial: true, intent: "help_query"
   - "what do you help with?" → isFinancial: true, intent: "help_query"
   - "how can you help me?" → isFinancial: true, intent: "help_query"

3. DATE/TIME QUERIES ARE FINANCIAL SERVICES
   - "what date is it now?" → isFinancial: true, intent: "date_time_query"
   - "what time is it?" → isFinancial: true, intent: "date_time_query"
   - "current date" → isFinancial: true, intent: "date_time_query"
   - These are FINANCIAL SERVICES we provide to traders

4. PRICE QUERIES - SIMPLE PRICE REQUESTS
   - "AAPL price" → intent: "analysis_query", symbols: ["AAPL"]
   - "what is AAPL" → intent: "analysis_query", symbols: ["AAPL"]
   - "AAPL stock price" → intent: "analysis_query", symbols: ["AAPL"]
   - "price of AAPL" → intent: "analysis_query", symbols: ["AAPL"]
   - "how much is AAPL" → intent: "analysis_query", symbols: ["AAPL"]
   - "AAPL current price" → intent: "analysis_query", symbols: ["AAPL"]
   - "show me AAPL" → intent: "analysis_query", symbols: ["AAPL"]
   - "AAPL quote" → intent: "analysis_query", symbols: ["AAPL"]
   - "AAPL at?" → intent: "analysis_query", symbols: ["AAPL"]
   - "AAPL trading at" → intent: "analysis_query", symbols: ["AAPL"]
   - Keywords: price, quote, "at?", "trading at", "how much", "show me" → ALL map to analysis_query

5. TREND QUERIES - MUST RECOGNIZE VARIOUS PHRASINGS
   - "apple direction" → intent: "trend_query", symbols: ["AAPL"]
   - "AAPL movement" → intent: "trend_query", symbols: ["AAPL"]
   - "apple outlook" → intent: "trend_query", symbols: ["AAPL"]
   - "apple momentum" → intent: "trend_query", symbols: ["AAPL"]
   - "where is apple going" → intent: "trend_query", symbols: ["AAPL"]
   - "apple future" → intent: "trend_query", symbols: ["AAPL"]
   - "AAPL trend" → intent: "trend_query", symbols: ["AAPL"]
   - Keywords: direction, movement, outlook, momentum, future, trajectory, trend → ALL map to trend_query

6. ANALYSIS QUERIES - RECOGNIZE PERFORMANCE QUESTIONS
   - "how's apple doing" → intent: "analysis_query", symbols: ["AAPL"]
   - "apple performance" → intent: "analysis_query", symbols: ["AAPL"]
   - "how is AAPL performing" → intent: "analysis_query", symbols: ["AAPL"]
   - "AAPL status" → intent: "analysis_query", symbols: ["AAPL"]
   - "AAPL analysis" → intent: "analysis_query", symbols: ["AAPL"]
   - Keywords: how's, doing, performance, performing, status, analysis → ALL map to analysis_query

7. COMPARISON QUERIES - VARIOUS FORMATS
   - "AAPL or MSFT" → intent: "comparison_query", symbols: ["AAPL", "MSFT"]
   - "apple versus microsoft" → intent: "comparison_query", symbols: ["AAPL", "MSFT"]
   - "better: AAPL MSFT" → intent: "comparison_query", symbols: ["AAPL", "MSFT"]
   - "AAPL/MSFT" → intent: "comparison_query", symbols: ["AAPL", "MSFT"]
   - "AAPL v MSFT" → intent: "comparison_query", symbols: ["AAPL", "MSFT"]
   - "apple > microsoft?" → intent: "comparison_query", symbols: ["AAPL", "MSFT"]
   - Keywords: or, versus, vs, better, /, v, > → ALL indicate comparison_query

8. COMPANY QUESTIONS ARE FINANCIAL (BUT NOT CRYPTO!)
   - "who is the CEO of Apple?" → isFinancial: true, intent: "company_info", symbols: ["AAPL"]
   - "who runs Microsoft?" → isFinancial: true, intent: "company_info", symbols: ["MSFT"]
   - "when was Amazon founded?" → isFinancial: true, intent: "company_info", symbols: ["AMZN"]
   - IMPORTANT: Crypto (BTC, ETH, etc) are NOT companies! Use "investment_advice" or "trend_query"
   - "tell me about bitcoin" → intent: "investment_advice", NOT company_info!

9. COMMODITY SYMBOL MAPPING - CRITICAL
   - "gold" → symbols: ["GC"] (NEVER XAU)
   - "silver" → symbols: ["SI"] (NEVER XAG)
   - "oil" → symbols: ["CL"]
   - These are the ONLY correct commodity symbols to use

10. CONTEXT UNDERSTANDING - CRITICAL
   - "compare them" → Look at conversation history for last 2 mentioned symbols
   - "show me their trends" → Extract symbols from recent context
   - ALWAYS check conversation history for "them", "it", "these", "those"
   - If symbols were mentioned in previous messages, extract them!

11. CHART DETECTION - MUST RECOGNIZE
   - "show me NVDA chart" → intent: "trend_query", requiresChart: true
   - "Bitcoin trends" → intent: "trend_query", requiresChart: true
   - Keywords: chart, trend, graph, history, show → Always set requiresChart: true
   - "show me X chart" ALWAYS means trend_query with requiresChart: true

12. GROUP QUERIES - EXACT MAPPINGS
   - "FAANG stocks" → intent: "group_analysis", symbols: ["META","AAPL","AMZN","NFLX","GOOGL"]
   - "tech stocks comparison" → intent: "comparison_query", symbols: ["AAPL","MSFT","GOOGL","AMZN","META","NVDA"]
   - "analyze FAANG stocks" → intent: "group_analysis", symbols: ["META","AAPL","AMZN","NFLX","GOOGL"]
   - "tech stocks" → intent: "group_analysis", symbols: ["AAPL","MSFT","GOOGL","AMZN","META","NVDA"]

13. PORTFOLIO QUERIES - CRITICAL
   - "analyze my portfolio" → isFinancial: true, intent: "portfolio_query"
   - "review my holdings" → isFinancial: true, intent: "portfolio_query"
   - "how is my portfolio doing?" → isFinancial: true, intent: "portfolio_query"
   - "portfolio performance" → isFinancial: true, intent: "portfolio_query"
   - "my investments" → isFinancial: true, intent: "portfolio_query"
   - "upgrade my portfolio" → isFinancial: true, intent: "portfolio_query"
   - "help me with my portfolio" → isFinancial: true, intent: "portfolio_query"
   - "portfolio insights" → isFinancial: true, intent: "portfolio_query"
   - ANY mention of "my portfolio", "my holdings", "my investments" → portfolio_query

14. MARKET OVERVIEW QUERIES - GENERAL MARKET STATUS
   - "market overview" → isFinancial: true, intent: "market_overview", symbols: []
   - "how is the market" → isFinancial: true, intent: "market_overview", symbols: []
   - "market summary" → isFinancial: true, intent: "market_overview", symbols: []
   - "market status" → isFinancial: true, intent: "market_overview", symbols: []
   - "what's happening in the market" → isFinancial: true, intent: "market_overview", symbols: []
   - "market conditions" → isFinancial: true, intent: "market_overview", symbols: []
   - Keywords: market overview, market summary, market status → ALL map to market_overview

15. INVESTMENT QUESTIONS ARE FINANCIAL
   - "is bitcoin a good investment?" → isFinancial: true, intent: "investment_advice", symbols: ["BTC"]
   - "tell me about bitcoin" → isFinancial: true, intent: "investment_advice", symbols: ["BTC"]
   - "bitcoin?" → isFinancial: true, intent: "investment_advice", symbols: ["BTC"]
   - "what's ethereum?" → isFinancial: true, intent: "investment_advice", symbols: ["ETH"]
   - Always extract the symbol being asked about!

ONLY mark isFinancial: false for TRULY UNRELATED queries:
- Weather ("what's the weather?")
- Recipes ("how to make pasta?")
- Jokes ("tell me a joke")
- Personal advice ("relationship advice")
- Non-financial math ("what's 2+2?")
- General knowledge unrelated to companies ("who wrote Romeo and Juliet?")

ANY question about stocks, markets, investing, trading, portfolios, or capabilities is FINANCIAL.

EXAMPLES:
Query: "hi"
Response: {"intent": "greeting", "symbols": [], "isFinancial": true, "requiresChart": false}

Query: "hello!"
Response: {"intent": "greeting", "symbols": [], "isFinancial": true, "requiresChart": false}

Query: "what can you do?"
Response: {"intent": "help_query", "symbols": [], "isFinancial": true, "requiresChart": false}

Query: "help"
Response: {"intent": "help_query", "symbols": [], "isFinancial": true, "requiresChart": false}

Query: "what date is it now?"
Response: {"intent": "date_time_query", "symbols": [], "isFinancial": true, "requiresChart": false}

Query: "AAPL price"
Response: {"intent": "analysis_query", "symbols": ["AAPL"], "isFinancial": true, "requiresChart": false}

Query: "what is AAPL"
Response: {"intent": "analysis_query", "symbols": ["AAPL"], "isFinancial": true, "requiresChart": false}

Query: "AAPL stock price"
Response: {"intent": "analysis_query", "symbols": ["AAPL"], "isFinancial": true, "requiresChart": false}

Query: "who is the CEO of Apple?"  
Response: {"intent": "company_info", "symbols": ["AAPL"], "isFinancial": true, "companyInfoRequest": "CEO"}

Query: "show me NVDA chart"
Response: {"intent": "trend_query", "symbols": ["NVDA"], "isFinancial": true, "requiresChart": true}

Query: "compare gold and silver"
Response: {"intent": "comparison_query", "symbols": ["GC", "SI"], "isFinancial": true, "requiresChart": false}

Query: "gold vs silver"
Response: {"intent": "comparison_query", "symbols": ["GC", "SI"], "isFinancial": true, "requiresChart": false}

Query: "what's the weather?"
Response: {"intent": "non_financial", "symbols": [], "isFinancial": false, "requiresChart": false}

Query: "analyze my portfolio"
Response: {"intent": "portfolio_query", "symbols": [], "isFinancial": true, "requiresChart": false}

Query: "can u help me upgrade my portfolio?"
Response: {"intent": "portfolio_query", "symbols": [], "isFinancial": true, "requiresChart": false}

Query: "how are my investments doing?"
Response: {"intent": "portfolio_query", "symbols": [], "isFinancial": true, "requiresChart": false}

VAGUE QUERIES - CRITICAL (when no symbol is specified, leave symbols empty):
Query: "what's the trend?"
Response: {"intent": "trend_query", "symbols": [], "isFinancial": true, "requiresChart": false}

Query: "should I buy?"
Response: {"intent": "investment_advice", "symbols": [], "isFinancial": true, "requiresChart": false}

Query: "what do you think?"
Response: {"intent": "investment_advice", "symbols": [], "isFinancial": true, "requiresChart": false}

Query: "show me more"
Response: {"intent": "trend_query", "symbols": [], "isFinancial": true, "requiresChart": false}

Query: "how is it doing?"
Response: {"intent": "trend_query", "symbols": [], "isFinancial": true, "requiresChart": false}

Query: "what's happening?"
Response: {"intent": "trend_query", "symbols": [], "isFinancial": true, "requiresChart": false}

Query: "market overview"
Response: {"intent": "market_overview", "symbols": [], "isFinancial": true, "requiresChart": false}

Query: "how is the market"
Response: {"intent": "market_overview", "symbols": [], "isFinancial": true, "requiresChart": false}

CRITICAL RULE: For vague queries without explicit symbol mentions, ALWAYS return an empty symbols array [], even if symbols were discussed earlier in the conversation. The system will handle context automatically. DO NOT try to infer symbols from conversation history for vague queries.

Return ONLY valid JSON, no explanation.`;

    // Get formatted conversation with portfolio context
    const formattedHistory = this.formatConversationHistory(conversationHistory, true);
    
    // Build conversation context string
    const conversationContext = formattedHistory.map(msg => 
      `${msg.role}: ${msg.content}`
    ).join('\n');
    
    const userMessage = conversationContext 
      ? `Recent conversation:\n${conversationContext}\n\nCurrent query: ${query}`
      : query;

    const messages = [
      { role: 'system', content: systemPrompt },
      { role: 'user', content: userMessage }
    ];

    try {
      // LLM-FIRST FIX: Temperature 0.7 for natural analysis
      const content = await this.makeRequest(messages, 0.7, 150);
      
      // Try to parse JSON response
      try {
        // Handle potential markdown code blocks
        const jsonMatch = content.match(/```(?:json)?\s*([\s\S]*?)\s*```/) || 
                         content.match(/\{[\s\S]*\}/);
        const jsonStr = jsonMatch ? (jsonMatch[1] || jsonMatch[0]) : content;
        
        const analysis = JSON.parse(jsonStr);
        
        // Ensure all required fields
        const result = {
          intent: analysis.intent || 'stock_query',
          symbols: analysis.symbols || [],
          isFinancial: analysis.isFinancial !== false, // Default to true
          requiresChart: analysis.requiresChart || false,
          educationalTopic: analysis.educationalTopic || null,
          companyInfoRequest: analysis.companyInfoRequest || null,
          confidence: analysis.confidence || 0.8
        };
        
        logger.info('[Azure] Comprehensive query analysis:', {
          query: query.substring(0, 50) + '...',
          intent: result.intent,
          isFinancial: result.isFinancial,
          symbols: result.symbols
        });
        
        return result;
        
      } catch (parseError) {
        logger.error('[Azure] Failed to parse LLM JSON response:', content);
        
        // Fallback: try to extract intent from raw text
        const lowerContent = content.toLowerCase();
        if (lowerContent.includes('non_financial') || lowerContent.includes('non-financial')) {
          return {
            intent: 'non_financial',
            symbols: [],
            isFinancial: false,
            requiresChart: false,
            educationalTopic: null,
            companyInfoRequest: null,
            confidence: 0.7
          };
        }
        
        // Default to financial query
        return {
          intent: 'stock_query',
          symbols: [],
          isFinancial: true,
          requiresChart: false,
          educationalTopic: null,
          companyInfoRequest: null,
          confidence: 0.5
        };
      }
      
    } catch (error) {
      logger.error('[Azure] Comprehensive query analysis failed:', error.message);
      throw error; // Let the caller handle fallback
    }
  }

  // Helper method to format conversation history consistently
  formatConversationHistory(history, includePortfolioContext = false) {
    const messages = history.slice(-10).map(msg => {
      // Handle new format with role and content
      if (msg.role && msg.content) {
        return { role: msg.role, content: msg.content };
      }
      // Handle old format
      return {
        role: msg.role || 'user',
        content: msg.content || msg.message || msg
      };
    });
    
    // Add portfolio context if available
    if (includePortfolioContext) {
      const portfolioMsg = history.slice().reverse().find(msg => msg.portfolio);
      if (portfolioMsg && portfolioMsg.portfolio) {
        const p = portfolioMsg.portfolio;
        const holdings = p.topHoldings?.map(h => `${h.symbol} (${h.percent}%)`).join(', ') || '';
        messages.unshift({
          role: 'system',
          content: `User's portfolio: $${p.totalValue} total, ${p.holdings} holdings. Top positions: ${holdings}. Keep this context in mind.`
        });
      }
    }
    
    return messages;
  }

  enforceResponseBrevity(response, queryType) {
    if (!response) return response;
    
    // Log original response for debugging
    const originalLength = response.length;
    
    // Remove banned phrases - AGGRESSIVE enforcement
    const bannedPhrases = [
      /let me know how you'd like to proceed/gi,
      /let me know.*proceed/gi,
      /let me know[^.?]*/gi,
      /feel free to ask[^.?]*/gi,
      /i'm here to help[^.?]*/gi,
      /i'm here to[^.?]*/gi,
      /want me to\s*[^.?]*/gi,
      /curious about\s*[^.?]*/gi,
      /should i\s*[^.?]*\?/gi,
      /interested in\s*[^.?]*\?/gi,
      /would you like me to\s*[^.?]*\?/gi,
      /would you like[^.?]*\?/gi,
      /what's on your mind[^.?]*/gi,
      /anything else[^.?]*/gi,
      /any other[^.?]*\?/gi,
      /what would you[^.?]*\?/gi
    ];
    
    let cleaned = response;
    let phrasesRemoved = 0;
    bannedPhrases.forEach(phrase => {
      const beforeLength = cleaned.length;
      cleaned = cleaned.replace(phrase, '').trim();
      if (cleaned.length < beforeLength) {
        phrasesRemoved++;
      }
    });
    
    // Remove multiple spaces and clean up
    cleaned = cleaned.replace(/\s+/g, ' ').replace(/\.\s*\./g, '.').trim();
    
    // Fix price formatting (remove spaces in prices like "$158. 17")
    cleaned = cleaned.replace(/\$(\d+)\.\s+(\d+)/g, '$$$1.$2');
    cleaned = cleaned.replace(/\$(\d+),\s+(\d+)/g, '$$$1,$2');
    
    // Log if banned phrases were removed
    if (phrasesRemoved > 0) {
      logger.warn(`[AzureOpenAI] Removed ${phrasesRemoved} banned phrases from ${queryType} response`);
      logger.debug(`[AzureOpenAI] Original: "${response.substring(0, 100)}..."`);
      logger.debug(`[AzureOpenAI] Cleaned: "${cleaned.substring(0, 100)}..."`);
    }
    
    // Check sentence count for non-portfolio queries
    if (queryType !== 'portfolio_analysis' && queryType !== 'portfolio_query') {
      const sentences = cleaned.split(/[.!?]+/).filter(s => s.trim().length > 0);
      
      const sentenceLimits = {
        'greeting': 2,
        'price_query': 4,
        'comparison': 6,
        'trend_query': 5,
        'general_response': 5,
        'default': 6
      };
      
      const limit = sentenceLimits[queryType] || sentenceLimits['default'];
      
      if (sentences.length > limit) {
        // Keep only the allowed number of sentences
        cleaned = sentences.slice(0, limit).join('. ') + '.';
        logger.debug(`[AzureOpenAI] Truncated response from ${sentences.length} to ${limit} sentences for ${queryType}`);
      }
    }
    
    return cleaned;
  }
}

module.exports = new AzureOpenAIService();