# COST Action TU1406 — Quality Specifications for Roadway Bridges (BridgeSpec)

**Type:** EU COST (Cooperation in Science and Technology) Research Action  
**Duration:** 2015–2019  
**Full Title:** Quality Specifications for Roadway Bridges, Standardization at a European Level  
**Acronym:** BridgeSpec  
**Official site:** https://www.tu1406.eu/  
**Chair:** Prof. João Rodrigues Correia (IST, Lisbon, Portugal)  
**Participating countries:** 28 (all EU member states + associated)

---

## Purpose and Scope

COST TU1406 was launched to address the absence of a harmonized European framework for
bridge performance indicators. Prior to this action, each EU member state operated its own
national system with different scales, different condition categories, and incompatible
rating philosophies — making cross-border comparisons, EU-level funding prioritization, and
shared technology deployment impossible.

The action produced:
1. A catalogue of performance indicators (PIs) used across Europe
2. A proposed set of **Key Performance Indicators (KPIs)** for harmonized reporting
3. Working Group reports on structural safety, serviceability, durability, and economy
4. Case studies from 8 countries applying the KPI framework

---

## Working Group Structure

| WG | Focus | Key Output |
|----|-------|-----------|
| WG1 | Performance Goals and Target Values | Definition of structural, serviceability, durability KPIs |
| WG2 | Measurement and Assessment Methods | Data collection protocols, inspection harmonization |
| WG3 | Performance-Based Maintenance | Link from KPI values to maintenance decisions |
| WG4 | Standardization and Dissemination | Draft framework for EU-level adoption |

---

## Key Performance Indicators (KPIs) Proposed

The action proposed a two-tier PI hierarchy:

### Tier 1 — Mandatory KPIs (applicable across all systems)

| KPI ID | Name | Category | Unit |
|--------|------|----------|------|
| KPI-S1 | Load-carrying capacity ratio | Structural safety | Ratio (≥1.0) |
| KPI-S2 | Scour depth vs. design depth | Structural safety (hydraulic) | m / m |
| KPI-D1 | Carbonation depth ratio | Durability | mm / mm cover |
| KPI-D2 | Chloride content at rebar depth | Durability | kg/m³ |
| KPI-V1 | Maximum deflection / span | Serviceability (vertical) | L/x |
| KPI-V2 | Riding quality (IRI) | Serviceability (riding) | m/km |
| KPI-E1 | Remaining service life estimate | Economic | Years |

### Tier 2 — Country-optional indicators
Crack width ratios, fatigue life fractions, bearing functionality scores,
expansion joint opening measurements, drainage blockage indices.

---

## Relevance to DeepInspect

| TU1406 KPI | DeepInspect Criterion | Coverage Assessment |
|------------|----------------------|---------------------|
| KPI-S1 (load capacity) | Criterion 3: Capacity vs. Demand | Partial — heuristic only, no drawings |
| KPI-S2 (scour) | Criterion 1: Scour / Foundations | Covered — OSM waterway + flood zone |
| KPI-D1 (carbonation) | Criterion 7: Degradation | Covered — Fick's law estimate from age/environment |
| KPI-D2 (chloride) | Criterion 7: Degradation | Covered — marine/road-salt environment estimation |
| KPI-V1 (deflection) | Criterion 10: Serviceability | Gap — no remote deflection measurement |
| KPI-V2 (riding quality) | Criterion 9: Deck / Slab | Partial — visual deck condition proxy |
| KPI-E1 (service life) | Output field | Covered — degradation model output |

**Positioning note:** DeepInspect can produce Tier 1 KPI estimates for KPI-S2, KPI-D1,
KPI-D2, and KPI-E1 from first principles. KPI-S1, KPI-V1, and KPI-V2 require physical
access and cannot be remotely assessed with the required precision.

---

## Data Availability

The TU1406 consortium published country-level data on which PIs are currently collected
in national systems. Key finding: **scour (KPI-S2) is the most commonly neglected PI**
across European national systems, despite being the leading cause of bridge collapse.
This is a direct validation of DeepInspect's weighting of Criterion 1 at 0.25 (highest
of all 11 criteria).

---

## Publications

- Final Action Report: https://www.tu1406.eu/wp-content/uploads/2018/07/COST_TU1406_WG4_booklet.pdf
- Deliverable D1.1: Catalogue of performance indicators across European systems
- Deliverable D3.1: Performance-based maintenance decision framework
- Edited volume: "Quality Specifications for Roadway Bridges" (CRC Press, 2019)

---

## Standards Status

TU1406 produced a **research framework**, not a binding standard. Adoption is voluntary.
As of 2026, no EU member state has formally adopted the TU1406 KPI framework as a
mandatory reporting requirement, though several national road agencies reference it in
their bridge management system documentation.

The European Committee for Standardization (CEN) TC 250 / SC 4 (Eurocode 1) and TC 350
are monitoring TU1406 outputs for potential integration into future Eurocode annexes.
