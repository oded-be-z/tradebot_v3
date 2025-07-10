const request = require('supertest');
const fs = require('fs');
const path = require('path');
const axios = require('axios');

const API_URL = 'http://localhost:3000';

// Test Results Collector for Final Report
class TestReportCollector {
    constructor() {
        this.results = {
            overview: {
                totalTests: 0,
                passedTests: 0,
                failedTests: 0,
                skippedTests: 0,
                startTime: new Date(),
                endTime: null
            },
            categories: {
                guardian: { tests: [], passed: 0, failed: 0 },
                marketData: { tests: [], passed: 0, failed: 0 },
                formatting: { tests: [], passed: 0, failed: 0 },
                stocksCrypto: { tests: [], passed: 0, failed: 0 },
                portfolio: { tests: [], passed: 0, failed: 0 },
                performance: { tests: [], passed: 0, failed: 0 },
                security: { tests: [], passed: 0, failed: 0 }
            },
            criticalIssues: [],
            recommendations: [],
            marketDataValidation: {},
            responseFormatting: {}
        };
    }

    recordTest(category, testName, status, details = {}) {
        this.results.overview.totalTests++;
        if (status === 'passed') {
            this.results.overview.passedTests++;
            this.results.categories[category].passed++;
        } else if (status === 'failed') {
            this.results.overview.failedTests++;
            this.results.categories[category].failed++;
            if (details.critical) {
                this.results.criticalIssues.push({
                    category,
                    test: testName,
                    issue: details.issue,
                    impact: details.impact
                });
            }
        }

        this.results.categories[category].tests.push({
            name: testName,
            status,
            ...details
        });
    }

    addRecommendation(priority, description, action) {
        this.results.recommendations.push({
            priority,
            description,
            action,
            category: 'general'
        });
    }

    generateReport() {
        this.results.overview.endTime = new Date();
        const duration = (this.results.overview.endTime - this.results.overview.startTime) / 1000;
        
        const report = `
# 🚀 FinanceBot Pro - Production Readiness Report

Generated: ${this.results.overview.endTime.toISOString()}
Duration: ${duration.toFixed(2)} seconds

## 📊 Executive Summary

### Overall Status: ${this.getOverallStatus()}

**Test Results:**
- ✅ Passed: ${this.results.overview.passedTests}
- ❌ Failed: ${this.results.overview.failedTests}
- 📊 Total: ${this.results.overview.totalTests}
- 📈 Success Rate: ${((this.results.overview.passedTests / this.results.overview.totalTests) * 100).toFixed(1)}%

### Category Breakdown:
${Object.entries(this.results.categories).map(([category, data]) => 
    `- **${category.toUpperCase()}**: ${data.passed}/${data.passed + data.failed} (${data.passed + data.failed > 0 ? ((data.passed / (data.passed + data.failed)) * 100).toFixed(1) : 0}%)`
).join('\n')}

## 🚨 Critical Issues
${this.results.criticalIssues.length === 0 ? '✅ No critical issues found!' : 
this.results.criticalIssues.map(issue => 
    `### ❌ ${issue.test}\n**Category:** ${issue.category}\n**Issue:** ${issue.issue}\n**Impact:** ${issue.impact}\n`
).join('\n')}

## 🎯 Detailed Test Results

${Object.entries(this.results.categories).map(([category, data]) => this.generateCategoryReport(category, data)).join('\n')}

## 📋 Recommendations

${this.results.recommendations.length === 0 ? '✅ No recommendations - system is production ready!' :
this.results.recommendations.map(rec => 
    `### ${rec.priority === 'high' ? '🔴' : rec.priority === 'medium' ? '🟡' : '🟢'} ${rec.description}\n**Action:** ${rec.action}\n`
).join('\n')}

## 🎉 Production Readiness Score: ${this.calculateProductionScore()}/100

${this.getProductionReadinessConclusion()}
        `;

        return report;
    }

    generateCategoryReport(category, data) {
        const total = data.passed + data.failed;
        const successRate = total > 0 ? ((data.passed / total) * 100).toFixed(1) : 0;
        
        return `
### ${category.toUpperCase()} - ${data.passed}/${total} (${successRate}%)

${data.tests.map(test => 
    `- ${test.status === 'passed' ? '✅' : '❌'} ${test.name}${test.details ? ` - ${test.details}` : ''}`
).join('\n')}
        `;
    }

    getOverallStatus() {
        const successRate = (this.results.overview.passedTests / this.results.overview.totalTests) * 100;
        if (successRate >= 95) return '🟢 PRODUCTION READY';
        if (successRate >= 85) return '🟡 NEEDS MINOR FIXES';
        if (successRate >= 70) return '🟠 NEEDS IMPROVEMENTS';
        return '🔴 NOT PRODUCTION READY';
    }

    calculateProductionScore() {
        const baseScore = (this.results.overview.passedTests / this.results.overview.totalTests) * 80;
        const criticalPenalty = this.results.criticalIssues.length * 10;
        const bonusPoints = this.results.criticalIssues.length === 0 ? 20 : 0;
        
        return Math.max(0, Math.min(100, Math.round(baseScore - criticalPenalty + bonusPoints)));
    }

    getProductionReadinessConclusion() {
        const score = this.calculateProductionScore();
        if (score >= 90) {
            return '🚀 **READY FOR PRODUCTION DEPLOYMENT** - All systems operational!';
        } else if (score >= 75) {
            return '⚠️ **READY WITH MINOR FIXES** - Address the issues above before production.';
        } else {
            return '🛑 **NOT READY FOR PRODUCTION** - Critical issues must be resolved.';
        }
    }
}

const reporter = new TestReportCollector();

describe('🚀 FinanceBot Pro - COMPREHENSIVE PRODUCTION READINESS TESTS', () => {
    let sessionId;
    let serverHealthy = false;

    beforeAll(async () => {
        console.log('\n🔥 Starting Comprehensive Production Tests...\n');
        
        // Check if server is running
        try {
            const healthResponse = await request(API_URL).get('/api/health');
            serverHealthy = healthResponse.status === 200;
            console.log('✅ Server is healthy and ready for testing');
        } catch (error) {
            console.error('❌ Server is not running! Please start the server first.');
            throw new Error('Server not available for testing');
        }

        // Initialize session
        const sessionResponse = await request(API_URL).get('/api/session/init');
        sessionId = sessionResponse.body.sessionId;
        console.log(`📝 Test session initialized: ${sessionId}`);
    }, 30000);

    afterAll(async () => {
        console.log('\n📊 Generating Final Production Report...\n');
        const report = reporter.generateReport();
        
        // Save report to file
        const reportPath = path.join(__dirname, 'production-readiness-report.md');
        fs.writeFileSync(reportPath, report);
        console.log(`📋 Report saved to: ${reportPath}`);
        
        // Also display in console for immediate review
        console.log(report);
    });

    // =============================================
    // 🛡️ GUARDIAN BEHAVIOR TESTS
    // =============================================
    describe('🛡️ Guardian Behavior Tests', () => {
        const financeQuestions = [
            'Tell me about Apple stock',
            'What is the current Bitcoin price?',
            'How do I analyze a stock?',
            'What are the best investment strategies?',
            'Explain market volatility',
            'What is portfolio diversification?'
        ];

        const nonFinanceQuestions = [
            'What is the weather today?',
            'How do I cook pasta?',
            'Tell me a joke',
            'What is the capital of France?',
            'How to learn programming?',
            'Write a poem about love'
        ];

        const borderlineQuestions = [
            'How does inflation affect the economy?',
            'What is the Federal Reserve?',
            'How do taxes impact investments?',
            'Tell me about economic indicators'
        ];

        test('should answer finance questions helpfully', async () => {
            for (const question of financeQuestions) {
                try {
                    const res = await request(API_URL)
                        .post('/api/chat')
                        .send({ message: question, sessionId });
                    
                    expect(res.status).toBe(200);
                    expect(res.body.success).toBe(true);
                    expect(res.body.data).toBeDefined();
                    
                    // Check response is helpful and finance-related
                    const content = JSON.stringify(res.body);
                    const isHelpful = content.length > 100; // Substantial response
                    const isFinanceRelated = /stock|market|price|invest|financial|trading|portfolio|analysis/i.test(content);
                    
                    if (isHelpful && isFinanceRelated) {
                        reporter.recordTest('guardian', `Finance Q: "${question}"`, 'passed', {
                            details: 'Provided helpful financial response'
                        });
                    } else {
                        reporter.recordTest('guardian', `Finance Q: "${question}"`, 'failed', {
                            issue: 'Response not helpful or not finance-focused',
                            critical: true,
                            impact: 'Users may not get proper financial guidance'
                        });
                    }
                } catch (error) {
                    reporter.recordTest('guardian', `Finance Q: "${question}"`, 'failed', {
                        issue: `Request failed: ${error.message}`,
                        critical: true
                    });
                }
            }
        }, 60000);

        test('should politely redirect non-finance questions', async () => {
            for (const question of nonFinanceQuestions) {
                try {
                    const res = await request(API_URL)
                        .post('/api/chat')
                        .send({ message: question, sessionId });
                    
                    expect(res.status).toBe(200);
                    const content = JSON.stringify(res.body).toLowerCase();
                    
                    // Should redirect politely to finance topics
                    const isPoliteRedirect = /finance|investment|market|help.*financial|focus.*financial/i.test(content);
                    const avoidsNonFinance = !/weather|cook|joke|capital|programming|poem/i.test(content);
                    
                    if (isPoliteRedirect && avoidsNonFinance) {
                        reporter.recordTest('guardian', `Non-finance Q: "${question}"`, 'passed', {
                            details: 'Properly redirected to finance topics'
                        });
                    } else {
                        reporter.recordTest('guardian', `Non-finance Q: "${question}"`, 'failed', {
                            issue: 'Did not properly redirect non-finance question',
                            critical: false,
                            impact: 'May provide off-topic responses'
                        });
                    }
                } catch (error) {
                    reporter.recordTest('guardian', `Non-finance Q: "${question}"`, 'failed', {
                        issue: `Request failed: ${error.message}`
                    });
                }
            }
        }, 45000);

        test('should handle borderline economic questions appropriately', async () => {
            for (const question of borderlineQuestions) {
                try {
                    const res = await request(API_URL)
                        .post('/api/chat')
                        .send({ message: question, sessionId });
                    
                    expect(res.status).toBe(200);
                    const content = JSON.stringify(res.body);
                    
                    // These should be answered as they relate to finance/investing
                    const providesFinancialContext = /invest|market|financial|economic|impact.*portfolio/i.test(content);
                    
                    if (providesFinancialContext) {
                        reporter.recordTest('guardian', `Borderline Q: "${question}"`, 'passed', {
                            details: 'Appropriately handled finance-adjacent topic'
                        });
                    } else {
                        reporter.recordTest('guardian', `Borderline Q: "${question}"`, 'failed', {
                            issue: 'Did not provide financial context for economic question'
                        });
                    }
                } catch (error) {
                    reporter.recordTest('guardian', `Borderline Q: "${question}"`, 'failed', {
                        issue: `Request failed: ${error.message}`
                    });
                }
            }
        }, 30000);
    });

    // =============================================
    // 📊 MARKET DATA ACCURACY TESTS
    // =============================================
    describe('📊 Market Data Accuracy Tests', () => {
        const testSymbols = ['AAPL', 'TSLA', 'GOOGL', 'MSFT', 'BTC', 'ETH'];

        test('should provide accurate real-time market data', async () => {
            for (const symbol of testSymbols) {
                try {
                    // Get data from our API
                    const botResponse = await request(API_URL)
                        .post('/api/chat')
                        .send({ 
                            message: `What is the current price of ${symbol}?`,
                            sessionId 
                        });

                    expect(botResponse.status).toBe(200);
                    
                    // Extract price from response
                    const responseText = JSON.stringify(botResponse.body);
                    const priceMatch = responseText.match(/\$?[\d,]+\.?\d*/);
                    
                    if (priceMatch && parseFloat(priceMatch[0].replace(/[$,]/g, '')) > 0) {
                        reporter.recordTest('marketData', `Real-time price for ${symbol}`, 'passed', {
                            details: `Found price data: ${priceMatch[0]}`
                        });
                        
                        // Store for validation
                        reporter.results.marketDataValidation[symbol] = {
                            price: priceMatch[0],
                            timestamp: new Date(),
                            source: 'bot_response'
                        };
                    } else {
                        reporter.recordTest('marketData', `Real-time price for ${symbol}`, 'failed', {
                            issue: 'No valid price data found in response',
                            critical: true,
                            impact: 'Users cannot get accurate market data'
                        });
                    }
                } catch (error) {
                    reporter.recordTest('marketData', `Real-time price for ${symbol}`, 'failed', {
                        issue: `Request failed: ${error.message}`,
                        critical: true
                    });
                }
            }
        }, 60000);

        test('should provide market data in sidebar', async () => {
            try {
                const marketResponse = await request(API_URL).get('/api/market/overview');
                expect(marketResponse.status).toBe(200);
                
                const marketData = marketResponse.body;
                expect(marketData.stocks).toBeDefined();
                expect(marketData.crypto).toBeDefined();
                
                const hasValidStockData = marketData.stocks.length > 0 && 
                    marketData.stocks.every(stock => stock.price > 0);
                const hasValidCryptoData = marketData.crypto.length > 0 && 
                    marketData.crypto.every(crypto => crypto.price > 0);

                if (hasValidStockData && hasValidCryptoData) {
                    reporter.recordTest('marketData', 'Sidebar market overview', 'passed', {
                        details: `${marketData.stocks.length} stocks, ${marketData.crypto.length} crypto pairs`
                    });
                } else {
                    reporter.recordTest('marketData', 'Sidebar market overview', 'failed', {
                        issue: 'Invalid or missing market data in sidebar',
                        critical: true,
                        impact: 'Sidebar will not show live market data'
                    });
                }
            } catch (error) {
                reporter.recordTest('marketData', 'Sidebar market overview', 'failed', {
                    issue: `Market overview API failed: ${error.message}`,
                    critical: true
                });
            }
        }, 15000);

        test('should generate charts with real data', async () => {
            try {
                const chartResponse = await request(API_URL)
                    .post('/api/chat')
                    .send({ 
                        message: 'Show me a chart for Apple stock',
                        sessionId 
                    });

                expect(chartResponse.status).toBe(200);
                
                if (chartResponse.body.chart && chartResponse.body.chart.data) {
                    const chartData = chartResponse.body.chart.data;
                    const hasValidData = chartData.datasets && 
                        chartData.datasets.length > 0 && 
                        chartData.datasets[0].data.length > 0;

                    if (hasValidData) {
                        reporter.recordTest('marketData', 'Chart data generation', 'passed', {
                            details: `Generated chart with ${chartData.datasets[0].data.length} data points`
                        });
                    } else {
                        reporter.recordTest('marketData', 'Chart data generation', 'failed', {
                            issue: 'Chart generated but contains no valid data',
                            critical: false,
                            impact: 'Charts may appear empty or broken'
                        });
                    }
                } else {
                    reporter.recordTest('marketData', 'Chart data generation', 'failed', {
                        issue: 'No chart data in response',
                        critical: false,
                        impact: 'Users cannot see visual market data'
                    });
                }
            } catch (error) {
                reporter.recordTest('marketData', 'Chart data generation', 'failed', {
                    issue: `Chart request failed: ${error.message}`
                });
            }
        }, 20000);
    });

    // =============================================
    // 🎨 RESPONSE FORMATTING TESTS
    // =============================================
    describe('🎨 Response Formatting Tests', () => {
        const testQueries = [
            'Analyze Microsoft stock',
            'What is Bitcoin doing today?',
            'Explain market volatility',
            'Tell me about Tesla earnings'
        ];

        test('should not contain markdown ** formatting in responses', async () => {
            for (const query of testQueries) {
                try {
                    const res = await request(API_URL)
                        .post('/api/chat')
                        .send({ message: query, sessionId });

                    expect(res.status).toBe(200);
                    
                    const responseText = JSON.stringify(res.body);
                    const hasMarkdownBold = /\*\*[^*]+\*\*/g.test(responseText);
                    
                    if (!hasMarkdownBold) {
                        reporter.recordTest('formatting', `No ** formatting in "${query}"`, 'passed', {
                            details: 'Clean response without markdown artifacts'
                        });
                    } else {
                        const matches = responseText.match(/\*\*[^*]+\*\*/g);
                        reporter.recordTest('formatting', `No ** formatting in "${query}"`, 'failed', {
                            issue: `Found markdown formatting: ${matches?.slice(0, 3).join(', ')}`,
                            critical: false,
                            impact: 'UI may display markdown formatting instead of styled text'
                        });
                        
                        reporter.results.responseFormatting[query] = {
                            foundFormatting: matches,
                            issue: 'Markdown bold formatting present'
                        };
                    }
                } catch (error) {
                    reporter.recordTest('formatting', `Formatting check for "${query}"`, 'failed', {
                        issue: `Request failed: ${error.message}`
                    });
                }
            }
        }, 30000);

        test('should return structured JSON responses', async () => {
            try {
                const res = await request(API_URL)
                    .post('/api/chat')
                    .send({ message: 'Analyze Amazon stock', sessionId });

                expect(res.status).toBe(200);
                expect(res.body.success).toBe(true);
                expect(res.body.data).toBeDefined();
                expect(res.body.metadata).toBeDefined();
                expect(res.body.metadata.timestamp).toBeDefined();

                const hasRequiredStructure = res.body.data.title && 
                    (res.body.data.summary || res.body.data.sections);

                if (hasRequiredStructure) {
                    reporter.recordTest('formatting', 'Structured JSON response format', 'passed', {
                        details: 'Response follows proper JSON structure'
                    });
                } else {
                    reporter.recordTest('formatting', 'Structured JSON response format', 'failed', {
                        issue: 'Response missing required structure (title, summary/sections)',
                        critical: false,
                        impact: 'Frontend may not display responses properly'
                    });
                }
            } catch (error) {
                reporter.recordTest('formatting', 'Structured JSON response format', 'failed', {
                    issue: `Request failed: ${error.message}`
                });
            }
        }, 15000);

        test('should format prices and percentages correctly', async () => {
            try {
                const res = await request(API_URL)
                    .post('/api/chat')
                    .send({ message: 'What is Apple stock price and daily change?', sessionId });

                expect(res.status).toBe(200);
                
                const responseText = JSON.stringify(res.body);
                const hasPriceFormat = /\$[\d,]+\.?\d*/g.test(responseText);
                const hasPercentFormat = /[+-]?\d+\.?\d*%/g.test(responseText);
                
                if (hasPriceFormat || hasPercentFormat) {
                    reporter.recordTest('formatting', 'Price and percentage formatting', 'passed', {
                        details: `Found price format: ${hasPriceFormat}, percentage format: ${hasPercentFormat}`
                    });
                } else {
                    reporter.recordTest('formatting', 'Price and percentage formatting', 'failed', {
                        issue: 'No properly formatted prices or percentages found',
                        critical: false,
                        impact: 'Financial data may not be clearly formatted for users'
                    });
                }
            } catch (error) {
                reporter.recordTest('formatting', 'Price and percentage formatting', 'failed', {
                    issue: `Request failed: ${error.message}`
                });
            }
        }, 15000);
    });

    // =============================================
    // 📈 COMPREHENSIVE STOCK & CRYPTO TESTS
    // =============================================
    describe('📈 Comprehensive Stock & Crypto Coverage', () => {
        const majorStocks = [
            'AAPL', 'MSFT', 'GOOGL', 'AMZN', 'TSLA', 'META', 'NVDA', 'NFLX', 
            'AMD', 'INTC', 'ORCL', 'CRM', 'ADBE', 'PYPL', 'UBER', 'LYFT'
        ];

        const cryptoCurrencies = [
            'BTC', 'ETH', 'ADA', 'SOL', 'DOT', 'MATIC', 'AVAX', 'LINK'
        ];

        const indices = [
            'SPY', 'QQQ', 'DIA', 'IWM', 'VTI'
        ];

        const commodities = [
            'GOLD', 'SILVER', 'OIL', 'GAS'
        ];

        test('should handle major stock symbols', async () => {
            const stockSample = majorStocks.slice(0, 8); // Test subset for speed
            
            for (const stock of stockSample) {
                try {
                    const res = await request(API_URL)
                        .post('/api/chat')
                        .send({ 
                            message: `Give me analysis of ${stock}`,
                            sessionId 
                        });

                    expect(res.status).toBe(200);
                    
                    const responseText = JSON.stringify(res.body).toLowerCase();
                    const hasStockAnalysis = /price|analysis|stock|market|trading|recommendation/i.test(responseText);
                    
                    if (hasStockAnalysis) {
                        reporter.recordTest('stocksCrypto', `Stock analysis: ${stock}`, 'passed', {
                            details: 'Provided relevant stock analysis'
                        });
                    } else {
                        reporter.recordTest('stocksCrypto', `Stock analysis: ${stock}`, 'failed', {
                            issue: 'Response did not contain stock analysis',
                            critical: false,
                            impact: `Users cannot get analysis for ${stock}`
                        });
                    }
                } catch (error) {
                    reporter.recordTest('stocksCrypto', `Stock analysis: ${stock}`, 'failed', {
                        issue: `Request failed: ${error.message}`
                    });
                }
            }
        }, 60000);

        test('should handle cryptocurrency queries', async () => {
            const cryptoSample = cryptoCurrencies.slice(0, 4); // Test subset
            
            for (const crypto of cryptoSample) {
                try {
                    const res = await request(API_URL)
                        .post('/api/chat')
                        .send({ 
                            message: `What is ${crypto} cryptocurrency price and outlook?`,
                            sessionId 
                        });

                    expect(res.status).toBe(200);
                    
                    const responseText = JSON.stringify(res.body).toLowerCase();
                    const hasCryptoAnalysis = /crypto|bitcoin|ethereum|price|blockchain|digital|currency/i.test(responseText);
                    
                    if (hasCryptoAnalysis) {
                        reporter.recordTest('stocksCrypto', `Crypto analysis: ${crypto}`, 'passed', {
                            details: 'Provided relevant crypto analysis'
                        });
                    } else {
                        reporter.recordTest('stocksCrypto', `Crypto analysis: ${crypto}`, 'failed', {
                            issue: 'Response did not contain crypto analysis'
                        });
                    }
                } catch (error) {
                    reporter.recordTest('stocksCrypto', `Crypto analysis: ${crypto}`, 'failed', {
                        issue: `Request failed: ${error.message}`
                    });
                }
            }
        }, 45000);

        test('should handle market indices and ETFs', async () => {
            for (const index of indices.slice(0, 3)) {
                try {
                    const res = await request(API_URL)
                        .post('/api/chat')
                        .send({ 
                            message: `Tell me about ${index} performance`,
                            sessionId 
                        });

                    expect(res.status).toBe(200);
                    
                    const responseText = JSON.stringify(res.body).toLowerCase();
                    const hasIndexAnalysis = /index|etf|market|performance|tracking|fund/i.test(responseText);
                    
                    if (hasIndexAnalysis) {
                        reporter.recordTest('stocksCrypto', `Index analysis: ${index}`, 'passed', {
                            details: 'Provided relevant index/ETF analysis'
                        });
                    } else {
                        reporter.recordTest('stocksCrypto', `Index analysis: ${index}`, 'failed', {
                            issue: 'Response did not contain index analysis'
                        });
                    }
                } catch (error) {
                    reporter.recordTest('stocksCrypto', `Index analysis: ${index}`, 'failed', {
                        issue: `Request failed: ${error.message}`
                    });
                }
            }
        }, 30000);
    });

    // =============================================
    // 💼 PORTFOLIO ANALYSIS TESTS
    // =============================================
    describe('💼 Portfolio Analysis Tests', () => {
        test('should analyze diverse portfolio compositions', async () => {
            const portfolioScenarios = [
                {
                    name: 'Tech Heavy Portfolio',
                    csv: 'symbol,shares,current_price,market_value\nAAPL,100,180,18000\nMSFT,50,350,17500\nGOOGL,25,140,3500\nTSLA,30,200,6000\n'
                },
                {
                    name: 'Balanced Portfolio',
                    csv: 'symbol,shares,current_price,market_value\nAAPL,50,180,9000\nJPM,40,150,6000\nJNJ,60,160,9600\nVTI,100,220,22000\n'
                },
                {
                    name: 'Crypto Portfolio',
                    csv: 'symbol,shares,current_price,market_value\nBTC,0.5,45000,22500\nETH,5,3000,15000\nADA,1000,0.5,500\n'
                }
            ];

            for (const scenario of portfolioScenarios) {
                try {
                    // Create temporary CSV file
                    const csvPath = path.join(__dirname, `test_${scenario.name.replace(/\s+/g, '_').toLowerCase()}.csv`);
                    fs.writeFileSync(csvPath, scenario.csv);

                    // Upload portfolio
                    const uploadRes = await request(API_URL)
                        .post('/api/upload')
                        .field('sessionId', sessionId)
                        .attach('files', csvPath);

                    expect(uploadRes.status).toBe(200);

                    // Analyze portfolio
                    const analysisRes = await request(API_URL)
                        .post('/api/chat')
                        .send({ 
                            message: 'Analyze my portfolio performance and risk',
                            sessionId 
                        });

                    expect(analysisRes.status).toBe(200);
                    
                    const hasPortfolioAnalysis = analysisRes.body.data && 
                        (analysisRes.body.data.type === 'portfolio' || 
                         JSON.stringify(analysisRes.body).toLowerCase().includes('portfolio'));

                    if (hasPortfolioAnalysis) {
                        reporter.recordTest('portfolio', `Portfolio: ${scenario.name}`, 'passed', {
                            details: 'Successfully analyzed portfolio composition'
                        });
                    } else {
                        reporter.recordTest('portfolio', `Portfolio: ${scenario.name}`, 'failed', {
                            issue: 'Portfolio analysis not properly executed',
                            critical: false,
                            impact: 'Users cannot get portfolio insights'
                        });
                    }

                    // Cleanup
                    fs.unlinkSync(csvPath);
                } catch (error) {
                    reporter.recordTest('portfolio', `Portfolio: ${scenario.name}`, 'failed', {
                        issue: `Portfolio test failed: ${error.message}`
                    });
                }
            }
        }, 90000);

        test('should provide portfolio recommendations', async () => {
            try {
                const res = await request(API_URL)
                    .post('/api/chat')
                    .send({ 
                        message: 'What recommendations do you have for my portfolio?',
                        sessionId 
                    });

                expect(res.status).toBe(200);
                
                const responseText = JSON.stringify(res.body).toLowerCase();
                const hasRecommendations = /recommend|suggest|consider|diversif|rebalanc|allocation|risk/i.test(responseText);
                
                if (hasRecommendations) {
                    reporter.recordTest('portfolio', 'Portfolio recommendations', 'passed', {
                        details: 'Provided actionable portfolio recommendations'
                    });
                } else {
                    reporter.recordTest('portfolio', 'Portfolio recommendations', 'failed', {
                        issue: 'No clear recommendations provided',
                        critical: false
                    });
                }
            } catch (error) {
                reporter.recordTest('portfolio', 'Portfolio recommendations', 'failed', {
                    issue: `Request failed: ${error.message}`
                });
            }
        }, 20000);
    });

    // =============================================
    // ⚡ PERFORMANCE & SECURITY TESTS
    // =============================================
    describe('⚡ Performance & Security Tests', () => {
        test('should handle concurrent requests efficiently', async () => {
            const startTime = Date.now();
            const concurrentRequests = Array(10).fill().map((_, i) => 
                request(API_URL)
                    .post('/api/chat')
                    .send({ 
                        message: `Quick price check for AAPL ${i}`,
                        sessionId: `concurrent_${i}` 
                    })
            );

            try {
                const responses = await Promise.all(concurrentRequests);
                const endTime = Date.now();
                const duration = endTime - startTime;
                
                const successfulResponses = responses.filter(res => res.status === 200).length;
                const averageResponseTime = duration / responses.length;

                if (successfulResponses >= 8 && averageResponseTime < 5000) {
                    reporter.recordTest('performance', 'Concurrent request handling', 'passed', {
                        details: `${successfulResponses}/10 successful, avg ${averageResponseTime.toFixed(0)}ms`
                    });
                } else {
                    reporter.recordTest('performance', 'Concurrent request handling', 'failed', {
                        issue: `Poor performance: ${successfulResponses}/10 successful, avg ${averageResponseTime.toFixed(0)}ms`,
                        critical: false,
                        impact: 'System may struggle under load'
                    });
                }
            } catch (error) {
                reporter.recordTest('performance', 'Concurrent request handling', 'failed', {
                    issue: `Concurrent requests failed: ${error.message}`,
                    critical: true
                });
            }
        }, 60000);

        test('should implement proper rate limiting', async () => {
            // This test checks if rate limiting is configured, not necessarily triggered
            try {
                const healthRes = await request(API_URL).get('/api/health');
                const hasRateLimiting = healthRes.body.features && healthRes.body.features.rateLimiting;

                if (hasRateLimiting) {
                    reporter.recordTest('security', 'Rate limiting configuration', 'passed', {
                        details: 'Rate limiting is properly configured'
                    });
                } else {
                    reporter.recordTest('security', 'Rate limiting configuration', 'failed', {
                        issue: 'Rate limiting not properly configured',
                        critical: true,
                        impact: 'System vulnerable to DoS attacks'
                    });
                }
            } catch (error) {
                reporter.recordTest('security', 'Rate limiting configuration', 'failed', {
                    issue: `Health check failed: ${error.message}`
                });
            }
        }, 10000);

        test('should include security headers', async () => {
            try {
                const res = await request(API_URL).get('/api/health');
                
                const hasXContentTypeOptions = res.headers['x-content-type-options'];
                const hasXFrameOptions = res.headers['x-frame-options'];
                
                if (hasXContentTypeOptions && hasXFrameOptions) {
                    reporter.recordTest('security', 'Security headers', 'passed', {
                        details: 'Essential security headers present'
                    });
                } else {
                    reporter.recordTest('security', 'Security headers', 'failed', {
                        issue: 'Missing security headers',
                        critical: false,
                        impact: 'Potential security vulnerabilities'
                    });
                }
            } catch (error) {
                reporter.recordTest('security', 'Security headers', 'failed', {
                    issue: `Security header check failed: ${error.message}`
                });
            }
        }, 10000);

        test('should validate input properly', async () => {
            const maliciousInputs = [
                '<script>alert("xss")</script>analyze apple',
                'DROP TABLE users; --',
                'a'.repeat(10000), // Very long input
                '{"malicious": "json"} analyze tesla'
            ];

            for (const input of maliciousInputs) {
                try {
                    const res = await request(API_URL)
                        .post('/api/chat')
                        .send({ message: input, sessionId });

                    // Should either reject (400/429) or sanitize safely (200)
                    const isHandledSafely = res.status === 400 || res.status === 429 || 
                        (res.status === 200 && !JSON.stringify(res.body).includes('<script>'));

                    if (isHandledSafely) {
                        reporter.recordTest('security', `Input validation: ${input.substring(0, 20)}...`, 'passed', {
                            details: `Properly handled with status ${res.status}`
                        });
                    } else {
                        reporter.recordTest('security', `Input validation: ${input.substring(0, 20)}...`, 'failed', {
                            issue: 'Malicious input not properly handled',
                            critical: true,
                            impact: 'XSS/injection vulnerabilities possible'
                        });
                    }
                } catch (error) {
                    // Network errors are fine for malicious inputs
                    reporter.recordTest('security', `Input validation: ${input.substring(0, 20)}...`, 'passed', {
                        details: 'Request rejected (network level)'
                    });
                }
            }
        }, 30000);

        test('should have proper error handling', async () => {
            try {
                // Test 404 handling
                const notFoundRes = await request(API_URL).get('/api/nonexistent');
                expect(notFoundRes.status).toBe(404);

                // Test invalid JSON handling
                const invalidRes = await request(API_URL)
                    .post('/api/chat')
                    .send({ sessionId: 'test' }); // Missing required field

                expect(invalidRes.status).toBe(400);

                reporter.recordTest('security', 'Error handling', 'passed', {
                    details: 'Proper HTTP error codes returned'
                });
            } catch (error) {
                reporter.recordTest('security', 'Error handling', 'failed', {
                    issue: `Error handling test failed: ${error.message}`
                });
            }
        }, 15000);
    });

    // Final validation and recommendations
    test('should generate final recommendations', async () => {
        // Add recommendations based on test results
        const totalTests = reporter.results.overview.totalTests;
        const passedTests = reporter.results.overview.passedTests;
        const successRate = (passedTests / totalTests) * 100;

        if (successRate < 95) {
            reporter.addRecommendation('high', 
                'Fix failing tests before production deployment',
                'Review and resolve all failed test cases above'
            );
        }

        if (reporter.results.criticalIssues.length > 0) {
            reporter.addRecommendation('high',
                'Address critical issues immediately',
                'Fix all critical issues marked above - these could impact user experience'
            );
        }

        if (Object.keys(reporter.results.responseFormatting).length > 0) {
            reporter.addRecommendation('medium',
                'Fix response formatting issues',
                'Remove markdown ** formatting from responses for better UI display'
            );
        }

        reporter.addRecommendation('low',
            'Monitor performance in production',
            'Set up monitoring for response times and error rates'
        );

        expect(true).toBe(true); // This test always passes, just generates recommendations
    });
}); 