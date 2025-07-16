// Debug server.js symbol extraction
const fs = require('fs');

// Read the server.js file to test the QueryAnalyzer logic
const serverCode = fs.readFileSync('./server.js', 'utf8');

// Extract the extractTopic method logic
const extractTopicRegex = /extractTopic\(message\) \{([\s\S]*?)\n  \}/;
const match = serverCode.match(extractTopicRegex);

if (match) {
  console.log('=== Server.js extractTopic Method ===');
  console.log(match[1]);
} else {
  console.log('Could not extract extractTopic method');
}

// Look for symbolMappings in server.js
const symbolMappingsRegex = /symbolMappings.*?=.*?\{([\s\S]*?)\n    \}/;
const symbolMatch = serverCode.match(symbolMappingsRegex);

if (symbolMatch) {
  console.log('\n=== Server.js symbolMappings ===');
  console.log(symbolMatch[1]);
} else {
  console.log('Could not extract symbolMappings');
}

// Look for specific "aapl" mappings
const aaplMatches = serverCode.match(/aapl.*:/gi);
console.log('\n=== AAPL mappings in server.js ===');
console.log(aaplMatches || 'No aapl mappings found');

// Look for specific "apple" mappings
const appleMatches = serverCode.match(/apple.*:/gi);
console.log('\n=== Apple mappings in server.js ===');
console.log(appleMatches || 'No apple mappings found');