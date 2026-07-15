# Fingermile

## Project Overview
A multi-user Chrome extension that tracks how far your finger has travelled scrolling across websites, exposed as personal analytics. Think: "your finger travelled 1.4km on YouTube today."

---

## Architecture

### Components
- **Chrome Extension** — content script + service worker + popup
- **Backend** — FastAPI + PostgreSQL, deployed on Railway
- **Auth** — Clerk (Google OAuth via `launchWebAuthFlow`)
- **Dashboard** — (Phase 2)

---

## Database Schema (PostgreSQL)

### `users`
| Column | Type | Note |
|---|---|---|
| `id` | UUID PK | Internal ID |
| `clerk_user_id` | VARCHAR UNIQUE | Clerk's user ID |
| `created_at` | TIMESTAMPTZ | |

### `scroll_sessions`
| Column | Type | Note |
|---|---|---|
| `id` | UUID PK | |
| `user_id` | UUID FK | → users.id |
| `session_id` | UUID UNIQUE | Generated in extension, idempotency key |
| `site` | VARCHAR | Normalized: `youtube.com` (no www, no path) |
| `duration_seconds` | INT | |
| `distance_cm` | INT | Converted in extension before sending |
| `date` | DATE | Set at session start in extension |
| `created_at` | TIMESTAMPTZ | |

### Indexes
- `(user_id, date)` — aggregation queries
- `(user_id, site)` — per-site stats
- `session_id` — upsert lookups

---

## API Design

**Base URL:** `/v1`  
**Auth:** All endpoints require `Authorization: Bearer <clerk_jwt>` header.  
**User identity:** Always extracted from JWT on backend. Never trust client-sent `user_id`.  
**Date format:** ISO 8601 — `YYYY-MM-DD` everywhere.

---

### POST `/v1/scroll`
Upserts a scroll session. Called every 300s and on session end.

**Request Body:**
```json
{
  "session_id": "uuid4",
  "site": "youtube.com",
  "duration_seconds": 300,
  "distance_cm": 45000,
  "date": "2026-06-05"
}
```

**Response:**
- `201 Created` — no body
- `4xx/5xx` — error body with message

---

### GET `/v1/metrics?from=YYYY-MM-DD&to=YYYY-MM-DD&site=youtube.com,twitter.com`
Returns aggregated daily scroll data grouped by site.

**Query Params:**
| Param | Required | Note |
|---|---|---|
| `from` | Yes | Start date inclusive |
| `to` | Yes | End date inclusive |
| `site` | No | Comma-separated hostnames. Omit for all sites. |

**Response:**
```json
{
  "from": "2026-06-01",
  "to": "2026-06-05",
  "data": {
    "youtube.com": [
      { "date": "2026-06-01", "distance_m": 120.5, "duration_min": 34.0 },
      { "date": "2026-06-02", "distance_m": 98.2, "duration_min": 28.5 }
    ],
    "twitter.com": [
      { "date": "2026-06-01", "distance_m": 75.0, "duration_min": 20.0 }
    ]
  },
  "totals": {
    "distance_m": 293.7,
    "duration_min": 82.5
  }
}
```

---

## Extension Architecture

### Session Lifecycle
1. Tab gains focus → generate `session_id` (UUID v4), record `date`, start timer
2. Every 300s → upsert to `POST /v1/scroll`
3. `visibilitychange: hidden` → `navigator.sendBeacon()` for final sync
4. Persist session state to `chrome.storage.local` every 300s as fallback
5. On extension load → scan `chrome.storage.local` for orphaned sessions, flush with original `date`

### Scroll Distance Calculation
Done entirely in the extension before sending to backend.

```javascript
// Normalize deltaMode
let deltaY = event.deltaY;
if (event.deltaMode === 1) deltaY *= 16;      // LINE → px (approx)
if (event.deltaMode === 2) deltaY *= window.innerHeight; // PAGE → px

// Convert px → cm
const dpi = 96 * window.devicePixelRatio;
const px_per_cm = dpi / 2.54;
const distance_cm = Math.abs(deltaY) / px_per_cm;
```

### Site Normalization
```javascript
// Always strip www and path
const site = window.location.hostname.replace(/^www\./, '');
```

### Storage Keys (chrome.storage.local)
```json
{
  "session:<session_id>": {
    "session_id": "uuid4",
    "site": "youtube.com",
    "date": "2026-06-05",
    "distance_cm": 45000,
    "duration_seconds": 300,
    "created_at": "2026-06-05T10:00:00Z",
    "synced": false
  }
}
```

---

## Auth Flow (Clerk + Extension)

1. Extension calls `chrome.identity.launchWebAuthFlow` → Clerk hosted OAuth UI
2. User signs in via Google or Microsoft
3. Clerk returns JWT
4. Extension stores JWT, sends as `Authorization: Bearer <jwt>` on all requests
5. Backend verifies JWT via Clerk SDK, extracts `clerk_user_id`
6. Backend upserts `users` table on first call

---

## Key Decisions & Rationale

| Decision | Rationale |
|---|---|
| Convert distance in extension | Privacy — backend never sees raw pixel data |
| `session_id` generated in extension | Enables idempotent upserts, prevents duplicates on retry |
| `date` set at session start | Correct attribution even if flush happens next day |
| `distance_cm` stored as INT | Avoids float precision issues in DB, sufficient granularity |
| Response in meters/minutes | Human-readable, conversion done at read time in backend |
| Grouped response shape | Frontend gets pre-aggregated data, no client-side grouping needed |

---

## Out of Scope (Phase 2)
- Midnight-spanning session splitting
- Social leaderboards
- "Mount Fuji" milestone gamification
- Dashboard frontend
- Per-page tracking (currently per-site only)