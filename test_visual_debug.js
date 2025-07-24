#!/usr/bin/env node

/**
 * Debug Visual Response Builder
 * Check actual response format
 */

const fetch = require('node-fetch');
const dotenv = require('dotenv');
dotenv.config();

const BASE_URL = 'http://localhost:3000';

async function debugVisualResponse() {
  console.log('🔍 Debugging Visual Response Builder...\n');
  
  const sessionId = `debug-visual-${Date.now()}`;
  
  try {
    // Test simple price query
    console.log('Testing: "AAPL"');
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json'
      },
      body: JSON.stringify({ 
        message: 'AAPL',
        sessionId: sessionId 
      })
    });
    
    const data = await response.json();
    
    if (!response.ok) {
      console.error('API Error:', data.error || 'Unknown error');
      return;
    }
    
    console.log('\n📄 Full Response:');
    console.log('-'.repeat(80));
    console.log(data.response);
    console.log('-'.repeat(80));
    
    // Check for visual elements
    console.log('\n🎨 Visual Elements Check:');
    console.log(`Has box characters: ${data.response.includes('┌')}`);
    console.log(`Has sparkline chars: ${/[▁▂▃▄▅▆▇█]/.test(data.response)}`);
    console.log(`Has color codes: ${data.response.includes('\x1b[')}`);
    console.log(`Response length: ${data.response.length} characters`);
    
    // Show first 500 chars to check format
    console.log('\n📋 First 500 characters:');
    console.log(data.response.substring(0, 500));
    
  } catch (error) {
    console.error('Error:', error.message);
  }
}

// Run debug
debugVisualResponse();