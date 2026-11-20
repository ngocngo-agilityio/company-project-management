# company-project-management

Monorepo with a backend (Fastify + Prisma) and a web app (React + Vite).

## 🏗️ Infrastructure

| Service | Region | Project name | Owner |
|---|---|---|---|
| Render | Singapore | `company-project-management` | Personal |
| Supabase (PostgreSQL) | South Asia (Mumbai) | `company-project-management` | Personal |
| Google Cloud (OAuth) | — | `company-project-management` | Personal |

## 🌐 URLs

| Component | URL |
|---|---|
| Backend | https://company-project-management-mmqg.onrender.com |
| Web | https://company-project-management-web.onrender.com |

The backend health check is at `/health`.

## 🔧 Run locally

```bash
pnpm install
cp .env.example .env   # then fill in real values in .env
pnpm run dev
```

- The web app runs at `http://localhost:5173`. Requests to `/api` are proxied to the backend.
- The backend runs at `http://127.0.0.1:3000` by default.

## 🔐 Environment variables

Real values live only in the local `.env` file and in Render's Environment settings. Do not commit `.env`, and do not put secrets in this README.

| Variable | Description |
|---|---|
| `PORT`, `HOST` | Port and bind address for the backend |
| `DATABASE_URL` | Supabase connection string (Session pooler) |
| `GOOGLE_CLIENT_ID`, `GOOGLE_CLIENT_SECRET` | OAuth client from Google Cloud |
| `GOOGLE_REDIRECT_URI` | `http://localhost:3000/auth/google/callback` for local development |
