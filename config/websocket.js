// config/websocket.js
// WebSocket configuration for production and development

module.exports = {
  // WebSocket server configuration
  server: {
    // Path for WebSocket connections
    path: '/ws',
    
    // Verify client connections
    verifyClient: (info) => {
      // Add origin checking for production
      if (process.env.NODE_ENV === 'production') {
        const origin = info.origin || info.req.headers.origin;
        const allowedOrigins = process.env.ALLOWED_ORIGINS ? 
          process.env.ALLOWED_ORIGINS.split(',') : ['http://localhost:3000'];
        
        if (origin && !allowedOrigins.includes(origin)) {
          return false;
        }
      }
      return true;
    },
    
    // Connection limits
    maxPayload: 1024 * 1024, // 1MB max message size
    
    // Heartbeat settings
    clientTracking: true,
    perMessageDeflate: false, // Disable compression for better performance
  },
  
  // Client configuration
  client: {
    // Reconnection settings
    maxReconnectAttempts: 5,
    reconnectDelay: 1000, // Start with 1 second
    maxReconnectDelay: 30000, // Max 30 seconds between attempts
    
    // Heartbeat settings
    heartbeatInterval: 30000, // 30 seconds
    heartbeatTimeout: 60000, // 60 seconds before considering connection dead
    
    // Message queue settings
    maxQueueSize: 100, // Max messages to queue while disconnected
  },
  
  // Feature flags
  features: {
    // Disable real-time updates in certain environments
    enableRealTime: process.env.ENABLE_WEBSOCKET !== 'false',
    
    // Enable debug logging
    debug: process.env.NODE_ENV === 'development',
  }
};