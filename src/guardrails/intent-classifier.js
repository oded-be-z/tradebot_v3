class IntentClassifier {
  constructor() {
    // MINIMAL keywords only for emergency fallback
    // The LLM is now the primary intelligence - this is ONLY for when LLM fails
    this.definitelyNonFinancial = [
      // Only OBVIOUS non-financial that have zero relation to finance
      'weather',
      'recipe',
      'cooking', 
      'joke',
      'sing a song',
      'write a poem',
      'play a game',
      'tell me a story',
      'draw',
      'paint',
      'dance',
      'sports score',
      'movie review',
      'book recommendation',
      'travel directions',
      'medical advice',
      'legal advice',
      'homework help',
      'math problem',
      'science question',
      'history lesson',
      'grammar check',
      'translate',
      'relationship advice'
    ];
    
    // Remove ALL the extensive keyword lists
    // Let the LLM understand context
  }
  
  // This becomes emergency fallback only
  classifyIntent(text, conversationHistory = []) {
    const normalizedText = text.toLowerCase().trim();
    
    // Only block OBVIOUS non-financial queries
    for (const keyword of this.definitelyNonFinancial) {
      if (normalizedText.includes(keyword)) {
        return {
          classification: 'non-financial',
          confidence: 0.9,
          reason: 'obvious_non_financial_keyword'
        };
      }
    }
    
    // Default: assume it might be financial, let LLM decide
    // We no longer try to classify financial queries locally
    return {
      classification: 'unknown',
      confidence: 0.3,
      reason: 'deferred_to_llm'
    };
  }
  
  // Simplified company detection for emergency use only
  detectCompany(text) {
    const commonCompanies = {
      'apple': 'AAPL',
      'microsoft': 'MSFT',
      'google': 'GOOGL',
      'amazon': 'AMZN',
      'tesla': 'TSLA',
      'meta': 'META',
      'facebook': 'META',
      'nvidia': 'NVDA'
    };
    
    const lowerText = text.toLowerCase();
    for (const [company, symbol] of Object.entries(commonCompanies)) {
      if (lowerText.includes(company)) {
        return symbol;
      }
    }
    
    return null;
  }
  
  // Emergency logging for debugging
  logClassification(query, result) {
    console.log(`[IntentClassifier-Fallback] Query: "${query}" -> ${result.classification} (${result.confidence})`);
  }
}

module.exports = IntentClassifier;