#!/usr/bin/env node

const intelligentResponse = require('./services/intelligentResponse');
const safeSymbol = require('./src/utils/safeSymbol');

async function quickTest() {
  console.log('Quick test of key fixes:\n');
  
  // Test 1: TSLS typo
  console.log('1. Testing TSLS typo correction:');
  const tsls = safeSymbol.extractSafeSymbols('TSLS');
  console.log(`   SafeSymbol: ${tsls.join(', ') || 'none'}`);
  
  // Test 2: FAANG extraction via LLM
  console.log('\n2. Testing FAANG via LLM:');
  const faangResponse = await intelligentResponse.generateResponse('analyze FAANG stocks', {});
  console.log(`   Response type: ${faangResponse.type}`);
  console.log(`   Symbols: ${faangResponse.symbols?.join(', ') || faangResponse.symbol || 'none'}`);
  
  // Test 3: Crypto market overview
  console.log('\n3. Testing crypto market overview:');
  const cryptoResponse = await intelligentResponse.generateResponse('crypto market overview', {});
  console.log(`   Response type: ${cryptoResponse.type}`);
  console.log(`   Symbols: ${cryptoResponse.symbols?.join(', ') || cryptoResponse.symbol || 'none'}`);
  
  // Test 4: Index mapping
  console.log('\n4. Testing S&P 500:');
  const spResponse = await intelligentResponse.generateResponse('S&P 500', {});
  console.log(`   Response type: ${spResponse.type}`);
  console.log(`   Symbol: ${spResponse.symbol || 'none'}`);
}

quickTest().catch(console.error);