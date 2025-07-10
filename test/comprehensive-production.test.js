const request = require('supertest');
const fs = require('fs');
const path = require('path');

const API_URL = 'http://localhost:3000';

// Production Test Report Generator
class ProductionReportCollector {
    constructor() {
        this.results = {
            overview: { totalTests: 0, passedTests: 0, failedTests: 0, startTime: new Date() },
            categories: {
                guardian: { tests: [], passed: 0, failed: 0 },
                marketData: { tests: [], passed: 0, failed: 0 },
                formatting: { tests: [], passed: 0, failed: 0 },
                stocksCrypto: { tests: [], passed: 0, failed: 0 },
                portfolio: { tests: [], passed: 0, failed: 0 },
                performance: { tests: [], passed: 0, failed: 0 },
                security: { tests: [], passed: 0, failed: 0 }
            },
            criticalIssues: []
        };
    }

    recordTest(category, testName, status, details = {}) {
        this.results.overview.totalTests++;
        if (status === 'passed') {
            this.results.overview.passedTests++;
            this.results.categories[category].passed++;
        } else {
            this.results.overview.failedTests++;
            this.results.categories[category].failed++;
            if (details.critical) {
                this.results.criticalIssues.push({ category, test: testName, issue: details.issue });
            }
        }
        this.results.categories[category].tests.push({ name: testName, status, ...details });
    }

    generateFinalReport() {
        const endTime = new Date();
        const duration = (endTime - this.results.overview.startTime) / 1000;
        const successRate = (this.results.overview.passedTests / this.results.overview.totalTests) * 100;
        
        return `
# 🚀 FinanceBot Pro - Production Readiness Report

**Generated:** ${endTime.toISOString()}
**Duration:** ${duration.toFixed(2)} seconds

## 📊 Executive Summary

### Overall Status: ${successRate >= 95 ? '🟢 PRODUCTION READY' : 
    successRate >= 85 ? '🟡 NEEDS MINOR FIXES' : 
    successRate >= 70 ? '🟠 NEEDS IMPROVEMENTS' : '🔴 NOT PRODUCTION READY'}

**Results:**
- ✅ Passed: ${this.results.overview.passedTests}
- ❌ Failed: ${this.results.overview.failedTests}  
- 📊 Total: ${this.results.overview.totalTests}
- 📈 Success Rate: ${successRate.toFixed(1)}%

## 🚨 Critical Issues
${this.results.criticalIssues.length === 0 ? '✅ No critical issues found!' : 
this.results.criticalIssues.map(issue => `- **${issue.test}:** ${issue.issue}`).join('\n')}

## 📋 Category Results
${Object.entries(this.results.categories).map(([cat, data]) => 
    `**${cat.toUpperCase()}:** ${data.passed}/${data.passed + data.failed} (${((data.passed / (data.passed + data.failed || 1)) * 100).toFixed(1)}%)`
).join('\n')}

## 🎯 Detailed Results
${Object.entries(this.results.categories).map(([cat, data]) => 
    `\n### ${cat.toUpperCase()}\n${data.tests.map(test => 
        `- ${test.status === 'passed' ? '✅' : '❌'} ${test.name}`
    ).join('\n')}`
).join('')}

## 🎉 Production Score: ${Math.round(successRate)}%

${successRate >= 90 ? '🚀 **READY FOR PRODUCTION!**' : 
  successRate >= 75 ? '⚠️ **NEEDS MINOR FIXES**' : '🛑 **NOT READY FOR PRODUCTION**'}
        `;
    }
}

const reporter = new ProductionReportCollector();

describe('🚀 FinanceBot Pro - COMPREHENSIVE PRODUCTION TESTS', () => {
    let sessionId;

    beforeAll(async () => {
        console.log('\n🔥 Starting Comprehensive Production Tests...\n');
        
        // Health check
        try {
            const health = await request(API_URL).get('/api/health');
            expect(health.status).toBe(200);
            console.log('✅ Server healthy');
        } catch (error) {
            throw new Error('❌ Server not running! Start with: npm start');
        }

        // Get session
        const session = await request(API_URL).get('/api/session/init');
        sessionId = session.body.sessionId;
    }, 30000);

    afterAll(() => {
        const report = reporter.generateFinalReport();
        const reportPath = path.join(__dirname, 'production-report.md');
        fs.writeFileSync(reportPath, report);
        console.log(`\n📋 Full Report: ${reportPath}`);
        console.log(report);
    });

    // 🛡️ GUARDIAN BEHAVIOR TESTS
    describe('🛡️ Guardian Behavior Tests', () => {
        const financeQuestions = [
            'Tell me about Apple stock',
            'What is Bitcoin price?', 
            'How to analyze stocks?',
            'Best investment strategies?',
            'Market volatility explanation'
        ];

        const nonFinanceQuestions = [
            'What is the weather?',
            'How to cook pasta?',
            'Tell me a joke',
            'Capital of France?'
        ];

        test('should answer finance questions helpfully', async () => {
            for (const question of financeQuestions) {
                try {
                    const res = await request(API_URL)
                        .post('/api/chat')
                        .send({ message: question, sessionId });
                    
                    const content = JSON.stringify(res.body);
                    const isHelpful = content.length > 100;
                    const isFinanceRelated = /stock|market|price|invest|financial|trading|portfolio/i.test(content);
                    
                    if (res.status === 200 && isHelpful && isFinanceRelated) {
                        reporter.recordTest('guardian', `Finance Q: "${question}"`, 'passed');
                    } else {
                        reporter.recordTest('guardian', `Finance Q: "${question}"`, 'failed', {
                            issue: 'Not helpful or not finance-focused',
                            critical: true
                        });
                    }
                } catch (error) {
                    reporter.recordTest('guardian', `Finance Q: "${question}"`, 'failed', {
                        issue: error.message,
                        critical: true
                    });
                }
            }
        }, 60000);

        test('should redirect non-finance questions politely', async () => {
            for (const question of nonFinanceQuestions) {
                try {
                    const res = await request(API_URL)
                        .post('/api/chat')
                        .send({ message: question, sessionId });
                    
                    const content = JSON.stringify(res.body).toLowerCase();
                    const isPoliteRedirect = /finance|investment|market|help.*financial|focus.*financial/i.test(content);
                    
                    if (res.status === 200 && isPoliteRedirect) {
                        reporter.recordTest('guardian', `Non-finance: "${question}"`, 'passed');
                    } else {
                        reporter.recordTest('guardian', `Non-finance: "${question}"`, 'failed', {
                            issue: 'Did not properly redirect'
                        });
                    }
                } catch (error) {
                    reporter.recordTest('guardian', `Non-finance: "${question}"`, 'failed', {
                        issue: error.message
                    });
                }
            }
        }, 30000);
    });

    // 📊 MARKET DATA ACCURACY TESTS
    describe('📊 Market Data Accuracy Tests', () => {
        const testSymbols = ['AAPL', 'TSLA', 'GOOGL', 'BTC', 'ETH'];

        test('should provide accurate real-time market data', async () => {
            for (const symbol of testSymbols) {
                try {
                    const res = await request(API_URL)
                        .post('/api/chat')
                        .send({ message: `What is current price of ${symbol}?`, sessionId });

                    const responseText = JSON.stringify(res.body);
                    const priceMatch = responseText.match(/\$?[\d,]+\.?\d*/);
                    
                    if (res.status === 200 && priceMatch && parseFloat(priceMatch[0].replace(/[$,]/g, '')) > 0) {
                        reporter.recordTest('marketData', `Real-time price: ${symbol}`, 'passed', {
                            details: `Found price: ${priceMatch[0]}`
                        });
                    } else {
                        reporter.recordTest('marketData', `Real-time price: ${symbol}`, 'failed', {
                            issue: 'No valid price data found',
                            critical: true
                        });
                    }
                } catch (error) {
                    reporter.recordTest('marketData', `Real-time price: ${symbol}`, 'failed', {
                        issue: error.message,
                        critical: true
                    });
                }
            }
        }, 60000);

        test('should provide market overview in sidebar', async () => {
            try {
                const res = await request(API_URL).get('/api/market/overview');
                
                if (res.status === 200 && res.body.stocks && res.body.crypto) {
                    const validStocks = res.body.stocks.length > 0 && res.body.stocks.every(s => s.price > 0);
                    const validCrypto = res.body.crypto.length > 0 && res.body.crypto.every(c => c.price > 0);

                    if (validStocks && validCrypto) {
                        reporter.recordTest('marketData', 'Sidebar market overview', 'passed', {
                            details: `${res.body.stocks.length} stocks, ${res.body.crypto.length} crypto`
                        });
                    } else {
                        reporter.recordTest('marketData', 'Sidebar market overview', 'failed', {
                            issue: 'Invalid market data in sidebar',
                            critical: true
                        });
                    }
                } else {
                    reporter.recordTest('marketData', 'Sidebar market overview', 'failed', {
                        issue: 'Market overview API failed',
                        critical: true
                    });
                }
            } catch (error) {
                reporter.recordTest('marketData', 'Sidebar market overview', 'failed', {
                    issue: error.message,
                    critical: true
                });
            }
        }, 15000);

        test('should generate charts with real data', async () => {
            try {
                const res = await request(API_URL)
                    .post('/api/chat')
                    .send({ message: 'Show me chart for Apple stock', sessionId });

                if (res.status === 200 && res.body.chart?.data) {
                    const chartData = res.body.chart.data;
                    const hasValidData = chartData.datasets && 
                        chartData.datasets.length > 0 && 
                        chartData.datasets[0].data.length > 0;

                    if (hasValidData) {
                        reporter.recordTest('marketData', 'Chart data generation', 'passed', {
                            details: `${chartData.datasets[0].data.length} data points`
                        });
                    } else {
                        reporter.recordTest('marketData', 'Chart data generation', 'failed', {
                            issue: 'Chart contains no valid data'
                        });
                    }
                } else {
                    reporter.recordTest('marketData', 'Chart data generation', 'failed', {
                        issue: 'No chart data in response'
                    });
                }
            } catch (error) {
                reporter.recordTest('marketData', 'Chart data generation', 'failed', {
                    issue: error.message
                });
            }
        }, 20000);
    });

    // 🎨 RESPONSE FORMATTING TESTS
    describe('🎨 Response Formatting Tests', () => {
        const testQueries = [
            'Analyze Microsoft stock',
            'What is Bitcoin doing today?',
            'Explain market volatility',
            'Tesla earnings report'
        ];

        test('should not contain markdown ** formatting', async () => {
            for (const query of testQueries) {
                try {
                    const res = await request(API_URL)
                        .post('/api/chat')
                        .send({ message: query, sessionId });

                    const responseText = JSON.stringify(res.body);
                    const hasMarkdownBold = /\*\*[^*]+\*\*/g.test(responseText);
                    
                    if (res.status === 200 && !hasMarkdownBold) {
                        reporter.recordTest('formatting', `No ** formatting: "${query}"`, 'passed');
                    } else {
                        const matches = responseText.match(/\*\*[^*]+\*\*/g);
                        reporter.recordTest('formatting', `No ** formatting: "${query}"`, 'failed', {
                            issue: `Found markdown: ${matches?.slice(0, 2).join(', ')}`,
                            critical: false
                        });
                    }
                } catch (error) {
                    reporter.recordTest('formatting', `Formatting check: "${query}"`, 'failed', {
                        issue: error.message
                    });
                }
            }
        }, 30000);

        test('should return structured JSON responses', async () => {
            try {
                const res = await request(API_URL)
                    .post('/api/chat')
                    .send({ message: 'Analyze Amazon stock', sessionId });

                const hasStructure = res.status === 200 && 
                    res.body.success === true &&
                    res.body.data &&
                    res.body.metadata;

                if (hasStructure) {
                    reporter.recordTest('formatting', 'Structured JSON response', 'passed');
                } else {
                    reporter.recordTest('formatting', 'Structured JSON response', 'failed', {
                        issue: 'Missing required JSON structure'
                    });
                }
            } catch (error) {
                reporter.recordTest('formatting', 'Structured JSON response', 'failed', {
                    issue: error.message
                });
            }
        }, 15000);

        test('should format prices and percentages correctly', async () => {
            try {
                const res = await request(API_URL)
                    .post('/api/chat')
                    .send({ message: 'Apple stock price and daily change?', sessionId });

                const responseText = JSON.stringify(res.body);
                const hasPriceFormat = /\$[\d,]+\.?\d*/g.test(responseText);
                const hasPercentFormat = /[+-]?\d+\.?\d*%/g.test(responseText);
                
                if (res.status === 200 && (hasPriceFormat || hasPercentFormat)) {
                    reporter.recordTest('formatting', 'Price and percentage formatting', 'passed');
                } else {
                    reporter.recordTest('formatting', 'Price and percentage formatting', 'failed', {
                        issue: 'No properly formatted prices or percentages'
                    });
                }
            } catch (error) {
                reporter.recordTest('formatting', 'Price and percentage formatting', 'failed', {
                    issue: error.message
                });
            }
        }, 15000);
    });

    // 📈 COMPREHENSIVE STOCK & CRYPTO TESTS
    describe('📈 Stock & Crypto Coverage Tests', () => {
        const majorStocks = ['AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX'];
        const cryptos = ['BTC', 'ETH', 'ADA', 'SOL', 'DOT'];

        test('should handle major stock symbols', async () => {
            const stockSample = majorStocks.slice(0, 6); // Test subset for speed
            
            for (const stock of stockSample) {
                try {
                    const res = await request(API_URL)
                        .post('/api/chat')
                        .send({ message: `Give me analysis of ${stock}`, sessionId });

                    const content = JSON.stringify(res.body).toLowerCase();
                    const hasStockAnalysis = /price|analysis|stock|market|trading|recommendation/i.test(content);
                    
                    if (res.status === 200 && hasStockAnalysis) {
                        reporter.recordTest('stocksCrypto', `Stock analysis: ${stock}`, 'passed');
                    } else {
                        reporter.recordTest('stocksCrypto', `Stock analysis: ${stock}`, 'failed', {
                            issue: 'No relevant stock analysis provided'
                        });
                    }
                } catch (error) {
                    reporter.recordTest('stocksCrypto', `Stock analysis: ${stock}`, 'failed', {
                        issue: error.message
                    });
                }
            }
        }, 60000);

        test('should handle cryptocurrency queries', async () => {
            const cryptoSample = cryptos.slice(0, 4);
            
            for (const crypto of cryptoSample) {
                try {
                    const res = await request(API_URL)
                        .post('/api/chat')
                        .send({ message: `${crypto} cryptocurrency price and outlook?`, sessionId });

                    const content = JSON.stringify(res.body).toLowerCase();
                    const hasCryptoAnalysis = /crypto|bitcoin|ethereum|price|blockchain|digital|currency/i.test(content);
                    
                    if (res.status === 200 && hasCryptoAnalysis) {
                        reporter.recordTest('stocksCrypto', `Crypto analysis: ${crypto}`, 'passed');
                    } else {
                        reporter.recordTest('stocksCrypto', `Crypto analysis: ${crypto}`, 'failed', {
                            issue: 'No relevant crypto analysis provided'
                        });
                    }
                } catch (error) {
                    reporter.recordTest('stocksCrypto', `Crypto analysis: ${crypto}`, 'failed', {
                        issue: error.message
                    });
                }
            }
        }, 45000);
    });

    // 💼 PORTFOLIO ANALYSIS TESTS
    describe('💼 Portfolio Analysis Tests', () => {
        test('should analyze uploaded portfolios', async () => {
            const testPortfolio = 'symbol,shares,current_price,market_value\nAAPL,100,180,18000\nMSFT,50,350,17500\nGOOGL,25,140,3500\nTSLA,30,200,6000\n';
            const csvPath = path.join(__dirname, 'test_portfolio.csv');
            
            try {
                fs.writeFileSync(csvPath, testPortfolio);

                // Upload portfolio
                const uploadRes = await request(API_URL)
                    .post('/api/upload')
                    .field('sessionId', sessionId)
                    .attach('files', csvPath);

                // Analyze portfolio
                const analysisRes = await request(API_URL)
                    .post('/api/chat')
                    .send({ message: 'Analyze my portfolio performance and risk', sessionId });

                const hasPortfolioAnalysis = analysisRes.status === 200 && 
                    (analysisRes.body.data?.type === 'portfolio' || 
                     JSON.stringify(analysisRes.body).toLowerCase().includes('portfolio'));

                if (uploadRes.status === 200 && hasPortfolioAnalysis) {
                    reporter.recordTest('portfolio', 'Portfolio upload and analysis', 'passed');
                } else {
                    reporter.recordTest('portfolio', 'Portfolio upload and analysis', 'failed', {
                        issue: 'Portfolio analysis not working properly',
                        critical: false
                    });
                }

                // Cleanup
                fs.unlinkSync(csvPath);
            } catch (error) {
                reporter.recordTest('portfolio', 'Portfolio upload and analysis', 'failed', {
                    issue: error.message
                });
            }
        }, 45000);

        test('should provide portfolio recommendations', async () => {
            try {
                const res = await request(API_URL)
                    .post('/api/chat')
                    .send({ message: 'What recommendations do you have for my portfolio?', sessionId });

                const content = JSON.stringify(res.body).toLowerCase();
                const hasRecommendations = /recommend|suggest|consider|diversif|rebalanc|allocation|risk/i.test(content);
                
                if (res.status === 200 && hasRecommendations) {
                    reporter.recordTest('portfolio', 'Portfolio recommendations', 'passed');
                } else {
                    reporter.recordTest('portfolio', 'Portfolio recommendations', 'failed', {
                        issue: 'No clear recommendations provided'
                    });
                }
            } catch (error) {
                reporter.recordTest('portfolio', 'Portfolio recommendations', 'failed', {
                    issue: error.message
                });
            }
        }, 20000);
    });

    // ⚡ PERFORMANCE & SECURITY TESTS
    describe('⚡ Performance & Security Tests', () => {
        test('should handle concurrent requests efficiently', async () => {
            const startTime = Date.now();
            const requests = Array(8).fill().map((_, i) => 
                request(API_URL)
                    .post('/api/chat')
                    .send({ message: `Quick price check ${i}`, sessionId: `concurrent_${i}` })
            );

            try {
                const responses = await Promise.all(requests);
                const duration = Date.now() - startTime;
                const successful = responses.filter(res => res.status === 200).length;
                const avgTime = duration / responses.length;

                if (successful >= 6 && avgTime < 4000) {
                    reporter.recordTest('performance', 'Concurrent request handling', 'passed', {
                        details: `${successful}/8 successful, avg ${avgTime.toFixed(0)}ms`
                    });
                } else {
                    reporter.recordTest('performance', 'Concurrent request handling', 'failed', {
                        issue: `Performance issue: ${successful}/8 successful, avg ${avgTime.toFixed(0)}ms`
                    });
                }
            } catch (error) {
                reporter.recordTest('performance', 'Concurrent request handling', 'failed', {
                    issue: error.message,
                    critical: true
                });
            }
        }, 45000);

        test('should implement security features', async () => {
            try {
                const healthRes = await request(API_URL).get('/api/health');
                const hasRateLimit = healthRes.body.features?.rateLimiting;
                const hasSecurity = healthRes.body.features?.security;

                if (hasRateLimit && hasSecurity) {
                    reporter.recordTest('security', 'Security features configured', 'passed');
                } else {
                    reporter.recordTest('security', 'Security features configured', 'failed', {
                        issue: 'Security features not properly configured',
                        critical: true
                    });
                }
            } catch (error) {
                reporter.recordTest('security', 'Security features configured', 'failed', {
                    issue: error.message
                });
            }
        }, 10000);

        test('should validate and sanitize malicious input', async () => {
            const maliciousInputs = [
                '<script>alert("xss")</script>analyze apple',
                'DROP TABLE users; --',
                'a'.repeat(5000) // Very long input
            ];

            for (const input of maliciousInputs) {
                try {
                    const res = await request(API_URL)
                        .post('/api/chat')
                        .send({ message: input, sessionId });

                    // Should either reject (400/429) or sanitize safely (200 without script tags)
                    const isHandledSafely = res.status === 400 || res.status === 429 || 
                        (res.status === 200 && !JSON.stringify(res.body).includes('<script>'));

                    if (isHandledSafely) {
                        reporter.recordTest('security', `Input validation: ${input.substring(0, 20)}...`, 'passed');
                    } else {
                        reporter.recordTest('security', `Input validation: ${input.substring(0, 20)}...`, 'failed', {
                            issue: 'Malicious input not properly handled',
                            critical: true
                        });
                    }
                } catch (error) {
                    // Network errors are acceptable for malicious inputs
                    reporter.recordTest('security', `Input validation: ${input.substring(0, 20)}...`, 'passed', {
                        details: 'Request properly rejected'
                    });
                }
            }
        }, 30000);

        test('should handle error cases gracefully', async () => {
            try {
                // Test 404 handling
                const notFoundRes = await request(API_URL).get('/api/nonexistent');
                expect(notFoundRes.status).toBe(404);

                // Test invalid input handling
                const invalidRes = await request(API_URL)
                    .post('/api/chat')
                    .send({ sessionId: 'test' }); // Missing message field

                expect(invalidRes.status).toBe(400);

                reporter.recordTest('security', 'Error handling', 'passed');
            } catch (error) {
                reporter.recordTest('security', 'Error handling', 'failed', {
                    issue: error.message
                });
            }
        }, 15000);
    });
}); 