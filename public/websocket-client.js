// public/websocket-client.js
// Client-side WebSocket handler for real-time market data

class WebSocketClient {
  constructor(options = {}) {
    this.url = options.url || `ws://${window.location.host}/ws`;
    this.reconnectDelay = options.reconnectDelay || 1000;
    this.maxReconnectAttempts = options.maxReconnectAttempts || 5;
    this.heartbeatInterval = options.heartbeatInterval || 30000;

    this.ws = null;
    this.reconnectAttempts = 0;
    this.isConnecting = false;
    this.subscriptions = new Set();
    this.eventHandlers = new Map();
    this.lastPingTime = 0;
    this.heartbeatTimer = null;

    this.stats = {
      messagesReceived: 0,
      messagesSent: 0,
      reconnectCount: 0,
      lastConnectedAt: null,
      connectionDuration: 0,
    };

    console.log("[WebSocketClient] Initialized");
  }

  // Connect to WebSocket server
  async connect() {
    if (
      this.isConnecting ||
      (this.ws && this.ws.readyState === WebSocket.OPEN)
    ) {
      return;
    }

    this.isConnecting = true;
    console.log("[WebSocketClient] Connecting to:", this.url);

    try {
      this.ws = new WebSocket(this.url);

      this.ws.onopen = () => {
        console.log("[WebSocketClient] Connected");
        this.isConnecting = false;
        this.reconnectAttempts = 0;
        this.stats.lastConnectedAt = Date.now();
        this.startHeartbeat();
        this.resubscribeToAll();
        this.emit("connected");
      };

      this.ws.onmessage = (event) => {
        this.handleMessage(event.data);
      };

      this.ws.onclose = (event) => {
        console.log(
          "[WebSocketClient] Disconnected:",
          event.code,
          event.reason,
        );
        this.isConnecting = false;
        this.stopHeartbeat();
        this.updateConnectionDuration();
        this.emit("disconnected", { code: event.code, reason: event.reason });
        this.scheduleReconnect();
      };

      this.ws.onerror = (error) => {
        console.error("[WebSocketClient] Error:", error);
        this.isConnecting = false;
        this.emit("error", error);
      };
    } catch (error) {
      console.error("[WebSocketClient] Connection failed:", error);
      this.isConnecting = false;
      this.scheduleReconnect();
    }
  }

  // Handle incoming messages
  handleMessage(data) {
    try {
      const message = JSON.parse(data);
      this.stats.messagesReceived++;

      switch (message.type) {
        case "trade":
          this.handleTradeUpdate(message.data);
          break;
        case "quote":
          this.handleQuoteUpdate(message.data);
          break;
        case "aggregate":
          this.handleAggregateUpdate(message.data);
          break;
        case "ping":
          this.handlePing();
          break;
        case "pong":
          this.handlePong();
          break;
        case "subscribed":
          this.handleSubscriptionConfirm(message.symbol);
          break;
        case "unsubscribed":
          this.handleUnsubscriptionConfirm(message.symbol);
          break;
        default:
          console.log("[WebSocketClient] Unknown message type:", message.type);
      }
    } catch (error) {
      console.error("[WebSocketClient] Error parsing message:", error);
    }
  }

  // Handle trade updates
  handleTradeUpdate(trade) {
    this.emit("trade", trade);
    this.updateMarketTicker(trade);
  }

  // Handle quote updates
  handleQuoteUpdate(quote) {
    this.emit("quote", quote);
  }

  // Handle aggregate updates (minute bars)
  handleAggregateUpdate(aggregate) {
    this.emit("aggregate", aggregate);
    this.updateChartData(aggregate);
  }

  // Handle ping from server
  handlePing() {
    this.send({ type: "ping" });
  }

  // Handle pong from server
  handlePong() {
    this.lastPingTime = Date.now();
  }

  // Handle subscription confirmation
  handleSubscriptionConfirm(symbol) {
    console.log(`[WebSocketClient] Subscribed to ${symbol}`);
    this.emit("subscribed", symbol);
  }

  // Handle unsubscription confirmation
  handleUnsubscriptionConfirm(symbol) {
    console.log(`[WebSocketClient] Unsubscribed from ${symbol}`);
    this.emit("unsubscribed", symbol);
  }

  // Subscribe to symbol
  subscribe(symbol) {
    if (!symbol) return;

    symbol = symbol.toUpperCase();
    this.subscriptions.add(symbol);

    if (this.isConnected()) {
      this.send({
        type: "subscribe",
        symbol: symbol,
      });
    }
  }

  // Unsubscribe from symbol
  unsubscribe(symbol) {
    if (!symbol) return;

    symbol = symbol.toUpperCase();
    this.subscriptions.delete(symbol);

    if (this.isConnected()) {
      this.send({
        type: "unsubscribe",
        symbol: symbol,
      });
    }
  }

  // Resubscribe to all symbols after reconnection
  resubscribeToAll() {
    this.subscriptions.forEach((symbol) => {
      this.send({
        type: "subscribe",
        symbol: symbol,
      });
    });
  }

  // Send message to server
  send(message) {
    if (this.isConnected()) {
      this.ws.send(JSON.stringify(message));
      this.stats.messagesSent++;
    }
  }

  // Check if connected
  isConnected() {
    return this.ws && this.ws.readyState === WebSocket.OPEN;
  }

  // Start heartbeat
  startHeartbeat() {
    this.heartbeatTimer = setInterval(() => {
      if (this.isConnected()) {
        this.send({ type: "ping" });
      }
    }, this.heartbeatInterval);
  }

  // Stop heartbeat
  stopHeartbeat() {
    if (this.heartbeatTimer) {
      clearInterval(this.heartbeatTimer);
      this.heartbeatTimer = null;
    }
  }

  // Schedule reconnection
  scheduleReconnect() {
    if (this.reconnectAttempts >= this.maxReconnectAttempts) {
      console.error("[WebSocketClient] Max reconnection attempts reached");
      this.emit("maxReconnectAttemptsReached");
      return;
    }

    this.reconnectAttempts++;
    const delay = this.reconnectDelay * Math.pow(2, this.reconnectAttempts - 1);

    console.log(
      `[WebSocketClient] Scheduling reconnect in ${delay}ms (attempt ${this.reconnectAttempts})`,
    );

    setTimeout(() => {
      this.connect();
    }, delay);
  }

  // Update connection duration
  updateConnectionDuration() {
    if (this.stats.lastConnectedAt) {
      this.stats.connectionDuration = Date.now() - this.stats.lastConnectedAt;
    }
  }

  // Update market ticker with real-time data
  updateMarketTicker(trade) {
    const tickerElements = document.querySelectorAll(
      `[data-symbol="${trade.symbol}"]`,
    );
    tickerElements.forEach((element) => {
      const priceElement = element.querySelector(".ticker-price");
      const changeElement = element.querySelector(".ticker-change");

      if (priceElement) {
        priceElement.textContent = `$${trade.price.toFixed(2)}`;
        priceElement.style.color = "#00D4FF";

        // Add flash animation
        priceElement.style.animation = "flash 0.5s ease-in-out";
        setTimeout(() => {
          priceElement.style.animation = "";
        }, 500);
      }

      // Update change indicator if available
      if (changeElement && trade.change !== undefined) {
        const isPositive = trade.change >= 0;
        changeElement.textContent = `${isPositive ? "+" : ""}${trade.change.toFixed(2)}% ${isPositive ? "↑" : "↓"}`;
        changeElement.className = `ticker-change ${isPositive ? "positive" : "negative"}`;
      }
    });
  }

  // Update chart data with real-time information
  updateChartData(aggregate) {
    // Find charts for this symbol
    const charts = window.activeCharts || [];
    charts.forEach((chart) => {
      if (chart.symbol === aggregate.symbol) {
        // Update chart with new data point
        const newDataPoint = {
          x: aggregate.timestamp,
          y: aggregate.close,
        };

        // Add to chart data
        if (chart.data.datasets && chart.data.datasets[0]) {
          chart.data.datasets[0].data.push(newDataPoint);

          // Keep only last 100 points for performance
          if (chart.data.datasets[0].data.length > 100) {
            chart.data.datasets[0].data.shift();
          }

          chart.update("none"); // Update without animation for performance
        }
      }
    });
  }

  // Event emitter functionality
  on(event, handler) {
    if (!this.eventHandlers.has(event)) {
      this.eventHandlers.set(event, []);
    }
    this.eventHandlers.get(event).push(handler);
  }

  off(event, handler) {
    if (this.eventHandlers.has(event)) {
      const handlers = this.eventHandlers.get(event);
      const index = handlers.indexOf(handler);
      if (index > -1) {
        handlers.splice(index, 1);
      }
    }
  }

  emit(event, data) {
    if (this.eventHandlers.has(event)) {
      this.eventHandlers.get(event).forEach((handler) => {
        try {
          handler(data);
        } catch (error) {
          console.error(
            `[WebSocketClient] Error in event handler for ${event}:`,
            error,
          );
        }
      });
    }
  }

  // Get connection statistics
  getStats() {
    return {
      ...this.stats,
      isConnected: this.isConnected(),
      subscriptions: Array.from(this.subscriptions),
      reconnectAttempts: this.reconnectAttempts,
    };
  }

  // Disconnect
  disconnect() {
    console.log("[WebSocketClient] Disconnecting...");
    this.stopHeartbeat();
    if (this.ws) {
      this.ws.close();
    }
  }
}

// Add CSS animation for price flash
const flashAnimation = `
@keyframes flash {
    0% { background-color: transparent; }
    50% { background-color: rgba(0, 212, 255, 0.3); }
    100% { background-color: transparent; }
}
`;

// Inject CSS
const style = document.createElement("style");
style.textContent = flashAnimation;
document.head.appendChild(style);

// Global WebSocket client instance
window.WebSocketClient = WebSocketClient;
