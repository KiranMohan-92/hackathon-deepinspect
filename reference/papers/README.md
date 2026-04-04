# Bridge Inspection Reference Papers — Annotated Bibliography

This bibliography covers the key academic and technical literature underpinning
DeepInspect's physics model, European standards alignment, and ML defect classification.
Papers are grouped by topic. BibTeX entries are in `citations.bib`.

---

## 1. Bridge Failure Statistics and Causation

### Wardhana & Hadipriono (2003)
**Title:** Analysis of Recent Bridge Failures in the United States  
**Authors:** Wardhana, K.; Hadipriono, F.C.  
**Journal:** Journal of Performance of Constructed Facilities, ASCE, 17(3), 144–150  
**Year:** 2003  
**DOI:** https://doi.org/10.1061/(ASCE)0887-3828(2003)17:3(144)  
**Relevance:** The foundational study behind DeepInspect's criterion weighting. Analyzed
500 bridge failures in the US from 1989–2000. Found hydraulic causes (scour, flooding,
overtopping) account for ~52% of failures. Overloading and collision account for ~12–20%.
Deterioration alone accounts for ~6–9%. These statistics directly justify the
criterion_weights in `backend/utils/scoring.py` (scour: 0.25, redundancy: 0.15).

### Wardhana & Hadipriono (2003) is the primary citation for DeepInspect's weighting rationale.

---

### Zhang et al. (2022)
**Title:** A Statistical Analysis of Bridge Failures in China from 1990 to 2019  
**Authors:** Zhang, G.; Yang, Y.; Guo, J.; Liu, D.; Jiang, J.  
**Journal:** Engineering Failure Analysis, 138, 106307  
**Year:** 2022  
**DOI:** https://doi.org/10.1016/j.engfailanal.2022.106307  
**Relevance:** Global validation of the US-derived Wardhana statistics. Chinese dataset
(474 failures, 1990–2019) confirms hydraulic causes as leading factor (~36% floods/scour),
with overloading second (~21%). Validates the universality of scour as the dominant
failure mode — not a US-specific phenomenon. Informs DeepInspect's Criterion 1 weight
for bridges outside the US context.

---

## 2. European Bridge Inspection Frameworks

### COST TU1406 Final Report (2019)
**Title:** Quality Specifications for Roadway Bridges, Standardization at a European Level  
**Authors:** Correia, J.R. et al. (COST Action TU1406 consortium)  
**Year:** 2019  
**Publisher:** CRC Press / Taylor & Francis  
**URL:** https://www.tu1406.eu/  
**Relevance:** The most comprehensive recent comparative study of European bridge
inspection practice. Proposed harmonized Key Performance Indicators (KPIs) for EU-level
reporting. Key finding: scour (KPI-S2) is the most commonly neglected indicator across
all 28 participating countries. Used to justify DeepInspect's positioning as filling
a documented European gap.

---

### BRIME D14 Final Report (2002)
**Title:** Bridge Management in Europe — Final Report  
**Authors:** TRL, LCPC, BASt, NPRA, CEDEX (consortium)  
**Year:** 2002  
**URL:** https://www.researchgate.net/publication/279176443  
**Relevance:** The foundational EU comparative study of bridge inspection systems across
UK, France, Germany, Norway, and Spain. Defined the three-tier inspection hierarchy
(routine/principal/special) that all European systems still use. Documented inspector
variability as a universal quality problem. First systematic documentation of the
communal bridge data gap in France. Provides the baseline European context against which
DeepInspect's innovation is positioned.

---

### FHWA International Scan PL-08-016 (2008)
**Title:** Bridge Inspection Practices — International Technology Scanning  
**Authors:** Hartmann, J. et al. (FHWA scan team)  
**Year:** 2008  
**Publisher:** Federal Highway Administration  
**URL:** https://international.fhwa.dot.gov/pubs/pl08016/pl08016.pdf  
**Relevance:** American engineers' external perspective on Danish, Finnish, French, and
German inspection systems. Key finding relevant to DeepInspect: scour assessment was
not integrated into routine inspection protocols in ANY of the four countries visited,
despite the US having formalized scour protocols after the 1987 Schoharie Creek collapse.
Validates the scour gap claim independently of Wardhana/Zhang.

---

### Pellegrino et al. (2021)
**Title:** Italian Guidelines for Classification and Risk Management of Existing Bridges  
**Authors:** Pellegrino, C. et al.  
**Journal:** MDPI Infrastructures, 6(4), 59  
**Year:** 2021  
**DOI:** https://doi.org/10.3390/infrastructures6040059  
**Relevance:** Open-access English summary of the Italian Linee Guida 2020. Explains
the multi-hazard H×V×E framework, the 5-level assessment hierarchy, and the Class of
Attention system. Primary reference for `country-systems/italy-linee-guida.md` and
`mappings/italian_coa_mapping.json`.

---

### Comparison of Rating Systems — MDPI (2023)
**Title:** Comparison of Bridge Condition Rating Systems Used in Different Countries  
**Authors:** Vosi, A.; Zanini, M.A.; Pellegrino, C.  
**Journal:** MDPI Applied Sciences, 13(2), 896  
**Year:** 2023  
**DOI:** https://doi.org/10.3390/app13020896  
**Relevance:** The most recent systematic comparison of national bridge rating systems
across Europe and North America. Provides quantitative comparison tables for scale
ranges, directionality, worst-component vs. averaging approaches, and inspection cycle
requirements. Directly supports the score mapping tables in `mappings/score_mappings.md`.

---

## 3. ML and AI for Bridge Defect Detection

### CODEBRIM — CVPR 2019
**Title:** CODEBRIM: Concrete Defect Bridge Image Segmentation Dataset  
**Authors:** Mundt, M.; Majumder, S.; Murali, S.; Panetsos, P.; Ramesh, V.  
**Conference:** IEEE/CVF Conference on Computer Vision and Pattern Recognition (CVPR)  
**Year:** 2019  
**DOI:** https://doi.org/10.1109/CVPR.2019.00312  
**Dataset:** https://zenodo.org/record/2620293  
**Relevance:** Introduced the first large-scale annotated dataset for bridge defect
classification from inspection images. 6 defect classes: crack, spalling, efflorescence,
exposed rebar, corrosion stain, bearing failure. Trained models achieve ~85% mAP on
element-level classification. Foundation dataset for DeepInspect's visual defect
taxonomy cross-reference. See `mappings/defects_to_codebrim.json`.

---

### dacl10k — WACV 2024
**Title:** dacl10k: Benchmark for Semantic Bridge Damage Segmentation  
**Authors:** Flotzinger, J.; Mörwald, P.; Krempl, G.; Kastner, S.  
**Conference:** IEEE Winter Conference on Applications of Computer Vision (WACV)  
**Year:** 2024  
**DOI:** https://doi.org/10.1109/WACV57701.2024.00055  
**Dataset:** https://dacl.ai/  
**Relevance:** State-of-the-art bridge damage segmentation dataset with 19 damage classes
and pixel-level annotation on 10,000+ images. Far larger and more detailed than CODEBRIM.
Includes classes not in CODEBRIM: woodrot, restained area, graffiti, protective equipment
failure. The benchmark for evaluating computer vision models on bridge inspection imagery.
See `mappings/defects_to_dacl10k.json` for DeepInspect category alignment.

---

### NEN 2767 ML Study — TU Delft (2019)
**Title:** Detecting Healthy Concrete in Bridges Using Images and Deep Learning  
**Authors:** Hüthwohl, P.; Lu, R.; Brilakis, I.  
**Journal:** Journal of Infrastructure Systems, ASCE, 25(3)  
**Year:** 2019  
**DOI:** https://doi.org/10.1061/(ASCE)IS.1943-555X.0000479  
**Relevance:** Demonstrated that CNN models trained on bridge inspection photographs
can predict NEN 2767 element condition scores within one condition class in ~85% of cases.
First major European study applying deep learning to national-standard bridge condition
rating. Validates the general approach of AI-based condition assessment and provides
a benchmark accuracy target for DeepInspect's visual assessment component.

---

## 4. Scour and Hydraulic Failure

### Lagasse et al. (FHWA HEC-18, 2012)
**Title:** Evaluating Scour at Bridges (HEC-18), 5th Edition  
**Authors:** Lagasse, P.F.; Zevenbergen, L.W.; Arneson, L.A.; Schall, J.D.; Clopper, P.E.  
**Publisher:** FHWA, Publication No. FHWA-HIF-12-003  
**Year:** 2012  
**URL:** https://www.fhwa.dot.gov/engineering/hydraulics/pubs/hif12003.pdf  
**Relevance:** The US federal standard for bridge scour evaluation. Defines scour types
(local, contraction, general/long-term), scour depth calculation methods, and the
framework for "scour critical" classification. Informs DeepInspect's scour agent logic
and the language used in field inspection scope recommendations.

---

### Johnson & Dock (1998)
**Title:** Scour Critical Bridges: Results from the First National Survey  
**Authors:** Johnson, P.A.; Dock, D.A.  
**Journal:** Journal of Infrastructure Systems, ASCE, 4(3), 93–100  
**Year:** 1998  
**DOI:** https://doi.org/10.1061/(ASCE)1076-0342(1998)4:3(93)  
**Relevance:** Documents the extent of the scour problem in the US: ~26,000 bridges
(of 600,000) classified as scour-critical at time of study. Provides statistical context
for the claim that scour is systematically under-addressed despite being the leading
collapse cause.

---

## 5. Degradation and Deterioration Modelling

### Frangopol, Kallen & van Noortwijk (2004)
**Title:** Probabilistic Models for Life-Cycle Performance of Deteriorating Structures  
**Authors:** Frangopol, D.M.; Kallen, M.J.; van Noortwijk, J.M.  
**Journal:** Progress in Structural Engineering and Materials, 6(4), 197–212  
**Year:** 2004  
**DOI:** https://doi.org/10.1002/pse.180  
**Relevance:** Foundational paper for probabilistic deterioration modelling. Covers
Markov chain models, gamma process models, and reliability-based lifetime prediction.
Informs the conceptual framework behind DeepInspect's Criterion 7 (Durability /
Time-Dependent Degradation) and the `remaining_service_life_years` output.

---

### Tuutti (1982) — Carbonation and Chloride Diffusion
**Title:** Corrosion of Steel in Concrete  
**Authors:** Tuutti, K.  
**Publisher:** Swedish Cement and Concrete Research Institute (CBI), Stockholm  
**Year:** 1982  
**Relevance:** The seminal model for reinforcement corrosion initiation in concrete.
Defines the two-phase model: initiation (carbonation/chloride front reaches rebar) +
propagation (active corrosion reducing cross-section). Fick's second law application
for chloride diffusion. The theoretical basis for DeepInspect's degradation model in
`backend/models/degradation.py`.

---

## 6. Inspection Quality and Consistency

### Moore et al. (FHWA-RD-01-020, 2001)
**Title:** Reliability of Visual Inspection for Highway Bridges  
**Authors:** Moore, M.; Phares, B.; Graybeal, B.; Rolander, D.; Washer, G.  
**Publisher:** FHWA, Report FHWA-RD-01-020  
**Year:** 2001  
**URL:** https://www.fhwa.dot.gov/publications/research/infrastructure/structures/01020/index.cfm  
**Relevance:** Documented that routine bridge inspections of the same bridge by different
inspectors produced ratings that varied by an average of 4–5 different condition states
for primary components, with 95% of ratings within 2 states of the mean. This is the
empirical basis for DeepInspect's "consistency advantage" claim. Inspector variability
is not a marginal problem — it is a fundamental limitation of human visual inspection.

---

## 7. Computer Vision and Structural Health Monitoring

### Ye et al. (2019)
**Title:** A Review on Deep Learning-Based Structural Health Monitoring of Civil Infrastructures  
**Authors:** Ye, X.W.; Jin, T.; Yun, C.B.  
**Journal:** Smart Structures and Systems, 24(5), 567–585  
**Year:** 2019  
**DOI:** https://doi.org/10.12989/sss.2019.24.5.567  
**Relevance:** Comprehensive review of deep learning applications for structural health
monitoring as of 2019. Covers vibration-based SHM, image-based defect detection, and
sensor fusion approaches. Places DeepInspect's computer vision approach in context of
the broader SHM research landscape.

---

## Quick Reference — Defect Dataset Papers

| Dataset | Year | Classes | Images | Annotation | Paper |
|---------|------|---------|--------|-----------|-------|
| CODEBRIM | 2019 | 6 | 1,590 images | Multi-label | CVPR 2019 |
| dacl10k | 2024 | 19 | 10,000+ | Pixel-level segmentation | WACV 2024 |
| CrackForest | 2016 | 1 (crack) | 118 | Pixel mask | IEEE Access |
| DeepCrack | 2019 | 1 (crack) | 537 | Pixel mask | Neurocomputing |
| Bridge Crack Dataset (BCD) | 2021 | 2 (crack/no crack) | 5,000+ | Image-level | Remote Sensing |
