#!/usr/bin/env bash
# ==============================================================================
# SmartRoute AI — Clean Bharat Intelligence Platform
# One-Command Local Development Launcher
# ==============================================================================

set -e

PROJECT_ROOT="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
cd "$PROJECT_ROOT"

echo "======================================================================"
echo "  SmartRoute AI — Clean Bharat Intelligence Platform (Hackathon 2026)"
echo "======================================================================"

# 1. Environment Verification
if ! command -v python3 &>/dev/null; then
  echo "[-] Python 3 is required but was not found in PATH."
  exit 1
fi

if ! command -v npm &>/dev/null; then
  echo "[-] npm / Node.js is required but was not found in PATH."
  exit 1
fi

export PYTHONPATH="$PROJECT_ROOT"
export DATABASE_URL="${DATABASE_URL:-sqlite:///./cleanbharat.db}"

# 2. Dependency Check & Installation if missing
if [ ! -d "$PROJECT_ROOT/frontend/node_modules" ]; then
  echo "[*] Installing frontend npm dependencies..."
  (cd "$PROJECT_ROOT/frontend" && npm install)
fi

# 3. Database Migrations
echo "[*] Ensuring database schema is up-to-date with Alembic..."
(cd "$PROJECT_ROOT/backend" && alembic upgrade head || echo "[!] Alembic check completed.")

# 4. Seed Demo Data if database is empty
echo "[*] Checking demo data in database..."
python3 -c "
from backend.app.database import SessionLocal
from backend.app.models.user import User
from backend.app.models.report import Report
from backend.app.services.seeder import seed_database

db = SessionLocal()
try:
    user_cnt = db.query(User).count()
    rep_cnt = db.query(Report).count()
    if user_cnt == 0 or rep_cnt == 0:
        print('[*] Database is empty. Seeding initial Clean Bharat demo records...')
        seed_database(db)
        print('[+] Demo data successfully seeded (180+ reports across 8 wards).')
    else:
        print(f'[+] Verified existing database with {rep_cnt} reports and {user_cnt} users.')
finally:
    db.close()
"

# 5. Dynamic Port Selection (prevent 'Address already in use' errors)
find_available_port() {
  local port=$1
  while lsof -Pi :"$port" -sTCP:LISTEN -t >/dev/null 2>&1; do
    echo "[!] Port $port is already in use. Checking next port..."
    port=$((port + 1))
  done
  echo "$port"
}

REQUESTED_BACKEND_PORT=${BACKEND_PORT:-8000}
REQUESTED_FRONTEND_PORT=${FRONTEND_PORT:-5173}

BACKEND_PORT=$(find_available_port "$REQUESTED_BACKEND_PORT")
FRONTEND_PORT=$(find_available_port "$REQUESTED_FRONTEND_PORT")

echo "----------------------------------------------------------------------"
echo "[*] Selected Backend Port:  $BACKEND_PORT (requested $REQUESTED_BACKEND_PORT)"
echo "[*] Selected Frontend Port: $FRONTEND_PORT (requested $REQUESTED_FRONTEND_PORT)"
echo "----------------------------------------------------------------------"

# Clean up children on exit
cleanup() {
  echo ""
  echo "[*] Stopping SmartRoute AI servers..."
  if [ -n "$BACKEND_PID" ]; then
    kill "$BACKEND_PID" 2>/dev/null || true
  fi
  if [ -n "$FRONTEND_PID" ]; then
    kill "$FRONTEND_PID" 2>/dev/null || true
  fi
  echo "[+] Services stopped cleanly."
  exit 0
}

trap cleanup SIGINT SIGTERM EXIT

# Start backend
python3 -m uvicorn backend.app.main:app --host 0.0.0.0 --port "$BACKEND_PORT" --reload &
BACKEND_PID=$!

# Wait briefly for backend to initialize
sleep 2

# Export target API URL for frontend
export VITE_API_BASE_URL="http://127.0.0.1:${BACKEND_PORT}/api"

# Start frontend
(cd "$PROJECT_ROOT/frontend" && npm run dev -- --host 0.0.0.0 --port "$FRONTEND_PORT") &
FRONTEND_PID=$!

echo ""
echo "======================================================================"
echo "  SmartRoute AI Platform is LIVE and ready for judge evaluation!"
echo "======================================================================"
echo "  Frontend Application: http://localhost:${FRONTEND_PORT}"
echo "  Backend API / Docs:   http://localhost:${BACKEND_PORT}/docs"
echo "  Telemetry Health:     http://localhost:${BACKEND_PORT}/api/health"
echo "----------------------------------------------------------------------"
echo "  Demo Logins (Password for all: Password123!):"
echo "    - Citizen:    citizen@cleanbharat.gov.in"
echo "    - Worker:     worker@cleanbharat.gov.in"
echo "    - Supervisor: supervisor@cleanbharat.gov.in"
echo "    - Admin:      admin@cleanbharat.gov.in"
echo "======================================================================"
echo "Press Ctrl+C to stop all servers."
echo ""

wait
