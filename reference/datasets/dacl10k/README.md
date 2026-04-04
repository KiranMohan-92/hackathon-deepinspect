# DACL10K — Damage and Condition Labels (10K Bridge Images)

## Overview

DACL10K is a semantic segmentation benchmark dataset for bridge damage detection. Published at WACV 2024, it contains approximately 10,000 high-resolution bridge inspection images annotated with 19 classes covering both damage types and structural objects.

**HuggingFace Repository**: https://huggingface.co/datasets/phiyodr/dacl10k
**Paper**: "DACL10K: Benchmark for Semantic Bridge Damage Segmentation", WACV 2024

---

## Dataset Statistics

| Property | Value |
|----------|-------|
| Total images | ~10,000 |
| Train split | ~8,000 images |
| Validation split | ~1,000 images |
| Test split | ~1,000 images |
| Annotation format | JSON (COCO-style polygon segmentation) |
| Image format | JPEG |
| License | Creative Commons CC BY 4.0 |
| Download size | ~15 GB |

---

## Class Taxonomy (19 Classes)

### Damage Types (13 classes)

| Class ID | Class Name | Description |
|----------|-----------|-------------|
| 0 | Crack | Surface or structural cracking |
| 1 | Spalling | Concrete surface delamination |
| 2 | Efflorescence | White salt deposits from water infiltration |
| 3 | ExposedRebar | Visible reinforcement steel |
| 4 | Rust | Iron oxide corrosion on metal elements |
| 5 | Graffiti | Surface vandalism (cosmetic, not structural) |
| 6 | BearingCorrosion | Corrosion specific to bearing elements |
| 7 | SteelCorrosion | Corrosion on structural steel members |
| 8 | ConcreteCrumbling | Advanced concrete disintegration |
| 9 | WaterLeakage | Active water seepage through structure |
| 10 | ChemicalDeposit | Non-calcium chemical staining/deposits |
| 11 | SealantDamage | Deteriorated expansion joint sealant |
| 12 | Joint | Damaged or misaligned expansion joints |

### Structural Objects (6 classes)

| Class ID | Class Name | Description |
|----------|-----------|-------------|
| 13 | Railing | Bridge safety railing elements |
| 14 | Drain | Drainage outlets and gutters |
| 15 | ExpansionJoint | Structural expansion joint assemblies |
| 16 | Bearing | Bearing pad and support assemblies |
| 17 | Curb | Kerb and edge beam elements |
| 18 | Vegetation | Plant growth (moss, weeds — moisture indicator) |

---

## Mapping to DeepInspect Categories

| DACL10K Class | DeepInspect Category | Severity Impact |
|--------------|---------------------|----------------|
| Crack | `structural_crack` | High |
| Spalling | `spalling` | Medium-High |
| ExposedRebar | `exposed_rebar` | Critical |
| ConcreteCrumbling | `advanced_deterioration` | Critical |
| SteelCorrosion / Rust | `corrosion` | High |
| BearingCorrosion | `bearing_damage` | Critical |
| WaterLeakage | `water_damage` | Medium |
| Efflorescence | `water_damage` | Low-Medium |
| SealantDamage / Joint | `expansion_joint_damage` | Medium |
| Graffiti | — | Ignored |
| Vegetation | `moisture_indicator` | Low |
| Structural objects | Context for damage localization | — |

---

## File Structure (after full download)

```
dacl10k/
├── metadata.json               # HuggingFace API response
├── dacl10k/                    # Downloaded only with --full flag
│   ├── train/
│   │   ├── images/
│   │   └── annotations.json
│   ├── validation/
│   │   ├── images/
│   │   └── annotations.json
│   └── test/
│       ├── images/
│       └── annotations.json
```

---

## Usage

```bash
# Download metadata only (fast — no images)
python download.py

# Clone full dataset via git-lfs (~15 GB)
python download.py --full --output-dir ./data
```

Note: Full download requires `git` and `git-lfs` to be installed. The script will check for these dependencies before attempting the clone.

---

## Citation

```bibtex
@inproceedings{flotzinger2024dacl10k,
  title={{DACL10K}: Benchmark for Semantic Bridge Damage Segmentation},
  author={Flotzinger, Johannes and Peer, Peter and Colombo, Daniel and Nessler, Stefan and Zischinsky, Thomas},
  booktitle={Proceedings of the IEEE/CVF Winter Conference on Applications of Computer Vision},
  year={2024}
}
```

---

## License

Creative Commons Attribution 4.0 International (CC BY 4.0).
Original images were collected from real-world bridge inspections in Europe.
