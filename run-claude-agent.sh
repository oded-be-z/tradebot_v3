#!/bin/bash
# Perfect Claude-Code Command: Strictly follows full-fixes-guide.md, automates all steps (skip confirmations), auto-resumes after token limits.

while true; do
  claude-code-agent \
    --guide /mnt/c/Users/oded.be/tradebot_v3/full-fixes-guide.md \
    --strict-follow \
    --auto-mode \
    --skip-all-confirmations \
    --dangerous-exec \
    --token-refresh-auto \
    --resume-on-refresh \
    --verbose-logs \
    --output-report FINANCEBOT_FINAL_FIX_REPORT.md
  if [ $? -eq 0 ]; then
    echo "All fixes complete! Bot empowered for trading – ready to recap markets."
    break
  else
    echo "Token limit hit – waiting 60s to refresh and auto-resume..."
    sleep 60
  fi
done
