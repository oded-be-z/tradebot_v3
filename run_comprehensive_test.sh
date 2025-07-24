#!/bin/bash

echo "Starting FinanceBot server..."
npm start &
SERVER_PID=$!

echo "Waiting for server to start (10 seconds)..."
sleep 10

echo "Checking server health..."
curl -s http://localhost:3000/api/health > /dev/null
if [ $? -eq 0 ]; then
    echo "Server is running!"
    
    echo "Running comprehensive test suite..."
    node test_comprehensive_suite.js
    
    echo "Tests complete. Stopping server..."
    kill $SERVER_PID
else
    echo "Server failed to start!"
    kill $SERVER_PID
    exit 1
fi