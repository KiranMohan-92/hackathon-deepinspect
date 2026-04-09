# DeepInspect

**Physics-first AI bridge health inspection platform.** Scan any city or map area to discover motor-vehicle bridges, then run a full 11-criteria structural assessment powered by a multi-agent AI swarm — no field visit required.

DeepInspect evaluates bridges against the same ranked criteria that govern real-world collapse: scour/foundations (#1, 52-55% of failures), load-path redundancy (#2), capacity vs. demand (#3), and 8 more — producing a traceable **Physics Health Certificate** with per-criterion scores, confidence bounds, and explicit field-inspection flags where remote assessment reaches its limits.

---

## What Makes This Different

| Traditional inspection tools | DeepInspect |
|------------------------------|-------------|
| Single risk score, opaque formula | 11 ranked criteria, physics-derived weights, every score traceable to data sources |
| Visual defects only | Scour risk, structural redundancy, load capacity, degradation modeling (Fick's law, ISO 9223) |
| Binary pass/fail | Confidence bounds on every criterion + explicit "REQUIRES FIELD INSPECTION" flags |
| Static PDF checklist | Interactive radar chart, expandable criterion cards, multi-page PDF export |

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Get API Keys](#2-get-api-keys)
3. [Project Setup](#3-project-setup)
4. [Run Locally](#4-run-locally)
5. [Using the App](#5-using-the-app)
6. [The 11-Criteria Physics Assessment](#6-the-11-criteria-physics-assessment)
7. [Agent Architecture](#7-agent-architecture)
8. [API Reference](#8-api-reference)
9. [European Reference Library & Cross-Validation](#9-european-reference-library--cross-validation)
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

---

## 2. Get API Keys

You need two API keys.

### Gemini API key

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Click **Get API key** > **Create API key**
3. Copy the key

### Google Maps API key

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Enable these two APIs:
   - **Street View Static API** — bridge imagery
   - **Geocoding API** — city name to coordinates (fallback; primary geocoding uses free OSM Nominatim)
3. Go to **Credentials** > **Create API Key**
4. Copy the key

> **Note:** The map itself uses OpenStreetMap (free, no key needed). You do **not** need the Maps JavaScript API.

---

## 3. Project Setup

### Backend environment file

```bash
cd backend
cp .env.example .env
```

Open `backend/.env` and fill in your keys:

```env
GEMINI_API_KEY=your_gemini_key_here
GOOGLE_MAPS_API_KEY=your_google_maps_key_here
GEMINI_MODEL=gemini-3.1-flash
DEMO_MODE=true
MAX_BRIDGES_PER_SCAN=10
```

See `backend/.env.example` for the full list of configurable options including Redis, rate limiting, upload limits, and logging.

### Frontend environment (optional)

The frontend defaults to `http://localhost:8000` for the backend. To override, create `frontend/.env`:

```env
VITE_API_BASE_URL=http://localhost:8000
```

---

## 4. Run Locally

Open **two terminals**.

### Terminal 1 — Backend

```bash
cd backend
python -m venv .venv
source .venv/bin/activate        # macOS / Linux
# .venv\Scripts\activate         # Windows

pip install -r requirements.txt
uvicorn main:app --reload --host 0.0.0.0 --port 8000
```

Verify: [http://localhost:8000/health](http://localhost:8000/health) should return `{"status":"ok","model":"..."}`

### Terminal 2 — Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## 5. Using the App

### Two-phase workflow

**Phase 1 — Discover (instant)**
Enter a city name or use "Scan this area" on the map. The backend queries OpenStreetMap for all motor-vehicle bridges (motorway through residential) and returns them sorted by structural priority. A city like Warsaw returns 200-400 bridges in seconds — no AI calls, no images.

**Phase 2 — Analyse (per bridge, ~30-60 seconds)**
Click any bridge, then **Run Deep Analysis**. The 7-agent swarm runs:
1. Street View imagery at 6 angles (N/NE/SE/S/SW/NW at 60-degree steps) with 14 defect categories
2. Scour and foundation risk assessment (waterway proximity + flood zone classification)
3. Historical context research (construction era, material, incidents)
4. Structural type classification and redundancy analysis
5. Physics-based degradation modeling (Fick's law, ISO 9223, freeze-thaw)
6. Full 11-criterion Physics Health Certificate generation

### Search modes

| Mode | Input example | What it does |
|------|--------------|--------------|
| **City** | `Warsaw`, `Wroclaw` | Discovers all motor-vehicle bridges in the city |
| **Bridge name** | `Most Grunwaldzki` | Searches for a named bridge |
| **Coordinates** | `51.1079, 17.0385` | Finds bridges within ~2 km of the point |
| **Scan this area** | (button on map) | Scans bridges visible in the current viewport |

### Map markers

- **Gray dots** — discovered but not yet analysed. Size reflects road class priority.
- **Coloured dots** — analysed bridges, colour-coded by risk tier:
  - Red (pulsing) = CRITICAL (4.0-5.0)
  - Orange (pulsing) = HIGH (3.0-3.9)
  - Amber = MEDIUM (2.0-2.9)
  - Green = OK (1.0-1.9)

### After analysis

The bridge detail panel shows:
- **Risk badge** with tier, score, and confidence level
- **Live AI reasoning feed** — watch each agent think in real time (scour, vision, context, structural, degradation, risk)
- **Street View images** with AI defect bounding boxes overlaid
- **Construction context** — era, material, age, significance
- **Condition summary** and key risk factors
- **Physics Health Certificate** — 11-criteria radar chart, expandable criterion cards with confidence bounds, field inspection flags, assessment limitations
- **Download PDF Report** — multi-page engineering report with cover page, criteria table, detail cards, field inspection priorities, and Street View imagery

### Keyboard shortcuts

Press `?` to open the keyboard shortcuts modal.

---

## 6. The 11-Criteria Physics Assessment

DeepInspect evaluates every bridge against 11 ranked inspection criteria derived from equilibrium physics (Newton's laws, Terzaghi bearing capacity, Paris' law for fatigue) and global bridge collapse statistics. The ranking is hard to vary — change the order and you contradict either the physics or the statistical record.

| Rank | Criterion | Weight | Why this rank |
|------|-----------|--------|---------------|
| 1 | Scour / Foundations / Channel Stability | 25% | 52-55% of all bridge collapses. Scour removes soil support, violating vertical equilibrium. |
| 2 | Load-Path Redundancy (NSTM) | 15% | Non-redundant tension members: local failure = total collapse. |
| 3 | Capacity vs. Demand | 12% | Overload causes ~11% of failures. Rating factor < 1.0 means legal loads exceed margin. |
| 4 | Substructure Integrity | 10% | Piers, abutments, pile caps transfer ALL loads to foundations. |
| 5 | Superstructure Elements | 10% | Girders, trusses, cables — fatigue cracks and section loss. |
| 6 | Overall Stability | 5% | Buckling, overturning — usually a consequence of #1-5, not an initiator. |
| 7 | Durability / Degradation | 8% | Corrosion, freeze-thaw, ASR — slow onset but cumulative. |
| 8 | Bearings / Joints | 5% | Failed seals accelerate degradation of higher-ranked components. |
| 9 | Deck / Slab | 4% | First line of defense against water intrusion. Indirect structural impact. |
| 10 | Stiffness / Serviceability | 3% | Leading indicator (deflections, vibrations), rarely causes collapse alone. |
| 11 | Ancillary Systems | 3% | Railings, drainage, coatings — lowest direct structural impact. |

**Weights sum to 1.0.** Scores are confidence-adjusted with pessimistic bias: low confidence on a high-impact criterion increases the effective risk score, because "I don't know" should not mean "it's fine."

### Physics Health Certificate

The final output is a `PhysicsHealthCertificate` containing:
- Overall weighted risk score (1.0-5.0) and tier
- Per-criterion scores with confidence levels (high/medium/low)
- Data sources used for each criterion
- Key findings and failure-mode probability per criterion
- Explicit field-inspection flags with specific scope (e.g., "Underwater sonar for pier scour depth")
- Estimated remaining service life (from degradation modeling)
- Assessment limitations (what remote assessment cannot verify)

### What this system does NOT claim

1. Remote visual analysis cannot detect subsurface defects (internal voids, hidden corrosion)
2. Scour depth below waterline requires bathymetric survey — we estimate risk, not depth
3. Load rating precision requires structural drawings — we provide capacity class, not rating factors
4. Material properties are inferred from era/type, not laboratory-tested
5. Street View imagery is point-in-time and may be years old
6. AI confidence is self-assessed — no independent validation loop yet

**These limitations are stated in every certificate.** A system that claims certainty where physics demands measurement is more dangerous than one that says "send an engineer."

---

## 7. Agent Architecture

DeepInspect uses a hierarchical agentic swarm — 7 specialized agents orchestrated in a parallel/sequential execution graph:

```
DiscoveryAgent --> bridge found
                      |
              +-------+-------------------+
              v       v                   v
    HydrologicalAgent VisionAgent(14cat) ContextAgent
              |       |                   |
              +---+---+                   |
                  v                       |
         StructuralTypeAgent <------------+
         (needs vision + context)
                  |
                  v
         DegradationAgent
         (needs context + vision + location)
                  |
                  v
         RiskAgent
         (all criterion scores -> weighted fusion)
         -> PhysicsHealthCertificate
```

**Step 1 (parallel):** HydrologicalAgent + VisionAgent + ContextAgent run simultaneously.
**Step 2 (sequential):** StructuralTypeAgent needs vision + context results.
**Step 3 (sequential):** DegradationAgent needs context + vision + location.
**Step 4 (sequential):** RiskAgent fuses all criterion scores + generates narrative.

### Agent details

| Agent | Criteria | Data sources | Output |
|-------|----------|-------------|--------|
| **DiscoveryAgent** | — | OSM Overpass (6 mirrors), Google Places (fallback), Nominatim geocoding | `list[BridgeSummary]` with priority scores |
| **HydrologicalAgent** | #1 Scour | OSM waterway tags within 500m, flood risk classification, Gemini Vision (exposed foundations, erosion, debris) | `ScourAssessment` |
| **VisionAgent** | #4,5,8,9,11 | Street View at 6 headings (0/60/120/180/240/300 degrees), Gemini Vision with 14 defect categories | `VisualAssessment` |
| **ContextAgent** | — | Gemini text model, Polish infrastructure knowledge (Soviet-era WPS/WPT panels, GDDKiA records) | `BridgeContext` (era, material, incidents, traffic, significance) |
| **StructuralTypeAgent** | #2,3,6 | Gemini Vision (structure type classification), OSM tags, redundancy lookup table (beam/truss/arch/cable/suspension) | `StructuralTypeAssessment` |
| **DegradationAgent** | #7 | Fick's 2nd law (chloride ingress), ISO 9223/9224 (corrosion rates by environment class), freeze-thaw cycles by Polish region | `DegradationAssessment` |
| **RiskAgent** | All 11 | All sub-assessments + Gemini narrative synthesis | `BridgeRiskReport` + `PhysicsHealthCertificate` |

### Scoring formula

The risk score uses a dual system for backward compatibility:

**Legacy scoring** (4-factor):
| Factor | Weight | Source |
|--------|--------|--------|
| Visual condition | 40% | Gemini vision — worst of 6 heading scores |
| Bridge age | 25% | OSM `start_date` or Gemini-estimated year |
| Incident history | 20% | Count of known past incidents |
| Inspection staleness | 15% | Years since last recorded inspection |

**Physics scoring** (11-criterion, authoritative):
Each criterion scored 1.0-5.0, weighted by collapse statistics, confidence-adjusted with pessimistic bias. The `PhysicsHealthCertificate.overall_risk_score` is the authoritative output used for ranking and triage.

### Graceful degradation

If any agent fails (network error, Gemini timeout), the pipeline continues. The failed criterion gets scored with low confidence and a field-inspection flag — not skipped. The system always produces a report.

---

## 8. API Reference

Base URL: `http://localhost:8000`

All SSE (Server-Sent Events) endpoints stream `data: {...}\n\n` lines with event types: `thinking_step`, `progress`, `complete`, `error`.

### Health Check

```
GET /health
```

Returns: `{"status": "ok", "model": "gemini-3.1-flash"}`

### Bridge Discovery (SSE stream)

```
POST /api/scan
Content-Type: application/json

{
  "query": "Warsaw",
  "query_type": "city_scan",
  "max_bridges": 500
}
```

`query_type` values: `city_scan`, `bridge_lookup`, `coordinate_query`, `bbox`.

For viewport scans:
```json
{
  "query": "viewport",
  "query_type": "bbox",
  "bbox": {"sw_lat": 52.20, "sw_lon": 20.95, "ne_lat": 52.25, "ne_lon": 21.05}
}
```

### Bridge Analysis (SSE stream)

```
POST /api/bridges/{osm_id}/analyze
Content-Type: application/json

{bridge summary object}
```

SSE events:
- `thinking_step` — per-agent reasoning (stage: vision/context/scour/structural/degradation/risk)
- `complete` — full `BridgeRiskReport` with embedded `PhysicsHealthCertificate`
- `error` — failure message

### Demo Data

```
GET /api/demo
```

Returns pre-cached Wroclaw scan results.

### Image Upload Analysis

```
POST /api/analyze-image
Content-Type: multipart/form-data

file: <bridge photo>
```

### Street View Images

```
GET /api/images/{osm_id}/{heading}
```

Headings: `0` (N), `60` (NE), `120` (SE), `180` (S), `240` (SW), `300` (NW).

### List Available Images

```
GET /api/bridges/{osm_id}/images
```

Returns list of cached heading values for a bridge.

---

## 9. European Reference Library & Cross-Validation

DeepInspect includes a comprehensive reference library for cross-validating its Physics Health Certificate against real European inspection data. This is the evidence base for authority adoption.

### Score Mappings (`reference/mappings/`)

Machine-readable JSON files that translate DeepInspect's 1.0-5.0 score to 9 international rating systems:

| System | Scale | Direction | Example: DeepInspect 3.5 = |
|--------|-------|-----------|---------------------------|
| Germany Zustandsnote | 1.0-4.0 | Ascending | 2.75 |
| France IQOA | 1/2/2E/3/3U (+S suffix) | Categorical | Class 3 |
| UK BCI | 0-100 | Descending | 52 |
| Netherlands NEN 2767 | 1-6 | Ascending | 4 |
| Italy Class of Attention | LOW-HIGH | Categorical | MEDIUM-HIGH |
| Poland GDDKiA | 0-5 | Ascending | 3 |
| Norway Brutus | 0-4 | Ascending | 2.5 |
| Sweden BaTMan | 0-3 | Ascending | 2 |
| US NBI | 0-9 | Descending | 4 |

Additional mapping files:
- `criteria_to_din1076_svd.json` — 11 criteria mapped to German S/V/D (Substance/Traffic Safety/Durability) axes
- `defects_to_dacl10k.json` — visual defect categories mapped to dacl10k 19-class segmentation
- `defects_to_codebrim.json` — visual defect categories mapped to CODEBRIM 6-class dataset
- `italian_coa_mapping.json` — criteria mapped to Italian risk types (structural, seismic, hydraulic, landslide)

### Open Datasets (`reference/datasets/`)

Download scripts for publicly available bridge datasets:

| Dataset | Bridges | Format | Script |
|---------|---------|--------|--------|
| **Norway NVDB** | 28,918 | REST API + CSV | `fetch_bridges.py` |
| **CODEBRIM** | 6 defect classes | Images + labels | `download.py` (Zenodo) |
| **dacl10k** | 9,920 images, 19 classes | Segmentation masks | `download.py` (HuggingFace) |
| **UK National Highways** | Strategic road network | CKAN API | `fetch_structures.py` |
| **data.europa.eu** | EU-wide statistics | Various | `download.py` |

### Country System Documentation (`reference/country-systems/`)

Detailed documentation for 8 European rating systems:
- Germany (DIN 1076), France (IQOA), UK (CS 450), Netherlands (NEN 2767)
- Italy (Linee Guida 2020), Poland (GDDKiA), Norway (Brutus), Sweden (BaTMan)

Each file includes: rating scale, damage codes, inspection cycle, network statistics, and mapping to DeepInspect criteria.

### European Standards (`reference/standards/`)

Framework documentation: COST TU1406, BRIME D14, FHWA EU Scanning Tour, Italian Guidelines 2020.

### Cross-Validation Methodology (`reference/methodology/`)

A repeatable process for validating DeepInspect against official inspection data:

1. **Select reference bridges** — 100 bridges across Norway, UK, Sweden with known ratings + Street View
2. **Run DeepInspect** — full 7-agent pipeline, save PhysicsHealthCertificate JSON
3. **Convert scores** — using `score_mappings.json` breakpoints
4. **Compute agreement** — Pearson r, Cohen's Kappa, false-negative rate
5. **Calibrate** — adjust `CRITERION_WEIGHTS` in `scoring.py` based on findings

Safety-critical target: **false-negative rate < 10%** (how often DeepInspect misses a HIGH/CRITICAL bridge).

### Research Benchmarks (`research/`)

5 analysis files: European standards comparison, real inspection report benchmarks, AI inspection landscape 2026, DeepInspect vs. European standards gap analysis, and GPT-5 claim validation.

---

## 10. Project Structure

```
deepinspect/
+-- backend/
|   +-- main.py                           # FastAPI app + 8 endpoints
|   +-- config.py                         # Pydantic settings from .env
|   +-- .env.example                      # Full environment template
|   +-- requirements.txt                  # Python dependencies
|   +-- agents/
|   |   +-- orchestrator.py               # 7-agent parallel/sequential execution graph
|   |   +-- discovery_agent.py            # OSM Overpass -> priority-scored bridges
|   |   +-- vision_agent.py               # Street View + Gemini Vision (14 defect categories)
|   |   +-- context_agent.py              # Gemini text -> Polish infrastructure history
|   |   +-- risk_agent.py                 # Score fusion + PhysicsHealthCertificate generation
|   |   +-- hydrological_agent.py         # Scour / flood risk assessment (criterion #1)
|   |   +-- structural_type_agent.py      # Redundancy + capacity classification (#2,3,6)
|   |   +-- degradation_agent.py          # Fick's law + ISO 9223 + freeze-thaw (#7)
|   +-- models/
|   |   +-- bridge.py                     # BridgeTarget, BridgeSummary, BridgeRiskReport
|   |   +-- vision.py                     # VisualAssessment (14 defect categories)
|   |   +-- context.py                    # BridgeContext (era, material, incidents)
|   |   +-- criteria.py                   # CriterionResult, PhysicsHealthCertificate
|   |   +-- scour.py                      # ScourAssessment
|   |   +-- structural_type.py            # StructuralTypeAssessment
|   |   +-- degradation.py                # DegradationAssessment
|   +-- services/
|   |   +-- gemini_service.py             # Gemini model instances (text + vision)
|   |   +-- overpass_service.py           # OSM Overpass query (6 mirror endpoints)
|   |   +-- streetview_service.py         # Street View fetch + disk cache (6 headings)
|   |   +-- maps_service.py              # Geocoding (Google Maps + Nominatim fallback)
|   |   +-- google_places_service.py      # Google Places fallback for bridge discovery
|   |   +-- flood_service.py              # Waterway proximity + flood risk classification
|   +-- utils/
|   |   +-- scoring.py                    # 11-criterion physics-weighted fusion + legacy scoring
|   |   +-- cache.py                      # Redis + in-memory fallback cache
|   |   +-- security.py                   # Security headers + API key middleware
|   |   +-- errors.py                     # Structured error responses
|   |   +-- audit.py                      # Request audit logging
|   +-- prompts/
|   |   +-- vision_prompt.txt             # 14-category defect analysis prompt
|   |   +-- context_prompt.txt            # Polish infrastructure research prompt
|   |   +-- risk_report_prompt.txt        # Risk narrative synthesis prompt
|   |   +-- scour_vision_prompt.txt       # Scour indicator detection prompt
|   |   +-- structural_type_prompt.txt    # Structure classification prompt
|   |   +-- degradation_prompt.txt        # Degradation reasoning prompt
|   +-- data/
|       +-- demo_cache/                   # Pre-computed results + cached Street View images
+-- frontend/
|   +-- src/
|   |   +-- App.tsx                       # Root component
|   |   +-- types.ts                      # TypeScript interfaces for API responses
|   |   +-- components/
|   |   |   +-- MapView.tsx               # Leaflet map with risk-coloured markers
|   |   |   +-- SearchBar.tsx             # City/bridge/coordinate search input
|   |   |   +-- BridgePanel.tsx           # Detail panel (pre-analysis + report views)
|   |   |   +-- BridgeList.tsx            # Sortable bridge list with checkboxes
|   |   |   +-- BridgeImageViewer.tsx     # Street View image carousel with defect overlays
|   |   |   +-- CommandHeader.tsx         # Top header bar with health indicator
|   |   |   +-- RiskBadge.tsx             # Severity-coloured risk tier badge
|   |   |   +-- StatsPanel.tsx            # Intelligence overview sidebar
|   |   |   +-- ReportExport.tsx          # Multi-page PDF report generator (jsPDF)
|   |   |   +-- ImageAnalysisModal.tsx    # Direct image upload analysis modal
|   |   |   +-- PhysicsCertificateView.jsx   # Physics Health Certificate display
|   |   |   +-- CriterionCard.jsx         # Expandable per-criterion detail card
|   |   |   +-- ErrorBoundary.tsx         # React error boundary wrapper
|   |   |   +-- KeyboardShortcutsModal.tsx # Keyboard shortcuts help dialog
|   |   |   +-- SkeletonLoader.tsx        # Loading state placeholders
|   |   |   +-- charts/
|   |   |       +-- CriteriaRadarChart.jsx   # 11-axis risk profile radar chart
|   |   |       +-- DefectFrequencyChart.tsx  # Average defect scores bar chart
|   |   |       +-- RiskDistributionChart.tsx # Risk tier distribution pie chart
|   |   +-- store/
|   |   |   +-- useAppStore.ts            # Zustand state management
|   |   +-- hooks/
|   |   |   +-- useBridgeScan.ts          # SSE streaming for bridge discovery
|   |   |   +-- useBridgeAnalyze.ts       # SSE streaming for bridge analysis
|   |   |   +-- useHealthCheck.ts         # Backend health polling
|   |   |   +-- useKeyboardShortcuts.ts   # Keyboard shortcut handler
|   |   |   +-- useUrlState.ts            # URL state sync
|   |   +-- utils/
|   |       +-- riskColors.ts             # Risk tier + defect colour palettes
|   |       +-- motionVariants.ts         # Framer Motion animation presets
|   +-- index.html
|   +-- tailwind.config.js                # Custom dark glassmorphism theme
|   +-- vite.config.ts                    # Vite bundler config
|   +-- tsconfig.json                     # TypeScript strict mode config
|   +-- package.json
+-- reference/                            # European inspection reference library
|   +-- standards/                        # EU frameworks (COST TU1406, BRIME, FHWA, Italian 2020)
|   +-- country-systems/                  # 8 country rating systems (DE/FR/UK/NL/IT/PL/NO/SE)
|   +-- datasets/                         # Download scripts for open bridge datasets
|   |   +-- norway-nvdb/                  # 28,918 Norwegian bridges via REST API
|   |   +-- codebrim/                     # CODEBRIM defect image dataset (Zenodo)
|   |   +-- dacl10k/                      # dacl10k 19-class segmentation (HuggingFace)
|   |   +-- uk-national-highways/         # UK BCI open data (CKAN API)
|   |   +-- data-europa-eu/              # EU-wide bridge statistics
|   +-- mappings/                         # Machine-readable score conversion files
|   |   +-- score_mappings.json           # DeepInspect <-> 9 international rating systems
|   |   +-- criteria_to_din1076_svd.json  # 11 criteria -> German S/V/D axes
|   |   +-- defects_to_dacl10k.json       # Visual categories -> dacl10k classes
|   |   +-- defects_to_codebrim.json      # Visual categories -> CODEBRIM classes
|   |   +-- italian_coa_mapping.json      # Criteria -> Italian risk types
|   +-- methodology/                      # Cross-validation protocol + metrics
|   +-- papers/                           # Annotated bibliography + BibTeX
+-- research/                             # Analysis & benchmarking
|   +-- 01-european-inspection-standards.md
|   +-- 02-real-inspection-reports-benchmarks.md
|   +-- 03-ai-inspection-landscape-2026.md
|   +-- 04-deepinspect-vs-european-standards.md
|   +-- 05-claim-validation-gpt5.md
+-- scripts/
|   +-- precompute_demo.py                # Generate demo cache data
|   +-- stitch-generate.mjs              # Google Stitch SDK UI generation
+-- DESIGN.md                            # Orbital Command Center design system
+-- README.md
```

---

## 11. Troubleshooting

**Backend returns 500 on `/api/scan`**
Check the terminal for a specific error. Common causes: invalid API key, Overpass API unreachable (all 6 mirrors down — try again in a minute).

**"No bridges found" for a city**
The Overpass query filters to motor-vehicle bridges only (motorway through residential). Some smaller towns have few OSM-tagged highway bridges. Try larger cities: `Warsaw`, `Wroclaw`, `Krakow`, `Gdansk`.

**"Scan this area" returns nothing**
Zoom in more — a viewport covering an entire country will return too many results and may time out. Zoom to city level (zoom 12-14) before scanning.

**Analysis takes longer than expected**
The physics swarm runs 7 agents with multiple Gemini calls per bridge. Expect 30-60 seconds. The SSE thinking feed shows real-time progress for each agent stage.

**Street View images don't appear**
Street View coverage is sparse in rural areas. The vision agent returns `None` and scoring falls back to moderate-risk defaults with low confidence. The certificate notes this limitation.

**PDF missing Physics Health Certificate pages**
Ensure you re-analysed the bridge after the latest code update. Old cached results from previous sessions don't include the certificate. Hard-refresh the browser (`Ctrl+Shift+R`) and run a new analysis.

**Certificate shows "low" confidence on most criteria**
This is expected when only Street View imagery is available. Low confidence triggers pessimistic bias (scores nudged toward 5.0) and field-inspection flags. This is a safety feature — unknown should not mean safe.

**Backend console shows "CERTIFICATE BUILD FAILED"**
Check the full traceback in the console. Most common cause: a Pydantic validation error from an agent returning unexpected data. The report still generates with `certificate: null` in this case.

**Polish diacritics garbled in PDF**
The PDF generator fetches Roboto Unicode fonts from jsDelivr CDN on first export. If offline, it falls back to Helvetica which cannot render Polish characters (ą, ę, ó, ś, etc.). Ensure internet access for the first PDF download.

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Backend | Python 3.11+, FastAPI 0.115, Pydantic 2.8, uvicorn |
| AI | Google Gemini (text + vision models via `google-generativeai`) |
| Frontend | React 18, TypeScript, Zustand, Recharts, Framer Motion, Leaflet |
| Styling | Tailwind CSS 3.4 (dark glassmorphism theme) |
| PDF | jsPDF with Roboto Unicode font embedding |
| Map | OpenStreetMap tiles via react-leaflet (no API key) |
| Data | OSM Overpass API (6 mirrors), Google Street View, Google Places (fallback) |
| Cache | Redis (optional, with in-memory fallback) |
