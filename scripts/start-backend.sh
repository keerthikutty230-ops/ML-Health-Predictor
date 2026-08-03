#!/bin/bash
# Start the Python FastAPI ML backend for the Health Risk Predictor
# This script ensures the backend is running and accessible

cd /home/z/my-project/mini-services/health-api

# Check if already running
if curl -s http://localhost:3001/api/status > /dev/null 2>&1; then
  echo "Backend already running on port 3001"
  exit 0
fi

echo "Starting Health Risk Predictor ML Backend..."
setsid python3 -m uvicorn main:app --host 0.0.0.0 --port 3001 > /tmp/health-api.log 2>&1 &
disown

# Wait for startup
for i in $(seq 1 10); do
  if curl -s http://localhost:3001/api/status > /dev/null 2>&1; then
    echo "Backend started successfully (port 3001)"
    exit 0
  fi
  sleep 1
done

echo "ERROR: Backend failed to start within 10 seconds"
exit 1
