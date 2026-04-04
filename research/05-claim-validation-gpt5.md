I read the four research files and checked the claims against agency reports, laws, papers, and vendor sources. Here is the validation.

1. CLAIM 1: Scour/hydraulic events cause 52-55% of all bridge collapses globally.  
VERDICT: PARTIALLY CORRECT  
EVIDENCE: Wardhana & Hadipriono (2003) found flood/scour caused about 53% of bridge failures in a U.S. dataset from 1989-2000. A later review cited in *Water* (2023) says U.S. flood/scour collapses were 53% for 1989-2000 and 47% for 1980-2012. FHWA/USGS also states scour is the leading cause of bridge failure in the U.S. I did not find a credible source supporting 52-55% as a global figure.  
SOURCE: [Wardhana & Hadipriono 2003](https://yetl.yabesh.ir/yetl1/handle/yetl/44308), [USGS/FHWA scour memo](https://water.usgs.gov/admin/memo/SW/sw96.10.html), [Water 2023 review](https://www.mdpi.com/2073-4441/15/15/2772)  
CORRECTION: “U.S. studies have found flood/scour or hydraulic causes account for roughly 47-53% of bridge collapses, depending on the period studied; this is not established as a global percentage.”

2. CLAIM 2: PLOS ONE 2026 benchmark found GPT-4o achieves 67.8% defect identification but only 16.41% severity evaluation and 22.61% maintenance recommendations.  
VERDICT: PARTIALLY CORRECT  
EVIDENCE: The paper exists and GPT-4o was the top recommended model with 67.80% overall accuracy. But 16.41% and 22.61% are the paper’s average accuracies for the task categories “severity evaluation” and “maintenance interval estimation” across models, not GPT-4o’s own scores.  
SOURCE: [PubMed record](https://pubmed.ncbi.nlm.nih.gov/41678462/), [PMC article](https://pmc.ncbi.nlm.nih.gov/articles/PMC12900301/)  
CORRECTION: “The February 12, 2026 PLOS ONE benchmark found GPT-4o had 67.80% overall accuracy; the benchmark as a whole showed very poor performance on severity evaluation (16.41% average) and maintenance interval estimation (22.61% average).”

3. CLAIM 3: Germany has ~39,500 bridges on federal highways with ~21% rated Zustandsnote 2.5+ (inadequate or worse).  
VERDICT: PARTIALLY CORRECT  
EVIDENCE: The bridge count is roughly right: official German sources put federal-highway bridges at about 40,000. The percentage is not right in current official data. Bundestag/BMV data for 2024 show, by bridge area, Zustandsnote 2.5+ is about 46.27% for Autobahnen and 41.65% for Bundesstraßen. Also, 2.5-2.9 is not “inadequate or worse”; BMV describes 3.0+ as the clearly worse categories.  
SOURCE: [Bundestag Drucksache 20/14188](https://dserver.bundestag.de/btd/20/141/2014188.pdf), [BMV bridge report](https://www.bmv.de/SharedDocs/DE/Anlage/K/presse/bruecken-an-bundesfernstrassen-bilanz-und-ausblick.pdf?__blob=publicationFile), [Bundestag WD 5 report](https://www.bundestag.de/resource/blob/1149794/WD-5-046-25.pdf)  
CORRECTION: “Germany has about 40,000 federal-highway bridges. In 2024, roughly 42-46% of bridge area was in Zustandsnote 2.5+, while roughly 10-12% was in 3.0+.”

4. CLAIM 4: France 2018 Senate report identified 25,000 bridges in poor condition and 840 at collapse risk.  
VERDICT: PARTIALLY CORRECT  
EVIDENCE: The report was not a 2018 report; it was a Senate report deposited on June 26, 2019, following the August 14, 2018 Morandi collapse. It does say at least 25,000 bridges are in poor structural condition. It also says 7% of state-managed bridges present a long-term collapse risk. Since the report says the non-conceded state network has about 12,000 bridges, that implies about 840, but the “840” is an inference, not the headline number stated directly.  
SOURCE: [French Senate report](https://www.senat.fr/rap/r18-609/r18-609_mono.html)  
CORRECTION: “The June 26, 2019 French Senate report said at least 25,000 bridges were in poor structural condition and that 7% of state-managed bridges presented a long-term collapse risk, implying roughly 840 on the non-conceded state network.”

5. CLAIM 5: FHWA study found inspectors disagree by 2+ points on NBI 0-9 scale for 95% of bridges.  
VERDICT: INCORRECT  
EVIDENCE: FHWA reported significant variability and said routine inspections produced, on average, four or five different rating values for the same primary components. But the published FHWA summary says 95% of ratings were within two points of the average, not that 95% disagreed by 2+ points.  
SOURCE: [FHWA Focus summary of the study](https://www.fhwa.dot.gov/publications/focus/01jan/bridge_study.cfm)  
CORRECTION: “FHWA found substantial inspector variability; ratings often differed, and 95% of ratings were within two points of the average, not 2+ points apart for 95% of bridges.”

6. CLAIM 6: No ISO/ASTM/EN standard exists for AI-assisted bridge inspection as of 2026.  
VERDICT: PARTIALLY CORRECT  
EVIDENCE: I found no official ISO/ASTM/EN standard specifically for AI-assisted bridge inspection. But there are now general AI standards and drafts, including ISO/IEC 42001, 42005, 42006, TS 42119-2, and an ASTM AI-assisted pavement testing work item. So the precise gap is “no bridge-inspection-specific AI standard found,” not “no relevant standard work exists at all.”  
SOURCE: [ISO/IEC 42001](https://www.iso.org/standard/42001), [ISO/IEC 42005](https://www.iso.org/standard/42005), [ISO/IEC 42006](https://www.iso.org/standard/42006), [ISO/IEC TS 42119-2](https://www.iso.org/standard/84127.html), [ASTM WK95270](https://store.astm.org/products-services/standards/workitem-wk95270)  
CORRECTION: “No ISO/ASTM/EN standard specifically for AI-assisted bridge inspection was identified, though general AI governance/testing standards and adjacent ASTM AI work now exist.”

7. CLAIM 7: IBM Inspecto deployed on Stenungsöbron bridge (Sweden) and Great Belt Link (Denmark).  
VERDICT: CONFIRMED  
EVIDENCE: IBM Research’s Inspecto project page explicitly lists inspection of the Stenungsöbron bridge with Trafikverket and the Great Belt Link with Sund & Bælt as success stories.  
SOURCE: [IBM Research Inspecto](https://research.ibm.com/projects/inspecto)  
CORRECTION: No correction needed.

8. CLAIM 8: DataGrid AI achieves sub-0.05mm crack width measurement accuracy.  
VERDICT: UNVERIFIED  
EVIDENCE: I found this only on Datagrid’s own marketing page. There is no public validation study, benchmark, or technical datasheet supporting it. The page is also internally shaky: it says cameras resolve cracks down to about 0.15 mm, while elsewhere claiming sub-0.05 mm measurement.  
SOURCE: [Datagrid blog page](https://datagrid.com/blog/ai-agent-identifies-cracks-deterioration-bridge-deck-photos)  
CORRECTION: “Datagrid markets high-precision crack measurement, but I found no public evidence verifying sub-0.05 mm accuracy.”

9. CLAIM 9: InSAR satellite monitoring achieves 1mm precision for settlement detection.  
VERDICT: PARTIALLY CORRECT  
EVIDENCE: Sixense says Atlas InSAR provides millimetric precision, specifically “up to 1 mm/year” and “2-3 mm precision on single measurement points.” The 2025 *Nature Communications* paper supports bridge monitoring usefulness but does not make a blanket 1 mm precision claim for all settlement detection.  
SOURCE: [Sixense Atlas InSAR](https://northernamerica.sixense-group.com/offer/monitoring/satellite-monitoring-atlas-insar), [Nature Communications 2025](https://www.nature.com/articles/s41467-025-64260-x)  
CORRECTION: “InSAR can provide millimetric deformation monitoring; vendor claims are up to 1 mm/year trend precision and about 2-3 mm for single points, not a universal 1 mm precision claim.”

10. CLAIM 10: The EU AI Act classifies infrastructure inspection AI as high-risk.  
VERDICT: PARTIALLY CORRECT  
EVIDENCE: The AI Act classifies as high-risk AI systems intended to be used as safety components in the management and operation of critical digital infrastructure, road traffic, or water/gas/heating/electricity. It does not explicitly say that all “infrastructure inspection AI” is high-risk. Whether an inspection system is high-risk depends on intended purpose and whether it is a safety component under Article 6 / Annex III.  
SOURCE: [EU AI Act, Regulation (EU) 2024/1689](https://eur-lex.europa.eu/eli/reg/2024/1689/oj)  
CORRECTION: “The EU AI Act can classify infrastructure inspection AI as high-risk when it is a safety component in critical-infrastructure management/operation, but it does not automatically classify all inspection AI that way.”

11. CLAIM 11: COST Action TU1406 found no two European countries use the same bridge rating system.  
VERDICT: PARTIALLY CORRECT  
EVIDENCE: TU1406 clearly found major fragmentation and “large disparity” in how European bridge performance indicators are quantified and specified. I did not find a TU1406 source stating the exact absolute claim that no two countries use the same system. A later survey groups countries into a few common rating-approach families, which suggests the literal claim is too strong.  
SOURCE: [COST TU1406 page](https://www.cost.eu/cost-action/quality-specifications-for-roadway-bridges-standardization-at-a-european-level-bridgespec/), [Survey paper](https://doi.org/10.1007/978-3-030-91877-4_2)  
CORRECTION: “TU1406 found strong cross-country fragmentation and lack of harmonisation in European bridge rating/inspection systems; the claim that literally no two countries use the same system is not supported by the sources I found.”

12. CLAIM 12: DeepInspect's architecture (VLM perception + physics constraints) has no direct competitor.  
VERDICT: UNVERIFIED  
EVIDENCE: I did not find a public product matching the exact combination of bridge screening from public imagery plus VLM reasoning plus physics-weighted multi-criteria scoring. But I did find adjacent competitors: IBM Inspecto uses large vision models for infrastructure inspection, and Bentley/Blyncsy uses Google Street View plus AI for roadway inspection and asset analytics. “No direct competitor” is a market claim I cannot prove rigorously from public sources.  
SOURCE: [IBM Inspecto](https://research.ibm.com/projects/inspecto), [Bentley Blyncsy](https://www.bentley.com/software/blyncsy/), [Bentley + Google press release](https://www.bentley.com/news/bentley-systems-partners-with-google-to-improve-infrastructure-through-asset-analytics/)  
CORRECTION: “I found no public system with the exact same stack and positioning, but adjacent competitors clearly exist; the stronger ‘no direct competitor’ claim remains unverified.”

If you want, I can turn this into a cleaned-up audit table you can drop back into the `research/` folder, with suggested replacement wording for each file.