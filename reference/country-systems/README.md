# European Bridge Inspection Systems — Comparative Overview

This directory contains detailed profiles of 8 national bridge inspection systems.
Each file covers: the regulatory framework, condition rating scale, inspection cycle,
authority responsible, and mapping to DeepInspect scores.

---

## Comparative Table

| Country | System Name | Database | Scale | Direction | Worst or Avg | Cycle | Authority |
|---------|------------|----------|-------|-----------|-------------|-------|-----------|
| Germany | DIN 1076 / RI-EBW-PRÜF | SIB-Bauwerke | 1.0–4.0 (Zustandsnote) | Ascending risk | Formula (max/avg blend) | 6yr principal, 3yr interim | BASt / Länder |
| France | IQOA | Cerema DB | 1, 2, 2E, 3, 3U | Ascending risk | Worst component | 3yr | Cerema / DREAL |
| United Kingdom | CS 450 | National Highways portal | 0–100 (BCI) | Descending risk (100=best) | BCI Avg + BCI Critical | 2yr | National Highways / LA |
| Netherlands | NEN 2767 | NARIS / DISK | 1–6 | Ascending deterioration | Worst element (weighted) | 6yr | Rijkswaterstaat |
| Italy | Linee Guida 2020 | AINOP | LOW–MEDIUM–HIGH (CoA) | Ascending risk | H×V×E per hazard type | Risk-based | MIT / ANAS / concessionaires |
| Poland | GDDKiA | GDDKiA BMS | 0–5 | Ascending risk | Overall bridge state | 5yr | GDDKiA |
| Norway | Brutus / NVDB | NVDB REST API | 0–4 per element | Ascending deterioration | Worst element | 5yr | Statens vegvesen |
| Sweden | BaTMan | batman.trafikverket.se | Condition classes 0–4 | Ascending deterioration | Element aggregation | 6yr | Trafikverket |

---

## Scale Direction Notes

**Ascending risk** means higher number = worse condition (same direction as DeepInspect 1-5).  
**Descending risk** means higher number = better condition (UK BCI: 100 = new bridge).  
**Ascending deterioration** means higher number = more deteriorated (NEN 2767: 1=as-built, 6=needs replacement).

For the DeepInspect score-to-national-scale mappings, see `../mappings/score_mappings.json`.

---

## Key Differentiators

### Most Mature System: Germany (DIN 1076)
Oldest continuously operated national system (since 1985). Best structured damage
documentation via the OSA code system. Highest inspector qualification requirements.
The three-axis S/V/D framework is more analytically rigorous than single-score approaches.

### Most Data-Rich System (Public): Norway (Brutus/NVDB)
NVDB is publicly accessible via REST API with condition data for all 16,971+ bridges.
The VG investigative journalism project published full condition data, creating public
accountability. Best for DeepInspect API integration.

### Largest Bridge Stock with Public Portal: Sweden (BaTMan)
~30,000 bridges, publicly queryable at batman.trafikverket.se. Read-only API accounts
available on request. Good for benchmarking DeepInspect against a large dataset.

### Most Risk-Theoretically Sophisticated: Italy (Linee Guida 2020)
The H×V×E multi-hazard framework is conceptually the most advanced, explicitly
combining structural, seismic, landslide, and hydraulic risks. Post-Morandi urgency
has driven rapid implementation despite the complexity.

### Highest Inspection Frequency: UK (CS 450)
2-year cycle is the most frequent among major European systems, resulting in the most
up-to-date condition data but also the highest inspection cost burden.

### Most Critical Infrastructure Problem: Poland (GDDKiA)
25% of national road bridges rated unsatisfactory or worse — the highest proportion
among the systems profiled here. Significant EU structural fund investment in bridge
rehabilitation ongoing.

---

## DeepInspect Market Opportunity by Country

| Country | Key Gap DeepInspect Fills | Priority |
|---------|--------------------------|----------|
| France | Uninspected communal/municipal bridges; 3yr cycle leaves large gaps | HIGH |
| Italy | Level 1 screening backlog; multi-hazard integration | HIGH |
| Poland | Budget-constrained inspection for deteriorating stock | HIGH |
| Germany | Between-cycle monitoring (6yr gaps); OSA-compatible defect output | MEDIUM |
| Norway | Validation against NVDB data; scour specialist screening | MEDIUM |
| Sweden | BaTMan gap-filling; small bridge coverage | MEDIUM |
| UK | Between-cycle monitoring; Local Authority bridges (less funded than NH) | MEDIUM |
| Netherlands | NEN 2767 compatible scoring for asset managers | LOW-MEDIUM |
