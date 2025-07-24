// Super simple chart test to isolate the hanging issue
console.log('1. Starting simple chart test...');

try {
  console.log('2. Requiring chartGenerator...');
  const chartGenerator = require('./services/chartGenerator');
  
  console.log('3. Chart generator loaded successfully');
  console.log('4. Calling generateSmartChart...');
  
  // Test with timeout
  const testChart = async () => {
    const chartPromise = chartGenerator.generateSmartChart('AAPL', 'trend');
    const timeoutPromise = new Promise((_, reject) =>
      setTimeout(() => reject(new Error('Test timeout')), 2000)
    );
    
    try {
      const result = await Promise.race([chartPromise, timeoutPromise]);
      console.log('5. Chart generation completed:', result ? 'SUCCESS' : 'NULL');
    } catch (error) {
      console.log('5. Chart generation failed:', error.message);
    }
  };
  
  testChart();
  
} catch (error) {
  console.log('ERROR in test setup:', error.message);
}

console.log('6. Test script completed');