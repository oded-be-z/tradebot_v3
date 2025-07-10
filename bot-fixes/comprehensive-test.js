const axios = require('axios');

async function testBot() {
    const baseURL = 'http://localhost:3000';
    const tests = [
        {
            name: "Non-financial query",
            message: "How to make pizza?",
            expected: "refuse",
            shouldContain: ["financial", "focus", "trading"]
        },
        {
            name: "Stock price query", 
            message: "What is Intel stock price?",
            expected: "answer",
            shouldContain: ["intel", "$", "price"]
        },
        {
            name: "Bitcoin price",
            message: "Bitcoin price",
            expected: "answer",
            shouldContain: ["crypto", "$", "cryptocurrency"]
        },
        {
            name: "Investment advice",
            message: "Should I buy Bitcoin?",
            expected: "refuse",
            shouldContain: ["focus", "financial", "trading"]
        },
        {
            name: "Greeting",
            message: "Hi",
            expected: "greeting",
            shouldContain: ["hey", "help", "financial"]
        }
    ];

    console.log("Testing Bot Responses");
    console.log("====================");

    for (const test of tests) {
        try {
            const response = await axios.post(baseURL + '/api/chat', {
                message: test.message,
                userId: 'test-user',
                sessionId: 'test-session'
            });

            const responseText = (response.data?.data?.content || response.data?.response || 'No response').toLowerCase();
            const passed = test.shouldContain.every(term => 
                responseText.includes(term.toLowerCase())
            );

            console.log((passed ? 'PASS' : 'FAIL') + ' - ' + test.name);
            console.log('Query: "' + test.message + '"');
            console.log('Response: ' + responseText.substring(0, 100) + '...');
            
            if (!passed) {
                console.log('Expected to contain: ' + test.shouldContain.join(', '));
            }
            console.log('');

        } catch (error) {
            console.log('ERROR - ' + test.name + ' - API Error');
            console.log('Error: ' + error.message);
            console.log('');
        }
    }
}

testBot();
