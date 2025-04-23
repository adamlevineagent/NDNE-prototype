#!/bin/bash
# Stop only the NDNE frontend and backend servers without affecting other node processes

echo "Stopping NDNE prototype servers..."

# Kill the frontend (Vite) server - it usually runs on ports 5173-5175
echo "Stopping frontend server..."
FRONTEND_PID=$(lsof -t -i:5175 2>/dev/null || lsof -t -i:5174 2>/dev/null || lsof -t -i:5173 2>/dev/null)
if [ ! -z "$FRONTEND_PID" ]; then
  echo "Found frontend server process: $FRONTEND_PID"
  kill $FRONTEND_PID
  echo "Frontend server stopped"
else
  echo "No frontend server found running on ports 5173-5175"
fi

# Kill the backend server - it runs on port 4000
echo "Stopping backend server..."
BACKEND_PID=$(lsof -t -i:4000 2>/dev/null)
if [ ! -z "$BACKEND_PID" ]; then
  echo "Found backend server process: $BACKEND_PID"
  kill $BACKEND_PID
  echo "Backend server stopped"
else
  echo "No backend server found running on port 4000"
fi

echo "NDNE prototype servers have been stopped"

# Make sure this script is executable:
# chmod +x scripts/stop-servers.sh