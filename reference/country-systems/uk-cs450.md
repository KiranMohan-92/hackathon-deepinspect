# United Kingdom — CS 450 Bridge Inspection Standard

**Standard:** CS 450 (formerly BD 63, formerly part of the Design Manual for Roads and Bridges — DMRB)  
**Full title:** CS 450: Inspection of Highway Structures  
**Authority:** National Highways (formerly Highways England) for the Strategic Road Network (SRN)  
**Local Authority bridges:** Managed by individual councils; CS 450 is recommended but not mandatory  
**Database:** National Highways Bridge Asset Management System; open data portal  
**Total bridges (England):** ~78,000 on the Strategic Road Network + ~300,000 local authority bridges  
**Open data:** https://www.data.gov.uk/dataset/national-highways-structures-asset-data  

---

## Regulatory Framework

CS 450 is part of the **Design Manual for Roads and Bridges (DMRB)**, the technical
standards suite for English trunk roads and motorways. It replaced the previous standard
BD 63/07 in 2020 with significant updates to the Bridge Condition Index calculation
methodology and the classification of inspection types.

**Devolved administrations:** Scotland uses the same technical basis (via Transport
Scotland); Wales and Northern Ireland have their own standards but use compatible BCI-style
metrics. This profile focuses on the England/National Highways version.

---

## BCI — Bridge Condition Index

The UK uses a **Bridge Condition Index (BCI)** on a scale of **0 to 100** where
**100 represents a new, perfect bridge** (descending risk — opposite of DeepInspect).

CS 450 defines two BCI values for every bridge:

### BCI Average (BCI Ave)
- Computed as a weighted average of all element condition scores across the entire bridge
- Reflects the overall condition of the asset
- Used for network-level reporting and asset management planning
- Formula: Σ(element_score × element_weight) / Σ(element_weight)
  where element weights are proportional to replacement cost

### BCI Critical (BCI Crit)
- Reflects the worst single critical element on the bridge
- Based on the Severity × Extent score of the most defective primary structural element
- Used for safety prioritization and inspection trigger decisions
- A bridge can have a high BCI Ave (generally good) but low BCI Crit (one bad element)

**The lower of BCI Ave and BCI Crit drives inspection decisions in practice.**

---

## Element Condition Scoring

Each bridge element is rated on two dimensions:

### Severity (1–5 scale)
| Score | Description |
|-------|-------------|
| 1 | No defect or negligible |
| 2 | Slight |
| 3 | Moderate |
| 4 | Severe |
| 5 | Very severe / dangerous |

### Extent (A–E scale)
| Grade | Description | % of Element Affected |
|-------|-------------|----------------------|
| A | None or negligible | < 1% |
| B | Minor | 1–10% |
| C | Moderate | 10–30% |
| D | Major | 30–75% |
| E | Extensive | > 75% |

**Element BCI contribution:**
```
Element Score = 100 - (Severity × Extent_factor × element_risk_weight)
```

The combined Severity × Extent rating produces a defect score that is subtracted from 100.
This means higher severity AND wider extent both reduce BCI.

---

## Inspection Types Under CS 450

| Type | Name | Frequency | Access Required | Purpose |
|------|------|-----------|-----------------|---------|
| General Inspection | GI | Every 2 years | Ground level + binoculars | Visual overview, identify changed conditions |
| Principal Inspection | PI | Every 6 years | Arm's length of all elements | Full element-level BCI assessment |
| Special Inspection | SI | As required | Specialist access | Specific defect investigation |
| Underwater Inspection | UI | As required | Diver + sonar | Submerged elements, scour |
| High Friction Surface Inspection | — | As required | Skid resistance testing | Road safety |

The 2-year General Inspection frequency is the most frequent of any European system's
primary inspection type, reflecting the UK's emphasis on continuous monitoring and
rapid response to deterioration.

---

## BCI Condition Bands and Actions

| BCI Range | Condition | Action Required |
|-----------|-----------|----------------|
| 85–100 | Very good | Routine maintenance |
| 70–84 | Good | Monitor; plan preventive maintenance |
| 60–69 | Fair | Maintenance within 3 years |
| 40–59 | Poor | Priority maintenance within 1–2 years |
| 20–39 | Very poor | Urgent intervention; load restriction review |
| 0–19 | Serious | Immediate action; possible closure |

**Network statistics (National Highways 2023):**
- BCI Ave > 70: ~68% of SRN bridges
- BCI Ave 60–70: ~18%
- BCI Ave < 60: ~14%
- BCI Crit < 40 (worst element very poor): ~8%

---

## Open Data Portal

National Highways publishes bridge condition data publicly. The dataset includes:
- Structure reference number (SRN)
- Structure type and material
- BCI Ave and BCI Crit values
- Year of last principal inspection
- Approximate location (county, road number)

This open data makes the UK one of the best systems for DeepInspect benchmarking —
actual BCI values can be compared against DeepInspect scores for the same bridges.

Access: https://www.data.gov.uk/dataset/national-highways-structures-asset-data

**Note:** Local Authority bridges are NOT included in this open dataset. The ~300,000
local authority bridges have variable inspection quality and data accessibility.

---

## Scour Assessment Under CS 450

CS 450 includes a specific scour assessment module: **Scour Assessment of Highway
Structures (CS 466)**. This is a companion standard that requires:

1. **Scour susceptibility screening:** All watercourse crossings rated for scour risk
2. **Bathymetric surveys:** For high-risk crossings, regular underwater surveys
3. **Scour action levels:** Triggered responses when scour depth exceeds thresholds

This makes the UK one of the few European systems with formalized scour monitoring —
though even here, implementation is inconsistent for local authority bridges.

---

## Mapping to DeepInspect

BCI is inverted relative to DeepInspect (100=best vs 1=best):

```
BCI_Ave ≈ 100 - (DeepInspect_score - 1.0) × (100 / 4.0)
         = 100 - (DeepInspect_score - 1.0) × 25
```

| DeepInspect Score | Approx BCI Ave | Condition Band |
|-------------------|----------------|---------------|
| 1.0 | 100 | Very good |
| 1.9 | 77.5 | Good |
| 2.0 | 75 | Good |
| 2.9 | 52.5 | Poor |
| 3.0 | 50 | Poor |
| 3.9 | 27.5 | Very poor |
| 4.0 | 25 | Very poor |
| 5.0 | 0 | Serious |

**BCI Critical** is mapped using the maximum (worst) criterion score from DeepInspect
rather than the overall weighted score.

See `../mappings/score_mappings.json` under `uk_bci` for the full piecewise mapping.
