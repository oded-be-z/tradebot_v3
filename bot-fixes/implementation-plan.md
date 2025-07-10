# Implementation Structure

## File Structure Needed
src/
├── knowledge/
│   ├── market-data-service.ts  # Real-time data fetching
│   ├── nlp-processor.ts        # Understanding queries
│   └── knowledge-base.ts       # Financial concepts
├── guardrails/
│   ├── intent-classifier.ts    # Identify query type
│   ├── response-filter.ts      # Apply restrictions
│   └── disclaimer-manager.ts   # Add legal disclaimers
├── tests/
│   ├── knowledge.test.ts       # Market knowledge tests
│   ├── guardrails.test.ts      # Boundary tests
│   └── integration.test.ts     # Full conversation tests
└── config/
└── financial-terms.json     # Supported topics/terms

## Azure OpenAI Prompt Updates
- Always check if query is financial before responding
- Include market data in responses when relevant
- Add disclaimers automatically
- Refuse non-financial queries politely

## Success Criteria
- Recognizes all major stocks and crypto
- Never answers non-financial questions
- Always includes disclaimers
- Passes 100+ test scenarios
