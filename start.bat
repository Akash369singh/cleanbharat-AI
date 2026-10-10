@echo off
REM ==============================================================================
REM SmartRoute AI — Clean Bharat Intelligence Platform
REM Windows Batch Launcher
REM ==============================================================================

echo ======================================================================
echo   SmartRoute AI — Clean Bharat Intelligence Platform (Hackathon 2026)
echo ======================================================================

set PYTHONPATH=%CD%
set DATABASE_URL=sqlite:///./cleanbharat.db

echo [*] Upgrading database migrations with Alembic...
cd backend
alembic upgrade head
cd ..

echo [*] Checking seed demo data...
python -c "from backend.app.database import SessionLocal; from backend.app.models.user import User; from backend.app.models.report import Report; from backend.app.services.seeder import seed_database; db = SessionLocal(); seed_database(db) if (db.query(User).count() == 0 or db.query(Report).count() == 0) else print('Existing verified database found.'); db.close()"

echo [*] Starting FastAPI Backend on http://localhost:8000 ...
start "SmartRoute Backend" cmd /k "python -m uvicorn backend.app.main:app --host 0.0.0.0 --port 8000 --reload"

timeout /t 2 /nobreak >nul

echo [*] Starting Vite Frontend on http://localhost:5173 ...
cd frontend
start "SmartRoute Frontend" cmd /k "npm run dev -- --host 0.0.0.0 --port 5173"
cd ..

echo.
echo ======================================================================
echo   SmartRoute AI Platform is running!
echo   Frontend Application: http://localhost:5173
echo   Backend API / Docs:   http://localhost:8000/docs
echo   Telemetry Health:     http://localhost:8000/api/health
echo ======================================================================
echo   Demo Logins (Password: Password123!):
echo     - citizen@cleanbharat.gov.in
echo     - worker@cleanbharat.gov.in
echo     - supervisor@cleanbharat.gov.in
echo     - admin@cleanbharat.gov.in
echo ======================================================================
pause
