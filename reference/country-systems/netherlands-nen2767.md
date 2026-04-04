# Netherlands — NEN 2767 Condition Assessment Standard

**Standard:** NEN 2767 (Conditiemeting van bouw- en installatietechnische objecten)  
**Full title:** Condition Measurement of Building and Installation Technical Objects  
**Authority:** NEN (Nederlands Normalisatie-instituut) — Dutch Standards Institute  
**Primary user for bridges:** Rijkswaterstaat (national water and road authority)  
**Database:** NARIS (Nationaal Areaal Rijkswaterstaatobjecten Informatie Systeem), also DISK  
**Total bridges (Netherlands):** ~90,000 (including provincial, municipal, and water authority structures)  
**Rijkswaterstaat network:** ~3,600 large structures on national roads and waterways  
**Source:** https://www.nen.nl/nen-2767-1-2019-nl-261519  

---

## Context: Why NEN 2767?

The Netherlands is unusual in using a building-and-infrastructure condition standard
(NEN 2767) for bridge inspection rather than a bridge-specific standard. This reflects
the Netherlands' integrated asset management philosophy: bridges, locks, tunnels, quay
walls, and buildings are all assessed on the same condition scale, enabling consistent
asset prioritization across the entire Rijkswaterstaat portfolio.

NEN 2767 was originally developed for building condition assessment in the 1980s and
adapted for infrastructure in subsequent revisions. The current version (NEN 2767-1:2019)
is the applicable edition for civil infrastructure.

---

## NEN 2767 Condition Scale

**Scale: 1 to 6** (ascending deterioration — higher = more deteriorated)

| Condition | Dutch Name | Description | Maintenance Implication |
|-----------|-----------|-------------|------------------------|
| **1** | Uitstekend (Excellent) | As-built / newly constructed condition. No defects. | None required |
| **2** | Goed (Good) | Slight aging. No functional defects. Cosmetic issues only. | Preventive maintenance |
| **3** | Redelijk (Reasonable) | Moderate deterioration. First signs of functional defects. | Planned maintenance within cycle |
| **4** | Matig (Moderate) | Significant deterioration. Functional capacity reduced. | Maintenance required soon |
| **5** | Slecht (Poor) | Serious deterioration. Loss of function in progress. | Urgent maintenance |
| **6** | Zeer slecht (Very Poor) | Failure of function. Replacement or major intervention required. | Replace or emergency repair |

**Key difference from other systems:** NEN 2767 condition 1 = as-built, not "good for
its age." This means old bridges in good condition for their age might still score 3-4
on NEN 2767, while the same bridge would score 1-2 on IQOA or DIN 1076. The scale is
absolute (against as-new standard), not relative (against expected condition for age).

---

## Three-Dimensional Defect Assessment

NEN 2767 assesses each defect on three dimensions:

### Intensity (Intensiteit) — 1 to 3
How severe is the defect in its affected area?

| Score | Description |
|-------|-------------|
| 1 | Slight (just detectable) |
| 2 | Moderate (clearly present) |
| 3 | Serious (advanced, functional impact) |

### Extent (Omvang) — 1 to 5
What proportion of the element area is affected?

| Score | Range |
|-------|-------|
| 1 | < 2% |
| 2 | 2–10% |
| 3 | 10–30% |
| 4 | 30–70% |
| 5 | > 70% |

### Relevance (Belang) — Weighting factor
Each element type is assigned a relevance weight reflecting its importance to the
overall function of the structure. Primary structural elements have high relevance;
ancillary elements have low relevance.

**Condition score per element:**
```
Element_condition = f(max_intensity, max_extent, relevance)
```

The function is a lookup table in NEN 2767 Annex A. The worst combination of intensity
and extent, weighted by relevance, produces the element condition score (1-6).

The **overall bridge condition** is the worst-element condition score.

---

## Application to Bridges: Standard Element Breakdown

Rijkswaterstaat applies NEN 2767 to bridges using a standardized element hierarchy:

| Level | Example Elements |
|-------|-----------------|
| Structure | Superstructure, substructure, foundation |
| Element group | Main girders, deck slab, piers, abutments |
| Element | Individual girder, individual pier |
| Defect | Crack in element X, corrosion on element Y |

For each defect on each element, the inspector records:
- Defect type (from the NEN 2767 defect catalogue)
- Intensity (1-3)
- Extent (1-5)
- Location description
- Photograph reference

---

## Inspection Cycle

| Inspection Level | Frequency | Access |
|-----------------|-----------|--------|
| Quick Scan (Quickscan) | 1–2 years | Drive-by / visual |
| Main Inspection (Hoofdinspectie) | 6 years | Arm's-length all elements |
| Detailed Investigation (Gedetailleerd onderzoek) | As needed | NDT, sampling, analysis |

The 6-year main inspection cycle aligns with Germany's Hauptprüfung.

---

## TU Delft Machine Learning Study

A notable research application: TU Delft researchers trained convolutional neural
networks to predict NEN 2767 element condition scores from bridge inspection photographs,
achieving accuracy within one condition class in ~85% of cases. This is directly relevant
to DeepInspect's approach.

Reference: Hüthwohl et al. (2019) "Detecting healthy concrete in bridges," Automation in
Construction. Also: Protopapadakis et al. (2019), NEN 2767 ML classification study.

**Implication:** NEN 2767's structured defect taxonomy and photographic databases make
it one of the best-documented European systems for ML training data.

---

## Rijkswaterstaat Data Availability

Rijkswaterstaat publishes aggregate condition statistics in its annual "Staat van de
Infrastructuur" (State of the Infrastructure) report. Individual bridge condition records
are available through formal data-sharing agreements.

**2023 condition statistics (Rijkswaterstaat national road bridges):**
- Condition 1–2: ~45% (good to excellent)
- Condition 3: ~37% (reasonable)
- Condition 4: ~14% (moderate; maintenance needed)
- Condition 5–6: ~4% (poor to very poor; urgent intervention)

---

## Comparison with Other European Scales

NEN 2767's absolute (as-built) reference creates systematic differences when comparing
with age-relative systems:

| Age | NEN 2767 Expected | DIN 1076 Expected | IQOA Expected |
|-----|-------------------|------------------|--------------|
| 0–10 years, good maintenance | 1–2 | 1.0–1.5 | 1 |
| 20–30 years, good maintenance | 2–3 | 1.5–2.0 | 1–2 |
| 40–50 years, good maintenance | 3–4 | 2.0–2.5 | 2 |
| 50+ years, deferred maintenance | 4–5 | 3.0–3.5 | 3 |

---

## Mapping to DeepInspect

NEN 2767 1-6 maps to DeepInspect 1-5 with a scale compression:

| DeepInspect Score | NEN 2767 Condition |
|-------------------|--------------------|
| 1.0–1.4 | 1 |
| 1.5–2.0 | 2 |
| 2.1–2.7 | 3 |
| 2.8–3.5 | 4 |
| 3.6–4.3 | 5 |
| 4.4–5.0 | 6 |

Note: NEN 2767 uses the worst-element result, so for generating a NEN 2767 equivalent
from DeepInspect, use `max(criterion_scores)` rather than the weighted average.

See `../mappings/score_mappings.json` under `netherlands_nen2767` for machine-readable mapping.
