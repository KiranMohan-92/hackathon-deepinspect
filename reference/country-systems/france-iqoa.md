# France — IQOA Bridge Condition Classification System

**System name:** IQOA (Image Qualité des Ouvrages d'Art — Quality Image of Engineering Structures)  
**Standard authority:** Cerema (Centre d'études et d'expertise sur les risques, l'environnement, la mobilité et l'aménagement)  
**Predecessor:** Sétra (merged into Cerema 2014)  
**Introduced:** 1979 (first classification); current version 1996  
**Applicable structures:** Road bridges, viaducts, retaining walls, tunnels on national and departmental roads  
**Total managed bridges:** ~240,000 (including national, departmental, and municipal)  
**National and departmental roads:** ~70,000 — these have the most systematic IQOA coverage  
**Reference:** https://www.cerema.fr/fr/activites/infrastructures-transports-mobilites/ouvrages-art  

---

## Administrative Structure

France's bridge inspection responsibility is divided:

| Network Level | Manager | IQOA Coverage |
|--------------|---------|--------------|
| National roads (routes nationales) | DREAL / DIRA (State services) | Systematic, 3-yr cycle |
| Departmental roads (routes départementales) | Département councils | Variable; most adopt IQOA but enforcement varies |
| Communal roads (voies communales) | Municipalities | Often no systematic inspection; huge gap |
| Motorways (autoroutes) | Private concessionaires (APRR, Vinci, etc.) | Own systems, often more thorough |

The communal bridge gap is a key DeepInspect market opportunity: France has an estimated
100,000+ communal bridges, many of which have never received an IQOA classification.

---

## IQOA Classification System

### Core Classes (5 categories)

| Class | Name | Description | Recommended Action |
|-------|------|-------------|-------------------|
| **1** | Bon état | Good condition. No significant defects. Structure functions as designed. | Routine maintenance only |
| **2** | Défauts mineurs | Minor defects. Deterioration is superficial or localized. No immediate risk. | Standard maintenance; observe |
| **2E** | Défauts importants | Significant defects affecting durability. Structural performance not currently impaired but trajectory is negative. "E" = entretien spécialisé (specialized maintenance needed). | Specialized maintenance within next cycle |
| **3** | Défauts graves | Serious defects. Structural behavior is impaired. Load-carrying capacity reduced. | Priority investigation and repair; consider load restriction |
| **3U** | Défauts très graves | Very serious defects. Urgent risk to structural integrity or user safety. "U" = urgent. | Immediate intervention; possible closure |

### The "S" Safety Suffix — Critical Feature

The "S" suffix (for **Sécurité** — Safety) can be appended to **any** IQOA class to indicate
an **immediate risk to user safety**, independent of the structural condition rating.

This is the most important and most misunderstood feature of the IQOA system:

| Class + S | Meaning |
|-----------|---------|
| **1S** | Bridge is in good structural condition BUT has an immediate user safety hazard (e.g., railing just damaged by a vehicle, slippery surface created by recent event) |
| **2S** | Minor structural defects + active user safety risk |
| **2ES** | Significant structural defects + active user safety risk |
| **3S** | Serious structural defects + active user safety risk |
| **3US** | Very serious defects + active user safety risk — worst possible classification |

The "S" suffix triggers an **immediate response** regardless of base class. A 1S bridge
must be addressed for the safety issue right away even though its structure is sound.

This mechanism is conceptually analogous to DeepInspect's field inspection flag system:
a bridge can have a moderate overall score but still require immediate field action if a
specific criterion (e.g., railing condition) indicates user safety risk.

---

## Inspection Methodology

### Inspection Cycle
- **Principal inspection (visite détaillée):** Every 3 years — the most frequent cycle
  among major European systems
- **Annual visit (visite annuelle):** Every year — rapid visual check for obvious changes
- **Special inspection (inspection spéciale):** Triggered by events (flood, collision,
  significant loading event, new damage report)

### Inspection Scope (Visite Détaillée)
The inspector must examine all structural components from sufficient proximity to assess
condition. For large viaducts, this requires access platforms (nacelles élévatrices),
under-bridge inspection vehicles, or boat access for waterway crossings.

### Worst-Component Approach
IQOA uses a **worst-component logic**: the overall bridge class is determined by the
worst-rated individual component. A bridge with ten components in class 1 and one
component in class 3 receives an overall rating of class 3.

This is more conservative than averaging approaches (Germany, Norway) and means that
a single failing element can classify an otherwise sound bridge as requiring priority
intervention.

**Implication for DeepInspect:** When computing the French IQOA equivalent, use the
maximum per-criterion score (worst component) rather than the weighted average.

---

## Component Classification Structure

IQOA divides a bridge into standardized component groups:

| Group | French Name | Elements |
|-------|------------|---------|
| Fondations | Foundations | Piles, pile caps, spread footings, scour protection |
| Appuis | Supports | Piers, abutments, wing walls |
| Tablier | Deck structure | Main girders, cross-beams, deck slab |
| Chaussée | Roadway | Wearing surface, waterproofing, drainage |
| Equipements | Equipment | Expansion joints, bearings, railings, lighting |
| Appareils d'appui | Bearings | Elastomeric or pot bearings, rocker bearings |
| Joints de chaussée | Expansion joints | Compression seals, finger joints, buried joints |

Each component group receives an IQOA class. The overall bridge class is the worst of these.

---

## Data Infrastructure

**Cerema IQOA database** contains inspection records for national and departmental road
bridges. As of 2023, the national road network (DIRA) has near-100% coverage.

**Data access:** Cerema publishes aggregate statistics. Individual bridge records are not
publicly accessible (unlike Norway/Sweden). Access requires formal agreement with the
relevant DREAL or Cerema regional office.

**Key statistic (2022 Cerema report):**
- Class 1: ~25% of inspected national road bridges
- Class 2: ~40%
- Class 2E: ~20%
- Class 3: ~12%
- Class 3U: ~3%
- Classes with S suffix (any): ~5%

Approximately **35% of national road bridges** (Class 2E + 3 + 3U) require maintenance
attention beyond routine upkeep.

---

## Convoy Load Rating

IQOA classification is a condition rating, not a load rating. France separately uses
a convoy classification system for weight restrictions:

| Class | Description | Equivalent |
|-------|-------------|-----------|
| Bc | Normal heavy vehicle convoy | ~40 tonne trucks |
| Bt | Abnormal transport | 48-tonne loads |
| Br | Military | Wheeled military convoys |
| D | Exceptional | Heavy industrial transport |

Bridges with IQOA class 3 or 3U often trigger a separate load rating review (inspection
technique approfondie) to determine whether convoy weight restrictions are warranted.

---

## Mapping to DeepInspect

**Score mapping (threshold-based):**

| DeepInspect Score | IQOA Class |
|-------------------|-----------|
| 1.0–1.9 | 1 |
| 2.0–2.4 | 2 |
| 2.5–2.9 | 2E |
| 3.0–3.9 | 3 |
| 4.0–5.0 | 3U |

**S-suffix trigger rule:** If any DeepInspect criterion with a safety-relevant tag
(Criterion 10: Serviceability, Criterion 11: Ancillary/Railings) scores >= 4.0,
append "S" to the IQOA class.

**Worst-component rule:** For IQOA output, use `max(criterion_scores)` mapped through
the threshold table above, rather than the confidence-weighted overall score.

See `../mappings/score_mappings.json` under `france_iqoa` for the machine-readable version.
