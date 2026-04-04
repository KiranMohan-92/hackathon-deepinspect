# Italian Bridge Inspection Guidelines 2020 — Linee Guida per la Classificazione e Gestione del Rischio

**Type:** National Ministerial Guidelines (not a binding law, but de facto mandatory)  
**Issuing body:** Consiglio Superiore dei Lavori Pubblici (CSLP) — Superior Council of Public Works  
**Year:** 2020 (published August 2020)  
**Trigger event:** Morandi Bridge (Ponte Morandi) collapse, Genoa, 14 August 2018, 43 fatalities  
**Official title (IT):** Linee Guida per la Classificazione e Gestione del Rischio, la Valutazione della Sicurezza ed il Monitoraggio dei Ponti Esistenti  
**MDPI open-access summary:** https://doi.org/10.3390/infrastructures6040059  

---

## Context: The Morandi Bridge Collapse

The Genoa Motorway Bridge (A10) collapsed on 14 August 2018, killing 43 people.
Post-collapse investigation revealed:
- The bridge had a known deterioration history documented in inspection reports
- Maintenance had been deferred despite identified structural concerns
- No systematic, mandatory multi-hazard risk classification existed in Italy
- No national database tracked inspection results consistently across all bridge owners
- Prestressing tendon corrosion — invisible without destructive investigation — was a key factor

The Italian government responded with a comprehensive national framework requiring
systematic multi-hazard risk classification for all ~60,000 major bridges and viaducts.

---

## Framework Architecture: 5-Level Assessment

The Italian guidelines define a hierarchical assessment process:

### Level 0 — Census and Inventory
**Purpose:** Establish that the bridge exists and is recorded in the national database.  
**Output:** Bridge record in AINOP (Archivio Informatico Nazionale delle Opere Pubbliche)  
**Who performs:** Bridge owner / managing authority  
**Minimum data:** Location, type, ownership, year of construction, span length, road class

### Level 1 — Simplified Inspection
**Purpose:** Rapid visual screening of all bridges.  
**Output:** Preliminary Class of Attention (CoA) assignment  
**Who performs:** Trained technician (not necessarily engineer)  
**Method:** Visual inspection, checklist-based, photographs  
**Time per bridge:** 1-4 hours depending on size  
**Equivalent to:** DeepInspect's screening assessment (remote analog)

### Level 2 — Detailed Visual Inspection
**Purpose:** Element-by-element condition rating.  
**Output:** Refined CoA; list of defects with severity and urgency  
**Who performs:** Qualified engineer with bridge inspection experience  
**Method:** Arm's-length visual inspection of all accessible elements  
**Time per bridge:** 1-3 days  
**Triggers Level 3 when:** Any defect with high severity/urgency, or CoA >= MEDIUM-HIGH

### Level 3 — In-depth Investigation
**Purpose:** Quantified assessment of specific defects or structural elements.  
**Output:** Defect quantification (crack widths in mm, corrosion depth, delamination area)  
**Who performs:** Specialist engineers, may require NDT lab  
**Methods:** GPR, half-cell potential, cores, rebound hammer, cover meter  

### Level 4 — Structural Analysis
**Purpose:** Full structural safety verification.  
**Output:** Verification of load-carrying capacity, remaining service life estimate  
**Who performs:** Structural engineering firm with bridge competency  
**Methods:** FEM modelling, load rating calculations, NTC 2018 structural code compliance  

---

## Class of Attention (CoA) System

The CoA is the Italian framework's central output concept. It combines four risk types
into a single categorical classification:

### Four Risk Types

| Risk Type | Italian Name | What it covers |
|-----------|-------------|----------------|
| Structural | Rischio strutturale e fondazionale | Load capacity, material degradation, foundation integrity |
| Seismic | Rischio sismico | Seismic vulnerability assessment |
| Landslide | Rischio frana | Slope instability affecting bridge supports |
| Hydraulic | Rischio idraulico | Flooding, scour, river channel migration |

### CoA Matrix Calculation

For each risk type, three factors are assessed:

```
Risk_type = Hazard × Vulnerability × Exposure

Where:
  Hazard (H):       External threat level (seismic zone, flood return period, landslide map)
  Vulnerability (V): Structural susceptibility to that threat
  Exposure (E):     Consequences if the bridge fails (traffic volume, strategic importance)
```

Each factor is rated on a 0-1 or categorical scale. The product gives a risk score for
that hazard type. The four risk scores are then combined (worst-of or weighted sum,
per the guidelines) to produce the final Class of Attention.

### CoA Classes

| Class | Italian | Meaning | Required Action |
|-------|---------|---------|-----------------|
| LOW | BASSA | No significant concerns | Normal inspection cycle |
| MEDIUM-LOW | MEDIO-BASSA | Minor deficiencies | Monitor; address in next maintenance cycle |
| MEDIUM | MEDIA | Moderate concerns | Inspect within 12 months; plan repairs |
| MEDIUM-HIGH | MEDIO-ALTA | Significant risk | Detailed investigation within 6 months |
| HIGH | ALTA | Serious risk; potential imminent danger | Immediate investigation; load restrictions may apply |

### Escalation Rules
- Any bridge with CoA = HIGH must receive a Level 3 or Level 4 investigation within 90 days
- Any bridge showing active deterioration that could affect safety must be escalated regardless of CoA
- Load restrictions or closure can be imposed at any CoA level by the managing authority

---

## Mapping to DeepInspect

| Italian Framework Element | DeepInspect Equivalent | Gaps |
|--------------------------|----------------------|------|
| Level 0 (Census) | OSM inventory data | Partial — OSM not 100% complete |
| Level 1 (Simplified) | DeepInspect full assessment | DeepInspect is more thorough than Level 1 |
| Structural risk (H×V×E) | Criteria 1-6 weighted | Cannot assess seismic vulnerability remotely |
| Hydraulic risk (H×V×E) | Criterion 1: Scour | Flood hazard from OSM; scour vulnerability estimated |
| Seismic risk | Not covered | Seismic zone maps available (API); vulnerability estimation possible |
| Landslide risk | Not covered | Landslide maps available (ISPRA); slope assessment possible |
| CoA = LOW | Tier OK (1.0-1.9) | Approximate mapping |
| CoA = MEDIUM-LOW | Tier MEDIUM lower range (2.0-2.4) | Approximate |
| CoA = MEDIUM | Tier MEDIUM upper range (2.5-2.9) | Approximate |
| CoA = MEDIUM-HIGH | Tier HIGH (3.0-3.9) | Approximate |
| CoA = HIGH | Tier CRITICAL (4.0-5.0) | Approximate |

**Key gap:** The Italian framework's seismic and landslide risk components have no
equivalent in the current DeepInspect assessment. For Italian deployment, DeepInspect
should integrate INGV seismic zone classification and ISPRA landslide hazard maps to
complete the four-component CoA calculation.

---

## Implementation Status (as of 2026)

The 2020 guidelines set aggressive timelines:
- All bridges to receive Level 1 assessment: by end of 2021 (partially met)
- AINOP database population: ongoing (significant backlog)
- Level 2 assessments: risk-prioritized, ongoing through 2026+

Italy's bridge stock presents a structural challenge: many bridges were built during
the 1960s-1970s economic boom under now-superseded design standards, and ownership is
fragmented across ANAS (national), regional authorities, provincial authorities,
municipal authorities, and private concessionaires (Autostrade per l'Italia for motorways).

---

## Key References

- CSLP Guidelines (2020): Official Italian text from Ministero delle Infrastrutture e dei Trasporti
- Pellegrino et al. (2021): "Italian Guidelines for Classification and Risk Management of Existing Bridges" — MDPI Infrastructures, https://doi.org/10.3390/infrastructures6040059
- Morandi Bridge collapse investigation: Commissione Ispettiva MIT, final report 2020
