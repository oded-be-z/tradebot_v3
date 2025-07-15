// Comprehensive format test for all query types
const generator = require("./services/intelligentResponse");

async function testAllQueries() {
  console.log("COMPREHENSIVE FORMAT TEST - 10 QUERY TYPES\n");
  console.log("=".repeat(60) + "\n");

  const queries = [
    "tell me about oil",
    "tell me about bitcoin",
    "oil trends",
    "bitcoin trends",
    "gold vs silver",
    "nvidia",
    "google",
    "intel",
    "what's happening with tesla",
    "ethereum analysis",
  ];

  for (const query of queries) {
    console.log(`\nTest: "${query}"`);
    console.log("-".repeat(40));

    try {
      // Mock context for test
      const mockContext = {
        topic: null, // Let extraction handle it
        portfolio: null,
        portfolioMetrics: null,
      };

      const response = await generator.generateResponse(query, mockContext);

      // Check for required sections
      const hasAllSections = checkResponseStructure(response.analysis);

      console.log("Structure Check:");
      console.log(
        `  ✓ Summary Card: ${hasAllSections.summaryCard ? "✅" : "❌"}`,
      );
      console.log(
        `  ✓ Key Metrics: ${hasAllSections.keyMetrics ? "✅" : "❌"}`,
      );
      console.log(
        `  ✓ Valuable Info: ${hasAllSections.valuableInfo ? "✅" : "❌"}`,
      );
      console.log(
        `  ✓ Historical Range: ${hasAllSections.historicalRange ? "✅" : "❌"}`,
      );

      if (!hasAllSections.allPresent) {
        console.log("\n❌ MISSING SECTIONS - Response:");
        console.log(response.analysis.substring(0, 500) + "...");
      } else {
        console.log("\n✅ All sections present");
        // Show full response (since it's short)
        console.log("\nFull Response:");
        console.log(response.analysis);
      }
    } catch (error) {
      console.log(`❌ Error: ${error.message}`);
    }

    console.log("\n" + "=".repeat(60));
  }
}

function checkResponseStructure(analysis) {
  const summaryCard = analysis.includes("**Summary Card**");
  const keyMetrics = analysis.includes("**Key Metrics List**");
  const valuableInfo = analysis.includes("**Valuable Info**");
  const historicalRange =
    analysis.includes("**Historical Price Range**") ||
    analysis.includes("**Historical Range**");

  return {
    summaryCard,
    keyMetrics,
    valuableInfo,
    historicalRange,
    allPresent: summaryCard && keyMetrics && valuableInfo && historicalRange,
  };
}

// Run the test
testAllQueries().catch(console.error);
