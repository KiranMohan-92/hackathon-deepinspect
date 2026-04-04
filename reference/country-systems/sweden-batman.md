# Sweden — BaTMan Bridge and Tunnel Management System

**System name:** BaTMan (Bridge and Tunnel Management)  
**Authority:** Trafikverket (Swedish Transport Administration)  
**Public portal:** https://batman.trafikverket.se/  
**API access:** Read-only accounts available by request to Trafikverket  
**Bridge stock:** ~30,000 bridges on the state road network  
**Total structures in BaTMan:** ~45,000 (includes tunnels, retaining walls, noise barriers)  
**Inspection standard:** TRVINFRA-00084 (formerly BaTMan Inspection Manual)  

---

## Overview

BaTMan is Sweden's national bridge and tunnel management system, operated by Trafikverket
since 2012. It covers all structures on the state road network (statliga vägar) and is
also used by many municipalities and county administrative boards (länsstyrelserna) for
their own structure management.

BaTMan is notable for being publicly accessible: the portal at batman.trafikverket.se
allows any member of the public to view structure location, type, and condition data.
Full read-only API access is available to researchers and companies by application.

---

## Condition Classification System

BaTMan uses a **0–4 condition class scale** per element (same scale as Norway's Brutus,
compatible with Danish Danbro), with the overall bridge condition derived by aggregation:

| Condition Class | Swedish Name | Description |
|----------------|-------------|-------------|
| **0** | Inga anmärkningar (No remarks) | No defects. Element in as-built condition or fully renewed. |
| **1** | Ytliga skador (Surface damage) | Superficial defects. Durability slightly affected. No functional impact. |
| **2** | Ytliga, spridda skador (Surface, spread) | Moderate defects, spread across element. Durability noticeably affected. Functional impact minor. |
| **3** | Djupgående skador (Deep damage) | Defects penetrating to structural material. Function impaired. Maintenance required. |
| **4** | Allvarliga skador (Serious damage) | Serious defects. Structural safety affected. Urgent action required. |

The overall bridge condition class is determined by the **worst element condition class**,
with a weighting procedure for bridges with many elements:

```
If any element = class 4 → Bridge overall = class 4
If any primary structural element = class 3 → Bridge overall = class 3
Otherwise → Bridge overall = weighted average rounded up
```

---

## BaTMan Element Hierarchy

BaTMan uses a detailed component breakdown with standardized element codes:

### Superstructure Elements
| Code | Element | Typical Defects Tracked |
|------|---------|------------------------|
| 1100 | Main girder (concrete) | Cracking, spalling, exposed rebar, delamination |
| 1200 | Main girder (steel) | Corrosion, fatigue cracks, section loss |
| 1300 | Deck slab | Cracking, delamination, drainage blockage |
| 1400 | Wearing surface | Rutting, cracking, potholing |
| 1500 | Waterproofing | Leakage, blistering, edge failure |

### Substructure Elements
| Code | Element | Typical Defects Tracked |
|------|---------|------------------------|
| 2100 | Pier (concrete) | Cracking, carbonation, scour at base |
| 2200 | Abutment | Settlement, cracking, drainage failure |
| 2300 | Wing wall | Cracking, tilting, backfill erosion |
| 2400 | Foundation | Scour, settlement (often from NVDB/geo data) |

### Functional Elements
| Code | Element | Typical Defects Tracked |
|------|---------|------------------------|
| 3100 | Bearings (lager) | Rotation restriction, corrosion, displacement |
| 3200 | Expansion joints (fogar) | Seal failure, debris accumulation, step |
| 4100 | Safety railings (räcken) | Impact damage, corrosion, gap at posts |
| 4200 | Drainage (avvattning) | Blockage, damage, inadequate capacity |

---

## Inspection Cycle

| Inspection Type | Swedish Name | Frequency | Scope |
|----------------|-------------|-----------|-------|
| General inspection | Allmän besiktning | 1–2 years | Visual from accessible positions; no special access |
| Main inspection | Huvud-besiktning | 6 years | Arm's-length of all elements; full BaTMan entry |
| Special inspection | Speciell besiktning | As needed | NDT, diving, specialist investigation |

The 6-year main inspection cycle is the longest among the systems profiled here (tied
with Germany), reflecting Sweden's lower maintenance pressure relative to older bridge
stocks in France, Poland, and Italy.

---

## Network Condition Statistics (Trafikverket 2023)

| Condition Class | Approximate % |
|----------------|--------------|
| 0 (No remarks) | ~15% |
| 1 (Surface damage) | ~42% |
| 2 (Surface, spread) | ~28% |
| 3 (Deep damage) | ~13% |
| 4 (Serious damage) | ~2% |

~15% of Swedish state road bridges are in condition class 3 or 4 and require maintenance
attention. Sweden's bridge stock is generally in good condition, benefiting from:
- Relatively young average age compared to Western European stock
- Strong maintenance funding under Trafikverket's asset management framework
- Low de-icing salt use on many roads (sand/grit preferred in many regions)

However, the coastal and archipelago bridges face severe marine chloride exposure,
and the northern Norrland region has extreme freeze-thaw cycling.

---

## BaTMan Public Portal Features

The public portal (batman.trafikverket.se) provides:
- Map view of all structures with color-coded condition class
- Structure detail page: type, material, year built, span lengths, condition class history
- Inspection date and inspector type (not individual inspector names)
- Maintenance history (work orders completed)
- Download of structure data (CSV/Excel) for registered users

**For DeepInspect:** The BaTMan portal enables validation studies at scale — Swedish
bridges can be searched by location, and their official condition classes can be compared
against DeepInspect remote assessments.

---

## Swedish Bridge Specifics

### Timber Bridges
Sweden has a significant number of timber bridges (~1,500 on state network), reflecting
the availability of forest resources and tradition of timber construction. BaTMan
includes specific defect codes for timber elements (rot, insect damage, mechanical
damage). These are invisible to Street View-based visual assessment.

### Cold-Climate Challenges
- **Ice loading:** Northern river crossings experience ice pressure on piers during
  spring breakup — a structural load case not present in central European inspection
- **Permafrost zone:** Northern Norrland has some roads on permafrost-adjacent terrain
- **Inspection seasonality:** Snow and ice limit effective visual inspection to approximately
  May–October in northern Sweden

### High-Speed Rail Bridges
Trafikverket also manages approximately 4,000 railway bridges under a separate BaTMan
module. Railway bridge inspection is not covered in this profile (Trafikverket Rail is
a separate regulatory regime).

---

## Mapping to DeepInspect

BaTMan's 0-4 scale maps directly to Norway's Brutus (same scale, same concepts):

| DeepInspect Score | BaTMan Condition Class |
|-------------------|----------------------|
| 1.0–1.4 | 0 (No remarks) |
| 1.5–2.1 | 1 (Surface damage) |
| 2.2–3.1 | 2 (Surface, spread) |
| 3.2–4.0 | 3 (Deep damage) |
| 4.1–5.0 | 4 (Serious damage) |

For DeepInspect integration:
- Use the BaTMan public portal API for validation data retrieval
- Element-level condition class 3 or 4 on primary structural elements triggers
  the field inspection flag in DeepInspect output

See `../mappings/score_mappings.json` under `sweden_batman` for the machine-readable mapping.

**API request (read-only account required):**
```
GET https://batman.trafikverket.se/api/v1/objects?type=bridge&bbox={lon_min},{lat_min},{lon_max},{lat_max}
Authorization: Bearer {token}
```
Contact: Trafikverket Kundtjänst for API account registration.
