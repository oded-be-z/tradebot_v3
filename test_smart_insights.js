/**
 * Smart Insights Test - Demonstrating intelligent context-aware responses
 * Shows increasing intelligence with repeated queries and user pattern detection
 */
const axios = require('axios');

async function testSmartInsights() {
  console.log('🧠 SMART INSIGHTS DEMONSTRATION\n');
  console.log('🎯 Goal: Show FinanceBot becoming increasingly intelligent with context\n');
  
  const sessionId = 'smart-insights-demo-' + Date.now();
  
  // Test sequence showing increasing intelligence
  const queries = [
    {
      query: "AAPL price",
      delay: 0,
      description: "Baseline query - establishes context",
      expectations: [
        "Should provide basic AAPL price info",
        "No time-based insights (first query)",
        "Should establish symbol context"
      ]
    },
    {
      query: "AAPL price", 
      delay: 3000, // 3 seconds later
      description: "Repeat query - should show time-based insight",
      expectations: [
        "Should show 'Update: AAPL...' or similar time reference",
        "Should reference 'since X minutes ago'",
        "Shows temporal intelligence"
      ]
    },
    {
      query: "Tell me about AAPL RSI and MACD indicators",
      delay: 1000,
      description: "Expert-level query - should trigger advanced insights",
      expectations: [
        "Should detect expert-level user",
        "Should provide technical indicators",
        "Should include RSI/MACD analysis"
      ]
    },
    {
      query: "AAPL price",
      delay: 1000, 
      description: "Third time checking - should suggest automation",
      expectations: [
        "Should detect frequent checking pattern",
        "Should suggest setting up alerts",
        "Shows behavioral intelligence"
      ]
    },
    {
      query: "compare AAPL to GOOGL",
      delay: 1000,
      description: "Comparison - adds to user pattern",
      expectations: [
        "Should use context from previous AAPL queries",
        "Should show comparison insights",
        "May detect comparison interest pattern"
      ]
    },
    {
      query: "AAPL vs MSFT this time",
      delay: 1000,
      description: "Another comparison - should detect pattern",
      expectations: [
        "Should recognize comparison pattern",
        "May suggest comprehensive comparison dashboard",
        "Shows pattern recognition intelligence"
      ]
    }
  ];

  let totalTests = 0;
  let insightfulResponses = 0;
  const results = [];

  console.log('📊 Running Smart Insights Sequence...\n');

  for (let i = 0; i < queries.length; i++) {
    const test = queries[i];
    
    console.log(`🧪 Test ${i + 1}: ${test.description}`);
    console.log(`   Query: "${test.query}"`);
    console.log(`   Expected: ${test.expectations[0]}`);
    
    if (test.delay > 0) {
      console.log(`   ⏱️  Waiting ${test.delay/1000}s for time-based context...`);
      await new Promise(resolve => setTimeout(resolve, test.delay));
    }
    
    try {
      const response = await axios.post('http://localhost:3000/api/chat', {
        message: test.query,
        sessionId: sessionId
      });

      const responseText = response.data.response;
      const symbols = response.data.symbols || [];
      
      console.log(`   📝 Response Preview: "${responseText.substring(0, 120)}..."`);
      console.log(`   🎯 Symbols: [${symbols.join(', ')}]`);

      // Analyze for Smart Insights
      const insightTests = {
        hasTimeReference: /update|since|ago|minutes?|hours?|just|recently/i.test(responseText),
        hasExpertTerms: /RSI|MACD|technical|indicators?|analysis/i.test(responseText),
        hasPatternRecognition: /checked|comparing|alerts?|dashboard|noticed/i.test(responseText),
        hasContextAwareness: /you.*asked|mentioned|discussed|before/i.test(responseText),
        hasSmartSuggestion: /want me to|set up|create|help|alerts/i.test(responseText)
      };

      // Test-specific intelligence checks
      let intelligenceDetected = false;
      let intelligenceType = 'basic';

      if (i === 1) { // Second AAPL query - should show temporal intelligence
        intelligenceDetected = insightTests.hasTimeReference;
        intelligenceType = 'temporal';
      } else if (i === 2) { // Expert query - should show expertise detection
        intelligenceDetected = insightTests.hasExpertTerms;
        intelligenceType = 'expertise';
      } else if (i === 3) { // Third AAPL query - should show pattern recognition
        intelligenceDetected = insightTests.hasPatternRecognition || insightTests.hasContextAwareness;
        intelligenceType = 'behavioral';
      } else if (i >= 4) { // Comparison patterns
        intelligenceDetected = insightTests.hasPatternRecognition || insightTests.hasContextAwareness;
        intelligenceType = 'pattern';
      }

      const intelligenceScore = Object.values(insightTests).filter(Boolean).length;
      
      results.push({
        test: i + 1,
        query: test.query,
        intelligenceDetected,
        intelligenceType,
        intelligenceScore: `${intelligenceScore}/5`,
        insights: insightTests
      });

      if (intelligenceDetected) {
        console.log(`   ✅ INTELLIGENT: ${intelligenceType} intelligence detected!`);
        insightfulResponses++;
      } else {
        console.log(`   📊 STANDARD: Basic response, no enhanced intelligence`);
      }

      console.log(`   🧠 Intelligence Score: ${intelligenceScore}/5\n`);
      totalTests++;

      // Short delay between tests
      await new Promise(resolve => setTimeout(resolve, 500));

    } catch (error) {
      console.error(`   ❌ Error in test ${i + 1}:`, error.message);
      totalTests++;
    }
  }

  // Results Analysis
  console.log('🏆 SMART INSIGHTS RESULTS\n');
  console.log(`📊 Overall Intelligence: ${insightfulResponses}/${totalTests} tests showed enhanced intelligence (${Math.round(insightfulResponses/totalTests*100)}%)\n`);

  // Detailed breakdown
  results.forEach(result => {
    const status = result.intelligenceDetected ? '🧠' : '📊';
    console.log(`${status} Test ${result.test}: "${result.query}"`);
    console.log(`   Type: ${result.intelligenceType} | Score: ${result.intelligenceScore}`);
    
    if (result.intelligenceDetected) {
      const detectedFeatures = Object.entries(result.insights)
        .filter(([key, value]) => value)
        .map(([key]) => key.replace(/([A-Z])/g, ' $1').toLowerCase())
        .join(', ');
      console.log(`   Features: ${detectedFeatures}`);
    }
    console.log('');
  });

  // Intelligence Analysis
  console.log('🎯 INTELLIGENCE ANALYSIS\n');

  if (insightfulResponses >= Math.ceil(totalTests * 0.8)) { // 80% threshold
    console.log('🎉 EXCELLENT: Smart Insights working brilliantly!');
    console.log('');
    console.log('✅ Verified Capabilities:');
    console.log('  🕐 Temporal Intelligence: Tracks time between queries');
    console.log('  🎓 Expertise Detection: Adapts to user knowledge level');
    console.log('  🔍 Pattern Recognition: Identifies user behavior patterns');
    console.log('  🧠 Context Awareness: Remembers previous interactions');
    console.log('  💡 Smart Suggestions: Proactively offers helpful actions');
    console.log('');
    console.log('🚀 FinanceBot now feels truly intelligent and personalized!');
  } else if (insightfulResponses >= Math.ceil(totalTests * 0.6)) { // 60% threshold
    console.log('✅ GOOD: Smart Insights partially working');
    console.log('  - Core intelligence features operational');
    console.log('  - Some edge cases need refinement');
  } else {
    console.log('⚠️  NEEDS IMPROVEMENT: Smart Insights not fully activated');
    console.log('  - Check SmartInsights integration in dualLLMOrchestrator');
    console.log('  - Verify context data is being passed correctly');
    console.log('  - Review temporal logic and pattern detection');
  }

  // Phase 3 Preview
  console.log('\n🔮 PHASE 3 PREVIEW: Visual Response Builder\n');
  console.log('With Smart Insights working, we can now add:');
  console.log('  📊 Price cards with sparklines showing historical context');
  console.log('  🎯 Risk gauges that adapt to user expertise level');
  console.log('  📈 Comparison tables with intelligent visual indicators');
  console.log('  🔥 Smart alerts based on detected user patterns');
  console.log('');
  console.log('🎯 Next: Implement Visual Response Builder components');
}

testSmartInsights().catch(console.error);