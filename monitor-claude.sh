#!/bin/bash
LOG_FILE="claude-progress.log"
echo "Starting Claude monitoring at $(date)" > $LOG_FILE

# Function to check for new files
check_progress() {
    echo "=== Progress check at $(date) ===" >> $LOG_FILE
    echo "New TypeScript files:" >> $LOG_FILE
    find . -name "*.ts" -newer bot-fixes/requirements.md -ls 2>/dev/null | grep -v node_modules >> $LOG_FILE
    echo "New test files:" >> $LOG_FILE
    find . -name "*.test.*" -newer bot-fixes/requirements.md -ls 2>/dev/null >> $LOG_FILE
    echo "Directory structure:" >> $LOG_FILE
    ls -la src/ 2>/dev/null >> $LOG_FILE
    echo "=========================" >> $LOG_FILE
}

# Monitor every 5 minutes
while true; do
    check_progress
    sleep 300
done
