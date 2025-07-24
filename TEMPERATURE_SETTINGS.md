# Temperature Settings Documentation

## Overview
Dynamic temperature settings based on query type to balance accuracy with conversational warmth.

## Temperature Mappings

### Low Temperature (0.1-0.2) - Maximum Accuracy
- **Portfolio Analysis**: 0.1
- **Financial Comparisons**: 0.1
- **Stock Data Queries**: 0.1
- **Intent Classification**: 0.1
- **Symbol Extraction**: 0.1
- **Query Analysis**: 0.2

### Medium Temperature (0.3-0.5) - Balanced Responses
- **Greetings**: 0.5
- **General Responses**: 0.5
- **Market Trends**: 0.3
- **Suggestions/Recommendations**: 0.5
- **Ambiguity Resolution**: 0.4

### Implementation Details

1. **enhanceResponse() Method**:
   ```javascript
   let temperature = 0.1; // Default for accuracy
   
   if (queryType === 'greeting' || queryType === 'general_response') {
     temperature = 0.5; // Warmer for conversation
   } else if (queryType === 'portfolio_analysis' || queryType === 'comparison') {
     temperature = 0.1; // Very low for financial accuracy
   } else if (queryType === 'trend_query') {
     temperature = 0.3; // Slightly higher for insights
   }
   ```

2. **Warmth Through Prompts** (Not Temperature):
   - "Be friendly and conversational while maintaining accuracy"
   - "Use natural language like 'I notice' instead of 'Analysis shows'"
   - "Acknowledge the user's situation personally"
   - "Your portfolio" instead of "The portfolio"
   - "I see that" instead of "Data indicates"

## Key Principle
Achieve warmth through carefully crafted prompts rather than high temperature, ensuring financial accuracy while maintaining a friendly tone.