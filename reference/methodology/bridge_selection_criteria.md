# Bridge Selection Criteria

## Purpose

This document defines the rules for selecting the 100 reference bridges used in DeepInspect V2 validation. Consistent selection criteria ensure the validation dataset is reproducible, representative, and free from systematic bias.

---

## Mandatory Requirements

Every selected bridge must satisfy all three of the following:

### 1. Official Condition Rating
The bridge must have a recorded condition rating in an authoritative national registry:
- **Norway**: NVDB Tilstandsgrad (0–3 scale) — field `condition_rating` in `datasets/norway-nvdb/bridges.json`
- **UK**: BCI score (0–100 scale) — from National Highways Open Data structures dataset
- **Sweden**: Trafikverket Tillståndsklass (0–4 scale) — from Trafikverket bridge database

Bridges with `condition_rating = null` or ratings older than **10 years** must be excluded unless no newer rating exists and the bridge is otherwise ideal for structural diversity.

### 2. Street View Coverage
The bridge must have usable Google Street View imagery confirming visibility of structural elements. This is a hard requirement because DeepInspect V2 analyses Street View frames.

**Verification procedure** (see [Street View Verification](#street-view-verification) section below).

### 3. OpenStreetMap Presence
The bridge must be tagged in OpenStreetMap with `bridge=yes` or equivalent, allowing location matching and metadata cross-referencing.

Search: `https://www.openstreetmap.org/` using the bridge name + municipality, or match by coordinates using Overpass API:
```
[out:json];
way["bridge"="yes"](around:200, {lat}, {lon});
out body;
```

---

## Target Composition

### By Country

| Country | Target Count | Minimum | Notes |
|---------|-------------|---------|-------|
| Norway | 50 | 40 | Primary validation country; NVDB has richest dataset |
| UK | 30 | 25 | National Highways BCI data; England only |
| Sweden | 20 | 15 | Trafikverket registry; supplement if Norway/UK fall short |
| **Total** | **100** | **80** | |

### By Condition Range (across all countries)

To avoid a biased distribution skewed toward good-condition bridges (which are over-represented in street-accessible locations):

| Condition Tier | Target % | Approx. Count |
|---------------|---------|--------------|
| OK (best) | 25% | ~25 bridges |
| FAIR | 35% | ~35 bridges |
| POOR | 25% | ~25 bridges |
| CRITICAL | 15% | ~15 bridges |

If CRITICAL bridges are under-represented (common, as poor bridges have restricted access), supplement with POOR-rated bridges and document the imbalance.

### By Structure Type

| Structure Type | Target % | Examples |
|---------------|---------|---------|
| Concrete (reinforced/prestressed) | 40% | Beam bridges, box girder, slab |
| Steel | 25% | Truss, plate girder, arch |
| Masonry / Stone | 15% | Arch, vaulted |
| Composite (steel-concrete) | 15% | Composite beam |
| Other / Timber | 5% | Historic, rural |

### By Geographic Spread

- Norway: minimum 3 different counties (fylker): e.g. Viken, Vestland, Trøndelag
- UK: minimum 3 different regions: e.g. North West, South East, West Midlands
- Sweden: minimum 2 different counties (län)

---

## Exclusion Criteria

Exclude a bridge if any of the following apply:

| Criterion | Reason |
|-----------|--------|
| Motorway bridges with no pedestrian/service road access | Street View imagery unavailable or unusable |
| Bridges under active major reconstruction | Condition rating reflects pre-works state, not current |
| Privately owned bridges with no public imagery | Cannot capture Street View frames |
| Pedestrian bridges not in national road registry | No official condition rating |
| Bridges with only satellite/aerial imagery | DeepInspect requires ground-level photography |
| Tunnels or culverts tagged as bridges | Different inspection methodology |

---

## Street View Verification

### Using the Static Metadata API

Before including a bridge, verify imagery exists using the Google Street View Static API metadata endpoint (free, no image download):

```
GET https://maps.googleapis.com/maps/api/streetview/metadata
    ?location={lat},{lon}
    &radius=50
    &key={YOUR_API_KEY}
```

A valid response has `"status": "OK"` and a `pano_id`. A `"status": "ZERO_RESULTS"` response means no Street View imagery within 50 metres — exclude the bridge or try a different lat/lon near the bridge deck.

### Python Snippet

```python
import requests

def check_street_view(lat: float, lon: float, api_key: str) -> dict:
    """
    Check Street View coverage at a coordinate.
    Returns dict with 'has_coverage' bool and metadata.
    """
    url = "https://maps.googleapis.com/maps/api/streetview/metadata"
    params = {
        "location": f"{lat},{lon}",
        "radius": 50,
        "key": api_key,
    }
    resp = requests.get(url, params=params, timeout=10)
    resp.raise_for_status()
    data = resp.json()
    return {
        "has_coverage": data.get("status") == "OK",
        "pano_id": data.get("pano_id"),
        "date": data.get("date"),
        "copyright": data.get("copyright"),
        "status": data.get("status"),
    }
```

### Alternative: Manual Verification

If no API key is available, verify via Google Maps street-level view:
1. Open `https://maps.google.com`
2. Navigate to the bridge coordinates
3. Drag the Street View person icon onto the road
4. Confirm orange road lines appear on the bridge approaches and/or deck
5. Record `verified_street_view: true` in `pilot_bridges.csv`

---

## Selection Workflow

1. Start with the full NVDB bridge list (`datasets/norway-nvdb/bridges.json`) filtered to bridges with `condition_rating != null`.
2. Stratify by condition tier (Tilstandsgrad 0–3 maps to OK/FAIR/POOR/CRITICAL).
3. Within each tier, randomly sample candidates weighted to achieve geographic spread.
4. For each candidate, run Street View metadata check.
5. Reject candidates with no coverage; draw next candidate from the same tier.
6. Verify OSM presence for each accepted bridge.
7. Record accepted bridges in `pilot_bridges.csv`.
8. Repeat for UK (BCI data) and Sweden (Trafikverket data).

---

## Record-Keeping

Each selected bridge is recorded in `pilot_bridges.csv` with:
- `bridge_id`: DeepInspect internal identifier (e.g. `NO-001`, `UK-001`, `SE-001`)
- `osm_id`: OpenStreetMap way or relation ID
- `country`, `city`, `name`, `lat`, `lon`
- `official_rating`, `rating_system`, `inspection_date`
- `structure_type`, `material`, `spans`
- Selection notes explaining any deviation from standard criteria

See `pilot_bridges.csv` for the full template.
