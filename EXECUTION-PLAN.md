# DeepInspect — Multi-Agent Extreme Environment Infrastructure Analyzer

## Execution Plan for GDG Build with AI Hackathon (Warsaw, March 28, 2026)

**Event**: GDG on Campus Build with AI Hackathon, Politechnika Warszawska
**Time**: 10:00 AM - 5:30 PM CET (~7 hours)
**Team**: 2 people
**Prep**: 1-2 hours tonight (March 27)

---

## What We're Building

**DeepInspect** — Upload a photo of ANY infrastructure (bridges, orbital hardware, undersea cables, wind turbines) + optional context -> multi-agent AI system validates the input, analyzes structural integrity with bounding box annotations, classifies damage with confidence scores, runs parallel environment and failure analysis, cross-validates consistency, and produces an annotated image + risk report.

Built on **Google ADK + Gemini Vision**.

### Why This Wins
- Gemini multimodal vision is Google's flagship capability
- Multi-agent ADK architecture with parallel execution is the 2026 GDG theme
- Infrastructure safety is a universal, high-stakes problem
- Multi-environment framing (terrestrial + space + underwater) is original
- Annotated image output with bounding boxes shows production-grade AI
- Three demo scenarios in 3 minutes = maximum judge impact

---

## Architecture

```
User uploads infrastructure photo + optional context (age, location, last inspection)
                    |
                    v
    +-------------------------------+
    |      Orchestrator Agent       |  Google ADK
    |  +-------------------------+  |
    |  | INPUT VALIDATION GATE   |  |  <- Rejects non-infrastructure, blurry photos
    |  | - Is this infrastructure?|  |
    |  | - Is image quality OK?  |  |
    |  | - Extract structure type |  |
    |  +------------+------------+  |
    +---------------|--------------+
                    | (passes validation)
                    v
    +-------------------------------+
    |        Vision Agent           |  Gemini 3 Flash (multimodal)
    |  - Damage detection           |
    |  - BOUNDING BOXES per damage  |  <- [y_min, x_min, y_max, x_max] coords (0-1000)
    |  - CONFIDENCE SCORE per find  |  <- 0.0-1.0 per damage item
    |  - Pattern classification     |
    +---------------+---------------+
                    |
          +---------+---------+
          v                   v
+------------------+ +------------------+
| Environment Agent| | Failure Mode     |  <- PARALLEL via ADK ParallelAgent
| (Search grounding| | Agent            |     (saves ~15 sec per analysis)
|  for real-time   | | (Search grounding|
|  conditions)     | |  for precedents) |
+--------+---------+ +--------+---------+
         +----------+---------+
                    v
    +-------------------------------+
    |       Priority Agent          |
    |  - Risk matrix scoring        |
    |  - CONSISTENCY VALIDATION     |  <- Cross-checks upstream findings
    |  - Recommended actions        |
    |  - Worst-case scenario        |
    +---------------+---------------+
                    v
    +-------------------------------+
    |         OUTPUT                |
    |  - Annotated Image            |  <- Original photo with bounding box overlays
    |    (color-coded damage zones) |
    |  - Structured Risk Report     |
    |  - Confidence indicators      |
    |  - Recommended Actions        |
    +-------------------------------+
```

### Agent Definitions

| Agent | Model | Role | Tools | Enhancements |
|-------|-------|------|-------|-------------|
| **Orchestrator** | Gemini 3 Flash | Validates input quality, routes to pipeline | ADK routing | Input quality gate, structure type detection |
| **Vision Agent** | Gemini 3 Flash (multimodal) | Damage detection with bounding boxes + confidence | Gemini Vision, Structured Output | Spatial coordinates, per-finding confidence |
| **Environment Agent** | Gemini 3 Flash | Environmental stressors via real-time data | Google Search grounding | Runs in parallel with Failure Mode |
| **Failure Mode Agent** | Gemini 3 Flash | Failure classification + historical precedents | Google Search grounding | Runs in parallel with Environment |
| **Priority Agent** | Gemini 3 Flash | Risk matrix + consistency validation | Structured Output | Cross-validates upstream coherence |

### Tech Stack

| Layer | Technology |
|-------|-----------|
| **Agent Framework** | Google ADK (Python) - `pip install google-adk` |
| **Parallel Execution** | ADK `ParallelAgent` for Environment + Failure Mode agents |
| **AI Model** | Gemini 3 Flash (multimodal) via `google-genai` |
| **Backend API** | FastAPI with SSE (Server-Sent Events) for real-time agent streaming |
| **Frontend** | React + TypeScript (Vite) |
| **Image Annotation** | HTML Canvas overlay rendering bounding boxes on original photo |
| **Styling** | Tailwind CSS + glassmorphism |
| **Deployment** | Local for demo |

### Google Tools Used (for judging)
1. **Google ADK** - Multi-agent orchestration with ParallelAgent
2. **Gemini 3 Flash Multimodal** - Image analysis with spatial bounding boxes
3. **Google Search Grounding** - Real-time environmental data + historical failure precedents
4. **Structured Output** - JSON risk reports with coordinates
5. **Function Calling** - Agent tool definitions
6. **Confidence Scoring** - Production-grade AI reliability pattern

---

## Agent Prompts (Copy-Paste Ready)

### Orchestrator Agent - Input Validation Gate
```
You are the orchestrator of a structural inspection AI system. Your first job is to VALIDATE the input before routing to specialized agents.

STEP 1 - INPUT VALIDATION:
Analyze the uploaded image and determine:
1. Is this a photo of physical infrastructure? (bridge, building, satellite, cable, turbine, pipeline, rail, dam, tower, etc.)
   - If NO (e.g., it's a person, animal, text document, meme, food): REJECT with message "Please upload a photo of physical infrastructure."
2. Is the image quality sufficient for analysis?
   - If severely blurred, too dark (<10% visible detail), or too small: REJECT with message "Image quality insufficient. Please provide a clearer photo."
3. What type of structure is this? Classify into: terrestrial_civil | terrestrial_industrial | orbital | subsea | arctic | other

STEP 2 - CONTEXT ENRICHMENT:
If the user provided optional context (age, location, last inspection, known issues), parse and structure it for downstream agents.

Output as JSON:
{
  "valid": true|false,
  "rejection_reason": null|"...",
  "structure_type": "...",
  "structure_subtype": "...",
  "environment_category": "terrestrial_civil|terrestrial_industrial|orbital|subsea|arctic",
  "user_context": {
    "age": null|"...",
    "location": null|"...",
    "last_inspection": null|"...",
    "known_issues": null|"..."
  }
}
```

### Vision Agent - With Bounding Boxes + Confidence
```
You are a structural engineering vision specialist with 20 years of infrastructure inspection experience.

Analyze the uploaded infrastructure photo and produce a detailed damage assessment.

For EACH damage or anomaly you detect:
1. Identify the damage type (crack, corrosion, deformation, spalling, impact, erosion, discoloration, delamination, etc.)
2. Describe it precisely (orientation, estimated dimensions, pattern)
3. Provide a BOUNDING BOX in [y_min, x_min, y_max, x_max] format where coordinates are normalized to a 0-1000 scale. The box should tightly enclose ONLY the damaged area.
4. Provide a short LABEL (max 5 words) for display on the image
5. Rate CONFIDENCE (0.0-1.0) for this specific finding. Use:
   - 0.9-1.0: Clearly visible, unambiguous damage
   - 0.7-0.89: Likely damage, but lighting/angle makes it uncertain
   - 0.5-0.69: Possible damage, could be shadow/dirt/normal wear - FLAG AS UNCERTAIN
   - Below 0.5: Do not include - too speculative
6. Classify the overall damage PATTERN (fatigue cracking, reinforcement corrosion, freeze-thaw, thermal cycling, UV degradation, mechanical impact, chemical attack, etc.)

Output as JSON:
{
  "structure_type": "...",
  "environment": "terrestrial|orbital|subsea|arctic",
  "damages": [
    {
      "id": 1,
      "type": "...",
      "description": "...",
      "bounding_box": [y_min, x_min, y_max, x_max],
      "label": "...",
      "severity": "MINOR|MODERATE|SEVERE|CRITICAL",
      "confidence": 0.0-1.0,
      "uncertain": false
    }
  ],
  "overall_pattern": "...",
  "overall_severity": "MINOR|MODERATE|SEVERE|CRITICAL",
  "overall_confidence": 0.0-1.0,
  "healthy_areas_noted": "Brief description of areas that appear structurally sound"
}

IMPORTANT: If confidence is below 0.7, set "uncertain": true and note this in the description. Honest uncertainty is better than false confidence.
```

### Environment Agent - With Search Grounding
```
You are an environmental engineering specialist. Given the structure type, environment category, and any user-provided location context, determine the environmental stressors acting on this infrastructure.

Use Google Search to find REAL, CURRENT environmental data relevant to this type of structure and location:
- Temperature ranges and thermal cycling frequency
- Moisture/humidity/precipitation patterns
- Chemical exposure (de-icing salts, acid rain, salt spray, industrial chemicals)
- UV radiation intensity
- Vibration and dynamic loading sources (traffic, wind, seismic)
- For ORBITAL: radiation dose rates, atomic oxygen flux, micrometeorite environment, thermal cycling extremes
- For SUBSEA: hydrostatic pressure, current velocity, biofouling rates, cathodic protection status
- For ARCTIC: permafrost thaw rates, ice loading, extreme thermal gradients

Output as JSON:
{
  "environment_type": "...",
  "location_context": "...",
  "stressors": [
    {
      "name": "...",
      "severity": "LOW|MEDIUM|HIGH",
      "measured_value": "...",
      "description": "...",
      "source": "..."
    }
  ],
  "accelerating_factors": ["List factors that would speed up deterioration"],
  "mitigating_factors": ["List factors that would slow deterioration"],
  "data_sources": ["URLs or references used"]
}
```

### Failure Mode Agent - With Search Grounding
```
You are a failure analysis engineer specializing in structural forensics. Given the damage assessment from the Vision Agent and the environmental context, classify the failure mode and predict progression.

Use Google Search to find HISTORICAL PRECEDENTS - real cases of similar failures in similar structures. Cite specific events with dates and outcomes.

Analysis steps:
1. Match the damage pattern to known failure mechanisms
2. Determine the root cause chain (initiating cause -> propagation mechanism -> potential failure mode)
3. Estimate progression rate based on damage type + environmental stressors
4. Find at least 2 historical precedents from real incidents

Output as JSON:
{
  "failure_mode": "...",
  "mechanism": "...",
  "root_cause_chain": ["initiating cause", "propagation mechanism", "eventual failure mode"],
  "progression_rate": "SLOW|MODERATE|RAPID",
  "time_to_critical": "...",
  "time_to_failure": "...",
  "historical_precedents": [
    {
      "event": "...",
      "location": "...",
      "year": "...",
      "outcome": "...",
      "relevance": "...",
      "source": "..."
    }
  ]
}
```

### Priority Agent - With Consistency Validation
```
You are a risk assessment engineer. Synthesize ALL findings from the Vision Agent, Environment Agent, and Failure Mode Agent into a final risk report.

STEP 1 - CONSISTENCY VALIDATION (CRITICAL):
Before producing your assessment, cross-check the upstream findings for internal consistency:
- If Vision Agent rated overall severity as MINOR but Failure Mode predicts RAPID progression -> FLAG as anomaly
- If Environment Agent found LOW stressors but Failure Mode estimates short time-to-failure -> FLAG as anomaly
- If Vision Agent confidence is below 0.7 on key findings -> note this reduces certainty of the entire assessment
- If Failure Mode's historical precedents don't match the damage pattern -> FLAG as weak analogy
Report any consistency issues in the output.

STEP 2 - RISK MATRIX:
Score each dimension 1-5:
- Severity: How bad is the current damage? (1=cosmetic, 5=structural failure imminent)
- Probability: How likely is progression to critical? (1=unlikely, 5=near-certain)
- Consequence: What happens if it fails? (1=minor inconvenience, 5=loss of life/catastrophic)
- Composite: Severity x Probability x Consequence (max 125)

STEP 3 - RISK TIER:
Map composite score:
- 1-15: LOW (monitor)
- 16-35: MEDIUM (schedule inspection)
- 36-60: MEDIUM-HIGH (inspect within 90 days)
- 61-90: HIGH (urgent intervention required)
- 91-125: CRITICAL (immediate action)

Output as JSON:
{
  "consistency_check": {
    "passed": true|false,
    "anomalies": ["List any inconsistencies found between agent outputs"],
    "confidence_adjustment": "Description of how low-confidence findings affect the assessment"
  },
  "risk_matrix": {
    "severity": {"score": 1-5, "reasoning": "..."},
    "probability": {"score": 1-5, "reasoning": "..."},
    "consequence": {"score": 1-5, "reasoning": "..."},
    "composite": 1-125
  },
  "risk_tier": "LOW|MEDIUM|MEDIUM-HIGH|HIGH|CRITICAL",
  "recommended_actions": [
    {"action": "...", "timeline": "...", "priority": "IMMEDIATE|URGENT|SCHEDULED|MONITOR"}
  ],
  "worst_case_scenario": "...",
  "summary": "2-3 sentence executive summary"
}
```

---

## Demo Script (3 Minutes)

### Scenario 1: Bridge Crack Analysis (60 sec)
- Upload a photo of a cracked concrete bridge pillar
- **Orchestrator**: "Infrastructure confirmed: concrete bridge pillar. Quality: sufficient."
- **Vision Agent**: Highlights 2-3 damage zones with RED/ORANGE bounding boxes on original image. "Longitudinal crack (confidence: 0.92), corrosion staining (confidence: 0.85), minor spalling (confidence: 0.71)"
- **Environment + Failure Mode** run in parallel (show both activating simultaneously)
- **Priority Agent**: "MEDIUM-HIGH risk. Score: 48/125. Consistency check: PASSED. Recommend inspection within 90 days."
- **Show annotated image**: Original bridge photo with color-coded damage boxes

### Scenario 2: Satellite Solar Panel (60 sec)
- Upload a photo of a damaged satellite solar panel
- **Vision Agent**: Highlights micrometeorite craters with bounding boxes. "3 impact craters detected (confidence: 0.88), cell discoloration (confidence: 0.65 -- UNCERTAIN)"
- **Environment Agent**: "LEO: thermal cycling +/-150C, atomic oxygen flux, radiation"
- **Failure Mode Agent**: "Precedent: Hubble Solar Array degradation (1990-2009)"
- **Priority Agent**: "MEDIUM risk. Note: 1 finding marked uncertain -- recommend higher-resolution imaging"

### Scenario 3: Undersea Cable or Wind Turbine (60 sec)
- Show versatility with a completely different environment
- Annotated image with damage zones highlighted

### Pitch Flow
1. **Hook** (15 sec): "The Morandi Bridge collapsed in 2018, killing 43 people. A crack was visible for years. What if AI could have flagged it -- with confidence scores and a countdown to failure?"
2. **Problem** (20 sec): "Infrastructure inspection is manual, expensive, and subjective. In extreme environments -- orbit, underwater, Arctic -- it's nearly impossible."
3. **Live Demo** (2 min): Run all 3 scenarios, emphasize annotated images and agent transparency
4. **Architecture** (15 sec): "Google ADK orchestrates 5 specialized Gemini agents -- including input validation, parallel analysis, and consistency cross-checks. This isn't a prototype; it's production-grade AI architecture."
5. **Close** (10 sec): "From bridges to satellites -- DeepInspect makes structural intelligence accessible everywhere."

---

## Tonight's Prep (1-2 Hours)

### Hour 1: Critical Path Setup

#### Step 1: API Access (10 min)
- [ ] Go to https://aistudio.google.com -> Get API key
- [ ] Set env var: `export GOOGLE_API_KEY=your_key_here`
- [ ] Test Gemini Vision with a simple image analysis call

#### Step 2: Project Scaffold (15 min)
```bash
mkdir -p backend frontend

# Backend
cd backend
python -m venv venv && source venv/bin/activate
pip install google-genai google-adk fastapi uvicorn python-multipart sse-starlette

# Frontend
cd ../frontend
npm create vite@latest . -- --template react-ts
npm install
npm install -D tailwindcss @tailwindcss/vite
```

#### Step 3: Gemini Vision + Bounding Box Smoke Test (15 min)
```python
# test_vision_bbox.py
from google import genai
import json

client = genai.Client(api_key="YOUR_KEY")

with open("test_bridge.jpg", "rb") as f:
    image_bytes = f.read()

response = client.models.generate_content(
    model="gemini-2.0-flash",
    contents=[
        {
            "parts": [
                {"text": """Analyze this infrastructure photo. For each damage found, provide:
                1. Type and description
                2. Bounding box as [y_min, x_min, y_max, x_max] normalized 0-1000
                3. Confidence score 0.0-1.0
                4. Short label (max 5 words)
                Output as JSON array."""},
                {"inline_data": {"mime_type": "image/jpeg", "data": image_bytes}}
            ]
        }
    ],
    config={"response_mime_type": "application/json"}
)
print(json.dumps(json.loads(response.text), indent=2))
```
- [ ] Verify bounding box coordinates are returned
- [ ] Verify coordinates make sense relative to the image
- [ ] Test with 2-3 different infrastructure photos

#### Step 4: ADK Agent + ParallelAgent Test (10 min)
```python
# test_agents.py
from google.adk.agents import Agent, SequentialAgent, ParallelAgent

vision_agent = Agent(
    name="vision_agent",
    model="gemini-2.0-flash",
    instruction="Analyze infrastructure photos for structural damage. Output JSON.",
)

env_agent = Agent(
    name="environment_agent",
    model="gemini-2.0-flash",
    instruction="Determine environmental stressors for the given structure type.",
)

failure_agent = Agent(
    name="failure_mode_agent",
    model="gemini-2.0-flash",
    instruction="Classify failure mode and find historical precedents.",
)

# Test parallel execution
parallel_analysis = ParallelAgent(
    name="parallel_analysis",
    sub_agents=[env_agent, failure_agent]
)
```
- [ ] Confirm ADK imports work
- [ ] Confirm ParallelAgent pattern works
- [ ] If ParallelAgent fails, prepare fallback with sequential calls

#### Step 5: Collect Demo Assets (10 min)
- [ ] Download 3-5 infrastructure photos:
  - Cracked bridge/concrete (search: "bridge crack inspection photo")
  - Satellite solar panel damage (search: "satellite solar panel damage")
  - Undersea cable / wind turbine blade (search: "subsea cable damage" or "turbine blade erosion")
- [ ] Save in `backend/demo_images/`

### If You Have More Time: Frontend Shell

#### Step 6: Frontend Scaffold + Image Annotation Component
- [ ] Dark theme with glassmorphism
- [ ] Canvas/SVG overlay component for bounding box rendering
- [ ] Layout: Upload zone | Annotated Image + Agent Feed | Report Panel
- [ ] Push to GitHub, share with teammate

---

## Game Day Schedule

### Person A (Backend + AI)
| Time | Task | Deliverable |
|------|------|-------------|
| 10:00-10:30 | Opening + adapt to challenge theme | Adjusted pitch framing |
| 10:30-11:00 | Orchestrator Agent with input validation gate | Rejects bad input |
| 11:00-12:00 | Vision Agent with bounding boxes + confidence | Damage detection with coords |
| 12:00-12:30 | Environment + Failure Mode agents with Search grounding | Grounded analysis |
| 12:30-13:00 | Wire up ParallelAgent + FastAPI SSE endpoint | Parallel execution + streaming |
| 13:00-13:30 | **Lunch + sync** | |
| 13:30-14:00 | Priority Agent with consistency validation | Cross-validated risk report |
| 14:00-14:30 | End-to-end integration | All 3 scenarios working |
| 14:30-15:00 | Prompt tuning + reliability hardening | Consistent results |
| 15:00-15:30 | Bug fixes + edge cases | No crashes during demo |

### Person B (Frontend + Pitch)
| Time | Task | Deliverable |
|------|------|-------------|
| 10:00-10:30 | Opening + adapt to challenge theme | |
| 10:30-11:30 | React UI: upload zone, agent activity feed, report panel | 3-panel layout |
| 11:30-12:30 | Annotated Image component: Canvas overlay with bounding boxes | Clickable damage zones |
| 12:30-13:00 | Connect frontend to backend SSE stream | Real-time agent display |
| 13:00-13:30 | **Lunch + sync** | |
| 13:30-14:30 | Polish: animations, loading states, confidence badges | Beautiful UI |
| 14:30-15:00 | Risk matrix visualization + context input field | Visual risk report |
| 15:00-15:30 | Prepare pitch deck (3-4 slides max) | Pitch ready |

### Shared Tasks
| Time | Task |
|------|------|
| 15:30-16:00 | Integration testing: all 3 demo scenarios end-to-end |
| 16:00-16:15 | Record backup demo video |
| 16:15-16:30 | Practice pitch (2 full rehearsals) |
| 16:30-17:00 | Final rehearsal + Q&A prep |
| 17:00-17:30 | Present! |

### Checkpoints & Fallbacks

| Time | Checkpoint | If FAILING |
|------|-----------|------------|
| 11:30 | Vision Agent returns bounding boxes | Drop bbox, use text-only damage descriptions |
| 12:30 | 2+ agents working end-to-end | Drop to Vision + Priority only |
| 13:30 | ParallelAgent works | Fall back to sequential calls |
| 14:30 | Frontend annotated image overlay works | Show raw JSON + original image side-by-side |
| 15:30 | All 3 scenarios produce good results | Focus on best 2 scenarios |
| 16:00 | Full demo working | Use backup video |

### Fallback Strategy
If ADK is too complex or buggy:
- Use raw Gemini API with `response_mime_type: "application/json"` to simulate agents
- Each "agent" is a Gemini call with a specialized system prompt
- Chain manually: Orchestrator -> Vision -> [Environment, Failure Mode] -> Priority
- Use `asyncio.gather()` for the parallel step

---

## UI Design

### Layout
```
+-------------------------------------------------------------------+
|  DeepInspect -- Infrastructure Intelligence    [Analyze]           |
+---------------+---------------------------+-----------------------+
|               |                           |                       |
|  UPLOAD +     |  ANNOTATED IMAGE          |  RISK REPORT          |
|  CONTEXT      |                           |                       |
|               |  +--------------------+   |  +------------------+ |
|  [drag &      |  | Original photo     |   |  | RISK: MED-HIGH  | |
|   drop]       |  | with colored       |   |  | Score: 48/125   | |
|               |  | bounding boxes     |   |  | Confidence: 87% | |
|  Context:     |  |                    |   |  +------------------+ |
|  +--------+   |  |  +RED-----+       |   |                       |
|  |Age: 45y|   |  |  |Crack   |       |   |  Consistency: PASSED  |
|  |Loc: War|   |  |  |conf:92%|       |   |                       |
|  |Last: 2y|   |  |  +--------+       |   |  Actions:             |
|  +--------+   |  |       +ORANGE--+  |   |  1. Inspect (90d)     |
|               |  |       |Spall   |  |   |  2. Core sample       |
|  ----------   |  |       |conf:71%|  |   |  3. Monitor (1yr)     |
|  Quick demo:  |  |       +--------+  |   |                       |
|  - Bridge     |  +--------------------+   |  Worst case:          |
|  - Satellite  |                           |  "Structural failure  |
|  - Cable      |  AGENT ACTIVITY FEED      |   within 3-7 years"  |
|               |  -----------------------  |                       |
|               |  Orchestrator: Valid      |  Precedents:          |
|               |  Vision: 3 findings       |  - Morandi Bridge '18 |
|               |  Environment: Done  +     |  - I-35W Bridge '07   |
|               |  Failure: Done      +-P   |                       |
|               |  Priority: MED-HIGH       |                       |
+---------------+---------------------------+-----------------------+
|  Built with Google ADK + Gemini 3 | 5 Agents | ParallelAgent      |
+-------------------------------------------------------------------+
```

### Image Annotation Rendering
- Canvas/SVG overlay positioned absolutely over original image
- Color mapping: CRITICAL = red (#ef4444), SEVERE = orange-red (#f97316), MODERATE = amber (#f59e0b), MINOR = yellow (#eab308)
- Box style: 2px solid border + semi-transparent fill (10% opacity) + label tag above
- Confidence badge: small pill showing "92%" next to each label
- Uncertain findings: dashed border + warning prefix
- Hover: expand to show full damage description
- Toggle button: show/hide annotations
- Coordinate conversion: `actual_x = (gemini_x / 1000) * img.naturalWidth`

### Styling
- Dark background (#0a0a0f)
- Glassmorphism panels
- Agent colors: Orchestrator=white, Vision=blue, Environment=green, Failure=orange, Priority=red
- Risk tier: large color-coded badge
- Confidence: pill badges (green >0.9, yellow 0.7-0.9, red <0.7)
- Parallel indicator in activity feed
- Animated thinking pulse when agents active

---

## Q&A Preparation

| Question | Answer |
|----------|--------|
| "How accurate is the damage detection?" | "Gemini Vision identifies damage with confidence scores -- we show uncertainty honestly. In production, we'd validate against labeled inspection datasets." |
| "Why multiple agents instead of one prompt?" | "Each agent specializes -- Vision looks at pixels, Environment knows physics, Failure Mode knows history. A single prompt can't ground-search AND analyze images simultaneously." |
| "Why parallel agents?" | "Environment and Failure Mode are independent analyses. ADK's ParallelAgent cuts analysis time by ~40%." |
| "How would this work in production?" | "Add a Validator Agent for false-positive checking, integrate with inspection databases, deploy via Cloud Run for field use on mobile." |
| "What about orbital use cases?" | "Starcloud deployed the first orbital data center nodes in January 2026. In-orbit structural monitoring is an active market." |

---

## Verification Checklist

- [ ] **Tonight**: API key works, Gemini Vision returns bounding boxes, ADK + ParallelAgent work, 3 demo photos ready
- [ ] **11:30**: Vision Agent returns valid bounding box coordinates
- [ ] **13:00**: Full pipeline end-to-end, frontend shows annotated image
- [ ] **14:30**: All 3 scenarios produce reliable, impressive results
- [ ] **15:30**: Parallel agents working, consistency validation active
- [ ] **16:00**: Backup demo video recorded
- [ ] **16:30**: Pitch rehearsed 2+ times, Q&A answers practiced
- [ ] **Pre-demo**: Photos load, API quota OK, laptop charged, backup video ready
- [ ] **Test**
