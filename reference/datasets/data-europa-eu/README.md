# EU Open Data Portal — Bridge Infrastructure Datasets

## Overview

The European Union Open Data Portal (data.europa.eu) aggregates open datasets from EU institutions, member state governments, and regional authorities. The portal provides a unified search API that indexes datasets from across Europe, making it a useful discovery layer for finding bridge and infrastructure datasets from countries beyond Norway and the UK.

**Portal**: https://data.europa.eu/
**API Documentation**: https://data.europa.eu/api/hub/

---

## API Reference

| Property | Value |
|----------|-------|
| Search Endpoint | `https://data.europa.eu/api/hub/search/datasets` |
| Format | JSON |
| Authentication | None required |
| Licence | Creative Commons CC BY 4.0 (portal itself) |
| Underlying dataset licences | Vary per dataset |

### Search Parameters

```
q=bridge+infrastructure     # Full-text search query
page=0                      # Zero-indexed page number
limit=20                    # Results per page (max 100)
filter[format]=CSV          # Filter by resource format
filter[country]=NO          # Filter by country code
```

### Response Structure

```json
{
  "result": {
    "count": 47,
    "items": [
      {
        "id": "http://data.europa.eu/88u/dataset/...",
        "title": {"en": "Bridge Condition Survey 2023"},
        "description": {"en": "..."},
        "publisher": {"name": "..."},
        "issued": "2024-01-15",
        "modified": "2024-03-01",
        "licence": "http://creativecommons.org/licenses/by/4.0/",
        "keywords": ["bridge", "infrastructure", "condition"],
        "distributions": [
          {
            "accessURL": "https://...",
            "downloadURL": "https://...",
            "format": "CSV",
            "byteSize": 1048576
          }
        ]
      }
    ]
  }
}
```

---

## Countries with Known Bridge Data Availability

Based on prior searches, the following countries publish bridge datasets discoverable via this portal:

| Country | Data Availability | Notes |
|---------|------------------|-------|
| Norway | High | NVDB is primary source (use dedicated script) |
| Germany | Medium | Bundesanstalt für Straßenwesen (BASt) publishes aggregate statistics |
| Netherlands | Medium | Rijkswaterstaat publishes structure condition data |
| Sweden | Medium | Trafikverket bridge registry (Bro- och tunneldatabasen) |
| Czech Republic | Low-Medium | SDB (Správa a Databáze Mostů) |
| Belgium | Low | Some regional datasets from Agentschap Wegen en Verkeer |
| France | Low | IQOA assessment data partially published |
| Italy | Low | Post-Morandi bridge (2018) data sharing improved |

---

## Output File

Running `download.py` produces `bridge_catalog.json`:

```json
{
  "fetched_at": "2025-04-02T10:00:00Z",
  "query": "bridge infrastructure",
  "total_found": 47,
  "downloadable_count": 23,
  "datasets": [
    {
      "id": "...",
      "title": "Bridge Condition Survey 2023",
      "publisher": "Rijkswaterstaat",
      "country": "NL",
      "licence": "CC BY 4.0",
      "formats": ["CSV", "JSON"],
      "download_urls": ["https://..."],
      "description": "..."
    }
  ]
}
```

---

## Usage

```bash
# Fetch bridge dataset catalog (metadata only)
python download.py --output-dir ./data

# Custom query
python download.py --query "pont infrastructure condition" --output-dir ./data

# Filter by country
python download.py --country NL --output-dir ./data

# Increase result count
python download.py --limit 100 --output-dir ./data
```

---

## Links

- EU Open Data Portal: https://data.europa.eu/
- API documentation: https://data.europa.eu/api/hub/
- SPARQL endpoint: https://data.europa.eu/sparql
- EU data licence information: https://data.europa.eu/en/training/what-are-open-data-licences
