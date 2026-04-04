# DeepInspect V2 — European Bridge Inspection Reference Library
## Dataset Catalog

This catalog lists all external datasets used for validation, training data augmentation, and cross-reference benchmarking in DeepInspect V2.

---

## Dataset Index

| Name | URL | License | Approx. Size | Format | DeepInspect Use Case |
|------|-----|---------|-------------|--------|----------------------|
| Norway NVDB Bridge Registry | https://nvdbapiles-v3.atlas.vegvesen.no/vegobjekter/60 | Norwegian Open Government Data (NLOD) | ~50 MB JSON | REST API / JSON | Ground-truth condition ratings (NVDB scale 1–5) for Norwegian bridges; geolocation matching to Street View imagery |
| CODEBRIM | https://zenodo.org/record/2620293 | Creative Commons CC BY 4.0 | ~2 GB | JPEG images + XML annotations | Fine-tuning defect classifiers; 6-class damage taxonomy maps to DeepInspect damage categories |
| DACL10K | https://huggingface.co/datasets/phiyodr/dacl10k | CC BY 4.0 | ~15 GB | JPEG images + JSON annotations | Semantic segmentation training; 19-class taxonomy including structural objects and damage types |
| UK National Highways Structures | https://opendata.nationalhighways.co.uk/ | Open Government Licence v3.0 | ~10 MB | CSV / JSON | BCI (Bridge Condition Index) scores for UK motorway and A-road bridges; calibration against DeepInspect scores |
| EU Open Data Portal — Bridge Infrastructure | https://data.europa.eu/api/hub/search/datasets?q=bridge+infrastructure | Varies per dataset (mostly CC BY / OGL) | Varies | CSV / JSON / RDF | Pan-European dataset discovery; supplementary country-level bridge registries |

---

## Dataset Details

### 1. Norway NVDB Bridge Registry
- **Provider**: Statens vegvesen (Norwegian Public Roads Administration)
- **API Version**: NVDB API v3
- **Object Type**: 60 (Bru / Bridge)
- **Record Count**: 16,971+ bridges (as of early 2025)
- **Auth**: None required — open public API
- **Key Fields**: bridge ID, name, road reference, municipality, county, geometry (WGS84), construction year, material, span count, total length, official condition rating
- **DeepInspect Use Case**: Primary ground-truth source for Norway calibration. Official ratings on NVDB 1–5 scale are converted to the DeepInspect 0–10 scale via `mappings/score_mappings.json`.
- **Fetch Script**: `norway-nvdb/fetch_bridges.py`

### 2. CODEBRIM (COncrEte DEfect BRidge IMage)
- **Provider**: Deutsches Zentrum für Luft- und Raumfahrt (DLR) / Zenodo
- **Zenodo Record**: 2620293
- **Image Count**: ~1,590 bridge images, ~6,000 annotated crop patches
- **Damage Classes**: Crack, Spalling, Exposed Rebar, Efflorescence, Corrosion Stain, Background
- **Annotation Format**: Multi-label XML per image crop
- **DeepInspect Use Case**: Benchmark dataset for the visual defect classifier. Class distribution used to set confidence thresholds per damage category.
- **Fetch Script**: `codebrim/download.py`

### 3. DACL10K (Damage and Condition Labels — 10K images)
- **Provider**: phiyodr (HuggingFace community)
- **HuggingFace Repo**: `phiyodr/dacl10k`
- **Image Count**: ~10,000 bridge inspection images
- **Classes (19 total)**:
  - Damage types (13): Crack, Spalling, Efflorescence, ExposedRebar, Rust, Graffiti, BearingCorrosion, SteelCorrosion, ConcreteCrumbling, WaterLeakage, ChemicalDeposit, SealantDamage, Joint
  - Structural objects (6): Railing, Drain, ExpansionJoint, Bearing, Curb, Vegetation
- **Annotation Format**: JSON (COCO-style)
- **DeepInspect Use Case**: Multi-label segmentation training data; structural object detection for context-aware damage scoring.
- **Fetch Script**: `dacl10k/download.py`

### 4. UK National Highways — Structures Open Data
- **Provider**: National Highways (formerly Highways England)
- **Portal**: https://opendata.nationalhighways.co.uk/
- **Previous System**: TRIS (retired early 2025) — data now migrated to new open data portal
- **Key Metric**: BCI (Bridge Condition Index) — scored 0–100 (higher = better condition)
- **Coverage**: Motorway and A-road structures in England managed by National Highways
- **DeepInspect Use Case**: UK calibration dataset. BCI scores converted to DeepInspect 0–10 scale. Provides large-scale structural condition distribution for bias analysis.
- **Fetch Script**: `uk-national-highways/fetch_structures.py`

### 5. EU Open Data Portal — Bridge Infrastructure Datasets
- **Provider**: Publications Office of the European Union
- **API**: EU Data Portal Hub Search API v2
- **Coverage**: Pan-European, multi-country bridge and infrastructure datasets
- **DeepInspect Use Case**: Supplementary dataset discovery for countries beyond Norway and UK. Useful for identifying Czech, Belgian, and German bridge registries.
- **Fetch Script**: `data-europa-eu/download.py`

---

## Directory Structure

```
datasets/
├── README.md                        # This file
├── norway-nvdb/
│   ├── README.md
│   ├── fetch_bridges.py
│   ├── bridges.json                 # Generated output
│   └── bridges.csv                  # Generated output
├── codebrim/
│   ├── README.md
│   └── download.py
├── dacl10k/
│   ├── README.md
│   └── download.py
├── uk-national-highways/
│   ├── README.md
│   └── fetch_structures.py
└── data-europa-eu/
    ├── README.md
    └── download.py
```

---

## License Notes

All datasets are used under their respective open data licenses. CODEBRIM and DACL10K require attribution to original authors in any publication. Norway NVDB data is published under NLOD 2.0, which is compatible with CC BY 4.0. UK National Highways data is published under OGL v3.0.

When publishing validation results, cite:

- CODEBRIM: Mundt et al. (2019), "Meta-learning convolutional neural architectures for multi-target concrete defect classification with the COncrete DEfect BRidge IMage dataset", CVPR 2019.
- DACL10K: Flotzinger et al. (2023), "DACL10K: Benchmark for Semantic Bridge Damage Segmentation", WACV 2024.
