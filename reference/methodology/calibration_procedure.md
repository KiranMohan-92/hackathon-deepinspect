# Calibration Procedure

## Purpose

This document describes how to adjust DeepInspect V2 scoring parameters based on validation findings. Calibration is performed after the pilot phase (30 bridges) and refined after the full validation run (100 bridges).

The goal is not to overfit to the validation set — it is to correct systematic biases identified in the bias analysis while preserving generalisability.

---

## When to Calibrate

Calibrate if any of the following conditions are met after running `compute_all_metrics`:

| Trigger | Action |
|---------|--------|
| RMSE > 1.0 (pilot) or > 0.8 (calibrated) | Weight adjustment required |
| Spearman rho < 0.50 (pilot) | Fundamental mapping review |
| False-negative rate > 15% | Pessimism weight must increase |
| Systematic country bias (mean delta differs by > 1.0 between countries) | Per-country offset calibration |
| Kappa < 0.20 | Mapping breakpoint review |

---

## Files to Modify

All calibration changes are made in the backend codebase. Do not modify validation data files.

| File | Purpose | Calibration Parameters |
|------|---------|----------------------|
| `backend/utils/scoring.py` | Core scoring engine | `CRITERION_WEIGHTS`, `pessimism_weight` |
| `reference/mappings/score_mappings.json` | Scale conversion breakpoints | Breakpoint coordinates per country |

---

## Step 1 — Weight Adjustment in CRITERION_WEIGHTS

`backend/utils/scoring.py` defines a `CRITERION_WEIGHTS` dict that controls how much each detected damage category contributes to the final score.

### Locating the weights

```python
# backend/utils/scoring.py (approximate location — verify with grep)
CRITERION_WEIGHTS = {
    "structural_crack":       0.35,
    "spalling":               0.25,
    "exposed_rebar":          0.40,
    "corrosion":              0.30,
    "water_damage":           0.10,
    "bearing_damage":         0.40,
    "expansion_joint_damage": 0.20,
    "advanced_deterioration": 0.45,
    "moisture_indicator":     0.05,
}
```

### How to adjust

1. Identify which damage categories are most associated with the largest deltas using the bias analysis output.
2. Compute the mean delta segmented by primary detected damage type.
3. If DeepInspect consistently **overestimates** severity when `category X` is dominant → **reduce** `CRITERION_WEIGHTS["X"]`.
4. If DeepInspect consistently **underestimates** when `category X` is dominant → **increase** `CRITERION_WEIGHTS["X"]`.

**Rule of thumb**: Change weights in increments of 0.05. Re-run validation on the held-out 30% test set after each change. Do not adjust by more than 0.15 in a single calibration round.

### Example adjustment

```python
# Before calibration: steel bridges showed mean_delta = +1.4 (overestimate)
# Primary damage on steel bridges: corrosion, bearing_damage
# Action: reduce corrosion weight slightly

# Before:
"corrosion": 0.30,

# After:
"corrosion": 0.25,
```

---

## Step 2 — Pessimism Weight Tuning

DeepInspect applies a `pessimism_weight` that biases the final score toward the worst detected damage (rather than averaging). This ensures critical defects dominate the score.

### Current value

```python
# backend/utils/scoring.py
pessimism_weight = 0.3
```

This means the final score is:
```
final_score = (1 - pessimism_weight) * weighted_average + pessimism_weight * worst_case
```

### Tuning guidance

| Observation | Adjustment |
|-------------|-----------|
| False-negative rate > 15% | Increase `pessimism_weight` (0.3 → 0.4) |
| Systematic overestimation (mean_delta > 0.5) | Decrease `pessimism_weight` (0.3 → 0.2) |
| Good overall metrics but poor FNR | Increase by 0.05 only |

**Valid range**: 0.1 – 0.5. Values outside this range produce pathological scores.

**Test after each change**: Run `compute_all_metrics` on the test split and verify FNR improves without degrading Spearman rho by more than 0.03.

---

## Step 3 — Mapping Breakpoint Refinement

Score conversion breakpoints in `reference/mappings/score_mappings.json` define how official ratings map to the DeepInspect 0–10 scale.

### Breakpoint format

```json
{
  "NVDB_tilstandsgrad": {
    "description": "Norway NVDB condition rating (0-3 scale)",
    "direction": "lower_is_worse",
    "breakpoints": [
      [0, 2.0],
      [1, 7.0],
      [2, 5.0],
      [3, 2.5]
    ]
  }
}
```

Note: NVDB 0 = "no rating" (treated as moderate), 1 = Good, 2 = Medium, 3 = Poor.

### Refinement procedure

1. Plot `converted_score` vs `deepinspect_score` as a scatter plot, coloured by official rating band.
2. Look for clusters where a specific official rating value consistently maps to an incorrect DeepInspect range.
3. Adjust the breakpoint for that rating value to shift the mapping.

**Example**: If NVDB=2 bridges cluster at DeepInspect 6.5 but the conversion maps them to 5.0 — adjust the breakpoint from `[2, 5.0]` to `[2, 6.5]`.

**Constraint**: Breakpoints must remain monotonic — the ordering of DeepInspect scores must mirror the ordering of official severity (worse official rating → lower DeepInspect score).

---

## Step 4 — Per-Country Offset Calibration

If bias analysis reveals a persistent country-level offset (e.g. Norwegian bridges are consistently scored 0.8 points higher than UK bridges at the same converted reference), apply a per-country additive offset.

### Implementation

```python
# backend/utils/scoring.py
COUNTRY_OFFSETS = {
    "norway": 0.0,   # adjust after validation
    "uk":     0.0,
    "sweden": 0.0,
}

def apply_country_offset(score: float, country: str) -> float:
    offset = COUNTRY_OFFSETS.get(country.lower(), 0.0)
    return max(0.0, min(10.0, score + offset))
```

The offset is computed as:
```
offset = -(mean_delta for that country)
```

For example, if Norway shows mean_delta = +0.8 (DeepInspect overestimates by 0.8), set `COUNTRY_OFFSETS["norway"] = -0.8`.

**Limitation**: Country offsets mask real calibration issues. Prefer weight adjustments first. Use offsets only when bias remains after weight/breakpoint calibration and when the country difference is statistically significant (p < 0.05 on a t-test).

---

## Step 5 — Train/Test Split

To prevent overfitting the calibration to the validation set:

- **Train split (70%)**: 70 bridges used to compute and guide calibration adjustments.
- **Test split (30%)**: 30 bridges held out, used only to verify that calibration improvements generalise.

### Splitting procedure

Split must be **stratified** by country and condition tier to preserve distribution:

```python
from sklearn.model_selection import StratifiedShuffleSplit
import pandas as pd

df = pd.read_csv("pilot_bridges.csv")

# Create stratification key combining country and tier
df["strat_key"] = df["country"] + "_" + df["reference_tier"]

splitter = StratifiedShuffleSplit(n_splits=1, test_size=0.30, random_state=42)
train_idx, test_idx = next(splitter.split(df, df["strat_key"]))

train_df = df.iloc[train_idx]
test_df = df.iloc[test_idx]

train_df.to_csv("train_split.csv", index=False)
test_df.to_csv("test_split.csv", index=False)
```

The test split (`test_split.csv`) must not be inspected during calibration — treat it as a held-out evaluation set.

---

## Step 6 — Calibration Iteration Loop

```
1. Run validation on train split → compute metrics
2. Identify largest bias source (country / damage type / structure age)
3. Make ONE targeted parameter change (weight / pessimism / breakpoint / offset)
4. Re-run validation on train split → verify improvement
5. If improvement: commit change; if regression: revert
6. Repeat until train metrics meet calibrated targets OR 5 iterations reached
7. Run final validation on test split → record generalisation metrics
8. Document all changes in calibration_log.md
```

**Maximum iterations before escalating to model retraining**: 5. If metrics do not meet calibrated targets after 5 iterations of weight/breakpoint adjustment, the failure likely indicates a fundamental model issue (training data distribution mismatch) rather than a scoring calibration issue.

---

## Calibration Log Template

Maintain a `calibration_log.md` in `results/` documenting each change:

```markdown
## Round 1 — 2025-04-10

**Trigger**: Norway mean_delta = +0.9 (overestimate), FNR = 18%

**Changes**:
- `pessimism_weight`: 0.30 → 0.38
- `CRITERION_WEIGHTS["corrosion"]`: 0.30 → 0.25

**Train metrics before**: spearman_rho=0.51, FNR=0.18, tier_match=0.52
**Train metrics after**:  spearman_rho=0.58, FNR=0.12, tier_match=0.57

**Decision**: Keep changes. Proceed to round 2.
```

---

## Files Modified Summary

| File | Parameter | Change Type |
|------|-----------|------------|
| `backend/utils/scoring.py` | `CRITERION_WEIGHTS` | Weight values per damage category |
| `backend/utils/scoring.py` | `pessimism_weight` | Single float |
| `backend/utils/scoring.py` | `COUNTRY_OFFSETS` | Per-country additive correction |
| `reference/mappings/score_mappings.json` | `breakpoints` | Coordinate pairs per country system |
