# SmartRoute AI — Deployment Guide
**Clean Bharat Intelligence Platform (AI First Product Builder Hackathon 2026)**

The codebase is engineered with unified single-service architecture: FastAPI serves both the REST API under `/api` and the compiled production React SPA under `/`. This allows deploying everything onto a single free web service without CORS or multi-domain configuration.

---

## Option 1: 1-Click Free Deployment on Render.com (Recommended)

Render can build both the frontend and backend together using the included `render.yaml` blueprint.

1. **Sign in to Render**: Go to [dashboard.render.com](https://dashboard.render.com).
2. **Create New Blueprint Instance**:
   - Click **New +** &rarr; **Blueprint**.
   - Connect your GitHub repository: `https://github.com/AkashSinghTech/cleanbharat-AI`.
   - Render automatically detects `render.yaml`.
3. **Deploy**:
   - Click **Apply**.
   - Render will automatically install Python and Node dependencies, build the frontend bundle, apply database migrations, seed the initial dataset, and launch `uvicorn` on the assigned `$PORT`.
4. **Live URL**:
   - Your application will be live at `https://cleanbharat-ai.onrender.com` (or your chosen service name).

---

## Option 2: 1-Click Deployment on Railway.app

1. Go to [railway.app](https://railway.app) and click **New Project** &rarr; **Deploy from GitHub repo**.
2. Select `AkashSinghTech/cleanbharat-AI`.
3. Set the following environment variables:
   - `PORT`: `8000` (or Railway's default)
   - `DATABASE_URL`: `sqlite:///./cleanbharat.db` (or provision a Railway PostgreSQL database)
4. Railway detects the `Dockerfile` or `Procfile` and builds the unified application automatically.

---

## Option 3: Split Deployment (Vercel Frontend + Render Backend)

If you prefer hosting the React frontend on Vercel and the FastAPI backend on Render:

### A. Deploy Backend (Render / Railway)
- **Root Directory**: Repository root
- **Build Command**: `pip install -r backend/requirements.txt && alembic upgrade head`
- **Start Command**: `uvicorn backend.app.main:app --host 0.0.0.0 --port $PORT`
- **CORS**: Automatically allows all origins (`*`).
- Note your live backend URL (e.g. `https://cleanbharat-backend.onrender.com`).

### B. Deploy Frontend (Vercel)
- Go to [vercel.com](https://vercel.com) &rarr; **Add New Project** &rarr; Select `cleanbharat-AI`.
- **Root Directory**: `frontend`
- **Framework Preset**: `Vite`
- **Build Command**: `npm run build`
- **Output Directory**: `dist`
- **Environment Variable**:
  - `VITE_API_BASE_URL`: `https://cleanbharat-backend.onrender.com/api`
- Click **Deploy**.

---

## Option 4: Containerized Deployment (Docker / VPS / Cloud Run)

To run the full-stack container on any Docker host:

```bash
# Clone the repository
git clone https://github.com/AkashSinghTech/cleanbharat-AI.git
cd cleanbharat-AI

# Build and start the container
docker compose up -d --build
```

The unified app will be accessible at `http://localhost:8000`.
To deploy to Google Cloud Run or AWS ECS:
```bash
docker build -t gcr.io/YOUR_PROJECT/cleanbharat-ai .
docker push gcr.io/YOUR_PROJECT/cleanbharat-ai
```
