# DeepInspect V2

**Production-grade European bridge inspection platform.** DeepInspect V2 turns a dark glass command deck into a physics-first remote inspection workflow: scan a city or live viewport, discover motor-vehicle bridges, and run an 8-agent module swarm that produces an 11-criteria **Physics Health Certificate**, European rating conversions, repair-cost brackets, deterministic action policy, and persistent assessment history.

Built on branch `deepinspect-v3`, the platform combines OpenStreetMap discovery, Google Street View imagery, Gemini reasoning, async persistence, resilient external-service calls, observability endpoints, and CI/CD release gates. The result is a production-oriented bridge triage system for European networks, with explicit confidence bounds and field-verification flags where remote evidence ends.

---

## Table of Contents

1. [What Makes This Different](#1-what-makes-this-different)
2. [Phase 0-7 Production Uplift](#2-phase-0-7-production-uplift)
3. [Architecture](#3-architecture)
4. [Prerequisites](#4-prerequisites)
5. [Get API Keys](#5-get-api-keys)
6. [Local Setup](#6-local-setup)
7. [Docker Setup](#7-docker-setup)
8. [Using the App](#8-using-the-app)
9. [The 11-Criteria Physics Assessment](#9-the-11-criteria-physics-assessment)
10. [API Endpoints](#10-api-endpoints)
11. [Environment Variables](#11-environment-variables)
12. [European Reference Library & Cross-Validation](#12-european-reference-library--cross-validation)
13. [Project Structure](#13-project-structure)
14. [Troubleshooting](#14-troubleshooting)
15. [Technology Stack](#15-technology-stack)

---

## 1. What Makes This Different

| Traditional inspection tools | DeepInspect V2 |
|------------------------------|----------------|
| Single risk score, opaque formula | 11 ranked criteria, physics-derived weights, every score traceable to data sources |
| Visual defects only | Scour risk, structural redundancy, load capacity, degradation modeling, trend history, evidence provenance |
| Binary pass/fail | Confidence bounds on every criterion plus explicit `REQUIRES FIELD INSPECTION` flags |
| Prototype workflow | Persistent assessments, observability endpoints, optional auth hardening, production config validation, CI release gates |
| Local rating only | 9-country bridge rating conversion across Europe plus US NBI interoperability |
| One-shot report | Deterministic action policy, cost estimation, escalation tracking, historical evidence linkage |

DeepInspect evaluates bridges against the same ranked criteria that govern real-world collapse: scour and foundations (#1, 52-55% of failures), load-path redundancy (#2), capacity vs. demand (#3), and 8 more. The output is a traceable engineering artifact rather than a single AI guess.

---

## 2. Phase 0-7 Production Uplift

The `deepinspect-v3` branch completed a 7-phase production uplift that moved the platform from advanced prototype to deployment-ready inspection stack.

### Phase 0: Structured Logging + Resilience

- `structlog` with JSON or console rendering.
- Request correlation via `X-Request-ID`.
- Circuit breakers for Gemini (`5` failures / `60s`), Overpass (`3` / `30s`), and Google Maps (`3` / `30s`).
- Resilient external-service call chain: circuit breaker -> retry with exponential backoff -> timeout.

### Phase 1: Database + Assessment Persistence

- SQLAlchemy 2.0 async persistence layer.
- SQLite for development and PostgreSQL as the production target.
- Seven persistence tables: `bridges`, `assessments`, `assessment_events`, `evidence_records`, `assessment_evidence_links`, `trends`, `audit_logs`.
- Automatic trend detection: `improving`, `stable`, `escalating`.
- Persistence APIs for history, trend, escalations, and evidence provenance.

### Phase 2: Testing Infrastructure + CI Hard Gates

- `142` backend unit and integration tests, up from `80`.
- Coverage added for resilience, database persistence, scoring, rating conversion, and cost estimation.
- All three legacy `|| true` soft-failure escapes were removed from CI.
- Merges are now hard-gated by test and build status.

### Phase 3: EU Rating Conversion + Cost Estimation + Decision Policy

- European bridge rating conversion for 9 systems:
  `DE DIN 1076`, `FR IQOA`, `UK CS 450 BCI`, `NL NEN 2767`, `IT Linee Guida 2020`, `PL GDDKiA`, `NO Brutus`, `SE BaTMan`, `US NBI`.
- Four repair-cost brackets: `minor`, `moderate`, `major`, `critical`.
- Defect-aware escalation logic for cost estimation.
- Deterministic decision policy engine with 6 action types:
  `continue_monitoring`, `schedule_routine`, `schedule_priority`, `field_inspection_required`, `load_restriction_review`, `emergency_closure_review`.

### Phase 4: Frontend Hardening

- Zustand persist middleware keeps `bridges`, `analyzedBridges`, and `activeFilter` across refreshes.
- `react-leaflet-cluster` added for high-density marker clustering.
- Existing production-grade `ErrorBoundary` with retry button retained as part of the hardened UI shell.

### Phase 5: Observability Stack

- In-process metrics exporter.
- Prometheus text exposition at `/api/v1/metrics/prometheus`.
- Readiness probe at `/api/v1/ready` checking database and Gemini availability.
- Observability config surface:
  `METRICS_ENABLED`, `OTEL_ENABLED`, `OTEL_SERVICE_NAME`.

### Phase 6: Auth + Production Hardening

- Optional JWT authentication support using `HS256`.
- Role model for `viewer`, `analyst`, and `admin`.
- Production configuration validation checks staging and production settings for insecure combinations.
- CORS is fully environment-driven.
- Error responses include correlated `error_id` values for incident tracing.

### Phase 7: CI/CD Release Gate

- Four-stage hard release gate in GitHub Actions:
  `backend-test`, `frontend-test`, `security-scan`, `docker-build`.
- `docker-build` depends on the first three stages.
- No soft failures: all stages must pass before release flow can proceed.

---

## 3. Architecture

DeepInspect uses an 8-agent module architecture: 7 specialist agents plus 1 orchestrator. Discovery and analysis are separated so large geographic scans stay fast while deep analysis remains traceable and physics-driven.

### 8-Agent Physics-First Swarm

```text
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

Orchestrator
  - schedules parallel and sequential steps
  - streams SSE progress
  - enforces graceful degradation when sub-agents fail
```

**Step 1:** `HydrologicalAgent`, `VisionAgent`, and `ContextAgent` run in parallel.  
**Step 2:** `StructuralTypeAgent` consumes vision and context output.  
**Step 3:** `DegradationAgent` consumes context, vision, and location data.  
**Step 4:** `RiskAgent` fuses all criteria into the final certificate and action recommendation.

### Agent Modules

| Agent | Criteria | Data sources | Output |
|------|----------|--------------|--------|
| `DiscoveryAgent` | — | OSM Overpass mirrors, Google Places fallback, Nominatim geocoding | `list[BridgeSummary]` with priority scores |
| `HydrologicalAgent` | #1 | OSM waterway tags, flood classification, Gemini Vision for exposed foundations and erosion | `ScourAssessment` |
| `VisionAgent` | #4, #5, #8, #9, #11 | Street View at 6 headings, Gemini Vision across 14 defect categories | `VisualAssessment` |
| `ContextAgent` | — | Gemini text model, bridge context research, Polish and European infrastructure context | `BridgeContext` |
| `StructuralTypeAgent` | #2, #3, #6 | Vision, OSM tags, structural redundancy lookup tables | `StructuralTypeAssessment` |
| `DegradationAgent` | #7 | Fick's law, ISO 9223/9224 corrosion logic, freeze-thaw context | `DegradationAssessment` |
| `RiskAgent` | All 11 | All sub-assessments plus Gemini narrative synthesis | `BridgeRiskReport` and `PhysicsHealthCertificate` |
| `Orchestrator` | — | Pipeline control, SSE streaming, graceful degradation, persistence handoff | End-to-end execution graph |

### 11-Criteria Scoring Model

The authoritative score is the 11-criterion `PhysicsHealthCertificate.overall_risk_score`. Each criterion is scored `1.0-5.0`, weighted by collapse relevance, then confidence-adjusted with pessimistic bias.

| Rank | Criterion | Weight | Why it matters |
|------|-----------|--------|----------------|
| 1 | Scour / Foundations / Channel Stability | 25% | The dominant collapse driver; support loss violates equilibrium directly |
| 2 | Load-Path Redundancy | 15% | Non-redundant members turn local failure into global collapse |
| 3 | Capacity vs. Demand | 12% | Overload and marginal reserve capacity materially raise failure risk |
| 4 | Substructure Integrity | 10% | Piers and abutments transfer all loads into the ground |
| 5 | Superstructure Elements | 10% | Girders, trusses, cables, and fatigue-sensitive elements |
| 6 | Overall Stability | 5% | Buckling and overturning risks |
| 7 | Durability / Degradation | 8% | Corrosion, chloride ingress, freeze-thaw, ASR |
| 8 | Bearings / Joints | 5% | Failed seals accelerate damage in higher-ranked systems |
| 9 | Deck / Slab | 4% | Water ingress and surfacing deterioration |
| 10 | Stiffness / Serviceability | 3% | Deflection and vibration act as early warning indicators |
| 11 | Ancillary Systems | 3% | Drainage, railings, coatings, and non-primary safety systems |

**Weights sum to 1.0.** Low-confidence observations are not treated as safe. If evidence is weak on a high-impact criterion, the score shifts conservatively and the certificate calls for field verification.

### Graceful Degradation

If any agent fails because of timeout, upstream outage, or malformed model output, the pipeline does not abort. The affected area is scored at lower confidence, the missing evidence is surfaced in the report, and the certificate adds field-inspection scope instead of pretending the data exists.

---

## 4. Prerequisites

| Tool | Minimum version | Check |
|------|------------------|-------|
| Python | 3.11+ | `python --version` |
| Node.js | 18+ | `node --version` |
| npm | 9+ | `npm --version` |
| Git | any | `git --version` |
| Docker | recommended for containerized local runs | `docker --version` |

---

## 5. Get API Keys

You need two API keys for local analysis.

### Gemini API key

1. Go to [aistudio.google.com](https://aistudio.google.com)
2. Click **Get API key** -> **Create API key**
3. Copy the key into `backend/.env` as `GEMINI_API_KEY`

### Google Maps API key

1. Go to [console.cloud.google.com](https://console.cloud.google.com)
2. Enable:
   - **Street View Static API**
   - **Geocoding API**
3. Create an API key
4. Copy it into `backend/.env` as `GOOGLE_MAPS_API_KEY`

The base map uses OpenStreetMap tiles. You do not need the Google Maps JavaScript API for the default DeepInspect UI.

---

## 6. Local Setup

The quickest path is one backend terminal and one frontend terminal.

### Clone and checkout

```bash
git clone <repo-url> && cd Deepinspect_V2
git checkout deepinspect-v3
```

### Backend terminal

```bash
cd backend
cp .env.example .env  # Add your GEMINI_API_KEY and GOOGLE_MAPS_API_KEY
pip install -r requirements.txt
uvicorn main:app --reload  # Starts on :8000, auto-creates SQLite DB
```

### Frontend terminal

```bash
cd frontend
npm install
npm run dev  # Starts on :5173
```

### Validation and tests

Run these from the repository root in a separate terminal:

```bash
cd backend && pytest tests/ -v  # 142 tests
cd ../frontend && npm run build
cd ../tests-e2e && npx playwright test  # 62 E2E tests
```

### Recommended local notes

- The backend defaults to `sqlite+aiosqlite:///./deepinspect.db` and auto-initializes tables on startup when `DATABASE_AUTO_INIT=true`.
- Using a Python virtual environment is recommended even though the fast-start block above omits it for brevity.
- If you want explicit frontend env values, copy `frontend/.env.example` to `frontend/.env`.
- The backend is available at `http://localhost:8000`.
- The frontend dev server is available at `http://localhost:5173`.

### First-run E2E note

`tests-e2e/` has its own `package.json`. On a fresh machine, install its dependencies before running Playwright:

```bash
cd tests-e2e
npm install
npx playwright install --with-deps
```

### Quick verification

- `GET http://localhost:8000/health` should return a health payload.
- `GET http://localhost:8000/api/v1/health` should return dependency-aware health details.
- `GET http://localhost:8000/api/v1/ready` should return readiness for database and Gemini.

---

## 7. Docker Setup

`docker-compose.yml` already exists, along with `docker-compose.override.yml` for development and `docker-compose.prod.yml` for production-style runs.

### Local development with Docker Compose

```bash
cp backend/.env.example backend/.env
# Add GEMINI_API_KEY and GOOGLE_MAPS_API_KEY to backend/.env

docker compose up --build
```

This uses:

- `docker-compose.yml`
- `docker-compose.override.yml` automatically

Local Docker services:

- Frontend: `http://localhost:5173`
- Backend API: `http://localhost:8000`
- Redis: `localhost:6379`

The development override enables hot reload for both backend and frontend.

### Production-style Compose run

```bash
docker compose -f docker-compose.yml -f docker-compose.prod.yml up -d
```

Production notes:

- The base compose file expects `backend/.env` to exist.
- The production compose file assumes container images are available from GHCR.
- For real staging or production validation, set `ENVIRONMENT=staging` or `ENVIRONMENT=production` in `backend/.env`.
- Production validation checks and flags insecure settings such as `AUTH_ENABLED=false`, `DEMO_MODE=true`, default `JWT_SECRET`, or SQLite in production mode.

---

## 8. Using the App

### Two-phase workflow

**Phase 1: Discover**

Enter a city name or use **Scan this area** on the map. The backend queries OpenStreetMap for motor-vehicle bridges and returns them ranked by structural priority. A city-scale scan can return hundreds of bridges quickly because discovery does not require the full analysis swarm.

**Phase 2: Analyse**

Click any bridge and run **Deep Analysis**. The swarm orchestrates:

1. Street View imagery at 6 headings.
2. Visual defect analysis across 14 categories.
3. Scour and foundation risk assessment.
4. Historical and contextual bridge research.
5. Structural type and redundancy classification.
6. Physics-based degradation modeling.
7. 11-criterion score fusion into the final Physics Health Certificate.

### Search modes

| Mode | Input example | What it does |
|------|---------------|--------------|
| City | `Warsaw`, `Wroclaw` | Discovers all motor-vehicle bridges in the city |
| Bridge name | `Most Grunwaldzki` | Searches for a named bridge |
| Coordinates | `51.1079, 17.0385` | Finds bridges within roughly 2 km |
| Scan this area | map button | Scans bridges visible in the current viewport |

### Map markers

- Gray dots: discovered but not yet analysed
- Coloured dots: analysed bridges, colour-coded by risk tier
- Clustered markers: dense urban scans remain usable at higher zoom levels

### After analysis

The bridge detail panel shows:

- Risk badge with tier, score, and confidence
- Live AI reasoning feed via SSE
- Street View images with defect overlays
- Construction context and likely structural system
- Condition summary and key risk factors
- Physics Health Certificate with per-criterion evidence
- EU rating conversions, cost estimate bracket, and deterministic recommended action
- Multi-page PDF export

Press `?` inside the app to open the keyboard shortcuts modal.

---

## 9. The 11-Criteria Physics Assessment

DeepInspect evaluates every bridge against 11 ranked inspection criteria derived from equilibrium physics, mechanics of materials, degradation science, and bridge collapse statistics. The ranking is intentionally difficult to perturb: if the order changes materially, either the structural mechanics or the failure record stops agreeing.

### Physics Health Certificate

The final `PhysicsHealthCertificate` includes:

- Overall weighted risk score (`1.0-5.0`) and tier
- Per-criterion score with confidence level
- Data sources used for each criterion
- Key findings and likely failure modes
- Field-inspection flags with explicit scope
- Estimated remaining service life from degradation modeling
- Assessment limitations
- EU and US rating conversions
- Repair-cost bracket
- Deterministic recommended action

### What this system does not claim

1. Remote visual analysis cannot detect subsurface defects or hidden internal corrosion.
2. Scour depth below the waterline still requires direct survey or sonar.
3. Precise load rating requires drawings and field verification.
4. Material properties are inferred from era and type, not laboratory-tested.
5. Street View imagery is point-in-time and may be outdated.
6. Confidence is model-generated and should not be mistaken for independent verification.

These limitations are called out in the certificate because a system that hides uncertainty is more dangerous than one that asks for an engineer when the evidence runs out.

---

## 10. API Endpoints

**Primary base URL:** `http://localhost:8000`  
**Preferred production namespace:** `/api/v1`

SSE endpoints stream `data: {...}\n\n` payloads with event types such as `thinking_step`, `progress`, `complete`, and `error`.

| Method | Path | Purpose | Notes |
|--------|------|---------|-------|
| `GET` | `/` | API root redirect | Redirects to `/api/v1` |
| `GET` | `/health` | Quick health check | Root health payload with version and model |
| `GET` | `/api/v1/health` | Dependency-aware health | Includes dependency status and missing key reporting |
| `GET` | `/api/v1/metrics` | Basic in-process counters | JSON metrics plus audit log count |
| `GET` | `/api/v1/metrics/prometheus` | Prometheus exposition | `text/plain; version=0.0.4` |
| `GET` | `/api/v1/ready` | Readiness probe | Checks database and Gemini availability |
| `POST` | `/api/v1/scan` | Bridge discovery | SSE stream for city, bridge name, coordinate, or bbox search |
| `POST` | `/api/v1/bridges/{osm_id}/analyze` | Full bridge analysis | SSE stream for swarm execution and final report |
| `GET` | `/api/v1/demo` | Demo dataset | Returns cached Wroclaw demo results |
| `POST` | `/api/v1/analyze-image` | Direct image analysis | Multipart upload endpoint |
| `GET` | `/api/v1/images/{osm_id}/{heading}` | Cached Street View image | Headings: `0`, `60`, `120`, `180`, `240`, `300` |
| `GET` | `/api/v1/bridges/{osm_id}/images` | Available cached images | Lists existing image URLs for a bridge |
| `GET` | `/api/v1/bridges/{osm_id}/history` | Assessment history | Newest-first persisted assessment list |
| `GET` | `/api/v1/bridges/{osm_id}/trend` | Latest trend record | Returns `improving`, `stable`, or `escalating` |
| `GET` | `/api/v1/escalations` | Escalating bridges | Lists bridges whose trend direction is escalating |
| `GET` | `/api/v1/bridges/{osm_id}/evidence` | Latest evidence provenance | Returns linked evidence records for the latest assessment |

### Legacy aliases

Core discovery and analysis routes also exist under legacy `/api/*` paths:

- `/api/scan`
- `/api/bridges/{osm_id}/analyze`
- `/api/demo`
- `/api/analyze-image`

For new integrations, prefer `/api/v1`.

### Sample scan request

```json
{
  "query": "Warsaw",
  "query_type": "city_scan",
  "max_bridges": 500
}
```

### Sample viewport scan

```json
{
  "query": "viewport",
  "query_type": "bbox",
  "bbox": {
    "sw_lat": 52.20,
    "sw_lon": 20.95,
    "ne_lat": 52.25,
    "ne_lon": 21.05
  }
}
```

### Operational notes

- You can supply `X-Request-ID` to correlate logs across services. If omitted, the backend generates one.
- Structured error responses include an `error.error_id` for incident tracing.
- When `API_KEYS` is configured, clients must send `X-API-Key`.

---

## 11. Environment Variables

`backend/.env.example` and `frontend/.env.example` are the starting points. The tables below document the variables you are most likely to tune locally or in deployment.

### Backend

| Variable | Default | Purpose |
|----------|---------|---------|
| `GEMINI_API_KEY` | none | Required Gemini API key |
| `GOOGLE_MAPS_API_KEY` | none | Required Google Maps API key for Street View and geocoding |
| `DATABASE_URL` | `sqlite+aiosqlite:///./deepinspect.db` | Async database URL |
| `DATABASE_AUTO_INIT` | `true` | Auto-create tables on startup for local development |
| `REDIS_URL` | `redis://localhost:6379` | Redis cache endpoint |
| `DEMO_MODE` | `true` | Enables demo-oriented defaults |
| `MAX_BRIDGES_PER_SCAN` | `50` | Caps discovery result count returned by default |
| `STREETVIEW_CACHE_DIR` | `./data/demo_cache/images` | Cached Street View image directory |
| `GEMINI_MODEL` | `gemini-3.1-flash-lite-preview` | Gemini model identifier |
| `LOG_LEVEL` | `INFO` | Backend log verbosity |
| `LOG_FORMAT` | `console` | `console` locally, `json` in production |
| `AGENT_TIMEOUT_SECONDS` | `120` | Timeout for long-running agent calls |
| `METRICS_ENABLED` | `true` | Observability feature flag surface |
| `OTEL_ENABLED` | `false` | OpenTelemetry feature flag surface |
| `OTEL_SERVICE_NAME` | `deepinspect` | OpenTelemetry service name |
| `API_KEYS` | empty | Comma-separated API keys for `X-API-Key` middleware |
| `AUTH_ENABLED` | `false` | Enables production auth expectations |
| `JWT_SECRET` | `change-me-in-production` | HS256 signing secret |
| `JWT_EXPIRY_MINUTES` | `60` | JWT access token lifetime |
| `JWT_ISSUER` | `deepinspect` | JWT issuer claim |
| `JWT_AUDIENCE` | `deepinspect-api` | JWT audience claim |
| `CORS_ORIGINS` | `http://localhost:5173,http://localhost:5174,http://localhost:3000` | Comma-separated allowed origins |
| `RATE_LIMIT_SCAN` | `30` | Scan requests per minute |
| `RATE_LIMIT_ANALYZE` | `10` | Analysis requests per minute |
| `RATE_LIMIT_UPLOAD` | `5` | Image upload requests per minute |
| `RATE_LIMIT_DEFAULT` | `60` | Default request rate limit |
| `MAX_UPLOAD_SIZE_MB` | `10` | Max upload size for image analysis |
| `ALLOWED_IMAGE_TYPES` | `image/jpeg,image/png,image/webp` | Accepted upload content types |
| `ENVIRONMENT` | `development` | Runtime environment used by production validation |

### Frontend

| Variable | Default | Purpose |
|----------|---------|---------|
| `VITE_API_BASE_URL` | `http://localhost:8000` | Backend API base URL |
| `VITE_GOOGLE_MAPS_API_KEY` | none | Frontend access to Google-backed map features if enabled |

### Deployment note

The runtime configuration check keys off `ENVIRONMENT`, not `APP_ENV`. For staging or production deployments, set `ENVIRONMENT=staging` or `ENVIRONMENT=production` in `backend/.env`.

---

## 12. European Reference Library & Cross-Validation

DeepInspect includes a European reference library for comparing its Physics Health Certificate against real inspection systems, open datasets, and standards. This is the evidence layer for authority adoption and calibration work.

### Score mappings (`reference/mappings/`)

Machine-readable JSON files translate DeepInspect's `1.0-5.0` score into 9 rating systems:

| System | Scale | Direction | Example: DeepInspect 3.5 = |
|--------|-------|-----------|---------------------------|
| Germany DIN 1076 Zustandsnote | `1.0-4.0` | Ascending | `2.75` |
| France IQOA | `1/2/2E/3/3U (+S)` | Categorical | `Class 3` |
| UK CS 450 BCI | `0-100` | Descending | `52` |
| Netherlands NEN 2767 | `1-6` | Ascending | `4` |
| Italy Linee Guida 2020 | `LOW-HIGH` | Categorical | `MEDIUM-HIGH` |
| Poland GDDKiA | `0-5` | Ascending | `3` |
| Norway Brutus / NVDB | `0-4` | Ascending | `2.5` |
| Sweden BaTMan | `0-4` | Ascending | `2` |
| US NBI / FHWA | `0-9` | Descending | `4` |

Additional mapping files:

- `criteria_to_din1076_svd.json`
- `defects_to_dacl10k.json`
- `defects_to_codebrim.json`
- `italian_coa_mapping.json`

### Open datasets (`reference/datasets/`)

| Dataset | Bridges / scope | Format | Script |
|---------|------------------|--------|--------|
| Norway NVDB | `28,918` bridges | REST API + CSV | `fetch_bridges.py` |
| CODEBRIM | 6 defect classes | Images + labels | `download.py` |
| dacl10k | `9,920` images, 19 classes | Segmentation masks | `download.py` |
| UK National Highways | Strategic road network | CKAN API | `fetch_structures.py` |
| data.europa.eu | EU-wide statistics | Various | `download.py` |

### Country system documentation (`reference/country-systems/`)

Detailed documentation is included for:

- Germany (`DIN 1076`)
- France (`IQOA`)
- United Kingdom (`CS 450`)
- Netherlands (`NEN 2767`)
- Italy (`Linee Guida 2020`)
- Poland (`GDDKiA`)
- Norway (`Brutus`)
- Sweden (`BaTMan`)

Each document covers rating scale, damage logic, inspection cycle, network context, and mapping back into DeepInspect criteria.

### Cross-validation methodology (`reference/methodology/`)

1. Select reference bridges across countries with known official ratings.
2. Run the full DeepInspect swarm and save the `PhysicsHealthCertificate`.
3. Convert scores using the mapping breakpoints.
4. Compute agreement metrics such as Pearson `r`, Cohen's Kappa, and false-negative rate.
5. Recalibrate criterion weights if required.

Safety-critical target: **false-negative rate below 10%** for missing HIGH or CRITICAL bridges.

### Research benchmarks (`research/`)

The repo also contains benchmark and gap-analysis documents covering:

- European inspection standards
- Real inspection report benchmarks
- AI inspection landscape in 2026
- DeepInspect vs. European standards gap analysis
- Claim validation and evidence review

---

## 13. Project Structure

```text
Deepinspect_V2/
├── backend/
│   ├── main.py                      # FastAPI app, middleware, router mount, startup init
│   ├── config.py                    # Pydantic settings and production validation
│   ├── .env.example                 # Backend environment template
│   ├── requirements.txt             # Python dependencies
│   ├── auth/
│   │   └── jwt_service.py           # HS256 JWT helpers and role model
│   ├── agents/
│   │   ├── orchestrator.py          # Parallel/sequential execution graph
│   │   ├── discovery_agent.py       # OSM bridge discovery and prioritization
│   │   ├── vision_agent.py          # Street View defect analysis
│   │   ├── context_agent.py         # Bridge context and incident research
│   │   ├── hydrological_agent.py    # Scour and flood assessment
│   │   ├── structural_type_agent.py # Structural system and redundancy logic
│   │   ├── degradation_agent.py     # Durability and service-life modeling
│   │   └── risk_agent.py            # Score fusion, conversions, cost, policy output
│   ├── api/
│   │   └── v1/
│   │       └── router.py            # Versioned API surface
│   ├── db/
│   │   ├── base.py                  # Async engine and session setup
│   │   ├── models.py                # 7 persistence tables
│   │   └── repository.py            # Assessment, evidence, history, trend operations
│   ├── middleware/
│   │   └── request_logging.py       # X-Request-ID binding and request correlation
│   ├── models/
│   │   ├── bridge.py
│   │   ├── criteria.py
│   │   ├── scour.py
│   │   ├── structural_type.py
│   │   ├── degradation.py
│   │   ├── vision.py
│   │   └── context.py
│   ├── services/
│   │   ├── logging_service.py       # structlog setup
│   │   ├── resilience.py            # circuit breaker, retry, timeout
│   │   ├── metrics_service.py       # in-process metrics and Prometheus exposition
│   │   ├── readiness_service.py     # readiness checks
│   │   ├── decision_service.py      # deterministic action policy
│   │   ├── gemini_service.py
│   │   ├── overpass_service.py
│   │   ├── streetview_service.py
│   │   ├── maps_service.py
│   │   ├── google_places_service.py
│   │   └── flood_service.py
│   ├── utils/
│   │   ├── scoring.py               # 11-criterion fusion and legacy scoring
│   │   ├── rating_conversion.py     # 9-system conversion logic
│   │   ├── cost_estimation.py       # 4-bracket repair cost estimator
│   │   ├── security.py              # security headers and API key middleware
│   │   ├── errors.py                # structured error envelopes with error_id
│   │   ├── audit.py                 # audit logging
│   │   └── cache.py                 # Redis and fallback cache support
│   └── tests/                       # 142 backend tests
├── frontend/
│   ├── src/
│   │   ├── App.tsx
│   │   ├── store/useAppStore.ts     # Zustand persist store
│   │   ├── components/
│   │   │   ├── MapView.tsx          # Leaflet map with marker clustering
│   │   │   ├── ErrorBoundary.tsx    # UI failure containment with retry
│   │   │   ├── BridgePanel.tsx
│   │   │   ├── BridgeImageViewer.tsx
│   │   │   ├── ReportExport.tsx
│   │   │   └── charts/              # Radar, defect, and risk charts
│   │   └── hooks/                   # SSE, health polling, URL state, shortcuts
│   ├── .env.example
│   ├── package.json
│   ├── Dockerfile
│   └── Dockerfile.dev
├── tests-e2e/                       # 62 Playwright E2E tests
├── reference/                       # European mappings, datasets, standards, methodology
├── research/                        # Benchmarking and standards analysis
├── .github/workflows/
│   ├── ci.yml                       # backend-test, frontend-test, security-scan, docker-build
│   └── deploy.yml                   # image build and deployment workflow
├── docker-compose.yml
├── docker-compose.override.yml
├── docker-compose.prod.yml
├── DESIGN.md
├── WORKFLOW.md
└── README.md
```

---

## 14. Troubleshooting

**Backend returns 500 on `/api/v1/scan`**  
Check the backend terminal first. Common causes are missing API keys, Overpass mirror failures, or malformed upstream responses.

**`/api/v1/ready` returns `503`**  
The readiness check requires the database connection to succeed. Gemini is reported in the payload, but database readiness is the hard gate.

**No bridges found for a city**  
Discovery filters to motor-vehicle bridges only. Some smaller towns have too few tagged highway bridges in OSM. Test with larger cities such as `Warsaw`, `Wroclaw`, `Krakow`, or `Gdansk`.

**Viewport scan returns nothing**  
Zoom further in. Country-scale bounding boxes are too large and can time out or return overly broad results.

**Analysis takes longer than expected**  
Deep analysis runs the full multi-agent pipeline and can take `30-60` seconds depending on upstream latency. Watch the SSE reasoning feed for progress.

**Street View images do not appear**  
Coverage is sparse in some rural areas. The system falls back to lower-confidence scoring and adds field-verification flags rather than hiding the gap.

**Most criteria show low confidence**  
That usually means the assessment leaned heavily on remote imagery with limited corroborating data. This is a safety feature, not a bug.

**Error responses contain an `error_id`**  
Use that ID together with `X-Request-ID` and structured logs to correlate incidents quickly.

**E2E tests fail immediately**  
Make sure the app is running and that `tests-e2e/` dependencies plus Playwright browsers are installed.

**Production startup reports config validation errors**  
Check `ENVIRONMENT`, `AUTH_ENABLED`, `DEMO_MODE`, `JWT_SECRET`, and `DATABASE_URL`. The production validation layer is designed to surface insecure combinations early.

---

## 15. Technology Stack

| Layer | Technology |
|-------|------------|
| Backend API | Python 3.11+, FastAPI `0.115.0`, uvicorn `0.30.0`, Pydantic `2.8.0` |
| AI | Google Gemini text and vision via `google-genai` |
| Persistence | SQLAlchemy async `2.x`, SQLite via `aiosqlite`, PostgreSQL as production target, Alembic |
| Resilience | Circuit breakers, retry/backoff, timeouts |
| Logging | `structlog` with console and JSON renderers |
| Frontend | React 18, TypeScript, Zustand, Recharts, Framer Motion |
| Mapping UI | Leaflet, `react-leaflet`, `react-leaflet-cluster` |
| Styling | Tailwind CSS with dark glassmorphism visual language |
| Reporting | jsPDF multi-page export |
| External data | OSM Overpass, Google Street View, Google Geocoding, Google Places fallback |
| Cache | Redis with in-memory fallback patterns |
| Observability | Prometheus text exposition, readiness probe, OTEL config surface |
| Testing | Pytest, pytest-asyncio, pytest-cov, Playwright |
| CI/CD | GitHub Actions, Trivy, Docker Buildx, GHCR |

DeepInspect V2 is opinionated by design: physics first, uncertainty surfaced, and production behavior explicit.
