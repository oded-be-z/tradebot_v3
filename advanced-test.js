const axios = require('axios');

async function testRealQueries() {
    const baseURL = 'http://localhost:3000';
    
    const financialQueries = [
        "whats up with bitcoin last week?",
        "how is tesla doing?", 
        "apple stock thoughts?",
        "crypto market today?",
        "nvidia earnings?",
        "what happened to gamestop?",
        "oil prices lately?",
        "gold vs bitcoin?"
    ];
    
    const nonFinancialQueries = [
        "how to make pizza?",
        "weather today?",
        "movie recommendations?",
        "best restaurants?",
        "travel tips?"
    ];
    
    const investmentAdvice = [
        "should i buy tesla?",
        "is apple a good buy?",
        "what stocks to invest in?",
        "sell my bitcoin?"
    ];

    console.log("=== TESTING FINANCIAL QUERIES ===");
    for (const query of financialQueries) {
        await testQuery(query, "FINANCIAL", baseURL);
    }
    
    console.log("\n=== TESTING NON-FINANCIAL QUERIES ===");
    for (const query of nonFinancialQueries) {
        await testQuery(query, "NON-FINANCIAL", baseURL);
    }
    
    console.log("\n=== TESTING INVESTMENT ADVICE ===");
    for (const query of investmentAdvice) {
        await testQuery(query, "INVESTMENT-ADVICE", baseURL);
    }
}

async function testQuery(message, expectedType, baseURL) {
    try {
        const response = await axios.post(baseURL + '/api/chat', {
            message: message,
            userId: 'test-user',
            sessionId: 'test-session-' + Date.now()
        });

        const classification = response.data.metadata?.intentClassification?.classification;
        const responseText = response.data.data?.content || response.data.response || "No response";
        
        let result = "UNKNOWN";
        if (classification === 'financial') result = "FINANCIAL";
        else if (classification === 'non-financial') result = "NON-FINANCIAL";
        else if (classification === 'greeting') result = "GREETING";
        
        const status = (expectedType === result) ? "PASS" : "FAIL";
        
        console.log(`${status} | Expected: ${expectedType} | Got: ${result} | "${message}"`);
        if (status === "FAIL") {
            console.log(`  Response: ${responseText.substring(0, 80)}...`);
        }
        
    } catch (error) {
        console.log(`ERROR | "${message}" - ${error.message}`);
    }
}

testRealQueries();
