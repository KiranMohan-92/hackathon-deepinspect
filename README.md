# DeepInspect

AI-powered bridge risk assessment for Poland. Scan any city or map area to discover motor-vehicle bridges ranked by structural priority, then deep-analyse individual bridges with Gemini vision and Street View imagery — no field inspection required.

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
9. [How It Works](#9-how-it-works)
10. [Project Structure](#10-project-structure)
11. [Troubleshooting](#11-troubleshooting)

---

## 1. Prerequisites

| Tool | Minimum version | Check |
|------|----------------|-------|
| Python | 3.11+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Git | any | `git --version` |

Docker is only needed for the containerised setup (Step 5).

---

## 2. Get API Keys

You need two API keys.

### Gemini API key

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Click **Get API key** → **Create API key**
3. Copy the key

### Google Maps API key

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Enable these two APIs:
   - **Street View Static API** — bridge imagery
   - **Geocoding API** — city name → coordinates (used as fallback; primary geocoding uses free OSM Nominatim)
3. Go to **Credentials** → **Create API Key**
4. Copy the key

> **Note:** The map itself uses OpenStreetMap (free, no key needed). You do **not** need the Maps JavaScript API.

---

## 3. Project Setup

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
MAX_BRIDGES_PER_SCAN=500
STREETVIEW_CACHE_DIR=./data/demo_cache/images
GEMINI_MODEL=gemini-3.1-flash-lite-preview
```

### Frontend environment file

```bash
cd deepinspect/frontend
cp .env.example .env
```

Open `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

The frontend no longer needs a Maps API key — the map runs on OpenStreetMap via Leaflet.

---

## 4. Run Locally

Open **two terminals**.

### Terminal 1 — Backend

```bash
cd deepinspect/backend

python -m venv venv

source venv/bin/activate        # macOS / Linux
venv\Scripts\activate           # Windows

pip install -r requirements.txt

uvicorn main:app --reload
```

Verify: [http://localhost:8000/health](http://localhost:8000/health) → `{"status":"ok"}`

Interactive docs: [http://localhost:8000/docs](http://localhost:8000/docs)

### Terminal 2 — Frontend

```bash
cd deepinspect/frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## 5. Run with Docker

```bash
cd deepinspect

# Make sure backend/.env is filled in first
docker-compose up --build
```

Services:
- Frontend → [http://localhost:5173](http://localhost:5173)
- Backend  → [http://localhost:8000](http://localhost:8000)
- Redis    → `localhost:6379` (optional cache, used automatically)

```bash
docker-compose down
```

---

## 6. Pre-compute Demo Cache

Run this before a live demo to pre-cache Wrocław results so the demo button returns instantly.

```bash
cd deepinspect

source backend/venv/bin/activate    # macOS/Linux
backend\venv\Scripts\activate       # Windows

python scripts/precompute_demo.py
```

Then click **Load Wrocław demo** in the UI, or call `GET /api/demo`.

---

## 7. Using the App

### Two-phase workflow

DeepInspect uses a two-phase approach that separates fast discovery from slow analysis:

**Phase 1 — Discover (instant)**
Enter a city name or use "Scan this area" on the map. The backend queries OpenStreetMap for all motor-vehicle bridges (motorway, trunk, primary, secondary, tertiary, residential) and returns them sorted by structural priority. A city like Warsaw returns ~200–400 bridges in seconds — no Gemini calls, no images.

**Phase 2 — Analyse (per bridge, ~15–30 seconds)**
Click any bridge on the map or in the list to open the detail panel. Click **Run Deep Analysis** to trigger the full AI pipeline for that specific bridge: Street View imagery is fetched at 3 angles, Gemini vision detects defects and draws bounding boxes, construction history is researched, and a risk score + engineering report is generated.

### Search modes

| Mode | Input example | What it does |
|------|--------------|--------------|
| **City** | `Warsaw`, `Kraków` | Discovers all motor-vehicle bridges in the city |
| **Bridge name** | `Most Grunwaldzki` | Searches for a named bridge |
| **Coordinates** | `51.1079, 17.0385` | Finds bridges within ~2 km of the point |

### Scan this area

Zoom and pan the map to any area of interest, then click **Scan this area** (bottom-right of map). This scans only the bridges visible in the current viewport — no geocoding needed.

### Map

- **Gray dots** — discovered but not yet analysed. Dot size reflects road class priority (motorway > trunk > primary …)
- **Coloured dots** — analysed bridges, colour-coded by risk tier:
  - Red (pulsing) = CRITICAL
  - Orange (pulsing) = HIGH
  - Amber = MEDIUM
  - Green = OK
- Hover any marker for a quick preview card
- Click a marker to open the detail panel

### Bridge detail panel

**Before analysis:** shows road class, priority score, construction year and material (if known in OSM), plus the **Run Deep Analysis** button.

**After analysis:** shows the full report:
- Risk tier and score (1.0–5.0)
- Street View images at N/E/W angles with AI defect bounding boxes overlaid
- Construction era, material, age
- Condition summary, key risk factors, recommended action
- Maintenance task list
- Confidence caveats
- **Download PDF Report** button

### Filter bar

Click **CRITICAL / HIGH / MEDIUM / OK / ALL** above the map to show only bridges of that risk tier. Filters apply only to analysed bridges — unanalysed bridges are always shown in ALL mode.

### Upload image

Click **Upload bridge image** to analyse your own photo directly — no bridge discovery needed. Gemini returns defect scores for all 6 categories with bounding boxes overlaid on your image.

### Load demo

Click **Load Wrocław demo** to load pre-cached results instantly (requires Step 6 to have been run first).

---

## 8. API Reference

Base URL: `http://localhost:8000`

### `GET /health`

```json
{"status": "ok", "model": "gemini-3.1-flash-lite-preview"}
```

### `POST /api/scan`

Fast bridge discovery. Returns all motor-vehicle bridges sorted by priority score. **No Gemini calls** — completes in seconds.

**Request body:**
```json
{
  "query": "Warsaw",
  "query_type": "city_scan",
  "max_bridges": 500
}
```

`query_type` values:
- `city_scan` — city name
- `bridge_lookup` — bridge name
- `coordinate_query` — `"lat, lon"` string
- `bbox` — viewport bounds (requires `bbox` field, see below)

For viewport scans, include the `bbox` field:
```json
{
  "query": "viewport",
  "query_type": "bbox",
  "max_bridges": 200,
  "bbox": {
    "sw_lat": 52.20, "sw_lon": 20.95,
    "ne_lat": 52.25, "ne_lon": 21.05
  }
}
```

**Response:** array of `BridgeSummary` objects:
```json
[
  {
    "osm_id": "123456",
    "name": "Most Poniatowskiego",
    "lat": 52.231,
    "lon": 21.024,
    "road_class": "primary",
    "construction_year": 1913,
    "material": "steel",
    "priority_score": 4.5
  }
]
```

### `POST /api/bridges/{osm_id}/analyze`

Deep analysis for a single bridge. Runs Vision + Context + Risk agents (~15–30 seconds).

**Request body:** the `BridgeSummary` object for that bridge (as returned by `/api/scan`).

**Response:** `BridgeRiskReport` with full risk assessment, visual defect scores, and engineering narrative.

### `GET /api/demo`

Returns pre-cached Wrocław scan results. Requires `precompute_demo.py` first.

### `POST /api/analyze-image`

Analyse an uploaded image file.

```bash
curl -X POST http://localhost:8000/api/analyze-image \
  -F "file=@/path/to/bridge.jpg"
```

Returns a `VisualAssessment` with scores for 6 defect categories and bounding box coordinates for each defect region.

### `GET /api/images/{osm_id}/{heading}`

Serve a cached Street View image for a bridge. `heading` is `0` (N), `90` (E), or `270` (W).

---

## 9. How It Works

### Bridge discovery and prioritisation

The Overpass query fetches only `highway`-tagged bridges (motorway, trunk, primary, secondary, tertiary, residential) — filtering out footbridges, cycleways, railway bridges, and culverts. This typically reduces a city's OSM bridge count from thousands to a few hundred meaningful road bridges.

Each bridge is assigned a **priority score** (1.0–6.5) based on:
- Road class (motorway = 5.0, residential = 0.8)
- Named bridge bonus (+0.5 — named bridges tend to be significant)
- Age bonus (+0.5–1.0 for bridges over 40 or 60 years old)

Bridges are sorted by priority score descending so the most important infrastructure appears first.

### Deep analysis pipeline (per bridge)

When the user clicks **Run Deep Analysis**, four agents run in sequence:

| Stage | Agent | What it does |
|-------|-------|-------------|
| 1 | Vision | Fetches Street View at 3 headings (N/E/W), sends to Gemini vision; returns defect scores (1–5) for 6 categories + bounding boxes |
| 2 | Context | Queries Gemini text model for construction history, era, material, past incidents |
| 3 | Risk | Fuses visual score + age + incidents + inspection staleness into a single score; calls Gemini for an engineering narrative report |

Vision and Context run in parallel; Risk runs after both complete.

### Risk scoring formula

| Factor | Weight | Source |
|--------|--------|--------|
| Visual condition | 40% | Gemini vision — average of 6 defect category scores |
| Bridge age | 25% | OSM `start_date` or Gemini-estimated year |
| Incident history | 20% | Count of known past incidents |
| Inspection staleness | 15% | Years since last recorded inspection |

Score range: **1.0 (best) → 5.0 (worst)**

### Risk tiers

| Tier | Score | Marker | Recommended action |
|------|-------|--------|--------------------|
| CRITICAL | 4.0–5.0 | Red pulsing | Immediate closure and emergency inspection |
| HIGH | 3.0–3.9 | Orange pulsing | Priority inspection within 30 days |
| MEDIUM | 2.0–2.9 | Amber | Schedule inspection within 6 months |
| OK | 1.0–1.9 | Green | Routine monitoring — next standard cycle |

### Geocoding

City names are resolved using **OSM Nominatim** (free, no API key). Google Geocoding API is used as an optional fallback if a Nominatim key is configured.

### Overpass API fallback

Bridge discovery uses three Overpass API mirrors tried in order:
1. `overpass-api.de`
2. `overpass.kumi.systems`
3. `overpass.openstreetmap.ru`

---

## 10. Project Structure

```
deepinspect/
├── backend/
│   ├── main.py                  # FastAPI — /api/scan, /api/bridges/{id}/analyze, /api/analyze-image
│   ├── config.py                # Settings from .env
│   ├── agents/
│   │   ├── orchestrator.py      # run_single_analysis() + run_pipeline() for demo
│   │   ├── discovery_agent.py   # Overpass query → priority-scored BridgeSummary list
│   │   ├── vision_agent.py      # Street View fetch + Gemini vision
│   │   ├── context_agent.py     # Gemini text → construction history
│   │   └── risk_agent.py        # Score fusion + Gemini narrative report
│   ├── models/
│   │   ├── bridge.py            # BridgeSummary, BridgeTarget, BridgeRiskReport, ScanRequest
│   │   ├── vision.py            # VisualAssessment, DefectScore, DefectRegion
│   │   └── context.py           # BridgeContext
│   ├── services/
│   │   ├── gemini_service.py    # Gemini model instances + generation configs
│   │   ├── overpass_service.py  # OSM Overpass query (motor-vehicle bridges only)
│   │   ├── maps_service.py      # Nominatim geocoding (Google as fallback)
│   │   └── streetview_service.py# Street View fetch + disk cache
│   ├── utils/
│   │   ├── scoring.py           # Risk score formula + tier mapping
│   │   └── cache.py             # Redis with in-memory fallback
│   ├── prompts/
│   │   ├── vision_prompt.txt    # Structural defect scoring prompt
│   │   ├── context_prompt.txt   # Bridge history research prompt
│   │   └── risk_report_prompt.txt # Narrative report generation prompt
│   ├── data/demo_cache/         # Pre-computed results + cached Street View images
│   ├── requirements.txt
│   ├── .env.example
│   └── Dockerfile
├── frontend/
│   ├── src/
│   │   ├── App.jsx              # Root layout + header risk summary
│   │   ├── components/
│   │   │   ├── MapView.jsx      # Leaflet map + gray/coloured markers + scan button
│   │   │   ├── SearchBar.jsx    # Query input + demo/upload buttons
│   │   │   ├── BridgePanel.jsx  # Pre-analysis view + post-analysis report
│   │   │   ├── BridgeList.jsx   # Priority-sorted bridge list with road class badges
│   │   │   ├── BridgeImageViewer.jsx # Street View images with defect overlays
│   │   │   ├── ImageAnalysisModal.jsx # Uploaded photo analysis overlay
│   │   │   ├── RiskBadge.jsx    # Colour-coded tier badge
│   │   │   └── ReportExport.jsx # jsPDF report download
│   │   ├── store/
│   │   │   └── useAppStore.js   # Zustand state: bridges, analyzedBridges, selectedBridgeId
│   │   ├── hooks/
│   │   │   ├── useBridgeScan.js # /api/scan calls (discovery)
│   │   │   └── useBridgeAnalyze.js # /api/bridges/{id}/analyze calls
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

**Backend returns 500 on `/api/scan`**
→ Check the terminal for a specific error. Common causes: invalid API key, Overpass API unreachable (try again in a minute), or a Gemini model name that doesn't exist in your API tier.

**"No bridges found" for a city**
→ The Overpass query filters to motor-vehicle bridges only. Some smaller towns have few or no OSM-tagged highway bridges. Try a larger city: `Warsaw`, `Kraków`, `Wrocław`, `Gdańsk`.

**"Scan this area" returns nothing**
→ Zoom in more — a viewport covering an entire country will return too many results and may time out. Zoom to city level (zoom 12–14) before scanning.

**`REQUEST_DENIED` from Google geocoding**
→ The Geocoding API is not enabled or the key is restricted. This only affects city-name scans (fallback to Nominatim usually handles it). Check your Google Cloud console.

**Street View images don't appear after analysis**
→ Street View coverage is sparse in rural areas. The vision agent returns `None` and the risk score falls back to a 3.0 visual component. The confidence caveat in the report will note the limitation.

**`GEMINI_API_KEY not found` on startup**
→ Make sure `backend/.env` exists (not just `.env.example`) and contains `GEMINI_API_KEY=...`.

**Frontend map is blank**
→ The map uses OpenStreetMap via Leaflet — no API key needed. If it's blank, check browser console for network errors (tile requests to `tile.openstreetmap.org` are blocked). Restart `npm run dev` after any `.env` change.

**Redis connection error in logs**
→ Non-fatal. The backend automatically falls back to in-memory caching. Redis is optional.

**Demo cache not found (`/api/demo` returns 404)**
→ Run `python scripts/precompute_demo.py` from the `deepinspect/` root with the backend venv active.

**`single '{' encountered in format string` error in risk agent**
→ This was a bug in an older version where the prompt template had unescaped braces. Make sure `backend/prompts/risk_report_prompt.txt` uses `{{` and `}}` around the JSON example block (not single braces).
