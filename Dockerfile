# Stage 1: Build Frontend
FROM node:20-alpine AS frontend-builder
WORKDIR /app/frontend
COPY frontend/package*.json ./
RUN npm ci
COPY frontend/ ./
RUN npm run build

# Stage 2: Python Backend & Runtime
FROM python:3.11-slim
WORKDIR /app

# Install system dependencies
RUN apt-get update && apt-get install -y --no-install-recommends \
    build-essential \
    curl \
    && rm -rf /var/lib/apt/lists/*

# Install Python requirements
COPY backend/requirements.txt ./backend/requirements.txt
RUN pip install --no-cache-dir -r backend/requirements.txt

# Copy backend code, migrations, and scripts
COPY backend/ ./backend/
COPY alembic.ini ./
COPY start.sh ./

# Copy built frontend assets from stage 1
COPY --from=frontend-builder /app/frontend/dist ./frontend/dist

# Environment settings
ENV PYTHONPATH=/app
ENV PORT=8000
ENV DATABASE_URL=sqlite:///./cleanbharat.db

EXPOSE 8000

# Run migrations, auto-seed if fresh, and start uvicorn
CMD ["sh", "-c", "alembic upgrade head && python3 -c \"from backend.app.database import SessionLocal; from backend.app.models.user import User; from backend.app.services.seeder import seed_database; db = SessionLocal(); User.query.count() if hasattr(User, 'query') else None; seed_database(db) if db.query(User).count() == 0 else None; db.close()\" && uvicorn backend.app.main:app --host 0.0.0.0 --port ${PORT}"]
