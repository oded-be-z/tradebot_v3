#!/usr/bin/env node

/**
 * FinanceBot Pro - API Test Script
 * Run this script while the server is running to verify functionality
 * Usage: node test/api-test.js
 */

const axios = require('axios');

const BASE_URL = 'http://localhost:3000';

console.log('🔧 FinanceBot Pro - API Test Suite');
console.log('='.repeat(50));

async function testHealthEndpoint() {
    console.log('\n📡 Testing Health Endpoint...');
    try {
        const response = await axios.get(`${BASE_URL}/api/health`);
        console.log('✅ Health check passed');
        console.log(`   Status: ${response.data.status}`);
        console.log(`   Version: ${response.data.version}`);
        return true;
    } catch (error) {
        console.log('❌ Health check failed');
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

async function testChatEndpoint(message, sessionId = null) {
    console.log(`\n💬 Testing Chat: "${message}"`);
    try {
        const payload = { message };
        if (sessionId) payload.sessionId = sessionId;
        
        const response = await axios.post(`${BASE_URL}/api/chat`, payload);
        
        if (response.data.success) {
            console.log('✅ Chat response received');
            console.log(`   Session: ${response.data.sessionId}`);
            console.log(`   Response length: ${response.data.data.content?.length || 0} chars`);
            return response.data.sessionId;
        } else {
            console.log('❌ Chat failed');
            console.log(`   Error: ${response.data.error}`);
            return null;
        }
    } catch (error) {
        console.log('❌ Chat request failed');
        console.log(`   Error: ${error.response?.data?.error || error.message}`);
        return null;
    }
}

async function testSessionStats() {
    console.log('\n📊 Testing Session Stats...');
    try {
        const response = await axios.get(`${BASE_URL}/api/session/stats`);
        console.log('✅ Session stats retrieved');
        console.log(`   Active sessions: ${response.data.stats.activeSessions}`);
        console.log(`   Total sessions: ${response.data.stats.totalSessions}`);
        return true;
    } catch (error) {
        console.log('❌ Session stats failed');
        console.log(`   Error: ${error.message}`);
        return false;
    }
}

async function runFullTestSuite() {
    console.log('\n🚀 Starting Full Test Suite...');
    
    const testQuestions = [
        'What is Bitcoin?',
        'Analyze Apple stock performance',
        'Tell me about Tesla',
        'How does the market look today?',
        'What are dividend stocks?'
    ];
    
    let passedTests = 0;
    let totalTests = 0;
    
    // Test 1: Health endpoint
    totalTests++;
    if (await testHealthEndpoint()) passedTests++;
    
    // Test 2: Session stats
    totalTests++;
    if (await testSessionStats()) passedTests++;
    
    // Test 3: Chat functionality
    let sessionId = null;
    for (const question of testQuestions) {
        totalTests++;
        const result = await testChatEndpoint(question, sessionId);
        if (result) {
            passedTests++;
            if (!sessionId) sessionId = result; // Use same session for subsequent tests
        }
    }
    
    // Final results
    console.log('\n' + '='.repeat(50));
    console.log(`📊 Test Results: ${passedTests}/${totalTests} passed`);
    
    if (passedTests === totalTests) {
        console.log('🎉 All tests passed! FinanceBot Pro is working correctly.');
    } else {
        console.log('⚠️  Some tests failed. Check server logs for details.');
    }
    
    process.exit(passedTests === totalTests ? 0 : 1);
}

// Check if server is running first
async function checkServer() {
    try {
        await axios.get(BASE_URL);
        return true;
    } catch (error) {
        console.log('❌ Server is not running on http://localhost:3000');
        console.log('   Please start the server first with: npm start');
        return false;
    }
}

// Main execution
(async () => {
    if (await checkServer()) {
        await runFullTestSuite();
    } else {
        process.exit(1);
    }
})(); 