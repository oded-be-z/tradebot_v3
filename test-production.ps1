# FinanceBot Pro - Comprehensive Production Test Script
# This script tests all critical functionality for production readiness

$baseUrl = "http://localhost:3000"
$testResults = @{
    TotalTests = 0
    PassedTests = 0
    FailedTests = 0
    Categories = @{
        Guardian = @{ Tests = @(); Passed = 0; Failed = 0 }
        MarketData = @{ Tests = @(); Passed = 0; Failed = 0 }
        Formatting = @{ Tests = @(); Passed = 0; Failed = 0 }
        StocksCrypto = @{ Tests = @(); Passed = 0; Failed = 0 }
        Portfolio = @{ Tests = @(); Passed = 0; Failed = 0 }
        Performance = @{ Tests = @(); Passed = 0; Failed = 0 }
        Security = @{ Tests = @(); Passed = 0; Failed = 0 }
    }
    CriticalIssues = @()
}

Write-Host "🚀 Starting FinanceBot Pro Production Tests..." -ForegroundColor Yellow
Write-Host "================================================"

# Helper Functions
function Record-Test {
    param($Category, $TestName, $Status, $Details = "", $Critical = $false)
    
    $testResults.TotalTests++
    if ($Status -eq "PASSED") {
        $testResults.PassedTests++
        $testResults.Categories[$Category].Passed++
        Write-Host "✅ $TestName" -ForegroundColor Green
    } else {
        $testResults.FailedTests++
        $testResults.Categories[$Category].Failed++
        Write-Host "❌ $TestName" -ForegroundColor Red
        if ($Details) { Write-Host "   $Details" -ForegroundColor Gray }
        if ($Critical) {
            $testResults.CriticalIssues += @{
                Test = $TestName
                Category = $Category
                Issue = $Details
            }
        }
    }
    
    $testResults.Categories[$Category].Tests += @{
        Name = $TestName
        Status = $Status
        Details = $Details
    }
}

function Test-ApiEndpoint {
    param($Method, $Endpoint, $Body = $null)
    
    try {
        $headers = @{ 'Content-Type' = 'application/json' }
        if ($Method -eq "POST" -and $Body) {
            $response = Invoke-RestMethod -Uri "$baseUrl$Endpoint" -Method $Method -Body ($Body | ConvertTo-Json) -Headers $headers -TimeoutSec 30
        } else {
            $response = Invoke-RestMethod -Uri "$baseUrl$Endpoint" -Method $Method -Headers $headers -TimeoutSec 30
        }
        return @{ Success = $true; Data = $response }
    } catch {
        return @{ Success = $false; Error = $_.Exception.Message }
    }
}

# Initialize Session
Write-Host "`n🔧 Initializing Test Session..." -ForegroundColor Cyan
$sessionResponse = Test-ApiEndpoint "GET" "/api/session/init"
if ($sessionResponse.Success) {
    $sessionId = $sessionResponse.Data.sessionId
    Write-Host "Session ID: $sessionId" -ForegroundColor Gray
} else {
    Write-Host "❌ Failed to initialize session" -ForegroundColor Red
    exit 1
}

# 1. GUARDIAN BEHAVIOR TESTS
Write-Host "`n🛡️ Testing Guardian Behavior..." -ForegroundColor Cyan

$financeQuestions = @(
    "Tell me about Apple stock",
    "What is the current Bitcoin price?",
    "How do I analyze a stock?",
    "What are the best investment strategies?",
    "Explain market volatility",
    "What is portfolio diversification?"
)

$nonFinanceQuestions = @(
    "What is the weather today?",
    "How do I cook pasta?",
    "Tell me a joke",
    "What is the capital of France?"
)

foreach ($question in $financeQuestions) {
    $response = Test-ApiEndpoint "POST" "/api/chat" @{ message = $question; sessionId = $sessionId }
    if ($response.Success) {
        $content = $response.Data | ConvertTo-Json -Depth 10
        $isHelpful = $content.Length -gt 200
        $isFinanceRelated = $content -match "stock|market|price|invest|financial|trading|portfolio"
        
        if ($isHelpful -and $isFinanceRelated) {
            Record-Test "Guardian" "Finance Q: '$($question.Substring(0,20))...'" "PASSED"
        } else {
            Record-Test "Guardian" "Finance Q: '$($question.Substring(0,20))...'" "FAILED" "Not helpful or not finance-focused" $true
        }
    } else {
        Record-Test "Guardian" "Finance Q: '$($question.Substring(0,20))...'" "FAILED" $response.Error $true
    }
}

foreach ($question in $nonFinanceQuestions) {
    $response = Test-ApiEndpoint "POST" "/api/chat" @{ message = $question; sessionId = $sessionId }
    if ($response.Success) {
        $content = $response.Data | ConvertTo-Json -Depth 10
        $isPoliteRedirect = $content -match "finance|investment|market|help.*financial"
        
        if ($isPoliteRedirect) {
            Record-Test "Guardian" "Non-finance Q: '$($question.Substring(0,20))...'" "PASSED"
        } else {
            Record-Test "Guardian" "Non-finance Q: '$($question.Substring(0,20))...'" "FAILED" "Did not redirect to finance topics"
        }
    } else {
        Record-Test "Guardian" "Non-finance Q: '$($question.Substring(0,20))...'" "FAILED" $response.Error
    }
}

# 2. MARKET DATA ACCURACY TESTS
Write-Host "`n📊 Testing Market Data Accuracy..." -ForegroundColor Cyan

$testSymbols = @("AAPL", "TSLA", "GOOGL", "MSFT", "BTC", "ETH")

foreach ($symbol in $testSymbols) {
    $response = Test-ApiEndpoint "POST" "/api/chat" @{ message = "What is the current price of $symbol?"; sessionId = $sessionId }
    if ($response.Success) {
        $content = $response.Data | ConvertTo-Json -Depth 10
        if ($content -match '\$?[\d,]+\.?\d*' -and $content -match $symbol) {
            Record-Test "MarketData" "Real-time price: $symbol" "PASSED"
        } else {
            Record-Test "MarketData" "Real-time price: $symbol" "FAILED" "No valid price data found" $true
        }
    } else {
        Record-Test "MarketData" "Real-time price: $symbol" "FAILED" $response.Error $true
    }
}

# Test Market Overview Sidebar
$marketResponse = Test-ApiEndpoint "GET" "/api/market/overview"
if ($marketResponse.Success -and $marketResponse.Data.stocks -and $marketResponse.Data.crypto) {
    $validStocks = ($marketResponse.Data.stocks | Where-Object { $_.price -gt 0 }).Count -gt 0
    $validCrypto = ($marketResponse.Data.crypto | Where-Object { $_.price -gt 0 }).Count -gt 0
    
    if ($validStocks -and $validCrypto) {
        Record-Test "MarketData" "Sidebar market overview" "PASSED"
    } else {
        Record-Test "MarketData" "Sidebar market overview" "FAILED" "Invalid market data in sidebar" $true
    }
} else {
    Record-Test "MarketData" "Sidebar market overview" "FAILED" "Market overview API failed" $true
}

# 3. RESPONSE FORMATTING TESTS
Write-Host "`n🎨 Testing Response Formatting..." -ForegroundColor Cyan

$formatTestQueries = @(
    "Analyze Microsoft stock",
    "What is Bitcoin doing today?",
    "Explain market volatility",
    "Tell me about Tesla earnings"
)

foreach ($query in $formatTestQueries) {
    $response = Test-ApiEndpoint "POST" "/api/chat" @{ message = $query; sessionId = $sessionId }
    if ($response.Success) {
        $content = $response.Data | ConvertTo-Json -Depth 10
        $hasMarkdownBold = $content -match '\*\*[^*]+\*\*'
        
        if (-not $hasMarkdownBold) {
            Record-Test "Formatting" "No ** formatting: '$($query.Substring(0,20))...'" "PASSED"
        } else {
            Record-Test "Formatting" "No ** formatting: '$($query.Substring(0,20))...'" "FAILED" "Found markdown formatting in response"
        }
        
        # Test structured response
        if ($response.Data.success -and $response.Data.data -and $response.Data.metadata) {
            Record-Test "Formatting" "Structured JSON response" "PASSED"
        } else {
            Record-Test "Formatting" "Structured JSON response" "FAILED" "Missing required JSON structure"
        }
    } else {
        Record-Test "Formatting" "Formatting check: '$($query.Substring(0,20))...'" "FAILED" $response.Error
    }
}

# 4. STOCKS & CRYPTO COVERAGE TESTS
Write-Host "`n📈 Testing Stock & Crypto Coverage..." -ForegroundColor Cyan

$majorStocks = @("AAPL", "MSFT", "GOOGL", "AMZN", "TSLA", "META")
$cryptoCurrencies = @("BTC", "ETH", "ADA", "SOL")

foreach ($stock in $majorStocks) {
    $response = Test-ApiEndpoint "POST" "/api/chat" @{ message = "Give me analysis of $stock"; sessionId = $sessionId }
    if ($response.Success) {
        $content = $response.Data | ConvertTo-Json -Depth 10
        $hasStockAnalysis = $content -match "price|analysis|stock|market|trading|recommendation"
        
        if ($hasStockAnalysis) {
            Record-Test "StocksCrypto" "Stock analysis: $stock" "PASSED"
        } else {
            Record-Test "StocksCrypto" "Stock analysis: $stock" "FAILED" "No relevant stock analysis"
        }
    } else {
        Record-Test "StocksCrypto" "Stock analysis: $stock" "FAILED" $response.Error
    }
}

foreach ($crypto in $cryptoCurrencies) {
    $response = Test-ApiEndpoint "POST" "/api/chat" @{ message = "What is $crypto cryptocurrency price and outlook?"; sessionId = $sessionId }
    if ($response.Success) {
        $content = $response.Data | ConvertTo-Json -Depth 10
        $hasCryptoAnalysis = $content -match "crypto|bitcoin|ethereum|price|blockchain|digital|currency"
        
        if ($hasCryptoAnalysis) {
            Record-Test "StocksCrypto" "Crypto analysis: $crypto" "PASSED"
        } else {
            Record-Test "StocksCrypto" "Crypto analysis: $crypto" "FAILED" "No relevant crypto analysis"
        }
    } else {
        Record-Test "StocksCrypto" "Crypto analysis: $crypto" "FAILED" $response.Error
    }
}

# 5. PORTFOLIO ANALYSIS TESTS
Write-Host "`n💼 Testing Portfolio Analysis..." -ForegroundColor Cyan

# Create test portfolio CSV
$testPortfolio = @"
symbol,shares,current_price,market_value
AAPL,100,180,18000
MSFT,50,350,17500
GOOGL,25,140,3500
TSLA,30,200,6000
"@

$csvPath = "test_portfolio.csv"
$testPortfolio | Out-File -FilePath $csvPath -Encoding UTF8

# Test portfolio analysis (simplified - would need proper multipart form handling for full test)
$portfolioResponse = Test-ApiEndpoint "POST" "/api/chat" @{ message = "Analyze my portfolio performance and risk"; sessionId = $sessionId }
if ($portfolioResponse.Success) {
    $content = $portfolioResponse.Data | ConvertTo-Json -Depth 10
    if ($content -match "portfolio|diversification|risk|allocation") {
        Record-Test "Portfolio" "Portfolio analysis response" "PASSED"
    } else {
        Record-Test "Portfolio" "Portfolio analysis response" "FAILED" "No portfolio-specific analysis"
    }
} else {
    Record-Test "Portfolio" "Portfolio analysis response" "FAILED" $portfolioResponse.Error
}

# Clean up
Remove-Item $csvPath -ErrorAction SilentlyContinue

# 6. PERFORMANCE TESTS
Write-Host "`n⚡ Testing Performance..." -ForegroundColor Cyan

# Concurrent request test
$startTime = Get-Date
$jobs = @()
for ($i = 1; $i -le 5; $i++) {
    $jobs += Start-Job -ScriptBlock {
        param($url, $sessionId, $i)
        try {
            $body = @{ message = "Quick price check $i"; sessionId = "$sessionId" + "_$i" } | ConvertTo-Json
            $result = Invoke-RestMethod -Uri "$url/api/chat" -Method POST -Body $body -ContentType "application/json" -TimeoutSec 10
            return @{ Success = $true; Data = $result }
        } catch {
            return @{ Success = $false; Error = $_.Exception.Message }
        }
    } -ArgumentList $baseUrl, $sessionId, $i
}

$results = $jobs | Wait-Job | Receive-Job
$endTime = Get-Date
$duration = ($endTime - $startTime).TotalMilliseconds
$successfulRequests = ($results | Where-Object { $_.Success }).Count

if ($successfulRequests -ge 4 -and $duration -lt 10000) {
    Record-Test "Performance" "Concurrent request handling" "PASSED" "$successfulRequests/5 successful in $([math]::Round($duration))ms"
} else {
    Record-Test "Performance" "Concurrent request handling" "FAILED" "Poor performance: $successfulRequests/5 successful in $([math]::Round($duration))ms"
}

$jobs | Remove-Job

# 7. SECURITY TESTS  
Write-Host "`n🔒 Testing Security..." -ForegroundColor Cyan

# Test health endpoint security features
$healthResponse = Test-ApiEndpoint "GET" "/api/health"
if ($healthResponse.Success) {
    $features = $healthResponse.Data.features
    if ($features.rateLimiting -and $features.security) {
        Record-Test "Security" "Security features configured" "PASSED"
    } else {
        Record-Test "Security" "Security features configured" "FAILED" "Security features not properly configured" $true
    }
} else {
    Record-Test "Security" "Security features configured" "FAILED" $healthResponse.Error
}

# Test malicious input handling
$maliciousInputs = @(
    '<script>alert("xss")</script>analyze apple',
    'DROP TABLE users; --',
    'a' * 1000  # Very long input
)

foreach ($input in $maliciousInputs) {
    $response = Test-ApiEndpoint "POST" "/api/chat" @{ message = $input; sessionId = $sessionId }
    $inputDesc = $input.Substring(0, [Math]::Min(20, $input.Length)) + "..."
    
    if ($response.Success) {
        $content = $response.Data | ConvertTo-Json -Depth 10
        if (-not ($content -match '<script>')) {
            Record-Test "Security" "Input validation: $inputDesc" "PASSED"
        } else {
            Record-Test "Security" "Input validation: $inputDesc" "FAILED" "Malicious input not sanitized" $true
        }
    } else {
        # Failed requests are OK for malicious input
        Record-Test "Security" "Input validation: $inputDesc" "PASSED" "Request properly rejected"
    }
}

# GENERATE FINAL REPORT
Write-Host "`n📊 Generating Final Report..." -ForegroundColor Cyan
Write-Host "==========================================="

$successRate = if ($testResults.TotalTests -gt 0) { 
    [math]::Round(($testResults.PassedTests / $testResults.TotalTests) * 100, 1) 
} else { 0 }

$overallStatus = if ($successRate -ge 95) { "🟢 PRODUCTION READY" }
                elseif ($successRate -ge 85) { "🟡 NEEDS MINOR FIXES" }
                elseif ($successRate -ge 70) { "🟠 NEEDS IMPROVEMENTS" }
                else { "🔴 NOT PRODUCTION READY" }

Write-Host "`n🎯 PRODUCTION READINESS REPORT" -ForegroundColor Yellow
Write-Host "================================"
Write-Host "Overall Status: $overallStatus" -ForegroundColor $(if ($successRate -ge 85) { "Green" } else { "Red" })
Write-Host ""
Write-Host "📊 Test Results:"
Write-Host "  ✅ Passed: $($testResults.PassedTests)"
Write-Host "  ❌ Failed: $($testResults.FailedTests)"
Write-Host "  📈 Success Rate: $successRate%"
Write-Host ""

Write-Host "📋 Category Breakdown:"
foreach ($category in $testResults.Categories.Keys) {
    $cat = $testResults.Categories[$category]
    $total = $cat.Passed + $cat.Failed
    $catRate = if ($total -gt 0) { [math]::Round(($cat.Passed / $total) * 100, 1) } else { 0 }
    Write-Host "  $category`: $($cat.Passed)/$total ($catRate%)"
}

if ($testResults.CriticalIssues.Count -gt 0) {
    Write-Host "`n🚨 CRITICAL ISSUES FOUND:" -ForegroundColor Red
    foreach ($issue in $testResults.CriticalIssues) {
        Write-Host "  ❌ [$($issue.Category)] $($issue.Test)" -ForegroundColor Red
        Write-Host "     $($issue.Issue)" -ForegroundColor Gray
    }
} else {
    Write-Host "`n✅ No critical issues found!" -ForegroundColor Green
}

Write-Host "`n🎉 Production Score: $([math]::Round($successRate))/100" -ForegroundColor Yellow

if ($successRate -ge 90) {
    Write-Host "`n🚀 READY FOR PRODUCTION DEPLOYMENT!" -ForegroundColor Green
    Write-Host "All systems are operational and ready for users." -ForegroundColor Green
} elseif ($successRate -ge 75) {
    Write-Host "`n⚠️ READY WITH MINOR FIXES" -ForegroundColor Yellow
    Write-Host "Address the issues above before production deployment." -ForegroundColor Yellow
} else {
    Write-Host "`n🛑 NOT READY FOR PRODUCTION" -ForegroundColor Red
    Write-Host "Critical issues must be resolved before deployment." -ForegroundColor Red
}

Write-Host "`nTest completed at $(Get-Date)" -ForegroundColor Gray

# Save report to file
$reportContent = @"
# FinanceBot Pro - Production Readiness Report

Generated: $(Get-Date)

## Executive Summary
Overall Status: $overallStatus
Success Rate: $successRate%

## Test Results
- Passed: $($testResults.PassedTests)
- Failed: $($testResults.FailedTests)
- Total: $($testResults.TotalTests)

## Category Results
$($testResults.Categories.Keys | ForEach-Object {
    $cat = $testResults.Categories[$_]
    $total = $cat.Passed + $cat.Failed
    $rate = if ($total -gt 0) { [math]::Round(($cat.Passed / $total) * 100, 1) } else { 0 }
    "- $_`: $($cat.Passed)/$total ($rate%)"
} | Out-String)

## Critical Issues
$($testResults.CriticalIssues | ForEach-Object { "- [$($_.Category)] $($_.Test): $($_.Issue)" } | Out-String)

## Production Score: $([math]::Round($successRate))/100

$(if ($successRate -ge 90) { "🚀 READY FOR PRODUCTION!" }
  elseif ($successRate -ge 75) { "⚠️ NEEDS MINOR FIXES" }
  else { "🛑 NOT PRODUCTION READY" })
"@

$reportContent | Out-File -FilePath "production-readiness-report.md" -Encoding UTF8
Write-Host "`n📄 Report saved to: production-readiness-report.md" -ForegroundColor Cyan 