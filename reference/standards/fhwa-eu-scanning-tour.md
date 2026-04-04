# FHWA European Scanning Tour — Bridge Inspection and Management Practices

**Type:** US Federal Highway Administration International Technology Scanning Program  
**Year:** 2008  
**Countries Visited:** Denmark, Finland, France, Germany  
**Report:** International Scan: Bridge Inspection Practices  
**Publication:** FHWA-PL-08-016  
**PDF:** https://international.fhwa.dot.gov/pubs/pl08016/pl08016.pdf  
**Scan Team Lead:** Joseph Hartmann, FHWA Office of Bridge Technology  

---

## Purpose of the Scan

The FHWA conducts international scanning tours to identify practices in other countries that
could improve US bridge inspection and management. This 2008 scan focused specifically on:
1. Principal inspection practices and protocols
2. Condition rating systems and documentation
3. Bridge management systems and data infrastructure
4. Qualifications and training of bridge inspectors

The scan is particularly valuable for DeepInspect because it provides American engineers'
observations of European systems — external perspective, not self-reporting.

---

## Country-by-Country Observations

### Denmark
- Inspections conducted every 5 years with interim visual checks annually
- Single national database (Danbro) covering all public bridges (~12,000 structures)
- Condition scale: 0-5 per element (0=as new, 5=failure)
- **Key finding:** Denmark had near-100% database coverage for state and regional bridges
  at time of visit — significantly ahead of France and Germany in data completeness
- Rating is element-based; overall bridge condition derived as weighted worst-element
- Danbro integrates cost modelling for maintenance prioritization

### Finland
- Finnish Bridge Register (Siltarekisteri) covers ~15,000 bridges
- Principal inspection every 5 years; general inspection every year
- Condition scale: 0-4 per component group (structure, wearing surface, equipment)
- **Key finding:** Finland uniquely required bridge inspectors to be licensed civil engineers
  with specific bridge inspection certification — the highest qualification requirement of
  the four countries visited
- All inspection reports filed electronically into central database within 30 days of inspection
- Winter inspection complications: ice, snow cover limits visual access to approximately
  6 months of reliable inspection windows per year

### France (IQOA)
- IQOA (Image Qualité des Ouvrages d'Art) system: classes 1, 2, 2E, 3, 3U
- 3-year inspection cycle for principal inspections
- ~240,000 bridges total; Cerema manages the reference database
- **Key finding:** FHWA team noted the "S" suffix system (immediate safety risk) as a
  particularly effective mechanism — any class can have an S appended to trigger immediate
  action regardless of the base condition rating
- French inspectors observed to be very systematic about element-by-element documentation
  with photographs linked to each defect
- Significant challenge: communal bridges (owned by municipalities, not the state) had
  far lower inspection rates and database coverage than departmental and national bridges

### Germany (DIN 1076)
- DIN 1076 principal inspections every 6 years; simpler visual check every 3 years
- Three-axis rating: Standsicherheit (S), Verkehrssicherheit (V), Dauerhaftigkeit (D)
- Each axis rated 0-4; composite Zustandsnote calculated
- **Key finding:** FHWA team highlighted the OSA coding system (Ort-Schaden-Auswirkung:
  Location-Damage-Effect) as the most systematic damage documentation approach of all
  four countries — each defect gets a 3-part code that captures where it is, what it is,
  and what structural effect it has
- BASt (Bundesanstalt für Straßenwesen) maintains SIB-Bauwerke database
- Inspector qualification: "Bauwerksprüfer" certification from BASt, requires engineering
  degree plus training

---

## Comparative Matrix (FHWA Observations)

| Criterion | Denmark | Finland | France | Germany |
|-----------|---------|---------|--------|---------|
| Inspection cycle | 5yr | 5yr | 3yr | 6yr (3yr interim) |
| Inspector qualification | Civil engineer | Licensed civil engineer + cert | Ingénieur + formation | Bauwerksprüfer (BASt) |
| Rating unit | Element | Component group | Component | Element (OSA coded) |
| Overall bridge score | Weighted worst | Average | Worst component | Zustandsnote formula |
| BMS/database | Danbro | Siltarekisteri | Iqoa-DB / Cerema | SIB-Bauwerke / BASt |
| Database completeness | Very high | High | Medium (national roads) | High (federal/state) |
| Underwater inspection | Diver required | Diver required | Diver or ROV | Diver required |

---

## Key Cross-Cutting Findings

### Finding 1: No Country Uses Remote Assessment
All four countries required physical access for principal inspections. None had developed
any systematic use of drone imagery, satellite data, or remote sensing for condition rating
at time of visit (2008). The FHWA team noted this as a potential area for development.

### Finding 2: Inspector Variability Is Universal
Despite different qualification requirements, all countries acknowledged inter-inspector
variability as a significant quality problem. Germany's OSA coding system was cited as
the most effective mitigation, but even with structured coding, assessments of crack
severity and corrosion extent varied between inspectors.

### Finding 3: Scour Assessment Gap
None of the four countries had integrated scour assessment into their routine bridge
inspection protocols at the time of the scan. All treated it as a separate hydraulic
engineering matter. The FHWA team (representing a US system that had developed NBIS
scour critical bridge protocols after the 1987 Schoharie Creek disaster) viewed this as
a significant safety gap in European practice.

### Finding 4: Cost Data Incomplete
France and Denmark had the most developed cost tracking in their bridge databases.
Germany and Finland had inspection condition data but limited integration with repair
cost records, making lifecycle cost optimization difficult.

---

## FHWA Recommendations to US Practice

The scan team recommended the US adopt several European practices:
1. **Worst-element logic** for network prioritization (France/Germany approach) rather
   than averaging across elements (common in some US state DOTs)
2. **Structured damage coding** analogous to Germany's OSA system
3. **Inspector certification** analogous to Finland's licensed engineer requirement
4. **Mandatory electronic filing** with photographic links, as practiced in Finland

---

## Relevance to DeepInspect

This report validates several DeepInspect design decisions:

1. **Scour gap confirmed:** The FHWA team's observation that no European country
   systematically inspects for scour validates DeepInspect Criterion 1's 0.25 weighting.
   DeepInspect fills a documented gap that existed in 2008 and persists today.

2. **Inspector variability confirmed:** The universal acknowledgment of inter-inspector
   variability across all four highly-developed inspection systems validates DeepInspect's
   consistency advantage claim.

3. **Remote assessment as innovation:** The scan team noted remote assessment as a
   development opportunity in 2008. DeepInspect represents that development, 17 years later.

4. **Documentation gap:** The finding that communal bridges in France are systematically
   under-inspected identifies a target market: thousands of small French municipal bridges
   that have never received a professional IQOA classification.
