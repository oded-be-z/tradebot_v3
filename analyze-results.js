const fs = require('fs');
const data = fs.readFileSync('final-verification.txt', 'utf8');

console.log("=== ORIGINAL ISSUES VERIFICATION ===\n");

// Check each issue
const checks = [
    {
        issue: "1. Bitcoin casual query (whats up with bitcoin last week?)",
        shouldBe: "FINANCIAL response with Bitcoin info",
        check: (data) => data.includes('"classification":"financial"') && data.includes('bitcoin')
    },
    {
        issue: "2. Non-financial query blocking (pizza)",
        shouldBe: "BLOCKED with refusal message", 
        check: (data) => data.includes('"classification":"non-financial"') && data.includes('focus on financial')
    },
    {
        issue: "3. Bitcoin price accuracy",
        shouldBe: "Real Bitcoin price (~$106k not $111k)",
        check: (data) => data.includes('Bitcoin') && (data.includes('$10') || data.includes('$9'))
    },
    {
        issue: "4. Investment advice blocking",
        shouldBe: "BLOCKED investment advice",
        check: (data) => data.includes('"classification":"non-financial"') && data.includes('Should I buy Bitcoin')
    },
    {
        issue: "5. Greeting working",
        shouldBe: "Proper greeting response",
        check: (data) => data.includes('"classification":"greeting"') && data.includes('financial assistant')
    },
    {
        issue: "6. Disclaimers present", 
        shouldBe: "Financial responses have disclaimers",
        check: (data) => data.includes('Note:') || data.includes('disclaimer')
    }
];

checks.forEach(check => {
    const passed = check.check(data);
    console.log(`${passed ? '✅' : '❌'} ${check.issue}`);
    console.log(`   Expected: ${check.shouldBe}`);
    if (!passed) {
        console.log(`   ⚠️  STILL BROKEN!`);
    }
    console.log('');
});
