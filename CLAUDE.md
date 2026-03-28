# CLAUDE.md — DeepInspect: Multi-Agent Infrastructure Intelligence Platform

## Project Overview

DeepInspect is a multi-agent AI system that analyzes infrastructure integrity across terrestrial, orbital, and subsea environments. It uses Google ADK + Gemini Vision to detect structural damage, assess environmental stressors, classify failure modes, and produce risk-scored intelligence reports with annotated imagery.

**Stack**: Google ADK (Python) · Gemini 3 Flash (multimodal) · FastAPI + SSE · React + TypeScript + Vite + Tailwind · OpenStreetMap Overpass · Google Street View · Google Search Grounding

**Team**: 2 people (Aerospace MSc + Astrophysics PhD)

---

## What Exists (Teammate's Foundation)

The current codebase has a working bridge-scanning pipeline for Poland:
- `backend/agents/orchestrator.py` — 4-stage pipeline: Discovery → Vision → Context → Risk
- `backend/agents/discovery_agent.py` — finds bridges via Overpass API
- `backend/agents/vision_agent.py` — Gemini vision analysis of Street View images
- `backend/agents/context_agent.py` — Gemini text-based contextual analysis
- `backend/agents/risk_agent.py` — risk scoring + narrative generation
- `backend/services/` — Street View, Maps, Overpass, Gemini service wrappers
- `backend/models/` — Pydantic models for BridgeTarget, VisualAssessment, BridgeContext, BridgeRiskReport
- `backend/utils/scoring.py` — weighted risk formula (visual 40%, age 25%, incidents 20%, inspection staleness 15%)
- `frontend/` — React + Leaflet map with bridge markers, side panel, Canvas bounding box overlays
- `docker-compose.yml` — backend + redis + frontend
- `scripts/precompute_demo.py` — pre-compute Wrocław demo cache

**What works**: End-to-end bridge scanning for any Polish city, Street View image caching, defect bounding box rendering, risk tier classification.

**What needs to change**: see Architecture Evolution below.

---

## Architecture Evolution: From Bridge Scanner → Infrastructure Intelligence Platform

### Phase 1: Foundation Cleanup
- [ ] Remove `backend/venv/` and `backend/__pycache__/` from git (add to `.gitignore`)
- [ ] Add proper `.gitignore` for Python + Node
- [ ] Add `.env.example` files for both backend and frontend
- [ ] Type-check: convert frontend from JSX → TSX
- [ ] Add `CLAUDE.md` (this file) to repo root

### Phase 2: Google ADK Migration
- [ ] Replace raw `google-generativeai` calls with Google ADK Agent objects
- [ ] Restructure agents into ADK-native patterns:
  - `OrchestratorAgent` — ADK SequentialAgent wrapping the full pipeline
  - `VisionAgent` — ADK Agent with Gemini multimodal, structured JSON output
  - `EnvironmentAgent` — ADK Agent with Google Search grounding tool
  - `FailureModeAgent` — ADK Agent with Google Search grounding tool
  - `PriorityAgent` — ADK Agent with structured output, consistency validation
- [ ] Use ADK `ParallelAgent` for Environment + FailureMode (replace manual asyncio.gather)
- [ ] Add input validation gate to OrchestratorAgent (reject non-infrastructure, blurry photos)
- [ ] Preserve existing Overpass/StreetView discovery pipeline as a pre-ADK data collection stage

### Phase 3: Multi-Environment Expansion
- [ ] Generalize models beyond bridges:
  - `InfrastructureTarget` (replaces `BridgeTarget`) — supports bridge, satellite, subsea_cable, wind_turbine, pipeline, dam, tower
  - `EnvironmentCategory` enum: terrestrial_civil, terrestrial_industrial, orbital, subsea, arctic
  - `InfrastructureReport` (replaces `BridgeRiskReport`) — environment-aware risk scoring
- [ ] Add direct image upload flow (bypass Overpass/StreetView discovery):
  - `POST /api/analyze` — accepts image + optional context JSON, streams SSE events
  - This is the primary flow for satellite panels, subsea cables, uploaded inspection photos
- [ ] Keep existing bridge discovery flow as a specialized mode:
  - `POST /api/scan` — city/viewport scan, Overpass → StreetView → analyze (existing flow, upgraded to ADK)
- [ ] Environment-specific prompt engineering:
  - Orbital: radiation dose, atomic oxygen, thermal cycling ±150°C, micrometeorite flux
  - Subsea: hydrostatic pressure, biofouling, cathodic protection, current velocity
  - Arctic: permafrost thaw, ice loading, extreme thermal gradients
  - Terrestrial: freeze-thaw, de-icing salts, traffic loading, seismic

### Phase 4: SSE Streaming Pipeline
- [ ] Replace synchronous JSON responses with Server-Sent Events for the analyze endpoint
- [ ] Event contract (every SSE event follows this schema):
  ```
  data: {"agent": "<name>", "status": "<queued|thinking|complete|error>", "payload": {...}, "timestamp": <unix_ms>}
  ```
- [ ] Agent event sequence for image upload flow:
  1. `orchestrator` — validates input, classifies structure type + environment
  2. `vision` — damage detection with bounding boxes + confidence scores
  3. `environment` — environmental stressors (parallel with failure_mode)
  4. `failure_mode` — failure classification + historical precedents (parallel with environment)
  5. `priority` — risk matrix + consistency validation + final report
- [ ] Agent event sequence for bridge scan flow:
  1. `discovery` — finding bridges via Overpass
  2. Per bridge: `vision` → parallel(`environment`, `failure_mode`) → `priority`
  3. `summary` — aggregate risk map
- [ ] "thinking" events emitted when each agent starts processing (shows agent activity in UI)
- [ ] Error events with graceful degradation (if one agent fails, continue pipeline)

### Phase 5: Frontend Rebuild — "Orbital Command Center"
- [ ] Convert JSX → TSX throughout
- [ ] Implement dual-mode UI:
  - **Map Mode** (existing, enhanced): Leaflet map for bridge scanning with risk markers
  - **Analysis Mode** (new): 3-panel command layout for single-image analysis
- [ ] Analysis Mode layout:
  ```
  +--[Panel A: 280px]--+--[Panel B: flex-1]--+--[Panel C: 340px]--+
  |  MISSION INPUT     |  VISUAL ANALYSIS    |  INTELLIGENCE      |
  |  - Image upload    |  - Annotated image  |  - Agent feed      |
  |  - Context fields  |  - Canvas overlay   |  - Risk report     |
  |  - Quick demos     |  - Bounding boxes   |  - Actions         |
  +--------------------+---------------------+--------------------+
  ```
- [ ] Design system:
  - Background: #06060a (near-black with blue undertone) + subtle noise texture + grid overlay
  - Panels: glassmorphism (backdrop-filter: blur(12px), rgba(12,14,22,0.85))
  - Typography: JetBrains Mono 700 for headings (uppercase, letter-spacing 0.12em), IBM Plex Sans for body
  - Severity colors: CRITICAL=#ff1744, SEVERE=#ff6d00, MODERATE=#ffab00, MINOR=#aeea00
  - Accent: #00e5ff (cyan) for scanning/active states
  - Agent colors: Orchestrator=#e8eaed, Vision=#448aff, Environment=#00e676, FailureMode=#ff6d00, Priority=#ff1744
- [ ] Canvas bounding box overlay:
  - Coordinates from Gemini: [y_min, x_min, y_max, x_max] normalized 0-1000
  - Color-coded by severity, 2px borders, 8% opacity fill
  - Confidence pills on each box
  - Dashed borders for uncertain findings (confidence < 0.7)
  - Staggered fade-in animation
  - Toggle annotations on/off
- [ ] Agent Activity Feed (real-time SSE):
  - Each agent: colored dot + name + status
  - Thinking: pulsing dot animation + message
  - Complete: solid dot + checkmark + summary
  - "PARALLEL EXECUTION" badge when Environment + FailureMode run simultaneously
- [ ] Risk Report Card:
  - Large risk tier badge with severity color
  - Risk matrix grid (Severity × Probability × Consequence)
  - Consistency check status
  - Recommended actions as timeline cards
  - Worst-case scenario callout
  - Historical precedents
- [ ] Quick demo buttons for 3 scenarios:
  - Satellite Solar Panel (loads demo image, triggers analysis)
  - Bridge Crack (loads demo image)
  - Subsea Cable (loads demo image)
- [ ] SSE connection hook: `useSSE.ts`
  - Connects to POST /api/analyze with multipart image
  - Parses SSE events, updates agent states via useReducer
  - Handles reconnection and error states
- [ ] Projector-optimized: min 12px body text, 2px borders, 28px risk badge

### Phase 6: Demo Assets & Documentation
- [ ] Collect demo images:
  - 2-3 bridge crack photos (real inspection photos, public domain)
  - 2-3 satellite solar panel damage photos (NASA/ESA public domain)
  - 2-3 subsea cable / wind turbine photos (public domain)
  - Store in `backend/data/demo_images/` and `frontend/public/demo_images/`
- [ ] Pre-compute demo cache for each scenario type
- [ ] Write comprehensive README with:
  - Architecture diagram
  - Setup instructions
  - API documentation
  - Screenshots
- [ ] Record demo video showing all 3 environment scenarios

---

## Coding Standards

- **Python**: Python 3.11+, type hints everywhere, Pydantic v2 for all models, async/await for I/O
- **TypeScript**: Strict mode, no `any`, interfaces for all data shapes
- **React**: Functional components with hooks, useReducer for complex state, no external state library except zustand if needed
- **Testing**: pytest for backend, test critical paths (scoring formula, agent prompt parsing, SSE event emission)
- **Error handling**: Every agent call wrapped in try/except, graceful degradation, error SSE events
- **Git**: Conventional commits, no binary blobs, no venv/node_modules

---

## Agent Prompts

### Orchestrator — Input Validation Gate

```
You are the orchestrator of a structural inspection AI system. VALIDATE the input before routing.

1. Is this a photo of physical infrastructure? (bridge, building, satellite, cable, turbine, pipeline, rail, dam, tower)
   - If NO: REJECT with "Please upload a photo of physical infrastructure."
2. Is image quality sufficient for analysis?
   - If severely blurred, too dark, or too small: REJECT with quality warning.
3. Classify structure type and environment category.

Output JSON:
{
  "valid": true|false,
  "rejection_reason": null|"...",
  "structure_type": "...",
  "structure_subtype": "...",
  "environment_category": "terrestrial_civil|terrestrial_industrial|orbital|subsea|arctic",
  "user_context": {"age": null, "location": null, "last_inspection": null, "known_issues": null}
}
```

### Vision Agent — Bounding Boxes + Confidence

```
You are a structural engineering vision specialist with 20 years of inspection experience.

For EACH damage or anomaly:
1. Identify damage type (crack, corrosion, deformation, spalling, impact, erosion, discoloration, delamination)
2. Describe precisely (orientation, estimated dimensions, pattern)
3. Provide BOUNDING BOX as [y_min, x_min, y_max, x_max] normalized 0-1000
4. Provide a short LABEL (max 5 words)
5. Rate CONFIDENCE (0.0-1.0):
   - 0.9-1.0: clearly visible, unambiguous
   - 0.7-0.89: likely damage, uncertain lighting/angle
   - 0.5-0.69: possible damage, flag as UNCERTAIN
   - Below 0.5: do not include
6. Classify overall damage PATTERN

Output JSON:
{
  "damages": [{"id": 1, "type": "...", "description": "...", "bounding_box": [y,x,y,x], "label": "...", "severity": "MINOR|MODERATE|SEVERE|CRITICAL", "confidence": 0.0-1.0, "uncertain": false}],
  "overall_pattern": "...",
  "overall_severity": "MINOR|MODERATE|SEVERE|CRITICAL",
  "overall_confidence": 0.0-1.0,
  "healthy_areas_noted": "..."
}
```

### Environment Agent — Search Grounding

```
You are an environmental engineering specialist. Use Google Search for REAL, CURRENT environmental data.

For the given structure type and environment:
- Temperature ranges, thermal cycling frequency
- Moisture/humidity/precipitation
- Chemical exposure (de-icing salts, acid rain, salt spray)
- UV radiation intensity
- Vibration and dynamic loading
- ORBITAL: radiation dose, atomic oxygen flux, micrometeorite environment, thermal cycling ±150°C
- SUBSEA: hydrostatic pressure, current velocity, biofouling rates, cathodic protection
- ARCTIC: permafrost thaw, ice loading, extreme thermal gradients

Output JSON:
{
  "stressors": [{"name": "...", "severity": "LOW|MEDIUM|HIGH", "measured_value": "...", "description": "...", "source": "..."}],
  "accelerating_factors": [...],
  "mitigating_factors": [...],
  "data_sources": [...]
}
```

### Failure Mode Agent — Search Grounding

```
You are a failure analysis engineer specializing in structural forensics. Use Google Search for HISTORICAL PRECEDENTS.

1. Match damage pattern to known failure mechanisms
2. Determine root cause chain
3. Estimate progression rate
4. Find 2+ historical precedents with dates and outcomes

Output JSON:
{
  "failure_mode": "...",
  "mechanism": "...",
  "root_cause_chain": ["initiating cause", "propagation", "failure mode"],
  "progression_rate": "SLOW|MODERATE|RAPID",
  "time_to_critical": "...",
  "time_to_failure": "...",
  "historical_precedents": [{"event": "...", "location": "...", "year": "...", "outcome": "...", "relevance": "...", "source": "..."}]
}
```

### Priority Agent — Consistency Validation

```
You are a risk assessment engineer. Synthesize ALL upstream findings.

STEP 1 — CONSISTENCY VALIDATION:
- Vision severity MINOR but Failure Mode predicts RAPID progression → FLAG
- Environment LOW stressors but short time-to-failure → FLAG
- Vision confidence below 0.7 → reduces overall certainty
- Failure Mode precedents don't match damage pattern → FLAG as weak analogy

STEP 2 — RISK MATRIX (score each 1-5):
- Severity: current damage state
- Probability: likelihood of progression
- Consequence: impact of failure
- Composite: Severity × Probability × Consequence (max 125)

STEP 3 — RISK TIER:
1-15: LOW | 16-35: MEDIUM | 36-60: MEDIUM-HIGH | 61-90: HIGH | 91-125: CRITICAL

Output JSON:
{
  "consistency_check": {"passed": true|false, "anomalies": [...], "confidence_adjustment": "..."},
  "risk_matrix": {"severity": {"score": 1-5, "reasoning": "..."}, "probability": {...}, "consequence": {...}, "composite": 1-125},
  "risk_tier": "LOW|MEDIUM|MEDIUM-HIGH|HIGH|CRITICAL",
  "recommended_actions": [{"action": "...", "timeline": "...", "priority": "IMMEDIATE|URGENT|SCHEDULED|MONITOR"}],
  "worst_case_scenario": "...",
  "summary": "2-3 sentence executive summary"
}
```

---

## SSE Event Contract

```typescript
// Every SSE event follows this shape:
interface SSEEvent {
  agent: 'orchestrator' | 'vision' | 'environment' | 'failure_mode' | 'priority' | 'discovery';
  status: 'queued' | 'thinking' | 'complete' | 'error';
  payload: Record<string, any>;
  timestamp: number; // unix ms
}

// Frontend state shape:
interface AnalysisState {
  image: File | null;
  imagePreviewUrl: string | null;
  analysisStatus: 'idle' | 'analyzing' | 'complete' | 'error';
  agents: Record<string, {
    status: 'queued' | 'thinking' | 'complete' | 'error';
    message: string;
    payload: any;
    timestamp: number | null;
  }>;
  showAnnotations: boolean;
  elapsedTime: number;
}
```

---

## File Structure Target

```
hackathon-deepinspect/
├── CLAUDE.md                          # This file
├── README.md                          # Project documentation
├── docker-compose.yml                 # Backend + Redis + Frontend
├── .gitignore                         # Python + Node + env
│
├── backend/
│   ├── Dockerfile
│   ├── requirements.txt
│   ├── .env.example
│   ├── config.py                      # Pydantic settings
│   ├── main.py                        # FastAPI app with SSE endpoints
│   │
│   ├── agents/                        # Google ADK agents
│   │   ├── __init__.py
│   │   ├── orchestrator.py            # ADK SequentialAgent — full pipeline
│   │   ├── vision_agent.py            # ADK Agent — multimodal damage detection
│   │   ├── environment_agent.py       # ADK Agent — Search grounding
│   │   ├── failure_mode_agent.py      # ADK Agent — Search grounding
│   │   ├── priority_agent.py          # ADK Agent — risk synthesis
│   │   └── discovery_agent.py         # Bridge discovery (Overpass + StreetView)
│   │
│   ├── models/
│   │   ├── __init__.py
│   │   ├── infrastructure.py          # InfrastructureTarget, InfrastructureReport
│   │   ├── vision.py                  # VisualAssessment, DamageRegion
│   │   ├── context.py                 # EnvironmentContext
│   │   └── events.py                  # SSE event models
│   │
│   ├── services/
│   │   ├── __init__.py
│   │   ├── gemini_service.py          # ADK model configuration
│   │   ├── maps_service.py            # Geocoding
│   │   ├── overpass_service.py        # OSM bridge discovery
│   │   ├── streetview_service.py      # Street View image fetching
│   │   └── sse_service.py             # SSE event emission helpers
│   │
│   ├── prompts/                       # Agent prompt templates
│   │   ├── orchestrator_prompt.txt
│   │   ├── vision_prompt.txt
│   │   ├── environment_prompt.txt
│   │   ├── failure_mode_prompt.txt
│   │   ├── priority_prompt.txt
│   │   └── context_prompt.txt         # Existing bridge context prompt
│   │
│   ├── utils/
│   │   ├── __init__.py
│   │   ├── scoring.py                 # Risk scoring formula
│   │   └── cache.py                   # Redis + in-memory cache
│   │
│   ├── data/
│   │   ├── demo_cache/                # Pre-computed demo results
│   │   └── demo_images/               # Demo scenario images
│   │
│   └── tests/
│       ├── test_scoring.py
│       ├── test_orchestrator.py
│       └── test_events.py
│
├── frontend/
│   ├── Dockerfile
│   ├── package.json
│   ├── tsconfig.json
│   ├── vite.config.ts
│   ├── tailwind.config.ts
│   ├── index.html
│   │
│   ├── public/
│   │   └── demo_images/               # Quick-demo scenario images
│   │
│   └── src/
│       ├── main.tsx
│       ├── App.tsx                     # Route between Map Mode and Analysis Mode
│       ├── index.css                   # CSS variables, fonts, noise texture, grid
│       ├── types.ts                    # TypeScript interfaces matching SSE contract
│       │
│       ├── hooks/
│       │   ├── useSSE.ts              # SSE connection + event parsing
│       │   ├── useBridgeScan.ts       # Bridge discovery API calls
│       │   └── useAnalysisState.ts    # Analysis mode state reducer
│       │
│       ├── components/
│       │   ├── layout/
│       │   │   ├── Header.tsx
│       │   │   ├── Footer.tsx
│       │   │   └── ModeToggle.tsx     # Switch between Map and Analysis mode
│       │   │
│       │   ├── analysis/              # Analysis Mode (3-panel command center)
│       │   │   ├── MissionInput.tsx    # Panel A: upload, context, quick demos
│       │   │   ├── VisualAnalysis.tsx  # Panel B: annotated image hero
│       │   │   ├── BoundingBoxOverlay.tsx  # Canvas rendering
│       │   │   ├── IntelligenceReport.tsx  # Panel C: agent feed + risk report
│       │   │   ├── AgentFeed.tsx      # Real-time agent status
│       │   │   └── RiskReport.tsx     # Risk matrix, actions, worst case
│       │   │
│       │   └── map/                   # Map Mode (bridge scanning)
│       │       ├── MapView.tsx        # Leaflet map with markers
│       │       ├── BridgePanel.tsx    # Side panel detail view
│       │       ├── BridgeList.tsx     # Bridge list
│       │       ├── BridgeImageViewer.tsx  # Street View + defect overlay
│       │       ├── SearchBar.tsx
│       │       └── StatsPanel.tsx
│       │
│       ├── store/
│       │   └── useAppStore.ts         # Zustand store
│       │
│       └── utils/
│           ├── riskColors.ts
│           └── coordinates.ts         # Gemini bbox → pixel conversion
│
└── scripts/
    ├── precompute_demo.py             # Pre-compute demo cache
    └── collect_demo_images.py         # Download public domain demo images
```

---

## Build Order (for Claude Code with ECC)

Execute these in order. Each phase should be a separate Claude Code session. Use `/compact` between phases.

### Session 1: Cleanup + .gitignore + TypeScript migration
```
Clean up the repo:
1. Add comprehensive .gitignore (Python venv, __pycache__, node_modules, .env, dist, *.pyc)
2. Remove backend/venv/ and all __pycache__/ directories from git tracking
3. Add .env.example files for backend and frontend
4. Convert frontend from JSX to TSX — update all component files, add tsconfig.json
5. Update vite.config to TypeScript
6. Add this CLAUDE.md to repo root
```

### Session 2: Backend — ADK Migration + New Agent Architecture
```
Migrate the backend to Google ADK:
1. Update requirements.txt: add google-adk, update google-generativeai
2. Research current Google ADK Python API (use search-first skill)
3. Create new agent files following the ADK Agent pattern:
   - agents/vision_agent.py — ADK Agent with Gemini multimodal
   - agents/environment_agent.py — ADK Agent with Google Search grounding tool
   - agents/failure_mode_agent.py — ADK Agent with Google Search grounding tool  
   - agents/priority_agent.py — ADK Agent with structured output
4. Create ADK ParallelAgent wrapping environment + failure_mode
5. Update orchestrator.py to use ADK SequentialAgent pipeline
6. Add input validation gate to orchestrator
7. Load prompts from backend/prompts/ directory
8. Keep existing discovery_agent.py, maps_service, overpass_service, streetview_service
9. Generalize models: InfrastructureTarget replaces BridgeTarget (keep backward compat)
```

### Session 3: Backend — SSE Streaming + Dual Endpoints
```
Add SSE streaming to the backend:
1. Create models/events.py with SSE event Pydantic models
2. Create services/sse_service.py — helper to emit typed SSE events
3. Add POST /api/analyze endpoint:
   - Accepts multipart image upload + optional context JSON
   - Returns EventSourceResponse
   - Streams agent events as they complete
   - Each agent emits "thinking" event on start, "complete" event with payload
   - Environment + FailureMode show parallel execution
   - Error handling: if agent fails, emit error event, continue pipeline
4. Update POST /api/scan to also stream SSE events (or keep as JSON for map mode)
5. Add POST /api/analyze-demo endpoint that streams pre-cached SSE events
6. Test with curl: curl -N -X POST http://localhost:8000/api/analyze -F "file=@test.jpg"
```

### Session 4: Frontend — Analysis Mode UI
```
Build the Analysis Mode frontend (the "Orbital Command Center"):
[Paste the full frontend mega-prompt from DEEPINSPECT-FRONTEND-PROMPT.md here]
```

### Session 5: Frontend — SSE Integration + Mode Toggle
```
Integrate SSE with the Analysis Mode frontend:
1. Create hooks/useSSE.ts — connects to POST /api/analyze, parses SSE events
2. Create hooks/useAnalysisState.ts — useReducer managing all agent states
3. Wire MissionInput.tsx to trigger SSE connection on image upload or demo button click
4. Wire AgentFeed.tsx to display real-time agent status from SSE events
5. Wire BoundingBoxOverlay.tsx to render when vision agent completes
6. Wire RiskReport.tsx to display when priority agent completes
7. Add ModeToggle component — switch between Map Mode and Analysis Mode
8. Update App.tsx to route between modes
9. Test end-to-end: upload image → see agents activate → see annotated image → see report
```

### Session 6: Demo Assets + Polish + Documentation
```
Final polish:
1. Collect demo images (public domain) for 3 scenarios:
   - Satellite solar panel damage (NASA/ESA)
   - Bridge crack inspection
   - Subsea cable / wind turbine
2. Store in frontend/public/demo_images/ and backend/data/demo_images/
3. Pre-compute demo cache for each scenario
4. Write comprehensive README with architecture diagram, setup instructions, screenshots
5. Run /code-review on entire codebase
6. Add pytest tests for scoring formula, event emission, agent prompt parsing
7. Record demo video
```

---

## ECC Commands Reference

| When | Command | Purpose |
|------|---------|---------|
| Start of each session | `/plan "..."` | Get implementation blueprint |
| Before writing ADK code | Research current Google ADK API | search-first skill verifies API surface |
| Hit a build error | `/build-fix` | Build-error-resolver diagnoses and fixes |
| Before integration | `/code-review` | Code-reviewer catches bugs |
| Between sessions | `/compact` | Clear context for next phase |
| Complex architecture decision | `/model opus` | Switch to Opus for deep reasoning |
| Back to coding | `/model sonnet` | Switch back for speed |
| After major milestone | `/learn` | Extract patterns for continuous learning |

---

## Key Technical Decisions

1. **ADK over raw Gemini calls**: ADK provides agent orchestration primitives (SequentialAgent, ParallelAgent) that make the multi-agent architecture explicit and inspectable. It also gives us Search grounding as a first-class tool.

2. **SSE over WebSockets**: SSE is simpler, unidirectional (server → client), works over HTTP/1.1, and is sufficient for our use case. The client sends one POST request with the image, then receives a stream of events.

3. **Dual-mode UI**: Map Mode for geographic scanning (existing), Analysis Mode for single-image deep inspection (new). Both share the same backend agents but different frontend experiences.

4. **Bounding box normalization**: Gemini returns coordinates as [y_min, x_min, y_max, x_max] normalized 0-1000. Frontend converts: `actual_x = (gemini_x / 1000) * displayWidth`. This is consistent across image sizes.

5. **Pre-computed demo cache**: For any live demonstration, pre-compute results to eliminate API latency. The demo endpoint streams cached SSE events with artificial delays to simulate real-time agent execution.

6. **Graceful degradation**: If any agent fails, the pipeline continues. The Priority Agent notes missing inputs in its consistency check. If Search grounding fails, agents fall back to knowledge-based analysis.
