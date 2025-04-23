#!/bin/bash
# Start NDNE prototype backend and frontend servers with improved handling

# Store the original directory
# Get the directory of this script
SCRIPT_DIR="$(cd "$(dirname "$0")" && pwd)"

# Check if servers are already running
echo "Checking for running servers..."
BACKEND_RUNNING=$(lsof -t -i:4000 2>/dev/null)
FRONTEND_RUNNING=$(lsof -t -i:5175 2>/dev/null || lsof -t -i:5174 2>/dev/null || lsof -t -i:5173 2>/dev/null)

# Start backend server if not already running
if [ -z "$BACKEND_RUNNING" ]; then
  echo "Starting backend server..."
  cd "$SCRIPT_DIR/../backend" || { echo "Error: backend directory not found"; exit 1; }
  npm run dev &
  BACKEND_PID=$!
  echo "Backend server started with PID: $BACKEND_PID"
  cd "$SCRIPT_DIR/.." || exit
else
  echo "Backend server already running with PID: $BACKEND_RUNNING"
fi

# Give the backend a moment to start
sleep 2

# Start frontend server if not already running
if [ -z "$FRONTEND_RUNNING" ]; then
  echo "Starting frontend server..."
  cd "$SCRIPT_DIR/../frontend" || { echo "Error: frontend directory not found"; exit 1; }
  npm run dev &
  FRONTEND_PID=$!
  echo "Frontend server started with PID: $FRONTEND_PID"
  cd "$SCRIPT_DIR/.." || exit
else
  echo "Frontend server already running with PID: $FRONTEND_RUNNING"
fi

echo "Servers should be available at:"
echo "- Backend: http://localhost:4000"
echo "- Frontend: http://localhost:5173 (or 5174/5175)"
echo ""
echo "Use './scripts/stop-servers.sh' to stop the servers when done"

# Make sure this script is executable:
# chmod +x scripts/start-servers.sh