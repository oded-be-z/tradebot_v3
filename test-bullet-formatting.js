const axios = require("axios");

const API_URL = "http://localhost:5000/api/chat";

async function testBulletFormatting() {
  console.log("=== Testing Bullet Formatting Fixes ===\n");

  const testQueries = [
    { message: "What's the price of AAPL?", expected: "stock analysis" },
    { message: "Tell me about BTC", expected: "crypto analysis" },
    { message: "How's TSLA doing today?", expected: "stock analysis" },
    { message: "Analysis of ETH", expected: "crypto analysis" },
  ];

  let passed = 0;
  let failed = 0;

  for (const test of testQueries) {
    try {
      console.log(`Testing: "${test.message}"`);

      const response = await axios.post(API_URL, {
        message: test.message,
        conversationHistory: [],
      });

      const content = response.data.response.content || response.data.response;
      console.log("Response:", content);

      // Check bullet formatting
      const bullets = content
        .split("\n")
        .filter((line) => line.trim().startsWith("•"));
      console.log(`Found ${bullets.length} bullets`);

      // Test 1: Exactly 4 bullets
      if (bullets.length !== 4) {
        console.log(`❌ FAIL: Expected 4 bullets, got ${bullets.length}`);
        failed++;
        continue;
      }

      // Test 2: Check for duplicates
      const uniqueBullets = new Set(bullets.map((b) => b.toLowerCase()));
      if (uniqueBullets.size !== bullets.length) {
        console.log(`❌ FAIL: Found duplicate bullets`);
        failed++;
        continue;
      }

      // Test 3: Check word count (max 10 words per bullet)
      let wordCountFail = false;
      bullets.forEach((bullet, idx) => {
        const words = bullet.split(" ").filter((w) => w.length > 0);
        // Subtract 1 for bullet symbol
        const wordCount = words.length - 1;
        if (wordCount > 10) {
          console.log(
            `❌ FAIL: Bullet ${idx + 1} has ${wordCount} words (max 10)`,
          );
          wordCountFail = true;
        }
      });

      if (wordCountFail) {
        failed++;
        continue;
      }

      console.log("✅ PASS: All bullet formatting checks passed");
      passed++;
    } catch (error) {
      console.log(`❌ ERROR: ${error.message}`);
      failed++;
    }

    console.log("---\n");
  }

  console.log(`\n=== Summary ===`);
  console.log(`Passed: ${passed}/${testQueries.length}`);
  console.log(`Failed: ${failed}/${testQueries.length}`);
  console.log(
    `Success Rate: ${((passed / testQueries.length) * 100).toFixed(0)}%`,
  );
}

// Run the test
testBulletFormatting().catch(console.error);
