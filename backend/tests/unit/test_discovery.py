import pytest
from agents.discovery_agent import (
    _compute_priority,
    _parse_raw,
    PROXIMITY_THRESHOLD_M,
    ROAD_PRIORITY,
)


class TestComputePriority:
    def test_motorway_highest_priority(self):
        score = _compute_priority("motorway", "Main Bridge", 2000)
        assert score >= 5.0

    def test_named_bridge_bonus(self):
        unnamed = _compute_priority("primary", None, 2000)
        named = _compute_priority("primary", "Historic Bridge", 2000)
        assert named > unnamed

    def test_age_bonus_over_60_years(self):
        young = _compute_priority("secondary", "Bridge", 2010)
        old = _compute_priority("secondary", "Bridge", 1960)
        assert old > young

    def test_age_bonus_over_40_years(self):
        young = _compute_priority("secondary", "Bridge", 2010)
        middle = _compute_priority("secondary", "Bridge", 1980)
        assert middle > young

    def test_unknown_road_class_defaults_to_one(self):
        score = _compute_priority("unknown_class", None, 2000)
        assert score == 1.0

    def test_residential_low_priority(self):
        score = _compute_priority("residential", None, 2020)
        assert score == 0.8

    def test_all_road_classes_have_priority(self):
        for road_class in ROAD_PRIORITY:
            score = _compute_priority(road_class, None, 2000)
            assert score > 0


class TestParseRaw:
    def test_deduplication_by_osm_id(self):
        raw = [
            {"osm_id": "123", "lat": 51.0, "lon": 17.0},
            {"osm_id": "123", "lat": 51.0, "lon": 17.0},
            {"osm_id": "456", "lat": 51.1, "lon": 17.1},
        ]
        result = _parse_raw(raw)
        assert len(result) == 2

    def test_deduplication_by_name(self):
        raw = [
            {
                "osm_id": "123",
                "lat": 51.0,
                "lon": 17.0,
                "name": "Main Bridge",
                "road_class": "primary",
            },
            {
                "osm_id": "456",
                "lat": 51.0,
                "lon": 17.0,
                "name": "Main Bridge",
                "road_class": "primary",
            },
        ]
        result = _parse_raw(raw)
        assert len(result) == 1

    def test_proximity_deduplication(self):
        raw = [
            {
                "osm_id": "123",
                "lat": 51.0,
                "lon": 17.0,
                "name": None,
                "road_class": "primary",
            },
            {
                "osm_id": "456",
                "lat": 51.0001,
                "lon": 17.0001,
                "name": None,
                "road_class": "primary",
            },
        ]
        result = _parse_raw(raw)
        assert len(result) == 1

    def test_year_parsing(self):
        raw = [
            {"osm_id": "123", "lat": 51.0, "lon": 17.0, "start_date": "1985-06-15"},
        ]
        result = _parse_raw(raw)
        assert result[0].construction_year == 1985

    def test_year_parsing_year_only(self):
        raw = [
            {"osm_id": "123", "lat": 51.0, "lon": 17.0, "start_date": "1985"},
        ]
        result = _parse_raw(raw)
        assert result[0].construction_year == 1985

    def test_weight_parsing(self):
        raw = [
            {"osm_id": "123", "lat": 51.0, "lon": 17.0, "maxweight": "25t"},
        ]
        result = _parse_raw(raw)
        assert result[0].max_weight_tons == 25.0

    def test_priority_sorting(self):
        raw = [
            {"osm_id": "123", "lat": 51.0, "lon": 17.0, "road_class": "residential"},
            {"osm_id": "456", "lat": 51.1, "lon": 17.1, "road_class": "motorway"},
        ]
        result = _parse_raw(raw)
        assert result[0].road_class == "motorway"

    def test_empty_input(self):
        result = _parse_raw([])
        assert result == []

    def test_invalid_year_ignored(self):
        raw = [
            {"osm_id": "123", "lat": 51.0, "lon": 17.0, "start_date": "invalid"},
        ]
        result = _parse_raw(raw)
        assert result[0].construction_year is None

    def test_invalid_weight_ignored(self):
        raw = [
            {"osm_id": "123", "lat": 51.0, "lon": 17.0, "maxweight": "invalid"},
        ]
        result = _parse_raw(raw)
        assert result[0].max_weight_tons is None


class TestRoadPriority:
    def test_motorway_link_less_than_motorway(self):
        assert ROAD_PRIORITY["motorway_link"] < ROAD_PRIORITY["motorway"]

    def test_trunk_equals_motorway_link(self):
        assert ROAD_PRIORITY["trunk"] == ROAD_PRIORITY["motorway_link"]

    def test_primary_less_than_trunk(self):
        assert ROAD_PRIORITY["primary"] < ROAD_PRIORITY["trunk"]

    def test_secondary_less_than_primary(self):
        assert ROAD_PRIORITY["secondary"] < ROAD_PRIORITY["primary"]

    def test_tertiary_less_than_secondary(self):
        assert ROAD_PRIORITY["tertiary"] < ROAD_PRIORITY["secondary"]

    def test_residential_lowest(self):
        assert ROAD_PRIORITY["residential"] < ROAD_PRIORITY["tertiary"]
