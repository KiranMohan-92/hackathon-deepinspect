# Italy — Linee Guida 2020 Bridge Risk Classification System

**System name:** Linee Guida per la Classificazione e Gestione del Rischio dei Ponti Esistenti  
**Issuing body:** Consiglio Superiore dei Lavori Pubblici (CSLP) / MIT  
**Year:** 2020  
**Trigger:** Genoa Morandi Bridge collapse (14 August 2018, 43 fatalities)  
**National bridge inventory:** AINOP (Archivio Informatico Nazionale delle Opere Pubbliche)  
**Total major bridges and viaducts:** ~60,000  
**Road authority (national):** ANAS SpA  
**Motorway network:** Private concessionaires (Autostrade per l'Italia, AISCAT members)  
**Technical reference:** https://doi.org/10.3390/infrastructures6040059  

---

## Why Italy Needed a New Framework

Prior to 2020, Italy had no unified national bridge inspection standard. Different road
managers (ANAS, regional authorities, provinces, municipalities, motorway concessionaires)
used different assessment methods with no common condition scale or database.

The Morandi Bridge collapse exposed the systemic failure:
- Documented deterioration had not triggered adequate maintenance
- No mandatory multi-hazard assessment existed
- No national database tracked inspection results consistently
- Prestressed concrete bridge stock from the 1960s-1970s "economic miracle" era was aging
  with unknown tendon condition
- Ownership fragmentation meant no single authority had oversight of the full national stock

---

## The Multi-Hazard Framework: H × V × E

The Italian guidelines' defining innovation is explicit multi-hazard risk assessment.
Every bridge is evaluated for four independent risk types:

### Risk Type 1: Structural and Foundational Risk (Rischio strutturale e fondazionale)

**Hazard (H):** Traffic loading intensity, overloading frequency, flood return period
  at the crossing, evidence of collision history  
**Vulnerability (V):** Structural condition of deck, piers, abutments, foundations;
  material deterioration; design standard vs. current NTC 2018 requirements  
**Exposure (E):** Bridge strategic importance; traffic volume (AADT); alternative route
  availability if bridge is closed; communities that depend on the crossing  

### Risk Type 2: Seismic Risk (Rischio sismico)

**Hazard (H):** PGA (peak ground acceleration) for the site from the Italian seismic
  hazard map (MPS04, INGV) for a 475-year return period  
**Vulnerability (V):** Seismic design category of the original construction (pre-1981
  bridges were designed to no or minimal seismic standards); bearing type (fixed vs.
  elastomeric vs. none); pier slenderness; connection details  
**Exposure (E):** Same as structural risk (traffic, strategic importance, alternatives)

Italy's seismic hazard is highly variable — northern Po Valley bridges face PGA ~0.05g,
while Calabria and Sicily bridges face PGA up to 0.35g+. This makes seismic risk the
dominant factor in many southern Italian bridge assessments.

### Risk Type 3: Landslide Risk (Rischio frana)

**Hazard (H):** ISPRA PAI (Piano di Assetto Idrogeologico) landslide hazard classification
  at the bridge site; hillslope gradient; geological formation  
**Vulnerability (V):** Abutment and approach embankment condition; drainage adequacy;
  historical evidence of slope movement at the site  
**Exposure (E):** As above

Landslide risk is relevant for approximately 30% of Italy's bridge stock, particularly
in the Apennine mountain range and the Pre-Alps.

### Risk Type 4: Hydraulic Risk (Rischio idraulico)

**Hazard (H):** Flood hazard class from PAI maps; river channel dynamics (lateral migration,
  aggradation/degradation trend); flood return period at site  
**Vulnerability (V):** Scour protection adequacy; pier geometry (streamlined vs. blunt);
  freeboard; age of bridge vs. current hydraulic standards  
**Exposure (E):** As above

---

## Class of Attention (CoA) Derivation

### Step 1: Score each risk type
Each of the four risk types is scored on a categorical scale: LOW, MEDIUM-LOW, MEDIUM,
MEDIUM-HIGH, HIGH.

The scoring uses lookup tables in the guidelines that translate H×V×E values into
categorical risk levels.

### Step 2: Combine across risk types
The final CoA is the **worst** (highest) risk class across the four types, with a
possible upward adjustment if two or more types reach MEDIUM or higher.

```python
CoA_components = [structural_risk, seismic_risk, landslide_risk, hydraulic_risk]
CoA_base = max(CoA_components)
# If 2+ components >= MEDIUM, CoA may be raised by one level
if sum(1 for r in CoA_components if r >= MEDIUM) >= 2:
    CoA_final = min(CoA_base + 1_level, HIGH)
else:
    CoA_final = CoA_base
```

### CoA Classes and Required Actions

| CoA | Meaning | Level 2 Inspection | Level 3/4 Required | Timeline |
|-----|---------|-------------------|-------------------|---------|
| LOW | No significant risk | Normal cycle | No | 5-year cycle |
| MEDIUM-LOW | Minor concerns | Accelerated cycle | No | 3-year cycle |
| MEDIUM | Moderate risk | Priority | Consider | 2-year cycle |
| MEDIUM-HIGH | Significant risk | Mandatory | Yes — Level 3 within 6 months | Immediate |
| HIGH | Serious risk | Mandatory | Yes — Level 3/4 within 90 days | Immediate |

---

## 5-Level Assessment Hierarchy

(See also `../standards/italian-guidelines-2020.md` for full detail)

| Level | Name | Who | Output |
|-------|------|-----|--------|
| 0 | Census | Owner | AINOP record exists |
| 1 | Simplified inspection | Technician | Preliminary CoA |
| 2 | Detailed visual inspection | Engineer | Confirmed CoA; defect list |
| 3 | In-depth investigation | Specialist engineer + NDT | Quantified defects |
| 4 | Structural analysis | Structural engineer (PE) | Load capacity verification |

---

## AINOP — National Bridge Database

The Linee Guida mandated creation of AINOP, a national public works inventory:
- Unique national ID for every bridge and viaduct
- Ownership and management responsibility
- Construction year, type, material
- Latest inspection date and CoA classification
- Link to inspection reports

AINOP is managed by MIT (Ministero delle Infrastrutture e dei Trasporti).
Population is ongoing; as of 2025, coverage of major structures (>10m span) is
estimated at ~85%. Small structures remain a significant gap.

---

## The Prestressed Concrete Challenge

A specific concern driving the Italian guidelines is the large stock of prestressed
concrete bridges built 1955-1985:
- Designed to standards now superseded by NTC 2018
- Post-tensioning tendons may be ungrouted or poorly grouted in some cases
- Tendon condition cannot be assessed visually — requires special NDT (MFL, GPR, radiography)
- The Fado highway bridge (Portugal, 2001) and several Italian collapses involved
  undetected tendon corrosion

The guidelines require all prestressed concrete bridges to receive a specific tendon
condition assessment as part of Level 3 investigation. This cannot be replicated remotely.

---

## Mapping to DeepInspect

**Score mapping (CoA classes):**

| DeepInspect Score | Italian CoA Class |
|-------------------|------------------|
| 1.0–1.9 | LOW |
| 2.0–2.4 | MEDIUM-LOW |
| 2.5–2.9 | MEDIUM |
| 3.0–3.9 | MEDIUM-HIGH |
| 4.0–5.0 | HIGH |

**DeepInspect gaps for full Italian CoA:**
- Seismic risk: Not currently assessed. Can be added with INGV API integration.
- Landslide risk: Not currently assessed. Can be added with ISPRA PAI maps.
- Hydraulic risk: Partially covered (Criterion 1: Scour). Flood hazard from OSM + flood maps.
- Full CoA requires all 4 components; DeepInspect currently covers structural + partial hydraulic.

See `../mappings/italian_coa_mapping.json` for criterion-to-risk-type mapping.
