# Fingermile

> How far has your finger travelled scrolling today?

Fingermile is a Chrome extension that measures how far your finger travels while scrolling across websites, exposed as personal analytics. Think: _"Your finger travelled 1.4km on YouTube today."_

---

## Features

- **Per-site scroll tracking** — see which websites you scroll the most
- **Distance + time metrics** — scroll distance in meters, time spent per site
- **Privacy-first** — raw pixel data never leaves your browser; only final centimeter values are sent
- **Personal dashboard** — web app with date range filters and site breakdown
- **Chrome extension popup** — quick glance at your stats without leaving the browser
- **Multi-user** — sign in with Google or email via Clerk

---

## Architecture

```
┌─────────────────┐     ┌──────────────────┐     ┌──────────────────┐
│  Chrome Extension│────▶│   Web Dashboard   │────▶│  FastAPI Backend  │
│  (content script │     │  (Vite + React)   │     │  (PostgreSQL)     │
│   + popup UI)    │     │  Clerk sync host  │     │  Railway deploy   │
└─────────────────┘     └──────────────────┘     └──────────────────┘
```

| Component     | Stack                                  | Path         |
| ------------- | -------------------------------------- | ------------ |
| **Extension** | React, Chrome APIs, Clerk Chrome SDK   | `extension/` |
| **Web App**   | Vite, React, Tailwind CSS, Clerk React | `web/`       |
| **Backend**   | FastAPI, SQLModel, asyncpg, PostgreSQL | `backend/`   |

---

## How It Works

1. The extension listens for `wheel` events on every page
2. `deltaY` (pixels scrolled) is normalized across `deltaMode` values (line, page, pixel)
3. Pixels are converted to centimeters using your screen DPI and device pixel ratio
4. Distance accumulates in the content script, flushes to the background worker every 2s
5. Every 5 minutes, the session syncs to the backend via authenticated API call
6. The web dashboard fetches aggregated data for display

**What we collect:** scroll distance (cm), duration (s), site hostname, date
**What we never collect:** page content, keystrokes, URLs, screenshots, browsing history

---

## Getting Started

### Prerequisites

- Node.js 18+
- Python 3.11+
- PostgreSQL (or a Railway Postgres instance)
- A [Clerk](https://clerk.com) account

### 1. Backend

```bash
cd backend
cp .env.dist .env   # fill in DATABASE_URL and CLERK_JWKS_URL
pip install -r requirements.txt
uvicorn app.main:app --reload
```

The API runs at `http://localhost:8000`. Tables are auto-created on startup via `init_db()`.

### 2. Web App

```bash
cd web
cp .env.dist .env   # fill in VITE_CLERK_PUBLISHABLE_KEY and VITE_BACKEND_URL
npm install
npm run dev
```

The dashboard runs at `http://localhost:5173`.

### 3. Extension

```bash
cd extension
cp .env.dist .env   # fill in all required vars
npm install
npm run build
```

Load the `extension/dist/` folder as an unpacked extension in `chrome://extensions`.

---

## Environment Variables

### Backend

| Variable         | Required | Description                                               |
| ---------------- | -------- | --------------------------------------------------------- |
| `DATABASE_URL`   | Yes      | PostgreSQL connection string (`postgresql+asyncpg://...`) |
| `CLERK_JWKS_URL` | Yes      | Clerk JWKS endpoint for JWT verification                  |
| `BYPASS_AUTH`    | No       | Set to `true` to skip auth (local dev only)               |

### Web App

| Variable                     | Required | Description           |
| ---------------------------- | -------- | --------------------- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes      | Clerk publishable key |
| `VITE_BACKEND_URL`           | Yes      | Backend API URL       |

### Extension

| Variable                     | Required | Description                             |
| ---------------------------- | -------- | --------------------------------------- |
| `VITE_CLERK_PUBLISHABLE_KEY` | Yes      | Clerk publishable key                   |
| `VITE_CLERK_SYNC_HOST`       | Yes      | Web app URL (Clerk session sync host)   |
| `VITE_BACKEND_URL`           | Yes      | Backend API URL                         |
| `VITE_WEB_DASHBOARD_URL`     | Yes      | Web app URL (for "View Dashboard" link) |
| `VITE_CLERK_FRONTEND_API`    | Yes      | Clerk Frontend API URL                  |

---

## API Endpoints

| Method   | Endpoint                      | Auth       | Description                                  |
| -------- | ----------------------------- | ---------- | -------------------------------------------- |
| `POST`   | `/v1/scroll`                  | Bearer JWT | Upsert a scroll session (called every 5 min) |
| `GET`    | `/v1/metrics?from=&to=&site=` | Bearer JWT | Get aggregated daily scroll data             |
| `DELETE` | `/v1/data`                    | Bearer JWT | Hard-delete all user data                    |
| `POST`   | `/v1/contact`                 | None       | Submit a contact form message                |
| `GET`    | `/health`                     | None       | Health check                                 |

---

## Deployment

### Railway

The backend deploys automatically on Railway via `railway.json`:

```bash
# Set these in Railway → Variables
DATABASE_URL=${{Postgres.DATABASE_URL}}
CLERK_JWKS_URL=https://your-instance.clerk.accounts.dev/.well-known/jwks.json
```

The web app can be deployed to any static host (Vercel, Netlify, Railway).

### Docker

```bash
# Production (external Postgres)
cd backend
docker build -t fingermile-api .

# Local dev (embedded Postgres)
docker compose up
```

---

## Project Structure

```
fingermile/
├── backend/
│   ├── app/
│   │   ├── main.py          # FastAPI app + lifespan
│   │   ├── routes.py        # API endpoints
│   │   ├── models.py        # SQLModel tables + Pydantic schemas
│   │   ├── db.py            # Async engine + session factory
│   │   ├── auth.py          # Clerk JWT verification
│   │   └── limiter.py       # Rate limiting
│   ├── Dockerfile           # Production build
│   ├── Dockerfile.compose   # Local dev (embedded Postgres)
│   ├── requirements.txt
│   └── railway.json
├── web/
│   ├── src/
│   │   ├── pages/           # HomePage, SignIn, SignUp, Privacy, Contact
│   │   ├── components/      # Logo, Header, Footer
│   │   └── index.css        # Tailwind + design tokens
│   ├── index.html
│   └── package.json
├── extension/
│   ├── src/
│   │   ├── popup/           # React popup UI
│   │   ├── content.ts       # Scroll event listener
│   │   └── background.ts    # Session management + sync
│   ├── public/              # Icons, manifest, fonts
│   └── package.json
└── docker-compose.yml
```

---

## License

MIT
