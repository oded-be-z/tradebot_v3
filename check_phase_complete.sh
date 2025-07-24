#!/bin/bash
PHASE=$1
echo "🔍 Checking Phase $PHASE completion..."
case $PHASE in
  1) # Port Configuration
    curl -s http://localhost:3000/api/health > /dev/null && echo "✅ Port 3000 working" || echo "❌ Port issue"
    ;;
  2) # Testing Suite
    [ -f "production_readiness_report.json" ] && echo "✅ Test report exists" || echo "❌ No test report"
    ;;
  3) # Browser Testing
    [ -f "browser_test_results.md" ] && echo "✅ Browser tests documented" || echo "❌ No browser tests"
    ;;
  4) # Production Checklist
    [ -f "deployment_checklist.txt" ] && echo "✅ Checklist complete" || echo "❌ No checklist"
    ;;
esac
echo "Review PRODUCTION_READINESS_PLAN.md before proceeding to next phase"