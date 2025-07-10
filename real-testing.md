# Real Pre-Production Testing

## DO NOT MOCK - Test with Real APIs

1. Update ALL test files to use REAL API calls:
   - Remove all mocking/stubbing
   - Use actual Polygon API with the key in .env
   - Test real responses from APIs
   - Verify actual data is returned

2. Create a manual test script (manual-test.js):
   - Test "What's Intel stock price?" → Should return real price
   - Test "INTC price" → Should return real Intel price  
   - Test "What should I eat?" → Should refuse politely
   - Test "Bitcoin price" → Should return real BTC price
   - Show actual responses, not mocked data

3. Integration with existing bot:
   - Show how to integrate these new modules into server.js
   - Update the chat endpoint to use the new guardrails
   - Test the complete flow from user input to bot response

4. Create run-local-test.js:
   - Start the server
   - Send test queries via HTTP
   - Display real responses
   - Verify guardrails are working

Show me:
- Real API responses (not mocked)
- How to run the bot locally
- Actual test results with real data
