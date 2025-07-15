const axios = require("axios");

const SERVER_URL = "http://localhost:3000";

async function testQuery(query) {
  try {
    console.log(`\nQuery: "${query}"`);
    console.log("-------------------");

    const response = await axios.post(`${SERVER_URL}/api/chat`, {
      message: query,
      sessionId: "manual_test_" + Date.now(),
    });

    const data = response.data;

    if (data.error) {
      console.log("Error:", data.error);
      return;
    }

    if (data.marketData && data.marketData.price) {
      console.log("Price:", `$${data.marketData.price.toFixed(2)}`);
      console.log("Change:", `${data.marketData.changePercent?.toFixed(2)}%`);
      console.log("Data Source:", data.marketData.source || "simulated");
    }

    if (data.response) {
      // Convert HTML to plain text for better readability
      const plainText = data.response
        .replace(/<br>/g, "\n")
        .replace(/<strong>/g, "")
        .replace(/<\/strong>/g, "")
        .replace(/<[^>]+>/g, "");

      console.log("\nResponse:");
      console.log(plainText);
    }
  } catch (error) {
    console.log(
      "Request failed:",
      error.response?.data?.error || error.message,
    );
  }
}

// Main execution
(async () => {
  console.log("🤖 FinanceBot Manual Test");
  console.log("=========================\n");

  // Test the queries that were failing
  await testQuery("bitcoin price?");
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await testQuery("oil price?");
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await testQuery("What is the current price of Apple stock?");
  await new Promise((resolve) => setTimeout(resolve, 1000));

  await testQuery("analyze gold");
})();
