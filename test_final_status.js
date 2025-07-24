const { execSync } = require('child_process');

console.log('🧪 FINAL STATUS CHECK\n');

const tests = [
  { name: 'Performance Tests', file: 'test-performance-e2e.js' },
  { name: 'Chart Tests', file: 'test-2-portfolio-intelligence.js' },
  { name: 'Context Switching', file: 'test-context-switching.js' },
  { name: 'Response Variety', file: 'test-3-nlp-variety.js' }
];

let totalPassed = 0;
let totalTests = 0;

tests.forEach(test => {
  console.log(`Running ${test.name}...`);
  try {
    const output = execSync(`node ${test.file} 2>&1`, { encoding: 'utf8' });
    
    // Count passed tests
    const passedMatches = output.match(/✅ PASSED/g);
    const passed = passedMatches ? passedMatches.length : 0;
    
    // Check for specific failures
    const failedMatches = output.match(/❌ (FAILED|FAIL|Response variety: \d+\/\d+ unique)/g);
    const failed = failedMatches ? failedMatches.length : 0;
    
    console.log(`  ${test.name}: ${passed} passed, ${failed} failed`);
    
    totalPassed += passed;
    totalTests += passed + failed;
  } catch (error) {
    console.log(`  ${test.name}: ERROR`);
  }
  console.log('');
});

const passRate = totalTests > 0 ? ((totalPassed / totalTests) * 100).toFixed(1) : 0;
console.log(`📊 OVERALL: ${totalPassed}/${totalTests} tests passed (${passRate}%)`);

if (passRate >= 90) {
  console.log('✅ TARGET ACHIEVED: 90%+ pass rate!');
} else {
  console.log(`❌ Current: ${passRate}% - Need to reach 90%`);
}