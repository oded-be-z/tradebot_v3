const axios = require('axios');
const logger = require('../utils/logger');
require('dotenv').config();

class AzureOpenAIService {
  constructor() {
    this.endpoint = process.env.AZURE_OPENAI_ENDPOINT || 'https://brn-azai.cognitiveservices.azure.com/openai/deployments/gpt-4o/chat/completions?api-version=2025-01-01-preview';
    this.apiKey = process.env.AZURE_OPENAI_KEY;
    this.timeout = 10000; // 10 second timeout
    this.maxRetries = 2;
    
    logger.info('[AzureOpenAI] Service initialized');
  }

  async makeRequest(messages, temperature = 0.1, maxTokens = 500) {
    const startTime = Date.now();
    let lastError = null;
    
    for (let retry = 0; retry <= this.maxRetries; retry++) {
      try {
        const response = await axios.post(
          this.endpoint,
          {
            messages,
            temperature,
            max_tokens: maxTokens,
            top_p: 0.95,
            frequency_penalty: 0,
            presence_penalty: 0
          },
          {
            headers: {
              'api-key': this.apiKey,
              'Content-Type': 'application/json'
            },
            timeout: this.timeout
          }
        );

        const latency = Date.now() - startTime;
        logger.debug(`[AzureOpenAI] Request completed in ${latency}ms`);
        
        return response.data.choices[0].message.content;
      } catch (error) {
        lastError = error;
        logger.error(`[AzureOpenAI] Request failed (attempt ${retry + 1}/${this.maxRetries + 1}):`, error.message);
        
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

      const intent = await this.makeRequest(messages, 0.1, 20);
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

      const response = await this.makeRequest(messages, 0.1, 50);
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

      const response = await this.makeRequest(messages, 0.1, 10);
      const needsChart = response.trim().toUpperCase() === 'YES';
      
      logger.debug(`[AzureOpenAI] Chart needed for "${query}": ${needsChart}`);
      return needsChart;
    } catch (error) {
      logger.error('[AzureOpenAI] Chart determination failed:', error.message);
      // Default based on keywords
      return query.toLowerCase().match(/chart|graph|trend|compare|visual/);
    }
  }

  async enhanceResponse(rawData, queryType, originalQuery) {
    try {
      // For simple responses, don't enhance
      if (queryType === 'date_time_query' || queryType === 'general_question') {
        return rawData;
      }

      const systemPrompt = `You are Max, a warm and knowledgeable financial assistant. Think of yourself as a friend who happens to be great at finance.

CONVERSATIONAL STYLE RULES:
1. START with acknowledgment:
   - "Let me check that for you..."
   - "Great question about [ASSET]!"
   - "I'm on it! Looking at [ASSET] now..."
   - "Interesting choice! Let me pull up [ASSET]..."

2. USE transition phrases:
   - "Here's what I'm seeing..."
   - "Interestingly..."
   - "The story here is..."
   - "What stands out is..."

3. MINIMIZE bullets - use flowing paragraphs:
   - Instead of "• Support at $X • Resistance at $Y"
   - Write: "The key levels to watch are support at $X and resistance at $Y"
   - Only use bullets for 3+ items that truly need listing

4. END with engagement:
   - "Curious about [related topic]?"
   - "Want me to dig deeper into [aspect]?"
   - "Should I compare this with [similar asset]?"
   - "Interested in the technical analysis?"

5. Keep ALL numerical data exactly as provided
6. Be concise but warm (2-3 short paragraphs max)
7. Use simple language - no jargon unless necessary`;

      const userMessage = `Query: "${originalQuery}"
Data: ${JSON.stringify(rawData, null, 2)}

Provide a warm, enhanced response that feels like it's from a helpful friend.`;

      const messages = [
        { role: "system", content: systemPrompt },
        { role: "user", content: userMessage }
      ];

      const enhanced = await this.makeRequest(messages, 0.3, 400);
      
      logger.debug(`[AzureOpenAI] Response enhanced with personality for query type: ${queryType}`);
      return enhanced;
    } catch (error) {
      logger.error('[AzureOpenAI] Response enhancement failed:', error.message);
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

      const response = await this.makeRequest(messages, 0.3, 100);
      return response.trim();
    } catch (error) {
      logger.error('[AzureOpenAI] Ambiguity resolution failed:', error.message);
      return `Did you mean ${possibleInterpretations.join(' or ')}?`;
    }
  }

  // NEW COMPREHENSIVE ANALYZER - THE PRIMARY BRAIN OF THE SYSTEM
  async analyzeQuery(query, conversationHistory = []) {
    const systemPrompt = `You are Max, a warm and helpful financial assistant. Analyze queries and return JSON while understanding the user's emotional context and needs.

CRITICAL RULES:

1. GREETINGS ARE FINANCIAL SERVICES - CHECK THESE FIRST!
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

3. COMPANY QUESTIONS ARE FINANCIAL
   - "who is the CEO of Apple?" → isFinancial: true, intent: "company_info", symbols: ["AAPL"]
   - "who runs Microsoft?" → isFinancial: true, intent: "company_info", symbols: ["MSFT"]
   - "when was Amazon founded?" → isFinancial: true, intent: "company_info", symbols: ["AMZN"]
   - ANY question about a company → extract the company's ticker

4. COMMODITY SYMBOL MAPPING - CRITICAL
   - "gold" → symbols: ["GC"] (NEVER XAU)
   - "silver" → symbols: ["SI"] (NEVER XAG)
   - "oil" → symbols: ["CL"]
   - These are the ONLY correct commodity symbols to use

5. CONTEXT UNDERSTANDING - CRITICAL
   - "compare them" → Look at conversation history for last 2 mentioned symbols
   - "show me their trends" → Extract symbols from recent context
   - ALWAYS check conversation history for "them", "it", "these", "those"
   - If symbols were mentioned in previous messages, extract them!

6. CHART DETECTION - MUST RECOGNIZE
   - "show me NVDA chart" → intent: "trend_query", requiresChart: true
   - "Bitcoin trends" → intent: "trend_query", requiresChart: true
   - Keywords: chart, trend, graph, history, show → Always set requiresChart: true
   - "show me X chart" ALWAYS means trend_query with requiresChart: true

7. GROUP QUERIES - EXACT MAPPINGS
   - "FAANG stocks" → intent: "group_analysis", symbols: ["META","AAPL","AMZN","NFLX","GOOGL"]
   - "tech stocks comparison" → intent: "comparison_query", symbols: ["AAPL","MSFT","GOOGL","AMZN","META","NVDA"]
   - "analyze FAANG stocks" → intent: "group_analysis", symbols: ["META","AAPL","AMZN","NFLX","GOOGL"]
   - "tech stocks" → intent: "group_analysis", symbols: ["AAPL","MSFT","GOOGL","AMZN","META","NVDA"]

8. INVESTMENT QUESTIONS ARE FINANCIAL
   - "is bitcoin a good investment?" → isFinancial: true, intent: "investment_advice", symbols: ["BTC"]
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

Return ONLY valid JSON, no explanation.`;

    const conversationContext = conversationHistory.slice(-6).map(msg => 
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
      const content = await this.makeRequest(messages, 0.3, 150); // Reduced tokens for faster response
      
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
  formatConversationHistory(history) {
    return history.slice(-6).map(msg => ({
      role: msg.role || 'user',
      content: msg.content || msg.message || msg
    }));
  }
}

module.exports = new AzureOpenAIService();