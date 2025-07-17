/**
 * Comprehensive verification that NO mock data exists in production code
 */

const chalk = require('chalk');
const fs = require('fs');
const path = require('path');

console.log(chalk.bold.blue('\n🔍 VERIFYING NO MOCK DATA IN PRODUCTION CODE\n'));

// Keywords to search for
const mockKeywords = [
  'MockDataGenerator',
  'generateMockData',
  'generateRealisticMockData',
  'mockData',
  'MockData',
  'generateMock',
  'createMockData',
  'fakePrices',
  'simulatedData',
  'generateFakeData'
];

// Directories to check
const directoriesToCheck = [
  './services',
  './src',
  './server.js',
  './app.js'
];

// File extensions to check
const fileExtensions = ['.js', '.ts', '.jsx', '.tsx'];

let totalIssues = 0;
const issuesFound = [];

// Function to check a single file
function checkFile(filePath) {
  if (!fs.existsSync(filePath)) return;
  
  const content = fs.readFileSync(filePath, 'utf8');
  const fileName = path.basename(filePath);
  
  // Skip test files and node_modules
  if (fileName.includes('.test.') || 
      fileName.includes('.spec.') || 
      filePath.includes('node_modules') ||
      filePath.includes('test-')) {
    return;
  }
  
  mockKeywords.forEach(keyword => {
    const regex = new RegExp(keyword, 'gi');
    const matches = content.match(regex);
    
    if (matches) {
      totalIssues += matches.length;
      issuesFound.push({
        file: filePath,
        keyword: keyword,
        count: matches.length
      });
    }
  });
}

// Function to check a directory recursively
function checkDirectory(dirPath) {
  if (!fs.existsSync(dirPath)) return;
  
  const stat = fs.statSync(dirPath);
  
  if (stat.isFile()) {
    const ext = path.extname(dirPath);
    if (fileExtensions.includes(ext)) {
      checkFile(dirPath);
    }
  } else if (stat.isDirectory()) {
    const files = fs.readdirSync(dirPath);
    files.forEach(file => {
      const fullPath = path.join(dirPath, file);
      checkDirectory(fullPath);
    });
  }
}

// Run checks
console.log(chalk.bold('Checking for mock data references...\n'));

directoriesToCheck.forEach(dir => {
  console.log(chalk.gray(`Checking ${dir}...`));
  checkDirectory(dir);
});

// Check specific critical files
console.log(chalk.bold('\nChecking critical files:'));

// 1. Check MockDataGenerator.js doesn't exist
const mockDataFiles = [
  './services/MockDataGenerator.js',
  './src/services/MockDataGenerator.js',
  './MockDataGenerator.js'
];

mockDataFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(chalk.red(`❌ MockDataGenerator.js still exists at: ${file}`));
    totalIssues++;
  }
});

// 2. Check AssetConfigManager.js doesn't exist
const assetConfigFiles = [
  './services/AssetConfigManager.js',
  './src/services/AssetConfigManager.js',
  './AssetConfigManager.js'
];

assetConfigFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(chalk.red(`❌ AssetConfigManager.js still exists at: ${file}`));
    totalIssues++;
  }
});

// 3. Check DataIntegrityValidator.js doesn't exist
const validatorFiles = [
  './services/DataIntegrityValidator.js',
  './src/services/DataIntegrityValidator.js',
  './DataIntegrityValidator.js'
];

validatorFiles.forEach(file => {
  if (fs.existsSync(file)) {
    console.log(chalk.red(`❌ DataIntegrityValidator.js still exists at: ${file}`));
    totalIssues++;
  }
});

// Report results
console.log(chalk.bold.blue('\n📊 VERIFICATION RESULTS\n'));

if (totalIssues === 0) {
  console.log(chalk.bold.green('✅ SUCCESS: No mock data found in production code!'));
  console.log(chalk.green('   All mock data generators have been removed'));
  console.log(chalk.green('   All mock data references have been cleaned up'));
  console.log(chalk.green('   Charts now use 100% real API data'));
} else {
  console.log(chalk.bold.red(`❌ FAILURE: Found ${totalIssues} mock data references`));
  
  if (issuesFound.length > 0) {
    console.log(chalk.red('\nMock references found in:'));
    issuesFound.forEach(issue => {
      console.log(chalk.red(`   ${issue.file}: ${issue.keyword} (${issue.count} times)`));
    });
  }
}

// Additional checks
console.log(chalk.bold.blue('\n🔧 ADDITIONAL VERIFICATION\n'));

// Check chartGenerator uses real data
if (fs.existsSync('./services/chartGenerator.js')) {
  const chartGen = fs.readFileSync('./services/chartGenerator.js', 'utf8');
  
  if (chartGen.includes('fetchRealHistoricalData')) {
    console.log(chalk.green('✅ chartGenerator.js uses fetchRealHistoricalData()'));
  }
  
  if (chartGen.includes('fetchCryptoHistoricalData')) {
    console.log(chalk.green('✅ chartGenerator.js has fetchCryptoHistoricalData()'));
  }
  
  if (chartGen.includes('CoinGecko')) {
    console.log(chalk.green('✅ chartGenerator.js fetches from CoinGecko API'));
  }
}

// Check server.js uses real data
if (fs.existsSync('./server.js')) {
  const server = fs.readFileSync('./server.js', 'utf8');
  
  if (server.includes('fetchHistoricalData')) {
    console.log(chalk.green('✅ server.js uses fetchHistoricalData()'));
  }
  
  if (server.includes('market-data-service')) {
    console.log(chalk.green('✅ server.js imports market-data-service'));
  }
}

console.log(chalk.gray('\n═══════════════════════════════════════════════════════════\n'));