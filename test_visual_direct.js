#!/usr/bin/env node

/**
 * Direct test of Visual Response Builder
 * Tests the visual components directly without going through the API
 */

const visualBuilder = require('./services/visualResponseBuilder');

// Test data
const mockData = {
  AAPL_market: {
    price: 175.50,
    change: 2.25,
    changePercent: 1.30,
    volume: 52343211,
    dayHigh: 177.23,
    dayLow: 174.12,
    history: [170, 172, 173, 171, 174, 175, 175.50]
  },
  MSFT_market: {
    price: 423.75,
    change: -1.25,
    changePercent: -0.29,
    volume: 23456789,
    dayHigh: 425.50,
    dayLow: 422.00
  },
  GOOGL_market: {
    price: 142.50,
    change: 3.75,
    changePercent: 2.70,
    volume: 18765432,
    dayHigh: 143.20,
    dayLow: 138.90
  }
};

function testVisualComponents() {
  console.log('🎨 Testing Visual Response Builder Components\n');
  
  // Test 1: Single Price Card
  console.log('1️⃣ Testing Price Card (AAPL):\n');
  const priceCard = visualBuilder.createPriceCard('AAPL', mockData.AAPL_market, 'intermediate');
  console.log(priceCard);
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 2: Comparison Table
  console.log('2️⃣ Testing Comparison Table:\n');
  const compTable = visualBuilder.createComparisonTable(['AAPL', 'MSFT', 'GOOGL'], mockData, 'intermediate');
  console.log(compTable);
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 3: Portfolio Summary
  console.log('3️⃣ Testing Portfolio Summary:\n');
  const portfolioData = {
    totalValue: 125000,
    totalCost: 100000,
    totalGain: 25000,
    gainPercent: 25,
    holdings: [
      { symbol: 'AAPL', value: 50000, gain: 10000, gainPercent: 25 },
      { symbol: 'MSFT', value: 40000, gain: 8000, gainPercent: 25 },
      { symbol: 'GOOGL', value: 35000, gain: 7000, gainPercent: 25 }
    ]
  };
  const portfolioSummary = visualBuilder.createPortfolioSummary(portfolioData, 'intermediate');
  console.log(portfolioSummary);
  console.log('\n' + '='.repeat(60) + '\n');
  
  // Test 4: Enhanced Response
  console.log('4️⃣ Testing Enhanced Response:\n');
  const originalResponse = "AAPL is currently trading at $175.50 with strong momentum.";
  
  // Test with single symbol data
  const singleSymbolData = { AAPL_market: mockData.AAPL_market };
  const enhanced = visualBuilder.enhanceResponse(
    originalResponse,
    singleSymbolData,
    'price_query',
    'intermediate'
  );
  console.log('Original:', originalResponse);
  console.log('\nEnhanced:');
  console.log(enhanced);
  
  // Test 5: Risk Gauge
  console.log('\n5️⃣ Testing Risk Gauge:\n');
  const lowRisk = visualBuilder.createRiskGauge(25);
  const medRisk = visualBuilder.createRiskGauge(50);
  const highRisk = visualBuilder.createRiskGauge(85);
  console.log('Low Risk (25%):', lowRisk);
  console.log('Med Risk (50%):', medRisk);
  console.log('High Risk (85%):', highRisk);
  
  // Test 6: Sparkline
  console.log('\n6️⃣ Testing Sparkline:\n');
  const sparkline = visualBuilder.generateSparkline([100, 105, 103, 108, 106, 110, 115, 112, 118, 120]);
  console.log('Price trend:', sparkline);
}

// Run tests
testVisualComponents();