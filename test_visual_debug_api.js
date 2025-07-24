#!/usr/bin/env node

/**
 * Debug Visual Response Builder API
 * Check what's happening in the response
 */

const fetch = require('node-fetch');
const dotenv = require('dotenv');
dotenv.config();

const BASE_URL = 'http://localhost:3000';

async function debugVisualAPI() {
  console.log('🔍 Debugging Visual Response Builder API...\n');
  
  const sessionId = `debug-api-${Date.now()}`;
  
  try {
    // Test single stock
    console.log('Testing: "What is the price of AAPL?"');
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'What is the price of AAPL?',
        sessionId: sessionId 
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('API Error:', data.error || 'Unknown error');
      return;
    }
    
    console.log('\n📊 Response Info:');
    console.log(`Type: ${data.type}`);
    console.log(`Symbol: ${data.symbol}`);
    console.log(`Symbols: ${JSON.stringify(data.symbols)}`);
    console.log(`Response length: ${data.response.length} chars`);
    console.log(`Has chart data: ${!!data.chartData}`);
    
    console.log('\n🎨 Visual Check:');
    console.log(`Has box chars (┌): ${data.response.includes('┌')}`);
    console.log(`Has sparkline: ${/[▁▂▃▄▅▆▇█]/.test(data.response)}`);
    console.log(`Has emojis: ${/[📊🔍💰📈]/.test(data.response)}`);
    
    // Show first 200 chars
    console.log('\n📄 First 200 chars of response:');
    console.log(data.response.substring(0, 200) + '...');
    
    // Look for visual indicators
    if (data.response.includes('┌─') || data.response.includes('│')) {
      console.log('\n✅ Visual elements found in response!');
      // Extract visual part
      const lines = data.response.split('\n');
      const visualLines = lines.filter(line => 
        line.includes('┌') || line.includes('│') || line.includes('└') || line.includes('├')
      );
      console.log('\nVisual lines found:');
      visualLines.slice(0, 10).forEach(line => console.log(line));
    } else {
      console.log('\n❌ No visual elements found in response');
    }
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run debug
debugVisualAPI();