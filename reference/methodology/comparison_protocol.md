# Comparison Protocol

## Purpose

This document defines the exact step-by-step procedure for comparing DeepInspect V2 output against official bridge condition ratings. Following this protocol precisely ensures results are reproducible and comparable across validation runs.

---

## Step 1 — Prepare the Reference Dataset

Create or update `pilot_bridges.csv` (located in this directory) with the selected reference bridges. Each row represents one bridge.

**Required columns for comparison input:**

| Column | Type | Example | Description |
|--------|------|---------|-------------|
| `bridge_id` | str | `NO-001` | DeepInspect internal ID |
| `country` | str | `Norway` | Country of bridge |
| `official_rating` | float | `2.0` | Raw rating from national system |
| `rating_system` | str | `NVDB_tilstandsgrad` | Which system provided the rating |
| `inspection_date` | date | `2023-06-15` | Date of official inspection |
| `structure_type` | str | `concrete_beam` | Structure classification |
| `lat` | float | `59.8901` | Latitude (WGS84) |
| `lon` | float | `10.7523` | Longitude (WGS84) |

Rating system values:
- `NVDB_tilstandsgrad` — Norway, scale 0–3
- `uk_national_highways_bci` — UK, scale 0–100
- `trafikverket_tillstandsklass` — Sweden, scale 0–4

---

## Step 2 — Run DeepInspect Analysis

For each bridge in the reference dataset, run the DeepInspect V2 pipeline using the bridge's coordinates.

```bash
# Example CLI invocation (adjust to actual DeepInspect CLI)
deepinspect analyse \
    --lat 59.8901 \
    --lon 10.7523 \
    --bridge-id NO-001 \
    --output-dir ./results/NO-001/
```

The pipeline fetches Street View imagery at the coordinates, runs the multi-model analysis stack, and writes output files.

**Required output per bridge:**
- `PhysicsHealthCertificate.json` — the primary structured output
- `analysis_metadata.json` — model versions, image count, timestamp

Record the run timestamp. All bridges in a single validation batch should be run within 30 days to avoid seasonal imagery variation.

---

## Step 3 — Save PhysicsHealthCertificate JSON

Each bridge's certificate must be saved to a consistent path:

```
results/
├── NO-001/
│   ├── PhysicsHealthCertificate.json
│   └── analysis_metadata.json
├── NO-002/
│   ├── PhysicsHealthCertificate.json
│   └── analysis_metadata.json
...
```

The `PhysicsHealthCertificate.json` structure (minimum required fields):

```json
{
  "bridge_id": "NO-001",
  "analysis_timestamp": "2025-04-02T10:30:00Z",
  "deepinspect_score": 6.4,
  "deepinspect_tier": "FAIR",
  "confidence": 0.82,
  "damage_detections": [
    {
      "category": "structural_crack",
      "severity": 0.45,
      "confidence": 0.91
    }
  ],
  "model_versions": {
    "visual_classifier": "v2.3.1",
    "physics_engine": "v1.8.0"
  }
}
```

---

## Step 4 — Convert Official Scores Using score_mappings.json

Load the score conversion mappings from `../mappings/score_mappings.json` and convert each bridge's official rating to the DeepInspect 0–10 scale.

```python
import json

with open("../mappings/score_mappings.json") as f:
    mappings = json.load(f)

def convert_score(official_rating: float, rating_system: str) -> float:
    """
    Convert an official rating to the DeepInspect 0–10 scale.
    Uses linear interpolation between breakpoints defined in score_mappings.json.
    """
    system_map = mappings[rating_system]
    breakpoints = system_map["breakpoints"]  # list of [official, deepinspect] pairs
    breakpoints.sort(key=lambda x: x[0])

    # Clamp to range
    if official_rating <= breakpoints[0][0]:
        return breakpoints[0][1]
    if official_rating >= breakpoints[-1][0]:
        return breakpoints[-1][1]

    # Linear interpolation
    for i in range(len(breakpoints) - 1):
        x0, y0 = breakpoints[i]
        x1, y1 = breakpoints[i + 1]
        if x0 <= official_rating <= x1:
            t = (official_rating - x0) / (x1 - x0)
            return round(y0 + t * (y1 - y0), 2)

    return official_rating  # fallback
```

Record the `converted_score` in `pilot_bridges.csv` alongside `official_rating`.

---

## Step 5 — Compute Agreement Metrics

With DeepInspect scores and converted reference scores available for all bridges, compute the full set of agreement metrics defined in [agreement_metrics.md](agreement_metrics.md).

```python
import pandas as pd

df = pd.read_csv("pilot_bridges.csv")

# Filter to rows with both scores
df = df.dropna(subset=["deepinspect_score", "converted_score"])

from agreement_metrics import compute_all_metrics
metrics = compute_all_metrics(
    predicted=df["deepinspect_score"].values,
    reference=df["converted_score"].values,
    tiers_pred=df["deepinspect_tier"].values,
    tiers_ref=df["reference_tier"].values,
)
print(metrics)
```

Save results to `results/agreement_metrics.json`.

---

## Step 6 — Bias Analysis

After computing overall metrics, stratify results to identify systematic patterns:

### By Country
```python
for country in df["country"].unique():
    subset = df[df["country"] == country]
    print(f"\n{country} (n={len(subset)}):")
    print(compute_all_metrics(subset["deepinspect_score"], subset["converted_score"]))
```

### By Structure Type
```python
for stype in df["structure_type"].unique():
    subset = df[df["structure_type"] == stype]
    if len(subset) >= 5:  # minimum sample size
        print(f"\n{stype} (n={len(subset)}):")
        print(compute_all_metrics(subset["deepinspect_score"], subset["converted_score"]))
```

### By Age Group
```python
df["age_group"] = pd.cut(
    df["construction_year"],
    bins=[0, 1950, 1970, 1990, 2010, 2100],
    labels=["Pre-1950", "1950-1970", "1970-1990", "1990-2010", "Post-2010"],
)
```

### By Severity Tier
Pay particular attention to False-Negative Rate for CRITICAL bridges — DeepInspect must not consistently underestimate the worst bridges.

### Documenting Findings

Record bias analysis findings in `results/bias_analysis.md`:
- Which countries/types show largest delta?
- Is there a systematic direction (over- or under-estimating)?
- Are the patterns consistent across metrics?

---

## Step 7 — Document Findings

After all bridges are processed and metrics computed, write a validation report:

```
results/
├── agreement_metrics.json        # Full metric outputs
├── bias_analysis.md              # Written bias analysis
├── validation_report.md          # Executive summary
└── per_bridge_results.csv        # Bridge-level score table
```

`per_bridge_results.csv` should contain all columns from `pilot_bridges.csv` plus:
- `deepinspect_score` — raw DeepInspect output
- `deepinspect_tier` — categorical tier
- `converted_score` — official score on 0–10 scale
- `reference_tier` — official tier (OK/FAIR/POOR/CRITICAL)
- `delta` — `deepinspect_score - converted_score`
- `tier_match` — boolean
- `within_one` — boolean (|delta| ≤ 1.0)

---

## Versioning

Each validation run must record:
- DeepInspect version (from `analysis_metadata.json`)
- `score_mappings.json` version/hash
- Date range of analysis
- Python environment (`pip freeze > requirements_validation.txt`)

Store all results under `results/validation_YYYY-MM-DD/` to preserve history across calibration iterations.
