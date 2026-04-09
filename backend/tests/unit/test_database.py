"""Tests for database models and repository layer."""
import pytest
import pytest_asyncio
from sqlalchemy.ext.asyncio import create_async_engine, async_sessionmaker, AsyncSession

from db.base import Base
from db import models  # noqa: F401
from db import repository as repo


@pytest_asyncio.fixture
async def db_session():
    """Create an in-memory SQLite database for each test."""
    engine = create_async_engine("sqlite+aiosqlite:///:memory:")
    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)

    session_factory = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)
    async with session_factory() as session:
        yield session

    await engine.dispose()


class TestInitDb:
    @pytest.mark.asyncio
    async def test_creates_all_tables(self, db_session):
        from sqlalchemy import inspect as sa_inspect
        conn = await db_session.connection()
        raw_conn = await conn.get_raw_connection()

        def get_tables(connection):
            inspector = sa_inspect(connection)
            return inspector.get_table_names()

        tables = await conn.run_sync(get_tables)
        expected = {
            "bridges", "assessments", "assessment_events",
            "evidence_records", "assessment_evidence_links",
            "trends", "audit_logs",
        }
        assert expected == set(tables)


class TestBridgeRepository:
    @pytest.mark.asyncio
    async def test_save_bridge_creates_new(self, db_session):
        bridge = await repo.save_bridge(
            db_session, osm_id="123", name="Test Bridge",
            lat=51.1, lon=17.0, road_class="primary",
        )
        assert bridge.osm_id == "123"
        assert bridge.name == "Test Bridge"
        assert bridge.lat == 51.1

    @pytest.mark.asyncio
    async def test_save_bridge_upserts(self, db_session):
        await repo.save_bridge(db_session, "123", "Old Name", 51.0, 17.0)
        bridge = await repo.save_bridge(db_session, "123", "New Name", 51.1, 17.1)
        assert bridge.name == "New Name"
        assert bridge.lat == 51.1


class TestAssessmentRepository:
    @pytest.mark.asyncio
    async def test_save_assessment(self, db_session):
        await repo.save_bridge(db_session, "br1", "Bridge 1", 51.0, 17.0)
        assessment = await repo.save_assessment(
            db_session, bridge_id="br1",
            risk_score=3.5, risk_tier="HIGH", confidence="medium",
        )
        assert assessment.risk_score == 3.5
        assert assessment.risk_tier == "HIGH"
        assert assessment.bridge_id == "br1"

    @pytest.mark.asyncio
    async def test_get_history_newest_first(self, db_session):
        await repo.save_bridge(db_session, "br1", "B1", 51.0, 17.0)
        await repo.save_assessment(db_session, "br1", 2.0, "MEDIUM")
        await repo.save_assessment(db_session, "br1", 3.5, "HIGH")
        await repo.save_assessment(db_session, "br1", 1.5, "OK")

        history = await repo.get_bridge_history(db_session, "br1")
        assert len(history) == 3
        scores = [h.risk_score for h in history]
        # Newest first — last saved should be first
        assert scores[0] == 1.5

    @pytest.mark.asyncio
    async def test_get_history_respects_limit(self, db_session):
        await repo.save_bridge(db_session, "br1", "B1", 51.0, 17.0)
        for i in range(5):
            await repo.save_assessment(db_session, "br1", float(i + 1), "MEDIUM")

        history = await repo.get_bridge_history(db_session, "br1", limit=2)
        assert len(history) == 2


class TestTrendDetection:
    @pytest.mark.asyncio
    async def test_no_trend_for_first_assessment(self, db_session):
        await repo.save_bridge(db_session, "br1", "B1", 51.0, 17.0)
        await repo.save_assessment(db_session, "br1", 2.0, "MEDIUM")
        trend = await repo.detect_trend(db_session, "br1")
        assert trend is None

    @pytest.mark.asyncio
    async def test_stable_trend(self, db_session):
        await repo.save_bridge(db_session, "br1", "B1", 51.0, 17.0)
        await repo.save_assessment(db_session, "br1", 2.0, "MEDIUM")
        await repo.save_assessment(db_session, "br1", 2.1, "MEDIUM")

        trend = await repo.detect_trend(db_session, "br1")
        assert trend is not None
        assert trend.direction == "stable"

    @pytest.mark.asyncio
    async def test_escalating_trend(self, db_session):
        await repo.save_bridge(db_session, "br1", "B1", 51.0, 17.0)
        await repo.save_assessment(db_session, "br1", 2.0, "MEDIUM")
        await repo.save_assessment(db_session, "br1", 3.5, "HIGH")

        trend = await repo.detect_trend(db_session, "br1")
        assert trend is not None
        assert trend.direction == "escalating"
        assert trend.delta == 1.5

    @pytest.mark.asyncio
    async def test_improving_trend(self, db_session):
        await repo.save_bridge(db_session, "br1", "B1", 51.0, 17.0)
        await repo.save_assessment(db_session, "br1", 3.5, "HIGH")
        await repo.save_assessment(db_session, "br1", 2.0, "MEDIUM")

        trend = await repo.detect_trend(db_session, "br1")
        assert trend is not None
        assert trend.direction == "improving"
        assert trend.delta == -1.5

    @pytest.mark.asyncio
    async def test_get_escalations(self, db_session):
        await repo.save_bridge(db_session, "br1", "B1", 51.0, 17.0)
        await repo.save_bridge(db_session, "br2", "B2", 52.0, 18.0)

        await repo.save_assessment(db_session, "br1", 2.0, "MEDIUM")
        await repo.save_assessment(db_session, "br1", 4.0, "CRITICAL")  # escalating

        await repo.save_assessment(db_session, "br2", 3.0, "HIGH")
        await repo.save_assessment(db_session, "br2", 1.5, "OK")  # improving

        escalations = await repo.get_escalations(db_session)
        assert len(escalations) == 1
        assert escalations[0].bridge_id == "br1"


class TestEvidenceRepository:
    @pytest.mark.asyncio
    async def test_save_evidence(self, db_session):
        evidence = await repo.save_evidence(
            db_session, source_type="street_view",
            provider="Google", confidence=0.85,
        )
        assert evidence.source_type == "street_view"
        assert evidence.provider == "Google"

    @pytest.mark.asyncio
    async def test_link_evidence(self, db_session):
        await repo.save_bridge(db_session, "br1", "B1", 51.0, 17.0)
        assessment = await repo.save_assessment(db_session, "br1", 2.0, "MEDIUM")
        evidence = await repo.save_evidence(db_session, "overpass", provider="OpenStreetMap")
        link = await repo.link_evidence(db_session, assessment.id, evidence.id, used_for="scour")
        assert link.assessment_id == assessment.id
        assert link.evidence_id == evidence.id
        assert link.used_for == "scour"

    @pytest.mark.asyncio
    async def test_get_bridge_evidence(self, db_session):
        await repo.save_bridge(db_session, "br1", "B1", 51.0, 17.0)
        assessment = await repo.save_assessment(db_session, "br1", 2.0, "MEDIUM")
        ev1 = await repo.save_evidence(db_session, "street_view", provider="Google")
        ev2 = await repo.save_evidence(db_session, "overpass", provider="OSM")
        await repo.link_evidence(db_session, assessment.id, ev1.id, "vision")
        await repo.link_evidence(db_session, assessment.id, ev2.id, "scour")

        evidence = await repo.get_bridge_evidence(db_session, "br1")
        assert len(evidence) == 2
        types = {e["source_type"] for e in evidence}
        assert types == {"street_view", "overpass"}


class TestAuditLogRepository:
    @pytest.mark.asyncio
    async def test_save_audit_log(self, db_session):
        log = await repo.save_audit_log(
            db_session, action="analyze",
            bridge_id="br1", user_ip="127.0.0.1",
            duration_ms=150.5, status="success",
        )
        assert log.action == "analyze"
        assert log.bridge_id == "br1"

    @pytest.mark.asyncio
    async def test_get_audit_logs_newest_first(self, db_session):
        await repo.save_audit_log(db_session, action="scan")
        await repo.save_audit_log(db_session, action="analyze")

        logs = await repo.get_audit_logs_db(db_session, limit=10)
        assert len(logs) == 2
        assert logs[0].action == "analyze"
