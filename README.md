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
| Static PDF checklist | Interactive radar chart, expandable criterion cards, NASA-quality PDF export |

---

## Table of Contents

1. [Prerequisites](#1-prerequisites)
2. [Get API Keys](#2-get-api-keys)
3. [Project Setup](#3-project-setup)
4. [Run Locally](#4-run-locally)
5. [Run with Docker](#5-run-with-docker)
6. [Testing](#6-testing)
7. [Using the App](#7-using-the-app)
8. [The 11-Criteria Physics Assessment](#8-the-11-criteria-physics-assessment)
9. [Agent Architecture](#9-agent-architecture)
10. [API Reference](#10-api-reference)
11. [European Reference Library & Cross-Validation](#11-european-reference-library--cross-validation)
12. [Project Structure](#12-project-structure)
13. [Troubleshooting](#13-troubleshooting)

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
REDIS_URL=redis://localhost:6379
DEMO_MODE=true
MAX_BRIDGES_PER_SCAN=500
GEMINI_MODEL=gemini-2.0-flash
```

### Frontend environment file

```bash
cd frontend
cp .env.example .env
```

Open `frontend/.env`:

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

Verify: [http://localhost:8000/health](http://localhost:8000/health)

### Terminal 2 — Frontend

```bash
cd frontend
npm install
npm run dev
```

Open [http://localhost:5173](http://localhost:5173).

---

## 5. Run with Docker

```bash
# Make sure backend/.env is filled in first
docker-compose up --build
```

Services:
- Frontend: [http://localhost:5173](http://localhost:5173)
- Backend: [http://localhost:8000](http://localhost:8000)
- Redis: `localhost:6379` (optional cache)

---

## 6. Testing

### Backend Tests

```bash
cd backend
python -m pytest tests/ -v
```

### E2E Tests

```bash
cd tests-e2e
npm install
npx playwright test
```

---

## 7. Using the App

### Two-phase workflow

**Phase 1 — Discover (instant)**
Enter a city name or use "Scan this area" on the map. The backend queries OpenStreetMap for all motor-vehicle bridges and returns them sorted by structural priority. A city like Warsaw returns 200-400 bridges in seconds — no AI calls, no images.

**Phase 2 — Analyse (per bridge, ~30-60 seconds)**
Click any bridge, then **Run Deep Analysis**. The 7-agent swarm runs:
1. Street View imagery at 6 angles with 14 defect categories
2. Scour and foundation risk assessment
3. Structural type classification and redundancy analysis
4. Physics-based degradation modeling
5. Full 11-criterion Physics Health Certificate

### Map markers

- **Gray dots** — discovered but not yet analysed
- **Coloured dots** — analysed bridges, colour-coded by risk tier:
  - Red (pulsing) = CRITICAL (4.0-5.0)
  - Orange (pulsing) = HIGH (3.0-3.9)
  - Amber = MEDIUM (2.0-2.9)
  - Green = OK (1.0-1.9)

### After analysis

The bridge detail panel shows:
- **Risk badge** with tier, score, and confidence level
- **Street View images** with AI defect bounding boxes overlaid
- **Construction context** — era, material, age, significance
- **Condition summary** and key risk factors
- **Physics Health Certificate** — 11-criteria radar chart, expandable criterion cards, field inspection flags
- **Download PDF Report** — multi-page engineering report

---

## 8. The 11-Criteria Physics Assessment

DeepInspect evaluates every bridge against 11 ranked inspection criteria derived from equilibrium physics and global bridge collapse statistics. The ranking is hard to vary — change the order and you contradict either Newton's laws or the statistical record.

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
- Key findings and failure-mode probability
- Explicit field-inspection flags with specific scope (e.g., "Underwater sonar for pier scour depth")
- Estimated remaining service life (from degradation modeling)
- Assessment limitations (what remote assessment cannot verify)

### What this system does NOT claim

1. Remote visual analysis cannot detect subsurface defects
2. Scour depth below waterline requires bathymetric survey — we estimate risk, not depth
3. Load rating precision requires structural drawings — we provide capacity class, not rating factors
4. Material properties are inferred from era/type, not tested
5. Street View imagery is point-in-time and may be years old

**These limitations are stated in every certificate.** A system that claims certainty where physics demands measurement is more dangerous than one that says "send an engineer."

---

## 9. Agent Architecture

DeepInspect uses a hierarchical agentic swarm — 7 specialized agents orchestrated in a parallel/sequential execution graph:

```
DiscoveryAgent ──> bridge found
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
         (needs context + vision)
                  |
                  v
         RiskFusionAgent
         (all criterion scores -> weighted fusion)
         -> PhysicsHealthCertificate
```

### Agent details

| Agent | Criterion | Data sources | Output |
|-------|-----------|-------------|--------|
| **DiscoveryAgent** | — | OSM Overpass, Google Places (fallback) | `list[BridgeSummary]` with priority scores |
| **HydrologicalAgent** | #1 Scour | OSM waterway tags, flood risk classification, Gemini Vision (exposed foundations, erosion) | `ScourAssessment` |
| **VisionAgent** | #4,5,8,9,11 | Street View at 6 headings, Gemini Vision | `VisualAssessment` with 14 defect categories |
| **ContextAgent** | — | Gemini text model, Polish infrastructure knowledge | `BridgeContext` (era, material, incidents, traffic) |
| **StructuralTypeAgent** | #2,3,6 | Gemini Vision (structure classification), OSM tags, redundancy lookup table | `StructuralTypeAssessment` |
| **DegradationAgent** | #7 | Fick's 2nd law (chloride ingress), ISO 9223 (corrosion rates), freeze-thaw cycles | `DegradationAssessment` |
| **RiskAgent** | All 11 | All sub-assessments, Gemini narrative | `BridgeRiskReport` + `PhysicsHealthCertificate` |

### Graceful degradation

If any agent fails, the pipeline continues — the criterion gets scored with lower confidence and a field-inspection flag, not skipped entirely. The system always produces a report.

---

## 10. API Reference

Base URL: `http://localhost:8000`

### Health Check

```
GET /health
```

### Bridge Discovery (SSE stream)

```
POST /api/scan
Content-Type: application/json

{"query": "Warsaw", "query_type": "city_scan", "max_bridges": 500}
```

### Bridge Analysis (SSE stream)

```
POST /api/bridges/{osm_id}/analyze
Content-Type: application/json

{bridge summary object}
```

Returns SSE events: `thinking_step` (per-agent reasoning), `complete` (full report with certificate), `error`.

### Street View Images

```
GET /api/images/{osm_id}/{heading}
```

Headings: `0` (N), `60`, `120`, `180`, `240`, `300`.

### Image Upload Analysis

```
POST /api/analyze-image
Content-Type: multipart/form-data
```

---

## 11. European Reference Library & Cross-Validation

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

The IQOA mapping includes the "S" safety suffix (immediate user safety risk) that can be appended to any class.

### Open Datasets (`reference/datasets/`)

Download scripts for publicly available bridge datasets:

| Dataset | Bridges | Format | Script |
|---------|---------|--------|--------|
| **Norway NVDB** | 28,918 | REST API + CSV | `fetch_bridges.py` (verified working) |
| **CODEBRIM** | 6 defect classes | Images + labels | `download.py` (Zenodo) |
| **dacl10k** | 9,920 images, 19 classes | Segmentation masks | `download.py` (HuggingFace) |
| **UK National Highways** | Strategic road network | CKAN API | `fetch_structures.py` |
| **data.europa.eu** | EU-wide statistics | Various | `download.py` |

```bash
# Example: fetch Norwegian bridge metadata
cd reference/datasets/norway-nvdb
python fetch_bridges.py --metadata-only

# Full fetch (28,918 bridges → JSON + CSV)
python fetch_bridges.py --output-dir ./data
```

### Cross-Validation Methodology (`reference/methodology/`)

A repeatable process for validating DeepInspect against official inspection data:

1. **Select reference bridges** — 100 bridges across Norway, UK, Sweden with known ratings + Street View
2. **Run DeepInspect** — full 7-agent pipeline, save PhysicsHealthCertificate JSON
3. **Convert scores** — using `score_mappings.json` breakpoints
4. **Compute agreement** — Pearson r, Cohen's Kappa, false-negative rate
5. **Calibrate** — adjust `CRITERION_WEIGHTS` in `scoring.py` based on findings

Safety-critical target: **false-negative rate < 10%** (how often DeepInspect misses a HIGH/CRITICAL bridge).

### Country System Documentation (`reference/country-systems/`)

Detailed documentation for 8 European rating systems: Germany (DIN 1076), France (IQOA), UK (CS 450), Netherlands (NEN 2767), Italy (Linee Guida 2020), Poland (GDDKiA), Norway (Brutus), Sweden (BaTMan). Each file includes: rating scale, damage codes, inspection cycle, network statistics, and mapping to DeepInspect criteria.

### Research Benchmarks (`research/`)

5 analysis files covering European standards comparison, real inspection report benchmarks, AI inspection landscape 2026, DeepInspect vs. European standards gap analysis, and GPT-5 claim validation.

---

## 12. Project Structure

```
deepinspect/
+-- backend/
|   +-- main.py                          # FastAPI entry point
|   +-- config.py                        # Settings from .env
|   +-- agents/
|   |   +-- orchestrator.py              # 7-agent execution graph
|   |   +-- discovery_agent.py           # OSM Overpass -> priority-scored bridges
|   |   +-- vision_agent.py              # Street View + Gemini Vision (14 categories)
|   |   +-- context_agent.py             # Gemini text -> construction history
|   |   +-- risk_agent.py                # Score fusion + PhysicsHealthCertificate
|   |   +-- hydrological_agent.py        # Scour / flood risk assessment
|   |   +-- structural_type_agent.py     # Redundancy + capacity classification
|   |   +-- degradation_agent.py         # Fick's law + ISO 9223 + freeze-thaw
|   +-- models/
|   |   +-- bridge.py                    # BridgeTarget, BridgeSummary, BridgeRiskReport
|   |   +-- vision.py                    # VisualAssessment (14 defect categories)
|   |   +-- context.py                   # BridgeContext
|   |   +-- criteria.py                  # CriterionResult, PhysicsHealthCertificate
|   |   +-- scour.py                     # ScourAssessment
|   |   +-- structural_type.py           # StructuralTypeAssessment
|   |   +-- degradation.py              # DegradationAssessment
|   +-- services/
|   |   +-- gemini_service.py            # Gemini model instances
|   |   +-- overpass_service.py          # OSM Overpass query
|   |   +-- streetview_service.py        # Street View fetch + disk cache
|   |   +-- maps_service.py             # Nominatim geocoding
|   |   +-- flood_service.py            # Waterway proximity + flood risk
|   +-- utils/
|   |   +-- scoring.py                   # 11-criterion physics-weighted fusion
|   +-- prompts/
|   |   +-- vision_prompt.txt            # 14-category defect analysis
|   |   +-- context_prompt.txt           # Polish infrastructure research
|   |   +-- risk_report_prompt.txt       # Risk narrative synthesis
|   |   +-- scour_vision_prompt.txt      # Scour indicator detection
|   |   +-- structural_type_prompt.txt   # Structure classification
|   |   +-- degradation_prompt.txt       # Degradation reasoning
|   +-- requirements.txt
|   +-- .env.example
+-- frontend/
|   +-- src/
|   |   +-- components/
|   |   |   +-- BridgePanel.jsx          # Detail panel + PhysicsCertificateView
|   |   |   +-- PhysicsCertificateView.jsx  # Certificate display
|   |   |   +-- CriterionCard.jsx        # Per-criterion expandable card
|   |   |   +-- ReportExport.jsx         # Multi-page PDF export
|   |   |   +-- charts/
|   |   |   |   +-- CriteriaRadarChart.jsx  # 11-axis risk profile
|   |   |   |   +-- DefectFrequencyChart.jsx
|   |   |   |   +-- RiskDistributionChart.jsx
|   |   +-- store/useAppStore.js         # Zustand state
|   |   +-- hooks/                       # SSE streaming, health check
|   +-- tailwind.config.js
|   +-- package.json
+-- reference/                            # European inspection reference library
|   +-- standards/                       # EU frameworks (COST TU1406, BRIME, FHWA, Italian 2020)
|   +-- country-systems/                 # 8 country rating systems (DE/FR/UK/NL/IT/PL/NO/SE)
|   +-- datasets/                        # Download scripts for open bridge datasets
|   |   +-- norway-nvdb/fetch_bridges.py # 28,918 Norwegian bridges via REST API
|   |   +-- codebrim/download.py         # CODEBRIM defect image dataset
|   |   +-- dacl10k/download.py          # dacl10k 19-class segmentation dataset
|   |   +-- uk-national-highways/        # UK BCI open data
|   |   +-- data-europa-eu/              # EU-wide bridge statistics
|   +-- mappings/                        # Machine-readable score conversion
|   |   +-- score_mappings.json          # DeepInspect <-> 9 rating systems
|   |   +-- criteria_to_din1076_svd.json # 11 criteria -> German S/V/D axes
|   |   +-- defects_to_dacl10k.json      # Visual categories -> dacl10k classes
|   |   +-- italian_coa_mapping.json     # Criteria -> Italian risk types
|   +-- methodology/                     # Cross-validation protocol + metrics
|   +-- papers/                          # Annotated bibliography + BibTeX
+-- research/                            # Analysis & benchmarking
|   +-- 01-european-inspection-standards.md
|   +-- 02-real-inspection-reports-benchmarks.md
|   +-- 03-ai-inspection-landscape-2026.md
|   +-- 04-deepinspect-vs-european-standards.md
|   +-- 05-claim-validation-gpt5.md
+-- DESIGN.md                            # Design system specification
+-- docker-compose.yml
+-- README.md
```

---

## 13. Troubleshooting

**Backend returns 500 on `/api/scan`**
Check the terminal for a specific error. Common causes: invalid API key, Overpass API unreachable (try again in a minute).

**"No bridges found" for a city**
The Overpass query filters to motor-vehicle bridges only. Some smaller towns have few OSM-tagged highway bridges. Try: `Warsaw`, `Wroclaw`, `Krakow`, `Gdansk`.

**Analysis takes longer than expected**
The physics swarm runs 7 agents with multiple Gemini calls. Expect 30-60 seconds per bridge. If scour or structural type agents fail, the report still generates with lower confidence.

**Street View images don't appear**
Street View coverage is sparse in rural areas. The vision agent returns `None` and scoring falls back to moderate-risk defaults. The confidence caveat notes the limitation.

**PDF missing Physics Health Certificate pages**
Ensure you re-analysed the bridge after the latest code update. Old cached results don't include the certificate. Hard-refresh the browser (`Ctrl+Shift+R`) and run a new analysis.

**Certificate shows "low" confidence on most criteria**
This is expected when only Street View imagery is available. Low confidence triggers pessimistic bias (higher risk scores) and field-inspection flags. This is a feature, not a bug.
