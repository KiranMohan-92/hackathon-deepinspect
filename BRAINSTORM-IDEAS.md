# Hackathon Brainstorm: GDG Build with AI (Warsaw, March 28, 2026)

All ideas explored during our brainstorming session for the GDG on Campus Build with AI Hackathon at Politechnika Warszawska.

---

## Event Intelligence

- **Date**: March 28, 2026, 10:00 AM - 5:30 PM CET
- **Location**: Stara Kotlownia, Politechnika Warszawska, Warsaw, Poland
- **Theme**: Build with AI using Google tools (Gemini, ADK, Vertex AI, AI Studio)
- **2026 GDG Focus**: Agentic AI -- Google Agent Development Kit (ADK), multi-agent systems, MCP
- **Typical Judging Criteria**: Functional/Technical (30%), Track Applicability (30%), Creativity/Originality (30%), Design/UX (10%)

### What NOT to Build (Anti-Patterns)
- Basic chatbot with Gemini
- Simple RAG system
- Medical/mental health bot
- Todo app with AI
- Single API call wrappers

### What Wins Hackathons (from past Google AI winners)
- Multi-agent ADK architecture
- Real-world problem with emotional resonance
- Multiple Google tools used prominently
- Polished, interactive demos
- Novel approach that stands out

### Past Winners Reference
- **ADK Hackathon Grand Prize**: SalesShortcut -- Multi-agent SDR system (FastAPI + ADK + BigQuery)
- **GKE Grand Prize**: Cart-to-Kitchen -- AI grocery assistant (Gemini + ADK + agent-to-agent)
- **ODSC Winner**: SurgAgent -- Surgical instrument tracking with Gemini
- **Pattern**: Multi-agent + real-world problem + polished demo = winner

---

## Google AI Tools Available (2026)

### Gemini 3 Features
- **Multimodal**: Text, image, audio, video understanding
- **Bounding Boxes**: Spatial object detection with coordinates (0-1000 normalized)
- **Segmentation Masks**: Gemini 2.5+ returns precise contour masks
- **Search Grounding**: Real-time Google Search for cited, factual responses
- **Maps Grounding**: Location-aware responses with spatial data
- **Context Circulation**: Tool results preserved across turns for complex reasoning
- **Structured Output**: JSON mode for reliable agent communication
- **Live API**: Real-time voice and vision via WebSocket (Gemini 3.1 Flash Live)
- **Tool Combos**: Combine Google Search + Maps + custom functions in one request

### Google ADK (Agent Development Kit)
- Code-first Python framework for multi-agent systems
- `ParallelAgent` for concurrent independent tasks
- `SequentialAgent` for ordered pipelines
- Tool confirmation (HITL) for guarded execution
- TypeScript SDK also available
- Graph-based workflows in ADK 2.0 Alpha

---

## Tier 1 Ideas: Agentic AI Showcase

### 1. CityPulse -- Multi-Agent Local Experience Planner
- **Problem**: Fragmented search across Maps, events, weather, transit for city exploration
- **Agents**: Scout (Maps grounding), Planner (itinerary), Concierge (Search grounding)
- **Why wins**: Uses Maps grounding (brand new), universally relatable, great demo
- **Feasibility**: 8/10

### 2. FactForge -- Multi-Agent Real-Time Fact Verification
- **Problem**: Misinformation spreads 6x faster than truth
- **Agents**: Decomposer, Research (Search grounding), Verdict
- **Why wins**: Social impact, multi-step reasoning, transparent agent feed
- **Feasibility**: 8/10

---

## Tier 2 Ideas: Real-World Problems (Poland/Europe Focus)

### 3. PrawaBot -- Refugee Rights Navigator
- **Problem**: Poland repealed special refugee law on March 5, 2026. 1M+ Ukrainians don't know their new rights
- **Agents**: Legal Parser, Eligibility, Action (Search grounding), Translation
- **Why wins**: Insanely timely (law changed THIS MONTH), affects 1M people, multimodal (photograph gov letters)
- **Google tools**: Gemini multilingual, Search grounding, Maps grounding (nearest office), ADK
- **Feasibility**: 8/10

### 4. BabciaHelper -- Elderly Digital Government Assistant
- **Problem**: Seniors can't navigate digital government services (ZUS, ePUAP, mObywatel)
- **Agents**: Guide, Document (Gemini vision for ID photos), Appointment (Maps grounding)
- **Why wins**: Universal empathy, Live API voice interface
- **Feasibility**: 7/10

### 5. DoctorFinder -- Healthcare Wait-Time Navigator
- **Problem**: Poland's NFZ specialist wait times: 6-12 months
- **Agents**: Triage, Search (real-time availability), Location (Maps grounding), Prep
- **Why wins**: Life-or-death stakes, Maps + Search combo, universally relatable
- **Feasibility**: 8/10

### 6. BreatheSafe -- Air Quality Health Advisor
- **Problem**: Poland has worst air quality in EU. 46,000 premature deaths/year
- **Agents**: Monitor (Search grounding for real-time AQI), Health, Action, Forecast
- **Why wins**: People are dying, personalized health, beautiful data viz
- **Feasibility**: 9/10

### 7. BizBoost -- Small Business Digital Assistant
- **Problem**: 70% of Polish small businesses have weak online presence
- **Agents**: Audit (Search grounding), Strategy, Content, Competitor (Maps grounding)
- **Why wins**: Economic impact, Maps + Search combo
- **Feasibility**: 8/10

### 8. StudyForge -- AI Study Group Simulator
- **Problem**: Students can't synthesize information across courses efficiently
- **Agents**: Socrates (questions), Tutor (explains), Challenger (devil's advocate), Summarizer
- **Why wins**: University venue, education is Google priority
- **Feasibility**: 9/10

---

## Tier 3 Ideas: Aerospace / Engineering / Visionary

### 9. OrbitGuard -- Space Debris Collision Prevention
- **Problem**: 36,500+ tracked objects in orbit, Kessler Syndrome threat
- **Agents**: Tracker (TLE data), Predictor (collision probability), Advisor (avoidance maneuvers), Reporter
- **Why wins**: Three.js 3D orbital visualization, real public data (CelesTrak)
- **Google tools**: ADK, Gemini reasoning, Search grounding
- **Feasibility**: 7/10

### 10. ExoScope -- Exoplanet Habitability Intelligence
- **Problem**: 5,700+ confirmed exoplanets, multi-disciplinary habitability analysis is fragmented
- **Agents**: Atmosphere (spectral analysis), Star (stellar properties), Climate (surface modeling), Verdict (habitability index 0-100)
- **Why wins**: Scientifically deep, planet comparison cards, Search grounding for JWST data
- **Data**: NASA Exoplanet Archive API
- **Feasibility**: 8/10

### 11. Kardashev Engine -- Civilization Energy Scaling Modeler (SELECTED INTEREST)
- **Problem**: Humanity at Kardashev 0.73. No tool models realistic pathways to Type I
- **Agents**: Energy Census (Search grounding), Technology (readiness assessment), Pathway (scenario modeling), Bottleneck (binding constraints)
- **Why wins**: Most original concept, "what if" scenarios, Three.js Earth visualization
- **Feasibility**: 8/10

### 12. SolarForge -- Space-Based Solar Power Constellation Designer
- **Problem**: Japan's OHISAMA launching 2026. Beam pointing accuracy <0.001 degrees at 17,000 mph
- **Agents**: Array (solar sizing), Beam (transmission physics), Ground (Maps grounding for rectenna), Safety (exclusion zones)
- **Why wins**: Front-page news, beam visualization in Three.js
- **Feasibility**: 6/10

### 13. ConstellationForge -- LEO Mega-Constellation Architect
- **Problem**: Designing optimal satellite constellation (coverage, cost, debris, spectrum)
- **Agents**: Coverage, Launch (Search grounding for pricing), Spectrum, Debris
- **Why wins**: Three.js constellation buildup visualization
- **Feasibility**: 7/10

---

## Tier 4 Ideas: Structural Engineering (SELECTED DIRECTION)

### 14. DeepInspect -- Multi-Agent Extreme Environment Infrastructure Analyzer (CHOSEN)
- **Problem**: Infrastructure inspection is manual, expensive, subjective. Extreme environments make it impossible
- **Agents**: Orchestrator (input validation), Vision (bounding boxes + confidence), Environment (Search grounding, parallel), Failure Mode (Search grounding, parallel), Priority (consistency validation)
- **Why wins**: Gemini Vision is Google's flagship, multi-environment is original, annotated image output, production-grade architecture
- **Feasibility**: 9/10
- **See**: EXECUTION-PLAN.md for full details

### 15. StructureSight (Earlier version of DeepInspect)
- Simpler: Vision + Environment + Failure + Priority (no validation, no bounding boxes)
- Evolved into DeepInspect with enhancements

---

## Decision Matrix

| Project | Judge Appeal | Tech Depth | Demo Impact | Feasibility | Google Tools |
|---------|-------------|------------|-------------|-------------|-------------|
| CityPulse | 5/5 | 4/5 | 5/5 | 4/5 | Maps+Search+ADK |
| FactForge | 5/5 | 5/5 | 4/5 | 4/5 | Search+ADK |
| PrawaBot | 5/5 | 4/5 | 4/5 | 4/5 | Multi+Search+Maps |
| DoctorFinder | 5/5 | 4/5 | 4/5 | 4/5 | Maps+Search+ADK |
| Kardashev | 5/5 | 4/5 | 5/5 | 4/5 | Search+ADK |
| OrbitGuard | 5/5 | 4/5 | 5/5 | 3/5 | Search+ADK |
| **DeepInspect** | **5/5** | **5/5** | **5/5** | **5/5** | **Vision+Search+ADK+Parallel** |

**Final Choice**: DeepInspect -- best balance of feasibility, technical depth, and demo impact.

---

## Key Research Sources

- [Google ADK Documentation](https://google.github.io/adk-docs/)
- [Gemini API Bounding Box Detection](https://ai.google.dev/gemini-api/docs/image-understanding)
- [ADK Hackathon Winners](https://cloud.google.com/blog/products/ai-machine-learning/adk-hackathon-results-winners-and-highlights)
- [Build with AI Program](https://developers.google.com/community/build-with-ai)
- [Orbital Data Centers (Jan 2026 launch)](https://introl.com/blog/orbital-data-center-nodes-launch-space-computing-infrastructure-january-2026)
- [Gemini 3 API Tooling Updates](https://blog.google/innovation-and-ai/technology/developers-tools/gemini-api-tooling-updates/)
- [Poland Refugee Law Change (March 2026)](https://www.visahq.com/news/2026-03-06/pl/poland-begins-phasing-out-social-benefits-for-ukrainian-refugees-under-new-law/)
- [Gemini 3.1 Flash Live API](https://blog.google/innovation-and-ai/technology/developers-tools/build-with-gemini-3-1-flash-live/)
