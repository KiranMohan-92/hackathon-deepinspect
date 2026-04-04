# Agreement Metrics

## Purpose

This document defines the statistical metrics used to measure agreement between DeepInspect V2 scores and official bridge condition ratings. Each metric targets a different aspect of agreement. Together they provide a complete picture of model performance.

---

## Validation Targets

| Metric | Scale Type | Pilot Target | Calibrated Target |
|--------|-----------|-------------|------------------|
| Pearson r | Continuous | — | > 0.70 |
| Spearman rho | Ordinal | > 0.50 | > 0.65 |
| RMSE | Continuous | < 1.0 | < 0.8 |
| MAE | Continuous | < 0.8 | < 0.6 |
| Cohen's Kappa | Categorical | > 0.30 | > 0.40 |
| False-negative rate | All | < 15% | < 10% |
| Tier-match rate | Categorical | > 50% | > 60% |
| Within-one rate | Ordinal | > 75% | > 85% |

All scores are on the 0–10 DeepInspect scale after conversion via `score_mappings.json`.

---

## Metric Definitions and Formulas

### 1. Pearson Correlation Coefficient (r)

Measures linear relationship between predicted and reference scores. Sensitive to outliers; use alongside Spearman.

**Formula:**

$$r = \frac{\sum_{i=1}^{n}(x_i - \bar{x})(y_i - \bar{y})}{\sqrt{\sum_{i=1}^{n}(x_i - \bar{x})^2} \cdot \sqrt{\sum_{i=1}^{n}(y_i - \bar{y})^2}}$$

where $x_i$ = DeepInspect score, $y_i$ = converted reference score.

**Python:**
```python
from scipy import stats
import numpy as np

def pearson_r(predicted: np.ndarray, reference: np.ndarray) -> dict:
    r, p_value = stats.pearsonr(predicted, reference)
    return {"pearson_r": round(r, 4), "p_value": round(p_value, 4)}
```

**Interpretation:** r > 0.70 indicates strong linear agreement. r < 0.40 suggests poor calibration.

---

### 2. Spearman Rank Correlation (rho)

Measures monotonic (rank-order) relationship. More robust than Pearson for ordinal data and non-normal distributions. This is the primary metric for bridge condition data, which is inherently ordinal.

**Formula:**

$$\rho = 1 - \frac{6 \sum_{i=1}^{n} d_i^2}{n(n^2 - 1)}$$

where $d_i$ = difference in ranks of $x_i$ and $y_i$.

**Python:**
```python
def spearman_rho(predicted: np.ndarray, reference: np.ndarray) -> dict:
    rho, p_value = stats.spearmanr(predicted, reference)
    return {"spearman_rho": round(rho, 4), "p_value": round(p_value, 4)}
```

**Interpretation:** rho > 0.65 means DeepInspect correctly orders bridges by condition in the majority of cases.

---

### 3. Root Mean Square Error (RMSE)

Penalises large individual errors more heavily than MAE. Useful for detecting outliers where DeepInspect grossly misestimates.

**Formula:**

$$\text{RMSE} = \sqrt{\frac{1}{n} \sum_{i=1}^{n}(x_i - y_i)^2}$$

**Python:**
```python
def rmse(predicted: np.ndarray, reference: np.ndarray) -> dict:
    error = predicted - reference
    value = float(np.sqrt(np.mean(error ** 2)))
    return {"rmse": round(value, 4)}
```

**Interpretation:** On the 0–10 scale, RMSE < 0.8 means the average error is less than 8% of the full scale range — acceptable for a first-generation AI system.

---

### 4. Mean Absolute Error (MAE)

Average magnitude of errors. More interpretable than RMSE for reporting to stakeholders ("on average, DeepInspect is X points away from the official score").

**Formula:**

$$\text{MAE} = \frac{1}{n} \sum_{i=1}^{n} |x_i - y_i|$$

**Python:**
```python
def mae(predicted: np.ndarray, reference: np.ndarray) -> dict:
    value = float(np.mean(np.abs(predicted - reference)))
    return {"mae": round(value, 4)}
```

**Interpretation:** MAE < 0.6 on a 0–10 scale corresponds to < 6% average deviation — strong performance.

---

### 5. Cohen's Kappa (κ)

Measures agreement between categorical tier assignments (OK / FAIR / POOR / CRITICAL), corrected for chance agreement. Use the 4-class tier scheme.

**Formula:**

$$\kappa = \frac{p_o - p_e}{1 - p_e}$$

where $p_o$ = observed agreement proportion, $p_e$ = expected agreement by chance.

**Tier mapping for this computation:**

| DeepInspect Score | Tier |
|------------------|------|
| 8.0 – 10.0 | OK |
| 6.0 – 7.9 | FAIR |
| 4.0 – 5.9 | POOR |
| 0.0 – 3.9 | CRITICAL |

**Python:**
```python
from sklearn.metrics import cohen_kappa_score

TIER_BREAKS = [0, 4.0, 6.0, 8.0, 10.01]
TIER_LABELS = ["CRITICAL", "POOR", "FAIR", "OK"]

def score_to_tier(score: float) -> str:
    for i, upper in enumerate(TIER_BREAKS[1:]):
        if score < upper:
            return TIER_LABELS[i]
    return TIER_LABELS[-1]

def cohens_kappa(predicted: np.ndarray, reference: np.ndarray) -> dict:
    pred_tiers = [score_to_tier(s) for s in predicted]
    ref_tiers = [score_to_tier(s) for s in reference]
    kappa = cohen_kappa_score(ref_tiers, pred_tiers)
    return {"cohens_kappa": round(kappa, 4)}
```

**Interpretation scale:**
- κ < 0.20: Slight agreement
- 0.20–0.40: Fair agreement
- 0.40–0.60: Moderate agreement (calibrated target)
- 0.60–0.80: Substantial agreement
- > 0.80: Near-perfect

---

### 6. False-Negative Rate (FNR)

Fraction of truly CRITICAL bridges that DeepInspect fails to classify as CRITICAL or POOR. This is the safety-critical metric — missing a critically deteriorated bridge is a serious failure mode.

**Formula:**

$$\text{FNR} = \frac{\text{FN}}{\text{FN} + \text{TP}}$$

where TP = DeepInspect correctly identifies CRITICAL/POOR, FN = DeepInspect misclassifies CRITICAL as FAIR or OK.

**Python:**
```python
def false_negative_rate(predicted: np.ndarray, reference: np.ndarray,
                        critical_threshold: float = 6.0) -> dict:
    """
    FNR for 'at-risk' bridges (official score < critical_threshold on 0-10 scale).
    A bridge is a false negative if it is officially at-risk but DeepInspect
    scores it above the threshold.
    """
    at_risk_mask = reference < critical_threshold
    fn = np.sum(at_risk_mask & (predicted >= critical_threshold))
    tp = np.sum(at_risk_mask & (predicted < critical_threshold))
    total_at_risk = fn + tp
    if total_at_risk == 0:
        return {"false_negative_rate": None, "note": "No at-risk bridges in sample"}
    fnr = fn / total_at_risk
    return {
        "false_negative_rate": round(fnr, 4),
        "false_negatives": int(fn),
        "true_positives": int(tp),
        "total_at_risk": int(total_at_risk),
    }
```

**Interpretation:** FNR < 10% is the calibrated target. Any FNR > 20% on the full validation set should trigger immediate recalibration before deployment.

---

### 7. Tier-Match Rate

Fraction of bridges where DeepInspect assigns the same 4-class tier (OK/FAIR/POOR/CRITICAL) as the official rating.

**Formula:**

$$\text{TierMatch} = \frac{1}{n} \sum_{i=1}^{n} \mathbf{1}[\text{tier}(x_i) = \text{tier}(y_i)]$$

**Python:**
```python
def tier_match_rate(predicted: np.ndarray, reference: np.ndarray) -> dict:
    pred_tiers = [score_to_tier(s) for s in predicted]
    ref_tiers = [score_to_tier(s) for s in reference]
    matches = sum(p == r for p, r in zip(pred_tiers, ref_tiers))
    rate = matches / len(predicted)
    return {
        "tier_match_rate": round(rate, 4),
        "matches": matches,
        "total": len(predicted),
    }
```

---

### 8. Within-One Rate

Fraction of bridges where the DeepInspect score is within 1.0 point of the converted reference score. A lenient but practical measure of "close enough" agreement.

**Formula:**

$$\text{WithinOne} = \frac{1}{n} \sum_{i=1}^{n} \mathbf{1}[|x_i - y_i| \leq 1.0]$$

**Python:**
```python
def within_one_rate(predicted: np.ndarray, reference: np.ndarray,
                    tolerance: float = 1.0) -> dict:
    within = np.sum(np.abs(predicted - reference) <= tolerance)
    rate = within / len(predicted)
    return {
        "within_one_rate": round(rate, 4),
        "tolerance": tolerance,
        "within_count": int(within),
        "total": len(predicted),
    }
```

---

## Combined Metric Computation

```python
import numpy as np
from scipy import stats
from sklearn.metrics import cohen_kappa_score

def compute_all_metrics(
    predicted: np.ndarray,
    reference: np.ndarray,
    tiers_pred: list[str] | None = None,
    tiers_ref: list[str] | None = None,
) -> dict:
    """
    Compute the full suite of DeepInspect validation metrics.

    Args:
        predicted:   DeepInspect scores (0–10 scale), shape (n,)
        reference:   Converted official scores (0–10 scale), shape (n,)
        tiers_pred:  Optional pre-computed tier labels for predicted scores
        tiers_ref:   Optional pre-computed tier labels for reference scores

    Returns:
        Dict of all metrics with values and metadata.
    """
    predicted = np.asarray(predicted, dtype=float)
    reference = np.asarray(reference, dtype=float)

    assert len(predicted) == len(reference), "Arrays must have equal length"
    n = len(predicted)

    # Continuous metrics
    pr, p_pr = stats.pearsonr(predicted, reference)
    sr, p_sr = stats.spearmanr(predicted, reference)
    error = predicted - reference
    rmse_val = float(np.sqrt(np.mean(error ** 2)))
    mae_val = float(np.mean(np.abs(error)))

    # Tier assignments
    if tiers_pred is None:
        tiers_pred = [score_to_tier(s) for s in predicted]
    if tiers_ref is None:
        tiers_ref = [score_to_tier(s) for s in reference]

    kappa = cohen_kappa_score(tiers_ref, tiers_pred)

    # Match rates
    tier_matches = sum(p == r for p, r in zip(tiers_pred, tiers_ref))
    within_one = int(np.sum(np.abs(error) <= 1.0))

    # False-negative rate
    at_risk_mask = reference < 6.0
    fn = int(np.sum(at_risk_mask & (predicted >= 6.0)))
    tp = int(np.sum(at_risk_mask & (predicted < 6.0)))
    total_at_risk = fn + tp
    fnr = (fn / total_at_risk) if total_at_risk > 0 else None

    return {
        "n": n,
        "pearson_r":          round(float(pr), 4),
        "pearson_p":          round(float(p_pr), 4),
        "spearman_rho":       round(float(sr), 4),
        "spearman_p":         round(float(p_sr), 4),
        "rmse":               round(rmse_val, 4),
        "mae":                round(mae_val, 4),
        "cohens_kappa":       round(float(kappa), 4),
        "false_negative_rate": round(fnr, 4) if fnr is not None else None,
        "false_negatives":    fn,
        "total_at_risk":      total_at_risk,
        "tier_match_rate":    round(tier_matches / n, 4),
        "within_one_rate":    round(within_one / n, 4),
        "mean_delta":         round(float(np.mean(error)), 4),
        "std_delta":          round(float(np.std(error)), 4),
        "max_overestimate":   round(float(np.max(error)), 4),
        "max_underestimate":  round(float(np.min(error)), 4),
    }
```

---

## Reporting Template

After running `compute_all_metrics`, format results for the validation report:

```python
def format_metric_report(metrics: dict, phase: str = "pilot") -> str:
    targets = {
        "pilot": {
            "spearman_rho": 0.50, "rmse": 1.0,
            "cohens_kappa": 0.30, "tier_match_rate": 0.50,
            "within_one_rate": 0.75, "false_negative_rate": 0.15,
        },
        "calibrated": {
            "pearson_r": 0.70, "spearman_rho": 0.65, "rmse": 0.8,
            "mae": 0.6, "cohens_kappa": 0.40, "tier_match_rate": 0.60,
            "within_one_rate": 0.85, "false_negative_rate": 0.10,
        },
    }[phase]

    lines = [f"=== Validation Metrics ({phase.upper()}, n={metrics['n']}) ==="]
    for key, target in targets.items():
        val = metrics.get(key)
        if val is None:
            status = "N/A"
        else:
            # FNR: lower is better; all others: higher is better
            if key in ("rmse", "mae", "false_negative_rate"):
                passed = val <= target
            else:
                passed = val >= target
            status = "PASS" if passed else "FAIL"
        lines.append(f"  {key:<25} {str(val):<10} target={'<=' if key in ('rmse','mae','false_negative_rate') else '>='}{target}  [{status}]")

    lines.append(f"\n  mean_delta:  {metrics['mean_delta']:+.3f}  (positive = DeepInspect overestimates)")
    lines.append(f"  std_delta:   {metrics['std_delta']:.3f}")
    return "\n".join(lines)
```

---

## Dependencies

```
numpy>=1.24
scipy>=1.11
scikit-learn>=1.3
pandas>=2.0
```

Install: `pip install numpy scipy scikit-learn pandas`
