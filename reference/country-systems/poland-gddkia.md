# Poland — GDDKiA Bridge Inspection System

**Authority:** GDDKiA (Generalna Dyrekcja Dróg Krajowych i Autostrad — General Directorate for National Roads and Motorways)  
**Legal basis:** Regulation of the Minister of Transport and Maritime Economy on technical conditions for public roads (Dz.U. 1999 Nr 43, poz. 430, with subsequent amendments)  
**Technical standard:** WT-2 (Wymagania Techniczne — Technical Requirements for Bridge Inspection)  
**Bridge stock (national roads):** ~8,600 bridges and viaducts on GDDKiA-managed network  
**Total Polish bridge stock:** ~70,000+ (including regional, municipal, railway)  
**Inspection database:** GDDKiA Bridge Management System (BMS)  
**Official data:** https://www.gddkia.gov.pl/pl/2551/Obiekty-mostowe  

---

## Administrative Context

Poland's road network is divided between:
- **National roads (drogi krajowe):** GDDKiA — 8,600 bridges, well-documented
- **Regional roads (drogi wojewódzkie):** 16 Marshal Offices (samorządy wojewódzkie) — variable quality
- **District roads (drogi powiatowe):** ~380 county councils — minimal systematic inspection
- **Municipal roads (drogi gminne):** Municipalities — largely uninspected

GDDKiA manages the best-documented portion of the Polish bridge stock. The regional, district,
and municipal networks — representing the majority of structures — have significantly less
systematic inspection coverage. This is a major market opportunity for DeepInspect.

---

## GDDKiA Condition Scale: 0–5

Poland uses a 6-state ordinal scale (ascending risk):

| State | Description | Structural Meaning | Action |
|-------|-------------|-------------------|--------|
| **0** | Excellent (Bardzo dobry) | New or recently reconstructed. No defects. | No action |
| **1** | Good (Dobry) | Minor aging. All structural functions intact. Cosmetic issues only. | Routine maintenance |
| **2** | Satisfactory (Dostateczny) | Moderate deterioration. Structure functional but showing defects. | Planned maintenance |
| **3** | Unsatisfactory (Niezadowalający) | Significant defects affecting durability. Function impaired. | Priority maintenance |
| **4** | Bad (Zły) | Serious defects. Load-carrying capacity reduced. Structural safety concerns. | Urgent repair; consider load restriction |
| **5** | Emergency (Awaryjny) | Pre-failure condition. Imminent risk to structural integrity. | Immediate closure; emergency intervention |

States 3–5 are classified as **"unsatisfactory or worse"** in GDDKiA reporting.

---

## Network Condition Statistics

**GDDKiA 2023 Annual Report — Bridge Condition:**

| State | Count | % of Network |
|-------|-------|-------------|
| 0 (Excellent) | 860 | ~10% |
| 1 (Good) | 3,100 | ~36% |
| 2 (Satisfactory) | 2,300 | ~27% |
| 3 (Unsatisfactory) | 1,460 | ~17% |
| 4 (Bad) | 580 | ~7% |
| 5 (Emergency) | ~300 | ~3% |

**~25% of GDDKiA bridges (states 3–5) are rated unsatisfactory or worse** — the highest
proportion among the national systems profiled in this library. This reflects the legacy
of Poland's post-war bridge construction program, which built large numbers of reinforced
concrete bridges in the 1950s-1970s using now-superseded design standards.

---

## Inspection Cycle and Method

| Inspection Type | Frequency | Method |
|----------------|-----------|--------|
| Annual inspection (Przegląd roczny) | Every year | Visual, ground level |
| Main inspection (Przegląd podstawowy) | Every 5 years | Arm's-length visual, all elements |
| Extended inspection (Przegląd rozszerzony) | As needed | NDT, specialist investigation |
| Emergency inspection (Przegląd doraźny) | After event | Post-flood, post-collision, post-seismic |

Inspector qualifications: Uprawnienia budowlane (building permit authority) in the
road/bridge specialty — equivalent to a licensed civil engineer with bridge experience.

---

## EU Structural Funds Impact

Poland has been a major recipient of EU cohesion and structural funds for infrastructure
since accession in 2004. A significant portion of these funds has been directed at:
1. New bridge construction on the A1, A2, A4 motorway corridors (funded ~80% by EU)
2. Rehabilitation of existing bridges on national and regional roads
3. BMS development and inspector training

The 2014-2020 programming period allocated approximately €1.5 billion for bridge
rehabilitation under the Infrastructure and Environment Operational Programme (POIiŚ).
The 2021-2027 period continues this investment.

**Result:** The proportion of bridges in states 0-1 has increased from ~30% in 2010
to ~46% in 2023, but the large pre-2004 stock continues to deteriorate.

---

## Age Distribution and Structural Type

GDDKiA bridge stock by construction era:

| Era | Approx. % | Dominant Type | Condition Concern |
|-----|-----------|--------------|------------------|
| Pre-1945 | ~5% | Masonry arch, riveted steel | Very old; variable condition |
| 1945–1970 | ~20% | Reinforced concrete, simple spans | Carbonation, rebar corrosion, poor cover |
| 1971–1990 | ~30% | Pre-stressed concrete, precast T-beams | Tendon condition unknown in many |
| 1991–2004 | ~20% | Cast-in-place concrete, some steel | Generally better; EU standards influence |
| 2005–present | ~25% | Modern reinforced/prestressed concrete, steel composite | Good condition; EU-standard design |

The 1945-1990 cohort (approximately 50% of the stock) represents the primary risk pool.
Many of these structures were designed without seismic consideration and with concrete
cover that is now insufficient for modern chloride environment requirements.

---

## Key Risk Factors for Poland

1. **De-icing salt exposure:** Heavy winter de-icing with chloride salts on all national
   roads since the 1970s. Many bridges from this era show advanced chloride-induced
   corrosion of reinforcement, particularly at deck edges and expansion joints.

2. **Heavy freight corridors:** Polish national roads carry significant east-west transit
   freight (TEN-T network). Overloading of older bridges designed for lighter loads is common.

3. **Scour on river crossings:** Poland has numerous Vistula, Odra, Bug, and San river
   crossings. Spring flooding and ice breakup create scour conditions; many older bridges
   lack scour protection or monitoring.

4. **Regional disparity:** Eastern and south-eastern Poland (Podkarpacie, Lubelskie) have
   significantly older bridge stock with lower maintenance investment than the western
   corridors (A2 Poznań-Warsaw, A4 Wrocław-Kraków).

---

## Mapping to DeepInspect

The Polish GDDKiA scale (0–5) is nearly identical in direction and concept to
DeepInspect (1–5), requiring only a simple offset and compression:

| DeepInspect Score | GDDKiA State |
|-------------------|-------------|
| 1.0–1.4 | 0 (Excellent) |
| 1.5–2.0 | 1 (Good) |
| 2.1–2.7 | 2 (Satisfactory) |
| 2.8–3.5 | 3 (Unsatisfactory) |
| 3.6–4.3 | 4 (Bad) |
| 4.4–5.0 | 5 (Emergency) |

This is the closest scale alignment of any European system to DeepInspect's 1-5 range,
making Poland an excellent initial validation partner for DeepInspect calibration studies.

See `../mappings/score_mappings.json` under `poland_gddkia` for the machine-readable mapping.
