// test-websocket.js
// Simple WebSocket test script

const WebSocket = require("ws");

console.log("🧪 Testing WebSocket Connection...");

// Test connection to local WebSocket server
const ws = new WebSocket("ws://localhost:3000/ws");

ws.on("open", () => {
  console.log("✅ WebSocket connection established");

  // Test subscribing to a symbol
  ws.send(
    JSON.stringify({
      type: "subscribe",
      symbol: "AAPL",
    }),
  );

  console.log("📤 Sent subscription request for AAPL");

  // Test ping
  setTimeout(() => {
    ws.send(
      JSON.stringify({
        type: "ping",
      }),
    );
    console.log("📤 Sent ping");
  }, 1000);
});

ws.on("message", (data) => {
  try {
    const message = JSON.parse(data);
    console.log("📥 Received message:", message);
  } catch (error) {
    console.error("❌ Error parsing message:", error);
  }
});

ws.on("close", (code, reason) => {
  console.log(`🔌 WebSocket connection closed: ${code} - ${reason}`);
});

ws.on("error", (error) => {
  console.error("❌ WebSocket error:", error);
});

// Close connection after 10 seconds
setTimeout(() => {
  console.log("🔒 Closing connection...");
  ws.close();
  process.exit(0);
}, 10000);
