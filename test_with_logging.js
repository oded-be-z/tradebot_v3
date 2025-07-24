const { spawn } = require('child_process');
const axios = require('axios');

const PORT = 3000;
const API_URL = `http://localhost:${PORT}/api/chat`;

async function waitForServer(maxAttempts = 30) {
  for (let i = 0; i < maxAttempts; i++) {
    try {
      await axios.get(`http://localhost:${PORT}/api/test`);
      return true;
    } catch (error) {
      await new Promise(resolve => setTimeout(resolve, 1000));
    }
  }
  return false;
}

async function runTest() {
  console.log('Starting server with logging...');
  
  // Start server and capture output
  const server = spawn('node', ['server.js'], {
    cwd: process.cwd(),
    stdio: ['ignore', 'pipe', 'pipe']
  });
  
  let serverOutput = '';
  server.stdout.on('data', (data) => {
    const output = data.toString();
    serverOutput += output;
    // Only show API Response Debug lines
    if (output.includes('[API Response Debug]')) {
      console.log('SERVER:', output);
    }
  });
  
  server.stderr.on('data', (data) => {
    console.error('SERVER ERROR:', data.toString());
  });
  
  // Wait for server to start
  console.log('Waiting for server to start...');
  const serverReady = await waitForServer();
  
  if (!serverReady) {
    console.error('Server failed to start');
    server.kill();
    return;
  }
  
  console.log('Server ready, running test...\n');
  
  try {
    // Run the test
    const sessionId = `logging_test_${Date.now()}`;
    const response = await axios.post(API_URL, {
      message: "How about NVDA?",
      sessionId: sessionId
    });
    
    console.log('\n📦 API Response:');
    console.log('Symbol at top level:', response.data.symbol);
    console.log('ShowChart at top level:', response.data.showChart);
    console.log('Symbol in metadata:', response.data.metadata?.symbol);
    
    // Give server time to log
    await new Promise(resolve => setTimeout(resolve, 1000));
    
  } catch (error) {
    console.error('Test error:', error.message);
  } finally {
    console.log('\nStopping server...');
    server.kill();
    
    // Save server output to file
    require('fs').writeFileSync('server_debug_output.log', serverOutput);
    console.log('Server output saved to server_debug_output.log');
  }
}

runTest();