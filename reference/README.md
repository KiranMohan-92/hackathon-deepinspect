# DeepInspect V2 — European Bridge Inspection Reference Library

This library provides the authoritative reference data underpinning DeepInspect's European
market capability: score translation, criterion mapping, defect taxonomy alignment, and
evidence for positioning DeepInspect against established national inspection frameworks.

---

## Library Structure

```
reference/
├── README.md                        ← This file
├── standards/                       ← EU-level frameworks and scanning studies
│   ├── cost-tu1406.md              ← COST Action TU1406 / BridgeSpec
│   ├── brime-d14.md                ← BRIME EU FP5 bridge management
│   ├── fhwa-eu-scanning-tour.md    ← FHWA comparative study (DE/DK/FI/FR)
│   ├── italian-guidelines-2020.md  ← Post-Morandi 5-level national framework
│   └── downloads/                  ← Place downloaded PDFs here (gitignored)
├── country-systems/                 ← National inspection system profiles
│   ├── README.md                   ← Comparative overview table
│   ├── germany-din1076.md
│   ├── france-iqoa.md
│   ├── uk-cs450.md
│   ├── netherlands-nen2767.md
│   ├── italy-linee-guida.md
│   ├── poland-gddkia.md
│   ├── norway-brutus.md
│   └── sweden-batman.md
├── papers/                          ← Academic literature
│   ├── README.md                   ← Annotated bibliography
│   └── citations.bib               ← BibTeX entries
└── mappings/                        ← Machine-readable translation files
    ├── README.md                   ← Usage guide with Python examples
    ├── score_mappings.json         ← DeepInspect → 8 national scales
    ├── score_mappings.md           ← Human-readable mapping rationale
    ├── criteria_to_din1076_svd.json
    ├── defects_to_dacl10k.json
    ├── defects_to_codebrim.json
    └── italian_coa_mapping.json
```

---

## How to Use This Library

### For engineers generating country-specific reports
Load `mappings/score_mappings.json` and call the appropriate `target_systems` key.
For France: translate the overall DeepInspect score to an IQOA class, then check whether
any criterion score >= 4.0 with a safety-related finding — if so, append the "S" suffix.

### For developers extending criteria
`mappings/criteria_to_din1076_svd.json` shows which DIN 1076 axis (S/V/D) each of the
11 DeepInspect criteria feeds into. Use this when generating German-format sub-scores.

### For researchers comparing defect datasets
`mappings/defects_to_dacl10k.json` and `defects_to_codebrim.json` allow DeepInspect's
14 visual defect categories to be cross-referenced with published benchmark datasets,
enabling dataset alignment studies and ML model comparison.

### For product/sales positioning
`research/04-deepinspect-vs-european-standards.md` (project root) contains the full
comparison matrix. The `country-systems/` profiles here contain the source data that
supports those comparisons.

---

## Key Numbers at a Glance

| Country | System | Total Bridges | % Needing Attention | Inspection Cycle |
|---------|--------|--------------|---------------------|-----------------|
| Germany | DIN 1076 | ~120,000 | ~30% rated 3.0-4.0 | 6 years (3 simple) |
| France | IQOA | ~240,000 | ~35% rated 2E or worse | 3 years |
| UK | CS 450 | ~78,000 motorway | BCI < 40: ~12% | 2 years |
| Netherlands | NEN 2767 | ~90,000 | Condition 4+: ~18% | 6 years |
| Italy | Linee Guida 2020 | ~60,000 major | Class attention HIGH: est. 20% | Risk-based |
| Poland | GDDKiA | ~8,600 national | 25% unsatisfactory | 5 years |
| Norway | Brutus/NVDB | ~16,971 | Condition 3-4: ~22% | 5 years |
| Sweden | BaTMan | ~30,000 | Condition 3+: ~20% | 6 years |

---

## Score Direction Convention

DeepInspect uses **ascending risk**: 1.0 = perfect, 5.0 = imminent failure.

National systems vary:
- **Ascending risk** (same direction): Germany Zustandsnote 1-4, France IQOA 1→3U, Poland GDDKiA 0-5, Norway Brutus 0-4, Italy CoA LOW→HIGH
- **Descending risk** (inverted): UK BCI 0-100 (100=best), US NBI 0-9 (9=new)
- **Ascending condition** (ascending = better): Netherlands NEN 2767 1-6 (1=as-built, 6=replace)

See `mappings/score_mappings.json` for the `direction` field on each target system.

---

## Maintenance Notes

- This library was initialized April 2026 for DeepInspect V2.
- `standards/downloads/` is gitignored — place downloaded PDFs there locally.
- When a national standard is revised, update both the country markdown file and the
  corresponding entries in `score_mappings.json` and `criteria_to_din1076_svd.json`.
- Add new BibTeX entries to `papers/citations.bib` and a corresponding annotation to
  `papers/README.md`.
