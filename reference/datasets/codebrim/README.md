# CODEBRIM — COncrEte DEfect BRidge IMage Dataset

## Overview

CODEBRIM is a benchmark dataset for multi-target classification of concrete bridge defects. It was created by the German Aerospace Center (DLR) and published at CVPR 2019. The dataset contains high-resolution images of concrete bridge surfaces annotated with six damage classes.

**Zenodo Record**: https://zenodo.org/record/2620293
**DOI**: 10.5281/zenodo.2620293

---

## Dataset Statistics

| Property | Value |
|----------|-------|
| Total images | ~1,590 bridge photographs |
| Annotated patches | ~6,000 multi-label crop patches |
| Image resolution | 2448 × 2448 px (original); various crop sizes |
| Annotation format | Multi-label XML per image |
| License | Creative Commons CC BY 4.0 |
| Download size | ~2 GB (full image archive) |

---

## Damage Classes

CODEBRIM uses a **multi-label** scheme — each image patch may exhibit multiple damage types simultaneously.

| Class ID | Class Name | Description |
|----------|-----------|-------------|
| 0 | Background | No visible defect |
| 1 | Crack | Surface or structural cracks in concrete |
| 2 | Spalling | Concrete delamination and surface loss |
| 3 | Exposed Rebar | Visible reinforcement steel due to concrete loss |
| 4 | Efflorescence | White calcium carbonate deposits from water infiltration |
| 5 | Corrosion Stain | Rust staining from corroding reinforcement |

### Class Distribution (approximate)

| Class | Patch Count | % of Dataset |
|-------|------------|-------------|
| Background | ~2,100 | 35% |
| Crack | ~1,800 | 30% |
| Spalling | ~1,200 | 20% |
| Efflorescence | ~900 | 15% |
| Exposed Rebar | ~600 | 10% |
| Corrosion Stain | ~500 | 8% |

Note: Percentages exceed 100% due to multi-label annotations.

---

## Mapping to DeepInspect Damage Categories

| CODEBRIM Class | DeepInspect Category | Severity Weight |
|---------------|---------------------|----------------|
| Crack | `structural_crack` | 0.35 |
| Spalling | `spalling` | 0.25 |
| Exposed Rebar | `exposed_rebar` | 0.40 (critical) |
| Efflorescence | `water_damage` | 0.10 |
| Corrosion Stain | `corrosion` | 0.30 |
| Background | — | 0.00 |

---

## File Structure (after download)

```
codebrim/
├── metadata.json            # Zenodo record metadata and file list
├── CODEBRIM_balanced/       # Downloaded only with --full flag
│   ├── defective_patches/
│   │   ├── crack/
│   │   ├── spalling/
│   │   ├── exposed_rebar/
│   │   ├── efflorescence/
│   │   └── corrosion_stain/
│   └── non_defective_patches/
│       └── background/
└── annotation/
    └── *.xml                # Multi-label annotations
```

---

## Usage

```bash
# Download metadata and file listing only (fast, no images)
python download.py

# Download full dataset (~2 GB images)
python download.py --full --output-dir ./data
```

---

## Citation

```bibtex
@inproceedings{mundt2019meta,
  title={Meta-learning convolutional neural architectures for multi-target concrete defect classification with the {COncrete} {DEfect} {BRidge} {IMage} dataset},
  author={Mundt, Martin and Majumder, Sagnik and Murali, Sreenivas and Panetsos, Panagiotis and Ramesh, Visvanathan},
  booktitle={Proceedings of the IEEE/CVF Conference on Computer Vision and Pattern Recognition},
  pages={11196--11205},
  year={2019}
}
```

---

## License

Creative Commons Attribution 4.0 International (CC BY 4.0).
When using this dataset in publications, cite Mundt et al. (2019) and include the DOI: 10.5281/zenodo.2620293.
