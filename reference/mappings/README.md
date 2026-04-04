# Mappings Directory — Usage Guide

This directory contains the machine-readable translation files that connect DeepInspect's
PhysicsHealthCertificate output to established European bridge inspection frameworks.

---

## File Index

| File | Purpose | Format |
|------|---------|--------|
| `score_mappings.json` | DeepInspect overall score → 8 national scales | JSON |
| `score_mappings.md` | Human-readable rationale for each mapping | Markdown |
| `criteria_to_din1076_svd.json` | 11 criteria → DIN 1076 S/V/D axes | JSON |
| `defects_to_dacl10k.json` | 14 visual defect categories → dacl10k 19 classes | JSON |
| `defects_to_codebrim.json` | 14 visual defect categories → CODEBRIM 6 classes | JSON |
| `italian_coa_mapping.json` | 11 criteria → Italian H×V×E risk types | JSON |

---

## Quick Start: Loading Score Mappings in Python

```python
import json
from pathlib import Path

# Load the mappings
mappings_path = Path(__file__).parent / "score_mappings.json"
with open(mappings_path) as f:
    mappings = json.load(f)

def deepinspect_to_germany(score: float) -> dict:
    """Convert DeepInspect overall score to German Zustandsnote."""
    system = mappings["target_systems"]["germany_zustandsnote"]
    breakpoints = system["breakpoints"]
    
    # Piecewise linear interpolation
    for i in range(len(breakpoints) - 1):
        bp_lo = breakpoints[i]
        bp_hi = breakpoints[i + 1]
        if bp_lo["deepinspect"] <= score <= bp_hi["deepinspect"]:
            ratio = (score - bp_lo["deepinspect"]) / (bp_hi["deepinspect"] - bp_lo["deepinspect"])
            target = bp_lo["target"] + ratio * (bp_hi["target"] - bp_lo["target"])
            return {
                "zustandsnote": round(target, 1),
                "tier": bp_lo["tier"],
                "label": bp_lo["target_label"],
                "standard": system["standard"]
            }
    
    # Clamp to extremes
    if score <= breakpoints[0]["deepinspect"]:
        return {"zustandsnote": breakpoints[0]["target"], "tier": "OK", "label": "Sehr gut"}
    return {"zustandsnote": breakpoints[-1]["target"], "tier": "CRITICAL", "label": "Gefährlich"}


def deepinspect_to_france_iqoa(max_criterion_score: float,
                                 has_safety_finding: bool = False) -> str:
    """
    Convert DeepInspect worst-criterion score to French IQOA class.
    
    Args:
        max_criterion_score: max(criterion_scores) from PhysicsHealthCertificate
        has_safety_finding: True if any safety-related criterion (rank 10/11) >= 4.0
                           with a user-safety specific finding
    Returns:
        IQOA class string e.g. "2E", "3", "3US"
    """
    system = mappings["target_systems"]["france_iqoa"]
    
    iqoa_class = "3U"  # default worst
    for threshold in system["thresholds"]:
        if max_criterion_score <= threshold["deepinspect_max"]:
            iqoa_class = threshold["target"]
            break
    
    if has_safety_finding:
        # Insert S before U if present: 3U → 3US, 2E → 2ES, 3 → 3S
        if iqoa_class == "3U":
            iqoa_class = "3US"
        elif iqoa_class == "2E":
            iqoa_class = "2ES"
        else:
            iqoa_class = iqoa_class + "S"
    
    return iqoa_class


def deepinspect_to_uk_bci(overall_score: float,
                            max_criterion_score: float) -> dict:
    """
    Convert DeepInspect scores to UK BCI Average and BCI Critical.
    
    Args:
        overall_score: confidence-weighted overall score (for BCI Ave)
        max_criterion_score: max(criterion_scores) (for BCI Crit)
    Returns:
        dict with bci_ave, bci_crit, condition_band
    """
    def to_bci(score: float) -> int:
        bci = round(100 - (score - 1.0) * 25)
        return max(0, min(100, bci))
    
    bci_ave = to_bci(overall_score)
    bci_crit = to_bci(max_criterion_score)
    
    bands = mappings["target_systems"]["uk_bci"]["condition_bands"]
    band = "Serious — immediate action"
    for range_str, label in bands.items():
        lo, hi = map(int, range_str.split("-"))
        if lo <= bci_ave <= hi:
            band = label
            break
    
    return {"bci_ave": bci_ave, "bci_crit": bci_crit, "condition_band": band}


def deepinspect_to_all_systems(overall_score: float,
                                 max_criterion_score: float,
                                 has_safety_finding: bool = False) -> dict:
    """
    Convert DeepInspect scores to all 8 national systems at once.
    Returns a dict keyed by system name.
    """
    return {
        "germany_zustandsnote": deepinspect_to_germany(overall_score),
        "france_iqoa": deepinspect_to_france_iqoa(max_criterion_score, has_safety_finding),
        "uk_bci": deepinspect_to_uk_bci(overall_score, max_criterion_score),
        # Additional systems follow same pattern — see score_mappings.json for thresholds
    }
```

---

## Quick Start: DIN 1076 S/V/D Axis Scores

```python
import json
from pathlib import Path

svd_path = Path(__file__).parent / "criteria_to_din1076_svd.json"
with open(svd_path) as f:
    svd_map = json.load(f)

def compute_svd_scores(criteria_results: list) -> dict:
    """
    Compute DIN 1076 S/V/D axis scores from DeepInspect criteria results.
    
    Args:
        criteria_results: list of CriterionResult objects from PhysicsHealthCertificate
    Returns:
        dict with S, V, D (0-4 scale) and ZN (Zustandsnote, 1.0-4.0 scale)
    """
    # Build key→(primary_axis, secondary_axis) lookup
    axis_map = {
        c["criterion_key"]: (c["primary_axis"], c.get("secondary_axis"))
        for c in svd_map["criteria"]
    }
    
    axis_scores = {"S": [], "V": [], "D": []}
    
    for criterion in criteria_results:
        key = criterion.criterion_name  # or use criterion_key if available
        # Normalize key for lookup
        lookup_key = key.lower().replace(" ", "_").replace("/", "_").split("(")[0].strip("_")
        
        for map_key, (primary, secondary) in axis_map.items():
            if map_key in lookup_key:
                # Scale DeepInspect 1-5 to DIN 0-4
                din_score = (criterion.score - 1.0)
                axis_scores[primary].append(din_score)
                if secondary:
                    axis_scores[secondary].append(din_score * 0.5)
                break
    
    S = max(axis_scores["S"]) if axis_scores["S"] else 0.0
    V = max(axis_scores["V"]) if axis_scores["V"] else 0.0
    D = max(axis_scores["D"]) if axis_scores["D"] else 0.0
    
    # DIN 1076 ZN formula: max dominates at 70%, mean contributes at 30%
    ZN_raw = max(S, V, D) * 0.7 + ((S + V + D) / 3.0) * 0.3
    ZN = round(min(4.0, max(1.0, ZN_raw + 1.0)), 1)
    
    return {
        "S": round(min(4.0, S), 1),
        "V": round(min(4.0, V), 1),
        "D": round(min(4.0, D), 1),
        "ZN": ZN,
        "standard": "DIN 1076 / RI-EBW-PRÜF"
    }
```

---

## Quick Start: Defect Dataset Alignment

```python
import json
from pathlib import Path

dacl_path = Path(__file__).parent / "defects_to_dacl10k.json"
with open(dacl_path) as f:
    dacl_map = json.load(f)

def get_dacl10k_classes_for_criterion(criterion_rank: int) -> list[str]:
    """
    Get the dacl10k class names that provide evidence for a given criterion.
    
    Args:
        criterion_rank: 1-11
    Returns:
        list of dacl10k class name strings
    """
    relevant_classes = set()
    for mapping in dacl_map["deepinspect_to_dacl10k"]:
        if criterion_rank in mapping.get("criterion_primary", []) or \
           criterion_rank in mapping.get("criterion_secondary", []):
            relevant_classes.update(mapping.get("dacl10k_classes", []))
    return sorted(relevant_classes)


def score_from_dacl10k_detections(detections: dict[str, float],
                                   criterion_rank: int) -> float:
    """
    Estimate DeepInspect criterion score from dacl10k detection confidences.
    
    Args:
        detections: dict of {dacl10k_class_name: detection_confidence (0-1)}
        criterion_rank: 1-11
    Returns:
        estimated score 1.0-5.0
    """
    relevant = get_dacl10k_classes_for_criterion(criterion_rank)
    
    # Find the highest-confidence detection among relevant classes
    max_conf = max((detections.get(cls, 0.0) for cls in relevant), default=0.0)
    
    # Check for score floor overrides (e.g., exposed_reinforcement → floor 4.0)
    for mapping in dacl_map["deepinspect_to_dacl10k"]:
        if criterion_rank in mapping.get("criterion_primary", []):
            if "score_floor" in mapping:
                detected_classes = [c for c in mapping.get("dacl10k_classes", [])
                                    if detections.get(c, 0) > 0.5]
                if detected_classes:
                    return max(mapping["score_floor"], 1.0 + max_conf * 4.0)
    
    if max_conf == 0:
        return 2.0  # unknown — not OK, but no evidence of defect either
    
    # Map confidence to score: low confidence → score ~2.5; high confidence → score ~4.5
    return round(1.5 + max_conf * 3.0, 1)
```

---

## Extending the Mappings

### Adding a New Target System
1. Add an entry to `score_mappings.json` under `target_systems`
2. Include required fields: `standard`, `country`, `range`, `direction`, `mapping_type`
3. Add corresponding breakpoints or thresholds
4. Add a rationale section to `score_mappings.md`
5. Update `../README.md` key numbers table if the country is new

### Adding a New Defect Category
1. Add the category to `defects_to_dacl10k.json` and `defects_to_codebrim.json`
2. Specify which DeepInspect criteria (by rank) the category feeds
3. List the target dataset classes that provide evidence
4. Document confidence modifier and any score floors/caps

### Updating for a New dacl10k Version
If dacl10k releases additional classes or changes class names:
1. Update `dacl10k_classes` array at the top of `defects_to_dacl10k.json`
2. Review each mapping's `dacl10k_classes` list for new relevant classes
3. Update version field and add a changelog note

---

## Validation

To validate that the score mappings are internally consistent, run:

```python
import json

with open("score_mappings.json") as f:
    data = json.load(f)

for system_name, system in data["target_systems"].items():
    if system["mapping_type"] == "piecewise_linear":
        bps = system["breakpoints"]
        # Check DeepInspect values are monotonically increasing
        di_vals = [bp["deepinspect"] for bp in bps]
        assert di_vals == sorted(di_vals), f"{system_name}: DI breakpoints not sorted"
        # Check target values are monotonically changing
        t_vals = [bp.get("target", bp.get("target_bci_ave")) for bp in bps]
        if system["direction"] == "ascending_risk":
            assert t_vals == sorted(t_vals), f"{system_name}: target not ascending"
        else:
            assert t_vals == sorted(t_vals, reverse=True), f"{system_name}: target not descending"
        print(f"  {system_name}: OK ({len(bps)} breakpoints)")
    elif system["mapping_type"] == "threshold":
        thresholds = system["thresholds"]
        maxvals = [t["deepinspect_max"] for t in thresholds]
        assert maxvals == sorted(maxvals), f"{system_name}: thresholds not sorted"
        assert maxvals[-1] == 5.0, f"{system_name}: last threshold must reach 5.0"
        print(f"  {system_name}: OK ({len(thresholds)} thresholds)")

print("All mappings validated.")
```
