const IntelligentResponse = require('./services/intelligentResponse');

async function debugNVDA() {
  const ir = IntelligentResponse;
  const response = await ir.generateResponse('NVDA', {});
  const content = response.analysis;
  
  console.log('=== NVDA Content ===');
  console.log(content);
  console.log('\n=== Volume Analysis ===');
  
  // Check the exact test regex
  const volumeLine = content.split('\n').find(line => line.toLowerCase().includes('volume'));
  console.log('Volume line:', volumeLine);
  
  if (volumeLine) {
    const volumeLineMatch = volumeLine.match(/volume.*\$[\d,]+/i);
    console.log('Volume line currency match:', volumeLineMatch);
  }
  
  const volumeFormatMatch = content.match(/volume[^.]*\d+\.?\d*[MBK]/i);
  console.log('Volume format match:', volumeFormatMatch);
  
  // Show around volume text
  const volumeIndex = content.toLowerCase().indexOf('volume');
  if (volumeIndex !== -1) {
    const start = Math.max(0, volumeIndex - 50);
    const end = Math.min(content.length, volumeIndex + 100);
    console.log('Context around volume:', content.substring(start, end));
  }
}

debugNVDA().catch(console.error);