# Norway NVDB Bridge Dataset

## Overview

The Norwegian National Road DataBase (NVDB) is maintained by Statens vegvesen (Norwegian Public Roads Administration) and contains detailed records for all public road infrastructure in Norway, including **16,971+ bridges** (as of early 2025).

NVDB data is published as open government data under the Norwegian Licence for Open Government Data (NLOD) 2.0, compatible with Creative Commons Attribution 4.0.

---

## API Reference

| Property | Value |
|----------|-------|
| Base URL | `https://nvdbapiles-v3.atlas.vegvesen.no/` |
| API Version | v3 |
| Authentication | None required |
| Rate Limit | ~4 req/s (be courteous — use 1 req/s) |
| Format | JSON |
| CORS | Open |

### Key Endpoints

```
GET /vegobjekter/{typeId}            # Fetch objects by type
GET /vegobjekttyper/{typeId}         # Fetch object type definition (data catalogue)
GET /vegobjekter/{typeId}/{id}       # Fetch single object by ID
GET /omrader/fylker                  # List of counties (fylker)
GET /omrader/kommuner                # List of municipalities (kommuner)
```

### Object Type 60 — Bru (Bridge)

NVDB uses numeric object type IDs. Object type **60** corresponds to **Bru** (Norwegian: Bridge).

> **Note**: The fetch script verifies this by querying `/vegobjekttyper/60` before downloading bridge records. If the object type name does not match "Bru", the script will warn and prompt confirmation.

### Fetch Parameters

```
inkluder=egenskaper,geometri,lokasjon   # Include properties, geometry, location
segmentering=true                        # Include road network segmentation
antall=1000                              # Page size (max 1000)
```

### Pagination

The API returns a `metadata` block with a `neste` (next) object containing the URL for the next page:

```json
{
  "metadata": {
    "antall": 1000,
    "returnert": 1000,
    "neste": {
      "start": "AbCdEf...",
      "href": "https://nvdbapiles-v3.atlas.vegvesen.no/vegobjekter/60?start=AbCdEf..."
    }
  },
  "objekter": [ ... ]
}
```

When `neste` is absent or `returnert < antall`, you have reached the last page.

---

## Data Fields

The following fields are extracted per bridge record:

| Field | NVDB Property ID | Description |
|-------|-----------------|-------------|
| `id` | (object ID) | Unique NVDB object identifier |
| `name` | 1078 | Bridge name (Navn på brua) |
| `coordinates` | geometry.wkt | WGS84 coordinates extracted from WKT |
| `road_reference` | lokasjon.vegsystemreferanser | Road network reference (e.g. EV6 S1D1 m0-450) |
| `construction_year` | 10277 | Year of construction (Byggeår) |
| `material` | 10278 | Primary material (Materiale): Betong, Stål, Tre, Stein, etc. |
| `span_count` | 10282 | Number of spans (Antall spenn) |
| `length` | 1081 | Total length in metres (Lengde) |
| `condition_rating` | 10362 | Official condition rating (Tilstandsgrad) 0–3 |

### Condition Rating Scale (Tilstandsgrad)

NVDB uses a 0–3 scale for condition ratings (where recorded):

| NVDB Value | Label | Description |
|-----------|-------|-------------|
| 0 | Ingen tilstandsgrad | No rating / not assessed |
| 1 | God | Good condition |
| 2 | Middels | Medium / fair condition |
| 3 | Dårlig | Poor condition |

This maps to DeepInspect tiers via `mappings/score_mappings.json` (Norway section).

---

## Output Files

Running `fetch_bridges.py` produces:

### `bridges.json`
Array of bridge objects:
```json
[
  {
    "id": 123456,
    "name": "Drammenselva bru",
    "coordinates": [10.1234, 59.7654],
    "road_reference": "EV18 S11D1 m250",
    "construction_year": 1978,
    "material": "Betong",
    "span_count": 3,
    "length": 145.0,
    "condition_rating": null
  }
]
```

### `bridges.csv`
Flat CSV with the same fields, one row per bridge. Suitable for import into pandas, QGIS, or Excel.

---

## Usage

```bash
# Metadata only (fast — shows record count and first page)
python fetch_bridges.py --metadata-only

# Fetch first 5 pages (5,000 bridges)
python fetch_bridges.py --max-pages 5 --output-dir ./data

# Fetch all bridges (17+ pages at 1000/page)
python fetch_bridges.py --output-dir ./data
```

---

## Data Quality Notes

- Not all bridges have condition ratings recorded — `condition_rating` may be `null`.
- Construction year and material fields have ~85% coverage; some older bridges lack these.
- Geometry is provided as WKT (Well-Known Text); the script extracts the first coordinate pair for point location.
- Road references use the Norwegian vegsystemreferanse format (e.g. `EV6 S1D1 m0–450`).
- For municipality/county filtering, use the `lokasjon.kommuner` and `lokasjon.fylker` fields.

---

## Links

- NVDB API documentation: https://nvdbapiles-v3.atlas.vegvesen.no/dokumentasjon/
- NVDB data catalogue (object types): https://datakatalogen.vegdata.no/
- NLOD 2.0 licence: https://data.norge.no/nlod/en/2.0
- Statens vegvesen open data portal: https://www.vegvesen.no/fag/teknologi/nasjonal-vegdatabank/
