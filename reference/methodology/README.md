# DeepInspect V2 — Cross-Reference Validation Methodology

## Purpose

This directory documents the complete methodology for validating DeepInspect V2 against official bridge inspection records from Norway, the UK, and Sweden. The goal is to produce a rigorous, reproducible comparison between AI-generated PhysicsHealthCertificate scores and ground-truth condition ratings from national bridge registries.

---

## Methodology Overview

The validation pipeline has six phases:

```
1. Bridge Selection    →  Select 100 bridges with known ratings and imagery
2. DeepInspect Run     →  Analyse each bridge, save PhysicsHealthCertificate JSON
3. Score Conversion    →  Map national rating scales to DeepInspect 0–10 scale
4. Agreement Metrics   →  Compute statistical agreement (Pearson, Spearman, RMSE, etc.)
5. Bias Analysis       →  Stratify by country, structure type, age, severity
6. Calibration         →  Adjust weights and mappings based on findings
```

---

## Document Index

| Document | Purpose |
|----------|---------|
| [bridge_selection_criteria.md](bridge_selection_criteria.md) | How to identify and select the 100 reference bridges |
| [comparison_protocol.md](comparison_protocol.md) | Step-by-step procedure for running and recording comparisons |
| [agreement_metrics.md](agreement_metrics.md) | Statistical metrics, formulas, and Python code for measuring agreement |
| [calibration_procedure.md](calibration_procedure.md) | How to adjust DeepInspect weights and mappings from validation findings |
| [pilot_bridges.csv](pilot_bridges.csv) | Template CSV with example rows for tracking pilot bridge results |

---

## Target Validation Set

| Country | Count | Rating System | Scale |
|---------|-------|--------------|-------|
| Norway | 50 | NVDB Tilstandsgrad | 0–3 |
| UK | 30 | BCI (Bridge Condition Index) | 0–100 |
| Sweden | 20 | Trafikverket Tillståndsklass | 0–4 |
| **Total** | **100** | — | — |

---

## Score Mapping

All national scales are converted to the DeepInspect 0–10 scale using the mappings defined in `../mappings/score_mappings.json`. See [comparison_protocol.md](comparison_protocol.md) for the conversion procedure.

---

## Validation Targets

### Pilot Phase (first 30 bridges)
The pilot uses a small sample to detect gross miscalibration before committing to the full 100-bridge run.

| Metric | Pilot Target |
|--------|-------------|
| Spearman rho | > 0.50 |
| RMSE | < 1.0 |
| Cohen's Kappa | > 0.30 |
| Tier-match rate | > 50% |

### Calibrated Phase (all 100 bridges, after calibration)

| Metric | Calibrated Target |
|--------|------------------|
| Pearson r | > 0.70 |
| Spearman rho | > 0.65 |
| RMSE | < 0.8 |
| MAE | < 0.6 |
| Cohen's Kappa | > 0.40 |
| False-negative rate | < 10% |
| Tier-match rate | > 60% |
| Within-one rate | > 85% |

Full metric definitions and Python implementations are in [agreement_metrics.md](agreement_metrics.md).

---

## File Structure

```
methodology/
├── README.md                       # This file
├── bridge_selection_criteria.md    # Selection rules and verification steps
├── comparison_protocol.md          # Step-by-step comparison procedure
├── agreement_metrics.md            # Statistical metrics with code
├── calibration_procedure.md        # Post-validation calibration guide
└── pilot_bridges.csv               # Bridge tracking template
```

---

## Related Resources

- Score mappings: `../mappings/score_mappings.json`
- DeepInspect scoring engine: `backend/utils/scoring.py`
- Dataset fetchers: `../datasets/`
- Country rating systems: `../country-systems/`
