const axios = require('axios');
const fs = require('fs');

const PORT = 3000;
const API_URL = `http://localhost:${PORT}/api/chat`;

async function makeRequest(message, sessionId) {
  const startTime = Date.now();
  try {
    const response = await axios.post(API_URL, {
      message,
      sessionId
    });
    const endTime = Date.now();
    return { ...response.data, _timing: endTime - startTime };
  } catch (error) {
    console.error('Request error:', error.message);
    return null;
  }
}

// Issue 1: Performance Analysis
async function analyzePerformance() {
  console.log('🔍 PERFORMANCE ANALYSIS');
  console.log('======================\n');
  
  const sessionId = `perf_${Date.now()}`;
  
  console.log('Testing simple query for timing breakdown...');
  const response = await makeRequest("AAPL price", sessionId);
  
  if (response) {
    console.log(`Total API time: ${response._timing}ms`);
    console.log(`Response: ${response.response.substring(0, 100)}...\n`);
    
    // Look at the server logs for internal timing
    console.log('Check server logs for internal timing breakdown');
  }
}

// Issue 2: Chart Generation Analysis
async function analyzeCharts() {
  console.log('🔍 CHART GENERATION ANALYSIS');
  console.log('============================\n');
  
  const sessionId = `chart_${Date.now()}`;
  
  console.log('Testing trend query for chart generation...');
  const response = await makeRequest("show me NVDA trend", sessionId);
  
  if (response) {
    console.log('Response fields:');
    console.log(`- showChart: ${response.showChart}`);
    console.log(`- chartData: ${response.chartData ? 'Present' : 'NULL'}`);
    console.log(`- type: ${response.type}`);
    console.log(`- symbol: ${response.symbol}`);
    
    if (response.chartData) {
      console.log(`- chartData keys: ${Object.keys(response.chartData)}`);
    }
    
    console.log(`\nResponse: ${response.response.substring(0, 150)}...\n`);
  }
}

// Issue 3: Error Handling Analysis
async function analyzeErrors() {
  console.log('🔍 ERROR HANDLING ANALYSIS');
  console.log('==========================\n');
  
  const sessionId = `error_${Date.now()}`;
  
  console.log('Testing fake symbol...');
  const response = await makeRequest("What's XYZABC price?", sessionId);
  
  if (response) {
    console.log(`Response: ${response.response}`);
    console.log(`Contains fake price: ${response.response.includes('$22.08') ? 'YES - PROBLEM' : 'NO - GOOD'}`);
    console.log(`Symbol returned: ${response.symbol}`);
    console.log(`Type: ${response.type}\n`);
  }
}

// Issue 4: Portfolio Analysis  
async function analyzePortfolio() {
  console.log('🔍 PORTFOLIO ANALYSIS');
  console.log('=====================\n');
  
  // Create a simple CSV for upload
  const csvContent = `Symbol,Shares,Average Cost
AAPL,100,150.00
MSFT,50,300.00
NVDA,25,400.00
GOOGL,20,100.00`;
  
  console.log('Creating test portfolio CSV...');
  fs.writeFileSync('test_portfolio.csv', csvContent);
  
  const sessionId = `portfolio_${Date.now()}`;
  
  // Try uploading portfolio
  try {
    const FormData = require('form-data');
    const form = new FormData();
    form.append('file', fs.createReadStream('test_portfolio.csv'));
    form.append('sessionId', sessionId);
    
    console.log('Uploading portfolio...');
    const uploadResponse = await axios.post(`http://localhost:${PORT}/api/portfolio/upload`, form, {
      headers: form.getHeaders()
    });
    
    console.log('Portfolio upload successful');
    
    // Now test portfolio analysis
    console.log('Testing portfolio analysis...');
    const analysisResponse = await makeRequest("analyze my portfolio", sessionId);
    
    if (analysisResponse) {
      console.log(`Analysis: ${analysisResponse.response.substring(0, 200)}...\n`);
    }
    
  } catch (error) {
    console.error('Portfolio error:', error.message);
    if (error.response) {
      console.error('Error response:', error.response.data);
    }
  } finally {
    // Clean up
    if (fs.existsSync('test_portfolio.csv')) {
      fs.unlinkSync('test_portfolio.csv');
    }
  }
}

async function runAnalysis() {
  console.log('🚨 CORE ISSUES ANALYSIS');
  console.log('=======================\n');
  
  await analyzePerformance();
  await analyzeCharts();
  await analyzeErrors();
  await analyzePortfolio();
  
  console.log('\n✅ Analysis complete. Check server logs for detailed timing information.');
}

runAnalysis().catch(console.error);