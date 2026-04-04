# DeepInspect Score Mappings — Human-Readable Reference

This document explains the rationale for each national scale mapping defined in
`score_mappings.json`. For machine consumption, use the JSON directly. This file
is for engineers, reviewers, and product stakeholders who need to understand *why*
the breakpoints are placed where they are.

---

## Guiding Principles

### 1. DeepInspect is a screening tool, not a certified inspection
All mappings are approximations. A DeepInspect score of 3.2 does not certify that a
bridge is "IQOA Class 3" — it indicates that a bridge with this remote-assessment
score would typically receive a Class 3 designation upon physical inspection.
Every national-scale output in a DeepInspect report should include a disclaimer.

### 2. Direction matters
DeepInspect uses **ascending risk** (1=good, 5=critical). Some European systems
are inverted (UK BCI: 100=good, 0=critical; US NBI: 9=good, 0=failed). The JSON
`direction` field documents this explicitly to prevent implementation errors.

### 3. Input score selection: weighted average vs. worst-component
- **Germany, Poland, Norway, UK (BCI Ave), Italy (CoA):** Use the confidence-weighted
  overall score from `compute_weighted_risk_score()`.
- **France (IQOA), Netherlands (NEN 2767), UK (BCI Crit), Sweden, Norway (element-level):**
  Use `max(criterion_scores)` — these systems use worst-component logic.

### 4. Tier alignment as anchor points
The four DeepInspect tiers (OK/MEDIUM/HIGH/CRITICAL) are the primary structural anchors.
Tier boundaries (2.0, 3.0, 4.0) align with major transitions in every national scale.
Breakpoints within tiers provide finer granularity.

---

## Germany — Zustandsnote (DIN 1076)

### Scale: 1.0–4.0 ascending risk

The Zustandsnote (ZN) is the most directly analogous to DeepInspect's overall score:
both are continuous numerical scales with ascending risk, covering roughly the same
range of bridge conditions (DIN 1076 has a compressed range: 4.0 is the maximum,
equivalent to DeepInspect 5.0).

### Rationale for breakpoints

| DeepInspect | ZN | Rationale |
|-------------|-----|-----------|
| 1.0 → 1.4 | 1.0 | Both represent new/excellent condition. Direct correspondence. |
| 1.9 → 1.4 | 1.4 | DeepInspect OK tier ceiling maps to ZN "gut" boundary. |
| 2.0 → 1.5 | 1.5 | MEDIUM tier entry maps to ZN "befriedigend" entry. |
| 2.9 → 2.4 | 2.4 | MEDIUM ceiling maps to ZN "ausreichend" entry boundary. |
| 3.0 → 2.5 | 2.5 | HIGH tier entry maps to ZN "nicht ausreichend" entry. |
| 3.9 → 3.4 | 3.4 | HIGH ceiling maps to ZN "ungenügend" entry boundary. |
| 4.0 → 3.5 | 3.5 | CRITICAL entry maps to ZN "ungenügend" — urgent maintenance. |
| 5.0 → 4.0 | 4.0 | Both represent maximum risk / imminent failure. |

The mapping is piecewise linear within each tier, providing smooth interpolation
rather than hard steps.

### S/V/D axis decomposition
For generating a full German-format report, the 11 criteria must be decomposed into
S, V, D sub-scores using `criteria_to_din1076_svd.json`. The ZN is then computed
from the S/V/D triplet using the DIN 1076 formula:
`ZN = max(S, V, D) × 0.7 + mean(S, V, D) × 0.3`

---

## France — IQOA (Cerema)

### Scale: categorical (1, 2, 2E, 3, 3U)

IQOA has only 5 discrete classes, making it a threshold mapping rather than linear.
The system uses worst-component logic, so DeepInspect's **maximum criterion score**
(not the weighted average) drives the IQOA output.

### Rationale for thresholds

| Max Criterion Score | IQOA Class | Rationale |
|--------------------|-----------|-----------|
| ≤ 1.99 | 1 | All criteria in OK tier → no significant defects |
| ≤ 2.39 | 2 | Minor defects present but no durability concern |
| ≤ 2.99 | 2E | At least one criterion shows durability concern (2E = specialized maintenance needed) |
| ≤ 3.99 | 3 | At least one criterion shows HIGH-tier score → structural behavior impaired |
| ≤ 5.0 | 3U | At least one criterion in CRITICAL tier → urgent risk |

### S-suffix logic
The "S" (safety) suffix is triggered independently of the structural classification:
```python
safety_criteria = [criterion_10_serviceability, criterion_11_ancillary]
if any(c.score >= 4.0 for c in safety_criteria) and has_user_safety_finding:
    iqoa_class += "S"
```
A bridge rated IQOA "2" with a dangerous railing becomes "2S".

---

## United Kingdom — BCI (CS 450)

### Scale: 0–100 descending risk (100=new)

The BCI inversion is the most counterintuitive of all the European mappings. The
formula `BCI = 100 - (DI - 1.0) × 25` provides a clean linear mapping.

### Two BCI values
- **BCI Average:** From the weighted overall DeepInspect score.
- **BCI Critical:** From the maximum criterion score (worst element).

Both should be reported in UK-format outputs. A bridge with BCI Ave = 65 (Fair)
but BCI Crit = 35 (Very poor) has one critically deteriorated element and must be
treated as Very poor for prioritization purposes.

### Condition band alignment

| DeepInspect Tier | BCI Range | CS 450 Band | Action |
|----------------|-----------|------------|--------|
| OK (1.0–1.99) | 75–100 | Good to Very good | Routine maintenance |
| MEDIUM (2.0–2.99) | 50–75 | Fair to Good | Planned maintenance |
| HIGH (3.0–3.99) | 25–50 | Very poor to Poor | Priority or urgent intervention |
| CRITICAL (4.0–5.0) | 0–25 | Serious to Very poor | Immediate action; closure review |

---

## Netherlands — NEN 2767

### Scale: 1–6 ascending deterioration (1=as-built, 6=replace)

NEN 2767 uses an **absolute** reference (1=as-built condition) not a relative one.
This means a 40-year-old bridge in good condition for its age still scores 2-3 on
NEN 2767, because it is not in as-built condition. This creates a systematic offset
relative to other systems.

The 6-level scale maps onto DeepInspect's 5-level range with slight compression:

| NEN 2767 | DeepInspect Range | Note |
|---------|------------------|------|
| 1 | 1.0–1.4 | As-built — only new or fully renewed elements reach this |
| 2 | 1.5–2.0 | Good — slight aging |
| 3 | 2.1–2.7 | Reasonable — moderate deterioration |
| 4 | 2.8–3.5 | Moderate — function reduced |
| 5 | 3.6–4.3 | Poor — loss of function in progress |
| 6 | 4.4–5.0 | Very poor — replace or emergency repair |

---

## Italy — Class of Attention (Linee Guida 2020)

### Scale: categorical (LOW, MEDIUM-LOW, MEDIUM, MEDIUM-HIGH, HIGH)

The Italian CoA is conceptually similar to DeepInspect tiers but with 5 levels vs. 4.
The mapping introduces a MEDIUM-LOW class that sits between DeepInspect OK and MEDIUM.

**Critical limitation:** DeepInspect currently covers structural + partial hydraulic
risk only. The Italian CoA also requires seismic and landslide risk assessment.
For Italian deployment, the output should be labeled:
`"CoA (structural/hydraulic only) — seismic and landslide assessment required for full CoA"`

See `italian_coa_mapping.json` for the full multi-hazard framework.

---

## Poland — GDDKiA (0–5)

### Scale: 0–5 ascending risk

The GDDKiA scale is the closest in structure to DeepInspect. The mapping is nearly
a direct correspondence with a slight offset (GDDKiA starts at 0, DeepInspect at 1).

This makes Poland the recommended first country for calibration studies — the scale
comparison will be most direct.

---

## Norway — Brutus / NVDB (0–4)

### Scale: 0–4 ascending deterioration

Norway's Brutus uses per-element condition grades. The overall bridge grade is the
worst-element grade. The NVDB REST API provides public access to these grades.

DeepInspect should compare Criterion-level scores (not overall weighted) against
NVDB element condition data for the most meaningful validation.

---

## Sweden — BaTMan (0–4)

### Scale: 0–4 ascending deterioration

Identical scale concept to Norway Brutus. The same thresholds apply. BaTMan's
public portal enables validation at scale.

---

## US NBI — Reference (0–9)

### Scale: 0–9 descending risk (9=new/excellent)

Included as a reference for comparisons with US literature and for deployments
serving US-based investors, development banks, or engineering firms working on
European bridges who use NBI as their mental reference frame.

NBI "Structurally Deficient" (SD) status is triggered by a rating of 4 or below
on deck, superstructure, or substructure items. In DeepInspect terms:
- Criterion 9 (Deck) score ≥ 2.9 → potential SD trigger for deck item
- Criterion 4 (Substructure) score ≥ 2.9 → potential SD trigger for substructure item
- Criterion 5 (Superstructure) score ≥ 2.9 → potential SD trigger for superstructure item

"Scour Critical" (NBI Item 113 = 3) is triggered by Criterion 1 score ≥ 3.5.
