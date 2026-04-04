# Norway — Brutus / NVDB Bridge Inspection System

**System name:** Brutus (BRUkbarhet, Tilstand, Utseende, Sikkerhet — Usability, Condition, Appearance, Safety)  
**National road database:** NVDB (Nasjonal VegDataBank — National Road Database)  
**Authority:** Statens vegvesen (Norwegian Public Roads Administration, NPRA)  
**Bridge stock:** ~16,971 bridges on public roads (Statens vegvesen 2023 register)  
**Total structures including culverts and tunnels:** ~100,000+  
**NVDB API:** https://nvdbapiles-v3.atlas.vegvesen.no/  
**Public portal:** https://vegkart.atlas.vegvesen.no/  
**Investigative data release:** VG newspaper obtained full bridge condition dataset (2018)  

---

## NVDB — The Most Open Bridge Database in Europe

Norway's NVDB is exceptional in European context: it is a **publicly accessible REST API**
providing condition and attribute data for all structures on the public road network.
No other European country provides this level of public data access for individual bridges.

The VG (Verdens Gang) investigative journalism project in 2018 obtained and published
the full NVDB bridge condition dataset, making Norway the best-documented country for
third-party analysis of bridge condition.

**NVDB API access:**
```
Base URL: https://nvdbapiles-v3.atlas.vegvesen.no/
Object type 60 = Bridges (Bruer)
Object type 66 = Culverts (Stikkrenner)
Condition data: Tilstandsgrad (condition grade) per element
```

Key API endpoints:
- `GET /vegobjekter/60` — All bridge records
- `GET /vegobjekter/60/{id}` — Single bridge with all attributes
- `GET /vegobjekter/60/{id}/egenskaper` — Attributes including condition grades

---

## Brutus Condition Scale

Brutus uses a **0–4 condition scale per element** (ascending deterioration):

| Grade | Norwegian | Description | Action |
|-------|-----------|-------------|--------|
| **0** | Meget god (Very good) | No defects. As-built or recently renewed. | None |
| **1** | God (Good) | Slight aging. Cosmetic defects only. | Preventive maintenance |
| **2** | Middels (Moderate) | Defects affecting durability. Function intact. | Planned maintenance |
| **3** | Dårlig (Poor) | Significant defects. Structural function affected. | Priority maintenance |
| **4** | Meget dårlig (Very poor) | Serious defects. Structural safety concerns. | Urgent action; restriction possible |

Unlike most European systems, there is no "closure-warranted" level — grade 4 bridges
require urgent action and possible load restrictions but not automatic closure.
Closure decisions are made by the regional road authority (Statsforvalter) based on
engineering judgment.

---

## Inspection Structure

### Inspection Types

| Type | Norwegian Name | Frequency | Scope |
|------|---------------|-----------|-------|
| Annual inspection | Ettersyn | Annual | Visual from road level; note obvious changes |
| Main inspection | Hovedinspeksjon | Every 5 years | Arm's-length visual of all elements; full Brutus ratings |
| Special inspection | Spesialinspeksjon | As needed | NDT, underwater, structural analysis |

### Inspector Requirements
- Civil engineering degree (sivilingeniør or ingeniør) with bridge specialization
- Approval by Statens vegvesen
- Continuing professional development required for recertification

---

## Element-Based Assessment

Brutus divides each bridge into standardized elements:

| Element Group | Norwegian | Typical Elements |
|--------------|-----------|-----------------|
| Superstructure | Overbygning | Main girders, deck slab, cross-beams |
| Substructure | Underbygning | Piers, abutments, wing walls |
| Foundation | Fundament | Footings, piles, scour protection |
| Bearings | Lagre | Elastomeric, pot, sliding bearings |
| Expansion joints | Fuger | All expansion joint types |
| Road surface | Dekke | Wearing surface, waterproofing |
| Drainage | Drenering | Drains, scuppers, downpipes |
| Safety equipment | Sikkerhetsutstyr | Railings, barriers, signs |
| Other | Diverse | Lighting, inspection hatches, etc. |

Each element receives a Brutus condition grade (0–4). The **overall bridge condition**
is typically the worst element grade, though regional practice varies slightly in how
grades are aggregated for the NVDB database entry.

---

## Network Condition Statistics (NVDB 2023)

| Condition Grade | Count (bridges) | % of Network |
|----------------|----------------|-------------|
| 0 (Very good) | ~2,700 | ~16% |
| 1 (Good) | ~6,500 | ~38% |
| 2 (Moderate) | ~5,100 | ~30% |
| 3 (Poor) | ~2,200 | ~13% |
| 4 (Very poor) | ~470 | ~3% |

~16% of Norwegian bridges (grades 3–4) require maintenance attention. The Norwegian
bridge stock is generally in better condition than Poland or France, reflecting consistent
investment under Norway's oil-funded infrastructure budget. However, the harsh climate
(freeze-thaw cycles, marine environment on the coast, de-icing salts in mountain passes)
accelerates deterioration.

---

## Special Challenges in Norway

### Fjord Crossings
Norway has many bridges crossing fjords, where:
- Marine environment causes accelerated chloride-induced corrosion
- Strong tidal currents create unusual loading conditions
- Some crossings involve floating bridge technology (Bergsøysund, Nordhordland) —
  unique inspection challenges

### Mountain Passes
- Severe de-icing salt application on mountain pass roads
- Freeze-thaw cycles: 50–100 per year in mountain regions vs. 10–20 in coastal areas
- Short inspection windows due to snow cover (similar to Finland)

### High-Wind Suspension Bridges
The E39 coastal highway project (Fergefri E39) is developing several long-span
fjord crossings that will require new inspection methodologies.

---

## NVDB API Integration for DeepInspect

Norway's NVDB is the most tractable European national database for API integration:

```python
import requests

# Fetch all bridges in Norway with condition data
def get_norwegian_bridges(bbox=None):
    base = "https://nvdbapiles-v3.atlas.vegvesen.no"
    params = {
        "inkluder": "egenskaper,lokasjon",
        "segmentering": "false",
    }
    if bbox:
        params["kartutsnitt"] = f"{bbox['lon_min']},{bbox['lat_min']},{bbox['lon_max']},{bbox['lat_max']}"
    
    r = requests.get(f"{base}/vegobjekter/60", params=params)
    return r.json()

# Condition grade is in egenskaper with attributtnavn = "Tilstandsgrad"
```

This enables DeepInspect to:
1. Pull existing Brutus grades for any Norwegian bridge
2. Compare against DeepInspect's remote assessment of the same bridge
3. Build a validation dataset for calibrating score mappings

---

## Mapping to DeepInspect

| DeepInspect Score | Brutus Grade |
|-------------------|-------------|
| 1.0–1.4 | 0 (Very good) |
| 1.5–2.1 | 1 (Good) |
| 2.2–3.1 | 2 (Moderate) |
| 3.2–4.0 | 3 (Poor) |
| 4.1–5.0 | 4 (Very poor) |

See `../mappings/score_mappings.json` under `norway_brutus` for the machine-readable mapping.
