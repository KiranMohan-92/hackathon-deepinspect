# Germany — DIN 1076 / RI-EBW-PRÜF Bridge Inspection System

**Standard:** DIN 1076:1999 (Ingenieurbauwerke im Zuge von Straßen und Wegen — Überwachung und Prüfung)  
**Inspection guideline:** RI-EBW-PRÜF (Richtlinie zur einheitlichen Erfassung, Bewertung, Aufzeichnung und Auswertung von Ergebnissen der Bauwerksprüfungen nach DIN 1076)  
**Database:** SIB-Bauwerke (Straßeninformationsbank — Bauwerksdaten)  
**Database authority:** BASt (Bundesanstalt für Straßenwesen) — Federal Highway Research Institute  
**Bridge stock:** ~120,000 bridges on public roads (federal, state, district, municipal)  
**Federal roads only (Autobahn + Bundesstraßen):** ~52,000 bridges, total deck area ~40 million m²  

---

## Legal and Administrative Framework

DIN 1076 is a German national standard with legal force through its incorporation into
federal road administration requirements (Allgemeines Rundschreiben Straßenbau, ARS).
All bridges on federal roads (administered by the Länder on behalf of the federal
government) must be inspected per DIN 1076. State (Land) and municipal bridges follow
the same standard in practice, though enforcement varies.

**Inspection authority:** The 16 German states (Länder) manage inspections through their
Straßenbauverwaltungen. Results feed into SIB-Bauwerke at the federal level.

---

## Inspection Cycle

| Inspection Type | German Name | Frequency | Who |
|----------------|-------------|-----------|-----|
| Principal Inspection | Hauptprüfung | Every 6 years | Certified Bauwerksprüfer |
| Simple Inspection | Einfache Prüfung | Every 3 years (between Hauptprüfung) | Certified Bauwerksprüfer |
| Continuous Monitoring | Laufende Beobachtung | Ongoing | Road maintenance staff |
| Special Inspection | Sonderprüfung | As needed (after flood, collision, etc.) | Bauwerksprüfer |

The **Hauptprüfung** requires arm's-length inspection of all structural elements —
every part of the bridge must be reachable by the inspector (ladder, MEWP, rope access,
boat, diving as appropriate). This is the most comprehensive requirement in Europe.

---

## Three-Axis Rating System: S-V-D

Germany uses a unique three-dimensional rating system that separates structural concerns
by their primary consequence:

### Standsicherheit (S) — Structural Safety / Load-Carrying Capacity
**What it measures:** The ability of the bridge to carry its design loads without collapse.  
**Includes:** Cracks in primary structural members, section loss, foundation concerns,
scour, overloading damage, buckling, connection failures.  
**Scale:** 0 (no deficiency) to 4 (imminently unsafe)  
**Score 4 meaning:** Bridge is or could become unable to carry loads safely — closure warranted.

### Verkehrssicherheit (V) — Traffic Safety / User Safety
**What it measures:** Safety of bridge users (drivers, cyclists, pedestrians).  
**Includes:** Railing damage, surface defects creating hazards, poor drainage causing
ice risk, collision-damaged parapets, missing or damaged safety barriers.  
**Scale:** 0 to 4  
**Score 4 meaning:** Bridge poses immediate danger to users — closure or restriction warranted.

### Dauerhaftigkeit (D) — Durability / Long-term Integrity
**What it measures:** The trajectory of deterioration — how quickly the bridge is
degrading and when structural problems will develop.  
**Includes:** Corrosion of reinforcement (cover quality, carbonation front), concrete
quality, drainage adequacy, coating condition, joint and bearing condition.  
**Scale:** 0 to 4  
**Score 4 meaning:** Deterioration is so advanced that intervention is required now to
prevent imminent structural or safety problems.

---

## Zustandsnote (Overall Condition Grade)

The three S/V/D scores are combined into a single **Zustandsnote** (ZN) using a formula
that weights structural safety most heavily:

```
ZN = max(S, V, D) × 0.7 + mean(S, V, D) × 0.3
```

The formula ensures the worst axis dominates (via the 70% weight on max) while the
overall picture contributes (30% weight on mean).

**Zustandsnote scale:**

| ZN | Verbal Description | Maintenance Implication |
|----|-------------------|------------------------|
| 1.0–1.4 | Very good (Sehr gut) | No action needed |
| 1.5–1.9 | Good (Gut) | Routine maintenance |
| 2.0–2.4 | Satisfactory (Befriedigend) | Maintenance within next inspection cycle |
| 2.5–2.9 | Adequate (Ausreichend) | Maintenance planning required |
| 3.0–3.4 | Deficient (Nicht ausreichend) | Maintenance within 1-2 years |
| 3.5–3.9 | Insufficient (Ungenügend) | Urgent maintenance; possible load restriction |
| 4.0 | Dangerous (Gefährlich) | Immediate action; closure may be warranted |

**Network statistics (2023 BASt report):**
- ZN 1.0–2.4 (good to satisfactory): ~65% of federal road bridges
- ZN 2.5–2.9 (adequate): ~18%
- ZN 3.0–3.4 (deficient): ~12%
- ZN 3.5–4.0 (urgent/dangerous): ~5%

---

## OSA Damage Code System

The RI-EBW-PRÜF guideline mandates that every defect be documented with a three-part
**OSA code**: Ort (Location) — Schaden (Damage type) — Auswirkung (Effect/Consequence).

### Ort (Location) Code — Where is the defect?

The bridge is divided into standardized element groups:

| Code | Element Group |
|------|--------------|
| 11 | Foundation / Subsoil |
| 12 | Pile / Caisson |
| 21 | Abutment (Widerlager) |
| 22 | Pier (Pfeiler) |
| 31 | Main girder / Primary structure (Hauptträger) |
| 32 | Cross-beam / Diaphragm |
| 33 | Deck slab (Fahrbahnplatte) |
| 34 | Wearing surface (Fahrbahnbelag) |
| 41 | Bearing (Lager) |
| 42 | Expansion joint (Fahrbahnübergang) |
| 51 | Railing / Parapet (Geländer, Kappe) |
| 52 | Drainage (Entwässerung) |
| 53 | Waterproofing (Abdichtung) |
| 61 | Protective coating (Korrosionsschutz) |
| 99 | Other / General |

### Schaden (Damage Type) Code — What is the defect?

| Code | Damage Type |
|------|------------|
| 01 | Crack (Riss) |
| 02 | Spalling (Abplatzung) |
| 03 | Exposed reinforcement (Freiliegender Bewehrungsstahl) |
| 04 | Corrosion of steel (Korrosion) |
| 05 | Settlement / Displacement (Setzung, Verschiebung) |
| 06 | Deformation (Verformung) |
| 07 | Contamination (Verschmutzung) |
| 08 | Vegetation (Bewuchs) |
| 09 | Water infiltration / Moisture (Durchfeuchtung) |
| 10 | Section loss (Querschnittsverlust) |
| 11 | Mechanical damage (Mechanische Beschädigung) |
| 12 | Missing element (Fehlendes Bauteil) |

### Auswirkung (Effect) Code — What is the structural consequence?

| Code | Effect | S/V/D Impact |
|------|--------|-------------|
| 1 | No structural consequence | D only |
| 2 | Durability affected; structure not yet impaired | D |
| 3 | Serviceability impaired | V or D |
| 4 | Load capacity impaired | S |
| 5 | Load capacity significantly impaired; urgent action | S (critical) |

A complete defect entry looks like: **33-01-04** = Deck slab (33) / Crack (01) / Load
capacity impaired (04). This tells a maintenance engineer exactly what element has what
problem with what urgency, without reading a narrative.

---

## Inspector Qualification: Bauwerksprüfer

German bridge inspectors must hold the **Bauwerksprüfer** qualification issued by BASt.
Requirements:
- University degree in civil engineering (or equivalent)
- Minimum 2 years of practical bridge engineering experience
- Completion of BASt-approved bridge inspection training course
- Written and practical examination
- Recertification every 5 years

The Bauwerksprüfer certification is one of the two strictest inspector qualification
requirements in Europe (alongside Finland's licensed engineer requirement).

---

## Mapping to DeepInspect

| DIN 1076 / OSA Element | DeepInspect Criterion | Notes |
|------------------------|----------------------|-------|
| Standsicherheit (S) axis | Criteria 1, 2, 3, 4, 5, 6 | Physics-weighted fusion of safety criteria |
| Verkehrssicherheit (V) axis | Criterion 10 (serviceability), 11 (ancillary) | |
| Dauerhaftigkeit (D) axis | Criterion 7 (degradation), 8 (bearings/joints), 9 (deck) | |
| OSA Ort 11-12 (foundation/pile) | Criterion 1 (scour/foundations) | |
| OSA Schaden 01 (cracks) | Criteria 4, 5, 9 | |
| OSA Schaden 04 (corrosion) | Criteria 5, 7 | |
| OSA Auswirkung 4-5 (load capacity) | Criteria 1-3 | |

**DeepInspect → Zustandsnote mapping:**
- DeepInspect 1.0–1.9 → ZN 1.0–1.4
- DeepInspect 2.0–2.9 → ZN 1.5–2.4
- DeepInspect 3.0–3.9 → ZN 2.5–3.4
- DeepInspect 4.0–5.0 → ZN 3.5–4.0

See `../mappings/score_mappings.json` for the piecewise linear breakpoints.
See `../mappings/criteria_to_din1076_svd.json` for criterion-to-axis mapping.
