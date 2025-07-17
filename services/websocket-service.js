// services/websocket-service.js
// Disabled WebSocket service - no real-time connections

const EventEmitter = require("events");
const logger = require("../utils/logger");

class WebSocketService extends EventEmitter {
  constructor(options = {}) {
    super();
    this.connections = new Map();
    this.marketSubscriptions = new Map();

    this.stats = {
      totalConnections: 0,
      activeConnections: 0,
      messagesReceived: 0,
      messagesSent: 0,
      reconnectAttempts: 0,
    };

    // WebSocket functionality disabled
    this.polygonWS = null;
    this.polygonReconnectAttempts = 0;

    logger.debug("[WebSocketService] Initialized (WebSocket disabled)");
  }

  // All WebSocket methods are no-ops when disabled
  async connectToPolygon() {
    logger.debug("[WebSocketService] Polygon WebSocket connection disabled");
    return false;
  }

  handlePolygonMessage(messages) {
    // No-op
  }

  handlePolygonStatus(message) {
    // No-op
  }

  handlePolygonTrade(trade) {
    // No-op
  }

  handlePolygonQuote(quote) {
    // No-op
  }

  handlePolygonAggregate(aggregate) {
    // No-op
  }

  subscribeToDefaultSymbols() {
    // No-op
  }

  subscribeToSymbol(symbol) {
    logger.debug(`[WebSocketService] Symbol subscription disabled for ${symbol}`);
    return false;
  }

  unsubscribeFromSymbol(symbol) {
    // No-op
  }

  schedulePolygonReconnect() {
    // No-op
  }

  addClient(clientId, ws) {
    this.connections.set(clientId, {
      ws,
      subscribedSymbols: new Set(),
      lastPing: Date.now(),
    });

    this.stats.totalConnections++;
    this.stats.activeConnections = this.connections.size;

    logger.debug(
      `[WebSocketService] Client ${clientId} connected (total: ${this.connections.size}) - No real-time data`,
    );

    // Set up basic client event handlers
    ws.on("message", (data) => {
      this.handleClientMessage(clientId, data);
    });

    ws.on("close", () => {
      this.removeClient(clientId);
    });

    ws.on("error", (error) => {
      logger.error(`[WebSocketService] Client ${clientId} error:`, error);
      this.removeClient(clientId);
    });
  }

  removeClient(clientId) {
    const client = this.connections.get(clientId);
    if (client) {
      this.connections.delete(clientId);
      this.stats.activeConnections = this.connections.size;

      logger.debug(
        `[WebSocketService] Client ${clientId} disconnected (total: ${this.connections.size})`,
      );
    }
  }

  handleClientMessage(clientId, data) {
    try {
      const message = JSON.parse(data);
      
      // Send back disabled message for any subscription attempts
      if (message.type === "subscribe") {
        this.sendToClient(clientId, {
          type: "error",
          message: "Real-time data disabled",
        });
      }
    } catch (error) {
      logger.error(
        `[WebSocketService] Error handling client ${clientId} message:`,
        error,
      );
    }
  }

  sendToClient(clientId, message) {
    const client = this.connections.get(clientId);
    if (client && client.ws.readyState === 1) { // WebSocket.OPEN
      client.ws.send(JSON.stringify(message));
      this.stats.messagesSent++;
    }
  }

  broadcastToClients(type, data) {
    // No-op - no real-time data to broadcast
  }

  getStats() {
    return {
      ...this.stats,
      polygonConnected: false,
      subscribedSymbols: [],
      totalSubscriptions: 0,
    };
  }

  async initialize() {
    logger.debug("[WebSocketService] Initialization skipped - WebSocket disabled");
    return true;
  }

  async shutdown() {
    logger.debug("[WebSocketService] Shutting down...");

    // Close all client connections
    this.connections.forEach((client, clientId) => {
      client.ws.close();
    });

    logger.debug("[WebSocketService] Shutdown complete");
  }
}

module.exports = WebSocketService;