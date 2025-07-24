// Add a debug endpoint to server.js temporarily
const fs = require('fs');
const path = require('path');

// Read the server file
const serverPath = path.join(__dirname, 'server.js');
const serverContent = fs.readFileSync(serverPath, 'utf8');

// Check if debug endpoint already exists
if (!serverContent.includes('/api/debug/symbols-test')) {
    // Find a good place to insert (after other debug endpoints)
    const insertAfter = 'app.get("/api/debug/test-scenarios"';
    const insertIndex = serverContent.indexOf(insertAfter);
    
    if (insertIndex !== -1) {
        // Find the end of that endpoint
        let braceCount = 0;
        let i = insertIndex;
        let foundStart = false;
        
        while (i < serverContent.length) {
            if (serverContent[i] === '{') {
                braceCount++;
                foundStart = true;
            } else if (serverContent[i] === '}') {
                braceCount--;
                if (foundStart && braceCount === 0) {
                    // Found the end
                    break;
                }
            }
            i++;
        }
        
        // Insert after the closing brace and newline
        const endIndex = serverContent.indexOf('\n', i) + 1;
        
        const debugEndpoint = `
// Debug endpoint for symbols test
app.post("/api/debug/symbols-test", async (req, res) => {
  const { message } = req.body;
  
  try {
    // Call orchestrator directly
    const result = await dualLLMOrchestrator.processQuery(message, {
      sessionId: 'debug_symbols',
      conversationHistory: []
    });
    
    res.json({
      orchestratorSymbols: result.symbols,
      orchestratorSymbol: result.symbol,
      understandingSymbols: result.understanding?.symbols,
      responsePreview: result.response?.substring(0, 50) + '...'
    });
  } catch (error) {
    res.status(500).json({ error: error.message });
  }
});
`;
        
        const newContent = serverContent.slice(0, endIndex) + debugEndpoint + serverContent.slice(endIndex);
        fs.writeFileSync(serverPath, newContent);
        
        console.log('Debug endpoint added successfully!');
        console.log('Restart the server and test with:');
        console.log('curl -X POST http://localhost:3000/api/debug/symbols-test -H "Content-Type: application/json" -d \'{"message": "Compare AAPL and MSFT"}\'');
    } else {
        console.log('Could not find insertion point');
    }
} else {
    console.log('Debug endpoint already exists');
}