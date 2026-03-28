# DeepInspect

AI-powered bridge risk assessment for Poland. Enter a city name, get a prioritised risk map of every bridge — scored by Gemini vision, Street View imagery, and structural metadata — with no field inspection required.

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Get API Keys](#2-get-api-keys)
3. [Project Setup](#3-project-setup)
4. [Run Locally](#4-run-locally)
5. [Run with Docker](#5-run-with-docker)
6. [Pre-compute Demo Cache](#6-pre-compute-demo-cache)
7. [Using the App](#7-using-the-app)
8. [API Reference](#8-api-reference)
9. [How Risk Scoring Works](#9-how-risk-scoring-works)
10. [Project Structure](#10-project-structure)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

Make sure you have these installed before starting:

| Tool | Minimum version | Check |
|------|----------------|-------|
| Python | 3.11+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Git | any | `git --version` |

Docker is only needed if you want to use the containerised setup (Step 5).

---

## 2. Get API Keys

You need two API keys. Both are available for free with Google Cloud credits.

### Gemini API key

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Click **Get API key** → **Create API key**
3. Copy the key — you'll need it in Step 3

### Google Maps API key

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Create a new project (or select an existing one)
3. Go to **APIs & Services** → **Enable APIs** and enable all three:
   - **Maps JavaScript API** (frontend map display)
   - **Street View Static API** (bridge imagery)
   - **Geocoding API** (city name → coordinates)
4. Go to **APIs & Services** → **Credentials** → **Create Credentials** → **API Key**
5. Copy the key

> **Tip:** Restrict the API key to only the three APIs above for security.

---

## 3. Project Setup

Clone or navigate to the project, then configure both `.env` files.

### Backend environment file

```bash
cd deepinspect/backend
cp .env.example .env
```

Open `backend/.env` and fill in your keys:

```env
GEMINI_API_KEY=your_gemini_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_key_here
REDIS_URL=redis://localhost:6379
DEMO_MODE=true
MAX_BRIDGES_PER_SCAN=50
STREETVIEW_CACHE_DIR=./data/demo_cache/images
GEMINI_MODEL=gemini-3.1-flash-lite-preview
```

### Frontend environment file

```bash
cd deepinspect/frontend
cp .env.example .env
```

Open `frontend/.env` and fill in your Maps key:

```env
VITE_API_BASE_URL=http://localhost:8000
VITE_GOOGLE_MAPS_API_KEY=your_google_maps_key_here
```

> The Maps key is the **same key** as in the backend `.env`.

---

## 4. Run Locally

Open **two terminals** — one for the backend, one for the frontend.

### Terminal 1 — Backend

```bash
cd deepinspect/backend

# Create a Python virtual environment
python -m venv venv

# Activate it
source venv/bin/activate        # macOS / Linux
venv\Scripts\activate           # Windows

# Install dependencies
pip install -r requirements.txt

# Start the server
uvicorn main:app --reload
```

You should see:
```
INFO:     Uvicorn running on http://127.0.0.1:8000
```

Verify it's working: open [http://localhost:8000/health](http://localhost:8000/health) — you should see `{"status":"ok"}`.

Interactive API docs are at [http://localhost:8000/docs](http://localhost:8000/docs).

### Terminal 2 — Frontend

```bash
cd deepinspect/frontend

# Install dependencies
npm install

# Start the dev server
npm run dev
```

You should see:
```
  VITE ready in ...ms
  ➜  Local:   http://localhost:5173/
```

Open [http://localhost:5173](http://localhost:5173) in your browser.

---

## 5. Run with Docker

If you prefer Docker over manual setup:

```bash
cd deepinspect

# Make sure backend/.env is filled in (Step 3)
# Then export your Maps key for the frontend container
export GOOGLE_MAPS_API_KEY=your_google_maps_key_here   # macOS/Linux
set GOOGLE_MAPS_API_KEY=your_google_maps_key_here       # Windows CMD

# Build and start everything
docker-compose up --build
```

Services:
- Frontend → [http://localhost:5173](http://localhost:5173)
- Backend → [http://localhost:8000](http://localhost:8000)
- Redis → `localhost:6379` (optional cache, used automatically)

To stop:
```bash
docker-compose down
```

---

## 6. Pre-compute Demo Cache

For a live demo or presentation, run the pre-computation script **before** you go on stage. It scans Wrocław's bridges once, saves results to disk, and the `/api/demo` endpoint returns them instantly with no API calls during your demo.

```bash
# From the deepinspect/ root directory
cd deepinspect

# Make sure your backend venv is active
source backend/venv/bin/activate    # macOS/Linux
backend\venv\Scripts\activate       # Windows

python scripts/precompute_demo.py
```

This takes 3–8 minutes on first run (fetches Street View images + runs Gemini analysis for ~30 bridges). Subsequent runs are faster because Street View images are cached to disk.

When complete you'll see:
```
Saved 30 bridge reports to backend/data/demo_cache/wroclaw.json
Risk distribution:
  CRITICAL   ████ (4)
  HIGH       ████████ (8)
  MEDIUM     ██████████ (10)
  OK         ████████ (8)

Demo cache ready. Use GET /api/demo endpoint during the presentation.
```

Then click **"Load Wrocław demo"** in the UI, or hit `GET /api/demo`.

---

## 7. Using the App

### Search bar

| Mode | Input example | What it does |
|------|--------------|--------------|
| **City** | `Wrocław` | Scans all bridges in the city bounding box |
| **Bridge name** | `Most Grunwaldzki` | Looks up a specific named bridge |
| **Coordinates** | `51.1079, 17.0385` | Finds bridges within ~2 km of the point |

Click **Scan** and wait 1–3 minutes for the analysis to complete (parallelised per bridge).

### Map

- Markers are colour-coded by risk tier: **red** = CRITICAL, **orange** = HIGH, **amber** = MEDIUM, **green** = OK
- Larger markers = higher risk
- Click any marker to open the detail panel on the right

### Bridge detail panel

Shows for the selected bridge:
- Risk tier and score (1.0–5.0)
- Construction year, material, era
- AI-generated condition summary
- Key risk factors
- Recommended action
- Visual defect scores (6 categories, each 1–5)
- Confidence caveats
- **Download PDF Report** button

### Filter bar

Click **CRITICAL / HIGH / MEDIUM / OK / ALL** above the map to show only bridges in that tier.

### Upload image

Click **"Upload bridge image"** to analyse your own photo directly with Gemini vision — no bridge discovery step, result shown immediately as an alert.

### Load demo

Click **"Load Wrocław demo"** to load pre-cached results instantly (requires Step 6 to have been run first).

---

## 8. API Reference

Base URL: `http://localhost:8000`

### `GET /health`

Returns server status.

```json
{"status": "ok", "model": "gemini-3.1-flash-lite-preview"}
```

### `POST /api/scan`

Run the full 4-agent pipeline on a query.

**Request body:**
```json
{
  "query": "Wrocław",
  "query_type": "city_scan",
  "max_bridges": 30
}
```

`query_type` values:
- `city_scan` — city name (e.g. `"Wrocław"`, `"Kraków"`)
- `bridge_lookup` — bridge name (e.g. `"Most Grunwaldzki"`)
- `coordinate_query` — `"lat, lon"` string (e.g. `"51.1079, 17.0385"`)

**Response:** array of `BridgeRiskReport` objects (sorted by risk score, highest first).

### `GET /api/demo`

Returns pre-cached Wrocław scan results. Requires `precompute_demo.py` to have been run first.

### `POST /api/analyze-image`

Analyse an uploaded image file directly.

```bash
curl -X POST http://localhost:8000/api/analyze-image \
  -F "file=@/path/to/bridge.jpg"
```

Returns a `VisualAssessment` JSON object with scores for all 6 defect categories.

---

## 9. How Risk Scoring Works

Each bridge gets a score from **1.0 (best)** to **5.0 (worst)** using a weighted formula:

| Factor | Weight | Source |
|--------|--------|--------|
| Visual condition (Gemini vision) | 40% | Street View images — 6 defect categories |
| Bridge age | 25% | OSM `start_date` or Gemini-estimated construction year |
| Incident history | 20% | Number of known past incidents or closures |
| Inspection staleness | 15% | Years since last recorded inspection |

If no Street View imagery is available, visual score defaults to 3.0 (medium risk assumption).
If no inspection record exists, staleness defaults to 4.5 (high risk assumption — treat as unknown = risky).

### Risk tiers

| Tier | Score range | Recommended action |
|------|-------------|-------------------|
| CRITICAL | 4.0 – 5.0 | Immediate closure and emergency inspection |
| HIGH | 3.0 – 3.9 | Priority inspection within 30 days |
| MEDIUM | 2.0 – 2.9 | Schedule inspection within 6 months |
| OK | 1.0 – 1.9 | Routine monitoring — next standard cycle |

---

## 10. Project Structure

```
deepinspect/
├── backend/
│   ├── main.py                  # FastAPI entrypoint — 4 endpoints
│   ├── config.py                # Settings loaded from .env
│   ├── agents/
│   │   ├── orchestrator.py      # Coordinates all 4 agents
│   │   ├── discovery_agent.py   # Overpass OSM + geocoding → bridge list
│   │   ├── vision_agent.py      # Street View fetch + Gemini vision scoring
│   │   ├── context_agent.py     # Gemini text → construction history
│   │   └── risk_agent.py        # Score fusion + Gemini narrative report
│   ├── models/
│   │   ├── bridge.py            # BridgeTarget, BridgeRiskReport, ScanRequest
│   │   ├── vision.py            # VisualAssessment, DefectScore
│   │   └── context.py           # BridgeContext
│   ├── services/
│   │   ├── gemini_service.py    # Gemini model instances + generation configs
│   │   ├── overpass_service.py  # OSM Overpass API wrapper
│   │   ├── maps_service.py      # Google Geocoding API wrapper
│   │   └── streetview_service.py# Street View fetch + disk cache
│   ├── utils/
│   │   ├── scoring.py           # Risk score formula + tier mapping
│   │   └── cache.py             # Redis with in-memory fallback
│   ├── prompts/
│   │   ├── vision_prompt.txt    # Structural defect scoring prompt
│   │   ├── context_prompt.txt   # Bridge history research prompt
│   │   └── risk_report_prompt.txt # Narrative report generation prompt
│   ├── data/demo_cache/         # Pre-computed results + cached images
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Root layout
│   │   ├── components/
│   │   │   ├── MapView.jsx      # Google Map + risk markers + filter bar
│   │   │   ├── SearchBar.jsx    # Query input + demo/upload buttons
│   │   │   ├── BridgePanel.jsx  # Selected bridge detail sidebar
│   │   │   ├── StatsPanel.jsx   # Risk count summary (left sidebar)
│   │   │   ├── RiskBadge.jsx    # Colour-coded tier badge
│   │   │   └── ReportExport.jsx # jsPDF report download
│   │   ├── store/useAppStore.js # Zustand global state
│   │   ├── hooks/useBridgeScan.js # API call hooks
│   │   └── utils/riskColors.js  # Tier → colour mapping
│   ├── index.html
│   ├── package.json
│   ├── vite.config.js
│   ├── tailwind.config.js
│   ├── .env.example
│   └── Dockerfile
├── scripts/
│   └── precompute_demo.py       # Pre-cache Wrocław scan results
├── docker-compose.yml
└── README.md
```

---

## 11. Troubleshooting

**`GEMINI_API_KEY` / `GOOGLE_MAPS_API_KEY` not found**
→ Make sure `backend/.env` exists and is not named `.env.example`. Both keys must be set.

**`REQUEST_DENIED` from Google Maps**
→ Check that all three APIs are enabled in your Google Cloud project: Maps JavaScript API, Street View Static API, Geocoding API.

**`No bridges found` for a city**
→ OpenStreetMap data varies by region. Try a larger city (`Wrocław`, `Kraków`, `Warszawa`). For coordinates, make sure the format is `lat, lon` with a comma.

**Street View returns no images**
→ Many rural bridges have no Street View coverage. The system defaults to a medium-risk score (3.0) and notes limited coverage in the confidence caveat.

**Frontend shows blank map**
→ Check `frontend/.env` has `VITE_GOOGLE_MAPS_API_KEY` set. The Maps JavaScript API must be enabled. Restart `npm run dev` after editing `.env`.

**Redis connection error in logs**
→ This is non-fatal. The backend automatically falls back to in-memory caching. Redis is optional — you don't need to install it to run the project.

**Demo cache not found (`GET /api/demo` returns 404)**
→ Run `python scripts/precompute_demo.py` from the `deepinspect/` root directory first.

**Gemini model not found error**
→ Update `GEMINI_MODEL` in `backend/.env` to a model name available in your API tier. The default is `gemini-3.1-flash-lite-preview`.
