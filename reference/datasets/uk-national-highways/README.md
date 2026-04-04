# UK National Highways — Structures Open Data

## Overview

National Highways (formerly Highways England) publishes open data for the road structures it manages across England's Strategic Road Network (SRN). This includes bridges, tunnels, gantries, retaining walls, and other highway structures on motorways and A-roads.

**Data Portal**: https://opendata.nationalhighways.co.uk/
**API**: CKAN-compatible REST API

---

## Important Note: TRIS Retirement (Early 2025)

The **Transport Research Information System (TRIS)** was retired in early 2025. Bridge condition data previously available through TRIS has been migrated to the new National Highways Open Data portal. If you encounter references to TRIS in older documentation, use the CKAN portal instead.

---

## Bridge Condition Index (BCI)

The primary condition metric for UK highway structures is the **Bridge Condition Index (BCI)**:

| Property | Value |
|----------|-------|
| Scale | 0 to 100 |
| Direction | Higher = better condition |
| Threshold — Good | BCI ≥ 85 |
| Threshold — Fair | 60 ≤ BCI < 85 |
| Threshold — Poor | 40 ≤ BCI < 60 |
| Threshold — Critical | BCI < 40 |

### Mapping to DeepInspect Scale (0–10)

```
DeepInspect = (BCI / 100) × 10
```

A more nuanced mapping (accounting for non-linearity) is defined in `mappings/score_mappings.json` under the `uk_national_highways` key.

---

## API Reference

| Property | Value |
|----------|-------|
| API Base | `https://opendata.nationalhighways.co.uk/api/3/action/` |
| Format | JSON |
| Authentication | None (open data) |
| Licence | Open Government Licence v3.0 |

### Key Endpoints

```
GET /api/3/action/package_search?q=bridge+structure    # Search datasets
GET /api/3/action/package_show?id={dataset_id}         # Dataset metadata
GET /api/3/action/resource_show?id={resource_id}       # Resource metadata
```

### CKAN Response Structure

```json
{
  "success": true,
  "result": {
    "count": 12,
    "results": [
      {
        "id": "...",
        "title": "Bridge Condition Data 2024",
        "notes": "Annual condition survey results...",
        "resources": [
          {
            "id": "...",
            "url": "https://...",
            "format": "CSV",
            "name": "bridge_condition_2024.csv"
          }
        ]
      }
    ]
  }
}
```

---

## Coverage

- **Road types**: Motorways (M), A-roads managed by National Highways
- **Geographic scope**: England only (devolved nations have separate administrations)
  - Scotland: Transport Scotland
  - Wales: Transport for Wales / Welsh Government
  - Northern Ireland: DfI Roads
- **Structure types**: Bridges, culverts, tunnels, retaining walls, sign gantries, noise barriers
- **Update frequency**: Annual inspection cycle; BCI updated post-inspection

---

## Output File

Running `fetch_structures.py` produces `structures_metadata.json`:

```json
{
  "fetched_at": "2025-04-02T10:00:00Z",
  "total_datasets": 12,
  "datasets": [
    {
      "id": "abc123",
      "title": "Bridge Condition Data 2024",
      "description": "...",
      "licence": "OGL3",
      "resources": [
        {
          "id": "def456",
          "name": "bridge_condition_2024.csv",
          "format": "CSV",
          "url": "https://..."
        }
      ]
    }
  ]
}
```

---

## Usage

```bash
# Fetch dataset listing and save metadata
python fetch_structures.py --output-dir ./data

# Custom search query
python fetch_structures.py --query "bridge condition BCI" --output-dir ./data
```

---

## Related Standards

- BD 63 / CS 450: Management of Highway Structures
- BA 79: Assessment of existing bridges
- PAS 55 / ISO 55001: Asset management systems

## Links

- National Highways Open Data: https://opendata.nationalhighways.co.uk/
- OGL v3.0: https://www.nationalarchives.gov.uk/doc/open-government-licence/version/3/
- DMRB (Design Manual for Roads and Bridges): https://www.standardsforhighways.co.uk/dmrb/
