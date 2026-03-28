# DeepInspect — Project Decision Log & Progress Tracker

**Project**: DeepInspect — Multi-Agent Infrastructure Intelligence Platform
**Team**: 2 developers
**Started**: March 27, 2026
**Repo**: https://github.com/KiranMohan-92/hackathon-deepinspect

---

## Origin Story

Originally conceived for the GDG Build with AI Hackathon (Warsaw, March 28, 2026). After discovering the event was restricted to Polish students, the team decided to build DeepInspect properly as a production-grade product without time pressure.

The teammate built a working bridge scanner for Poland as the V1 foundation. This document tracks the V2 evolution into a multi-environment infrastructure intelligence platform.

---

## Architecture Decisions

### ADR-001: Use ADK agents as individual units, NOT SequentialAgent for the full pipeline

**Decision**: Each agent (Vision, Environment, Failure Mode, Priority) is an ADK `Agent` object. The orchestrator is our own Python async code that calls them in sequence.

**Why**: The pipeline mixes non-LLM calls (Overpass API, Street View fetch) with LLM calls. ADK's `SequentialAgent` assumes all steps are LLM agents. Our orchestrator needs conditional routing, external API calls, and error handling between stages — better expressed as Python functions.

**Consequence**: We get the best of both worlds — ADK's agent abstractions + Search grounding tools, with full control over orchestration flow.

### ADR-002: SSE over WebSockets for real-time streaming

**Decision**: Use Server-Sent Events (EventSourceResponse from sse-starlette) for streaming agent activity to the frontend.

**Why**: SSE is unidirectional (server → client), works over HTTP/1.1, simpler than WebSockets. The client sends one POST with the image, then receives a stream of events. No bidirectional communication needed.

**Consequence**: Frontend uses `fetch` + `ReadableStream` (not native `EventSource`, which only supports GET). This is handled in Phase 6's `useSSE.ts` hook.

### ADR-003: Dual-mode UI — Analysis Mode + Map Mode

**Decision**: Keep the teammate's Map Mode for geographic bridge scanning AND add a new Analysis Mode for single-image deep inspection.

**Why**: Map Mode is a genuinely differentiated feature (scan a city, get a risk map of every bridge). Analysis Mode is the hero feature for multi-environment infrastructure. Having both shows breadth and depth.

**Consequence**: Two completely separate UI experiences sharing the same backend agents. Mode toggle in the header. Zustand store persists across mode switches.

### ADR-004: Fail-closed validation gate

**Decision**: The orchestrator's input validation gate fails closed on parse errors (rejects the image) and only fails open on connectivity issues.

**Why**: Original implementation failed open on ALL exceptions — a selfie or meme that caused any parse error would be accepted as valid infrastructure. The code reviewer caught this as a CRITICAL security issue.

**Consequence**: If the validation agent returns malformed JSON, the image is rejected with a clear error message. Only network timeouts allow the image through (so analysis can proceed even if the validation call is slow).

### ADR-005: Sequential Environment → Failure Mode (not truly parallel)

**Decision**: Run Environment Agent first, then feed its output into Failure Mode Agent.

**Why**: Originally designed as parallel, but Failure Mode analysis is significantly richer when it has the environmental context (e.g., knowing freeze-thaw cycles helps classify corrosion patterns). The code reviewer flagged the original "parallel" implementation as actually running sequentially with a hidden double-call — emitting two `thinking` events simultaneously while only one agent was running was misleading the UI.

**Consequence**: Slightly higher latency (~5-8s sequential vs ~4-5s parallel) but better analysis quality. The SSE events now emit `thinking` at the correct moment for each agent.

### ADR-006: Bounding box coordinate system — Gemini 0-1000 normalized

**Decision**: Vision Agent returns bounding boxes as `[y_min, x_min, y_max, x_max]` in Gemini's 0-1000 normalized coordinate system. Frontend converts to pixels.

**Why**: Gemini natively returns coordinates in this format. Converting on the backend would couple the backend to display dimensions. Frontend conversion via `actual_x = (gemini_x / 1000) * displayWidth` is simple and resolution-independent.

**Consequence**: `BoundingBoxOverlay.tsx` handles the conversion with a Canvas overlay positioned using parent-relative `getBoundingClientRect()` (not `offsetLeft/offsetTop`, which the reviewer caught as a positioning bug).

### ADR-007: google-genai replaces google-generativeai

**Decision**: Migrate from old `google-generativeai` SDK to new `google-genai` unified SDK.

**Why**: ADK depends on `google-genai` (the new unified SDK). The old `google-generativeai` is deprecated. Both SDKs can coexist temporarily — the gemini_service.py keeps backward-compatible exports (text_model, vision_model) for the existing bridge scan flow while the new analysis pipeline uses the ADK/genai path.

**Consequence**: `requirements.txt` lists `google-genai>=1.0.0` and `google-adk>=1.0.0`. Old SDK is automatically available as a fallback.

---

## Completed Phases

### Phase 1: Foundation Cleanup
**Commit**: `e9636ec` | **Files changed**: 9,808 | **Lines**: -1,231,827

- Created comprehensive `.gitignore` (Python, Node, IDE, OS, credentials, cached images)
- Removed 9,800+ tracked artifact files from git (venv, __pycache__, node_modules, dist, cached Street View images)
- Created `backend/.env.example` with all 7 config variables documented
- Created `frontend/.env.example` with Vite environment variables
- Copied `CLAUDE.md` to repo root as canonical project context

**Reviewer findings (code-reviewer)**: Missing env vars (MAX_BRIDGES_PER_SCAN, STREETVIEW_CACHE_DIR), model name mismatch in .env.example, no gitignore rule for runtime image caches. All fixed before commit.

### Phase 2: TypeScript Migration
**Commit**: `d86b679` | **Files changed**: 21 | **Lines**: +519 -204

- Added `tsconfig.json` with strict mode
- Created `types.ts` with 25+ TypeScript interfaces matching all backend models
- Renamed all 14 frontend files from JSX/JS to TSX/TS
- Added typed props, event handlers, refs, Zustand store
- Added `vite-env.d.ts` for environment type declarations

**Reviewer findings (typescript-reviewer)**: Deprecated `baseUrl` in TS 6, env vars typed as non-optional, unsafe `as Error` casts, fragile `keyof` access pattern, redundant `as RiskTier` casts, missing null guard on `#root`. All fixed before commit.

### Phase 3: Backend ADK Migration + New Agents
**Commit**: `f18d4c5` | **Files changed**: 13 | **Lines**: +1,396

- Created ADK service layer (`gemini_service.py`) with Runner + InMemorySessionService
- Created Environment Agent with Google Search grounding for real-time data
- Created Failure Mode Agent with Google Search grounding for historical precedents
- Created Priority Agent with risk matrix (Severity x Probability x Consequence) and consistency validation
- Created 4 agent prompt files with structured JSON output schemas
- Created generalized Pydantic models: InfrastructureTarget, DamagesAssessment, EnvironmentAnalysis, FailureModeAnalysis, PriorityReport
- Created SSE event model (AgentEvent) with factory methods
- Added `run_analysis_pipeline()` to orchestrator — existing `run_pipeline()` unchanged
- Implemented ADK fallback: thin wrapper using raw Gemini if ADK unavailable

**Reviewer findings (python-reviewer)**: Fail-open validation (CRITICAL), CWD-relative module-level file reads (CRITICAL), deprecated datetime.utcnow(), blocking sync in async fallback, hidden double-call in parallel analysis, Pydantic v2 __init__ override, non-unique target IDs, inconsistent JSON parsing in fallbacks. All fixed before commit.

### Phase 4: SSE Streaming Backend
**Commit**: `b7389dd` | **Files changed**: 2 | **Lines**: +222

- Created `sse_service.py` with SSE event formatting helpers
- Added `POST /api/analyze` — streams real-time agent events via EventSourceResponse
- Added `POST /api/analyze-demo` — streams pre-cached events with delays for demos
- Existing endpoints completely unchanged

**Reviewer findings (code-reviewer)**: Path traversal in demo endpoint (HIGH), error message leakage exposing internals (HIGH), parallel/sequential mismatch emitting misleading events (HIGH). All fixed before commit.

### Phase 5: Analysis Mode Frontend
**Commit**: `eb272c7` | **Files changed**: 10 | **Lines**: +1,494

- Created full design system: dark void background, glassmorphism panels, severity colors, agent colors, JetBrains Mono + IBM Plex Sans, animations (scan line, agent pulse, bbox fade-in, risk glow)
- Created 7 Analysis Mode components: AnalysisMode, MissionInput, VisualAnalysis, BoundingBoxOverlay, AgentFeed, RiskReport, IntelligenceReport
- Created `useAnalysisState` hook with useReducer state management
- Added ANALYSIS | MAP mode toggle to App.tsx
- Map Mode fully preserved — zero changes to existing components

**Reviewer findings (code-reviewer)**: Canvas positioning bug with offsetLeft/offsetTop (HIGH), draw-before-layout race condition (HIGH), object URL memory leak on image replacement (HIGH), error state silently dropped (HIGH), staggered animation on single canvas (HIGH). All fixed before commit.

---

## Upcoming Phases

### Phase 6: SSE Frontend Integration
- Create `useSSE.ts` hook connecting to `POST /api/analyze`
- Wire real-time agent events to AgentFeed, BoundingBoxOverlay, RiskReport
- Wire demo buttons to `/api/analyze-demo`
- Forward context fields to backend

### Phase 7: Demo Assets + Multi-Environment
- Collect public domain demo images (bridge, satellite, subsea)
- Pre-compute demo caches
- Tune environment-specific prompts

### Phase 8: Testing
- pytest for scoring formula, SSE events, model validation, orchestrator
- Frontend component tests for BoundingBoxOverlay coordinate conversion

### Phase 9: Security + Code Review
- Full OWASP security scan
- Final Python + TypeScript code quality pass

### Phase 10: Documentation + Polish
- Comprehensive README with architecture diagram
- Dead code cleanup
- Final git hygiene

---

## Code Review Summary

Every phase was reviewed by a specialized agent before committing:

| Phase | Reviewer | Findings | Fixed |
|-------|----------|----------|-------|
| 1 | code-reviewer | 2 HIGH, 2 MEDIUM | All |
| 2 | typescript-reviewer | 5 HIGH, 6 MEDIUM | All HIGH |
| 3 | python-reviewer | 2 CRITICAL, 7 HIGH | All CRITICAL + HIGH |
| 4 | code-reviewer | 3 HIGH, 4 MEDIUM | All HIGH |
| 5 | code-reviewer | 5 HIGH, 5 MEDIUM | All HIGH |

**Total issues caught and fixed before commit: 17 CRITICAL/HIGH**

---

## Tech Stack

| Layer | Technology |
|-------|-----------|
| Agent Framework | Google ADK (Python) with raw Gemini fallback |
| AI Model | Gemini Flash (multimodal) via google-genai |
| Search Grounding | Google Search via ADK tools |
| Backend API | FastAPI + SSE (sse-starlette) |
| Frontend | React + TypeScript (Vite) + Tailwind CSS |
| State Management | Zustand (Map Mode) + useReducer (Analysis Mode) |
| Image Annotation | HTML Canvas with Gemini 0-1000 coordinate conversion |
| Bridge Discovery | OpenStreetMap Overpass API |
| Street View | Google Street View Static API |
| Maps | Leaflet + react-leaflet |
| PDF Export | jsPDF |
| Containerization | Docker Compose (backend + redis + frontend) |

---

## File Structure (current)

```
hackathon-deepinspect/
├── CLAUDE.md                    # Project context + architecture plan
├── CHANGELOG.md                 # Phase-by-phase change log
├── PROJECT-LOG.md               # This file — decisions + progress
├── EXECUTION-PLAN.md            # Original execution plan
├── BRAINSTORM-IDEAS.md          # All brainstormed ideas
├── docker-compose.yml
├── .gitignore
│
├── backend/
│   ├── main.py                  # FastAPI app + SSE endpoints
│   ├── config.py                # Pydantic settings
│   ├── requirements.txt         # Python deps (ADK, genai, sse-starlette)
│   ├── .env.example
│   ├── agents/
│   │   ├── orchestrator.py      # Bridge scan + analysis pipeline
│   │   ├── discovery_agent.py   # Overpass bridge discovery (unchanged)
│   │   ├── vision_agent.py      # Gemini vision analysis (unchanged)
│   │   ├── context_agent.py     # Bridge context research (unchanged)
│   │   ├── risk_agent.py        # Bridge risk scoring (unchanged)
│   │   ├── environment_agent.py # NEW: ADK + Search grounding
│   │   ├── failure_mode_agent.py # NEW: ADK + Search grounding
│   │   └── priority_agent.py    # NEW: Risk matrix + consistency
│   ├── models/
│   │   ├── bridge.py            # Bridge models (unchanged)
│   │   ├── vision.py            # DefectScore models (unchanged)
│   │   ├── context.py           # BridgeContext (unchanged)
│   │   ├── infrastructure.py    # NEW: Generalized models
│   │   └── events.py            # NEW: SSE event models
│   ├── services/
│   │   ├── gemini_service.py    # ADK + raw Gemini service layer
│   │   ├── sse_service.py       # NEW: SSE formatting helpers
│   │   ├── maps_service.py      # Geocoding (unchanged)
│   │   ├── overpass_service.py  # OSM queries (unchanged)
│   │   └── streetview_service.py # Street View (unchanged)
│   ├── prompts/
│   │   ├── vision_prompt.txt    # (unchanged)
│   │   ├── context_prompt.txt   # (unchanged)
│   │   ├── risk_report_prompt.txt # (unchanged)
│   │   ├── orchestrator_prompt.txt # NEW
│   │   ├── environment_prompt.txt  # NEW
│   │   ├── failure_mode_prompt.txt # NEW
│   │   └── priority_prompt.txt     # NEW
│   └── utils/
│       ├── scoring.py           # Risk formula (unchanged)
│       └── cache.py             # (unchanged)
│
├── frontend/
│   ├── tsconfig.json            # Strict TypeScript
│   ├── vite.config.ts
│   ├── package.json
│   └── src/
│       ├── main.tsx
│       ├── App.tsx              # Mode toggle (ANALYSIS | MAP)
│       ├── index.css            # Design system + animations
│       ├── types.ts             # All TypeScript interfaces
│       ├── vite-env.d.ts
│       ├── hooks/
│       │   ├── useBridgeScan.ts
│       │   └── useAnalysisState.ts # NEW: Analysis state reducer
│       ├── store/
│       │   └── useAppStore.ts
│       ├── components/
│       │   ├── analysis/        # NEW: "Orbital Command Center"
│       │   │   ├── AnalysisMode.tsx
│       │   │   ├── MissionInput.tsx
│       │   │   ├── VisualAnalysis.tsx
│       │   │   ├── BoundingBoxOverlay.tsx
│       │   │   ├── AgentFeed.tsx
│       │   │   ├── RiskReport.tsx
│       │   │   └── IntelligenceReport.tsx
│       │   ├── MapView.tsx      # (unchanged)
│       │   ├── BridgePanel.tsx  # (unchanged behavior)
│       │   ├── BridgeList.tsx
│       │   ├── BridgeImageViewer.tsx
│       │   ├── ImageAnalysisModal.tsx
│       │   ├── SearchBar.tsx
│       │   ├── StatsPanel.tsx
│       │   ├── ReportExport.tsx
│       │   └── RiskBadge.tsx
│       └── utils/
│           └── riskColors.ts
│
└── scripts/
    └── precompute_demo.py
```
