#!/bin/bash

# cleanup_before_push.sh
# Script to clean up test files, logs, and documentation before pushing to git

echo "==============================================="
echo "Git Repository Cleanup Script"
echo "==============================================="
echo ""
echo "This script will remove test files, logs, and documentation"
echo "to prepare the repository for pushing to GitHub."
echo ""

# Count files to be removed
TEST_FILES=$(find . -maxdepth 1 -name "test_*.js" -o -name "*test*.js" -o -name "*-test*.js" | wc -l)
DOC_FILES=$(find . -maxdepth 1 -name "*.md" | grep -E "(REPORT|IMPLEMENTATION|ATTACK|VULNERABILITIES|AUDIT|REMEDIATION|TEST_SUITE|E2E_TEST)" | wc -l)
LOG_FILES=$(find . -maxdepth 1 -name "*.log" -o -name "*.pid" | wc -l)
JSON_FILES=$(find . -maxdepth 1 -name "*_results*.json" -o -name "*test*.json" | wc -l)
CSV_FILES=$(find . -maxdepth 1 -name "*.csv" | wc -l)
TXT_FILES=$(find . -maxdepth 1 -name "*.txt" | wc -l)

TOTAL_FILES=$((TEST_FILES + DOC_FILES + LOG_FILES + JSON_FILES + CSV_FILES + TXT_FILES))

echo "Files to be removed:"
echo "  - Test JavaScript files: $TEST_FILES"
echo "  - Documentation/Reports: $DOC_FILES"
echo "  - Log files: $LOG_FILES"
echo "  - Test result JSONs: $JSON_FILES"
echo "  - CSV files: $CSV_FILES"
echo "  - Text files: $TXT_FILES"
echo "  - TOTAL: $TOTAL_FILES files"
echo ""

# Show sample of files to be removed
echo "Sample files that will be removed:"
echo "--------------------------------"
find . -maxdepth 1 -name "test_*.js" | head -5 | sed 's/^/  /'
find . -maxdepth 1 -name "*.md" | grep -E "(REPORT|IMPLEMENTATION|ATTACK)" | head -5 | sed 's/^/  /'
find . -maxdepth 1 -name "*.log" | head -5 | sed 's/^/  /'
echo "  ... and more"
echo ""

# Confirm before proceeding
read -p "Do you want to proceed with cleanup? (yes/no): " CONFIRM

if [ "$CONFIRM" != "yes" ]; then
    echo "Cleanup cancelled."
    exit 0
fi

echo ""
echo "Starting cleanup..."
echo ""

# Remove test JavaScript files
echo "Removing test JavaScript files..."
find . -maxdepth 1 \( -name "test_*.js" -o -name "*test*.js" -o -name "*-test*.js" \) -delete

# Remove documentation and reports
echo "Removing documentation and reports..."
find . -maxdepth 1 -name "*.md" | grep -E "(REPORT|IMPLEMENTATION|ATTACK|VULNERABILITIES|AUDIT|REMEDIATION|TEST_SUITE|E2E_TEST|AGENT2_FINAL|COMPREHENSIVE_TEST|CRITICAL_|LIVE_|LLM_|PARTIAL_|PORTFOLIO_AUTO|PRE_PRODUCTION|PRIORITY_|PRODUCTION_|QUICK_WINS|SECURITY_|SYSTEM_AUDIT|TRADING_|WEBSOCKET_)" | xargs rm -f

# Remove log files
echo "Removing log files..."
find . -maxdepth 1 -name "*.log" -delete
find . -maxdepth 1 -name "*.pid" -delete

# Remove test result JSONs
echo "Removing test result JSONs..."
find . -maxdepth 1 \( -name "*_results*.json" -o -name "*test*.json" \) -delete

# Remove CSV files (test data)
echo "Removing test CSV files..."
find . -maxdepth 1 -name "*.csv" -delete

# Remove text files
echo "Removing test text files..."
find . -maxdepth 1 -name "*.txt" -delete

# Remove specific known test/debug files
echo "Removing other debug files..."
rm -f continuous_test_runner.js
rm -f comprehensive-test-suite.js
rm -f generate-comprehensive-test-report.js
rm -f load-test.js
rm -f quick-test.js
rm -f quick-test-fixes.js
rm -f debug_*.js
rm -f diagnostic_*.js

echo ""
echo "Cleanup complete!"
echo ""

# Show remaining files
echo "Remaining files in root directory:"
echo "--------------------------------"
ls -la | grep -v "^d" | grep -v "^total" | wc -l
echo ""

# Show git status
echo "Git status after cleanup:"
echo "------------------------"
git status --short

echo ""
echo "Repository is now clean and ready for commit!"
echo ""
echo "Next steps:"
echo "1. Review the remaining files"
echo "2. Update .gitignore if needed"
echo "3. Commit your changes"
echo "4. Push to GitHub"