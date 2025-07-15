#!/usr/bin/env node

const axios = require("axios");

async function quickTest() {
  try {
    // Test 1: Non-financial refusal
    const nonFin = await axios.post("http://localhost:3000/api/chat", {
      message: "teach me to make pizza",
      sessionId: "quick1",
    });

    // Test 2: Financial query
    const fin = await axios.post("http://localhost:3000/api/chat", {
      message: "Apple stock",
      sessionId: "quick2",
    });

    // Test 3: Commodity
    const commodity = await axios.post("http://localhost:3000/api/chat", {
      message: "gold price",
      sessionId: "quick3",
    });

    console.log("=== QUICK VALIDATION RESULTS ===");

    console.log("\n1. NON-FINANCIAL (should refuse):");
    console.log("Content:", nonFin.data.data.content.substring(0, 100));
    console.log(
      "Refuses?",
      nonFin.data.data.content.includes("focus exclusively"),
    );

    console.log("\n2. FINANCIAL (should have bullets):");
    console.log("Content:", fin.data.data.content.substring(0, 100));
    const finBullets = (fin.data.data.content.match(/•/g) || []).length;
    console.log("Bullet count:", finBullets);

    console.log("\n3. COMMODITY (should work):");
    console.log("Content:", commodity.data.data.content.substring(0, 100));
    const commBullets = (commodity.data.data.content.match(/•/g) || []).length;
    console.log("Bullet count:", commBullets);
    console.log(
      "Refuses?",
      commodity.data.data.content.includes("focus exclusively"),
    );
  } catch (error) {
    console.error("Test failed:", error.message);
  }
}

quickTest();
