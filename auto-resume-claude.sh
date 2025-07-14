#!/bin/bash

# Auto-resume Claude-code script
PROJECT_FILE="financebot-fix-plan.txt"
LOG_FILE="claude-progress.log"
MAX_ATTEMPTS=50
ATTEMPT=1

echo "Starting Claude-code with auto-resume capability..."

while [ $ATTEMPT -le $MAX_ATTEMPTS ]; do
    echo "Attempt $ATTEMPT of $MAX_ATTEMPTS" | tee -a $LOG_FILE
    
    # Run claude-code
    claude-code --max-tokens 200000 --auto-approve --continue-on-error --verbose $PROJECT_FILE 2>&1 | tee -a $LOG_FILE
    
    # Check if completed successfully
    if [ ${PIPESTATUS[0]} -eq 0 ]; then
        echo "Claude-code completed successfully!" | tee -a $LOG_FILE
        break
    fi
    
    # Wait for token refresh (adjust time as needed)
    echo "Token limit reached. Waiting 60 seconds before retry..." | tee -a $LOG_FILE
    sleep 60
    
    ATTEMPT=$((ATTEMPT + 1))
done

if [ $ATTEMPT -gt $MAX_ATTEMPTS ]; then
    echo "Max attempts reached. Please check the log file: $LOG_FILE"
fi
