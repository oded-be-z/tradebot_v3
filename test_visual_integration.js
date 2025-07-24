#!/usr/bin/env node

/**
 * Test Visual Response Builder Integration
 * Verifies visual elements appear in actual chat responses
 */

const fetch = require('node-fetch');
const dotenv = require('dotenv');
dotenv.config();

const BASE_URL = 'http://localhost:3000';

async function testVisualIntegration() {
  console.log('🎨 Testing Visual Response Builder in Live Chat...\n');
  
  const sessionId = `visual-test-${Date.now()}`;
  let allPassed = true;
  
  // Test 1: Single stock should show price card
  console.log('Test 1: Single Stock Price Card');
  try {
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'AAPL',
        sessionId: sessionId 
      })
    });
    
    const data = await response.json();
    
    if (data.response.includes('┌') && data.response.includes('│')) {
      console.log('✅ Price card detected!');
    } else {
      console.log('❌ No price card found');
      allPassed = false;
    }
    
    if (data.response.match(/[▁▂▃▄▅▆▇█]/)) {
      console.log('✅ Sparkline detected!');
    } else {
      console.log('❌ No sparkline found');
    }
    
  } catch (error) {
    console.error('❌ Test 1 failed:', error.message);
    allPassed = false;
  }
  
  // Test 2: Comparison should show table
  console.log('\nTest 2: Comparison Table');
  try {
    const response = await fetch(`${BASE_URL}/api/chat`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ 
        message: 'Compare AAPL, MSFT, and GOOGL',
        sessionId: sessionId 
      })
    });
    
    const data = await response.json();
    
    if (data.response.includes('Symbol') && data.response.includes('Price') && data.response.includes('Change %')) {
      console.log('✅ Comparison table detected!');
    } else {
      console.log('❌ No comparison table found');
      allPassed = false;
    }
    
    if (data.response.includes('🏆') || data.response.includes('📉')) {
      console.log('✅ Best/worst performer badges detected!');
    } else {
      console.log('❌ No performer badges found');
    }
    
  } catch (error) {
    console.error('❌ Test 2 failed:', error.message);
    allPassed = false;
  }
  
  // Summary
  console.log('\n' + '='.repeat(50));
  if (allPassed) {
    console.log('✅ Visual Response Builder is integrated and working!');
  } else {
    console.log('❌ Some visual elements are not appearing in chat');
    console.log('Check server logs for [VisualBuilder] messages');
  }
}

// Run test
testVisualIntegration();