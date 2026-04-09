"""
Repository layer for bridge inspection data access.
All functions accept an AsyncSession and return ORM model instances.
"""

from datetime import datetime, timezone

from sqlalchemy import desc, select
from sqlalchemy.ext.asyncio import AsyncSession

from db.models import (
    AssessmentEvidenceLink,
    AssessmentRecord,
    AuditLogRecord,
    BridgeRecord,
    EvidenceRecord,
    TrendRecord,
)


async def save_bridge(
    session: AsyncSession,
    osm_id: str,
    name: str | None,
    lat: float,
    lon: float,
    **kwargs,
) -> BridgeRecord:
    """Upsert a bridge record by creating it or updating its metadata."""
    record = await session.get(BridgeRecord, osm_id)
    if record is not None:
        record.name = name or record.name
        record.lat = lat
        record.lon = lon
        for key, value in kwargs.items():
            if hasattr(record, key) and value is not None:
                setattr(record, key, value)
        record.updated_at = datetime.now(timezone.utc)
    else:
        record = BridgeRecord(osm_id=osm_id, name=name, lat=lat, lon=lon, **kwargs)
        session.add(record)

    await session.flush()
    return record


async def save_assessment(
    session: AsyncSession,
    bridge_id: str,
    risk_score: float,
    risk_tier: str,
    confidence: str | None = None,
    certificate_json: dict | None = None,
    report_json: dict | None = None,
) -> AssessmentRecord:
    """Persist a completed bridge assessment."""
    record = AssessmentRecord(
        bridge_id=bridge_id,
        risk_score=risk_score,
        risk_tier=risk_tier,
        confidence=confidence,
        certificate_json=certificate_json,
        report_json=report_json,
    )
    session.add(record)
    await session.flush()

    await _update_trend(session, bridge_id, risk_score, risk_tier)
    return record


async def save_evidence(
    session: AsyncSession,
    source_type: str,
    provider: str | None = None,
    source_url: str | None = None,
    confidence: float | None = None,
    payload: dict | None = None,
) -> EvidenceRecord:
    """Persist an evidence record."""
    record = EvidenceRecord(
        source_type=source_type,
        provider=provider,
        source_url=source_url,
        confidence=confidence,
        payload_json=payload or {},
    )
    session.add(record)
    await session.flush()
    return record


async def link_evidence(
    session: AsyncSession,
    assessment_id: str,
    evidence_id: str,
    used_for: str | None = None,
) -> AssessmentEvidenceLink:
    """Create a provenance link between an assessment and an evidence record."""
    link = AssessmentEvidenceLink(
        assessment_id=assessment_id,
        evidence_id=evidence_id,
        used_for=used_for,
    )
    session.add(link)
    await session.flush()
    return link


async def get_bridge_history(
    session: AsyncSession,
    osm_id: str,
    limit: int = 50,
) -> list[AssessmentRecord]:
    """Get assessment history for a bridge, newest first."""
    stmt = (
        select(AssessmentRecord)
        .where(AssessmentRecord.bridge_id == osm_id)
        .order_by(desc(AssessmentRecord.created_at))
        .limit(limit)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def detect_trend(session: AsyncSession, osm_id: str) -> TrendRecord | None:
    """Get the latest trend record for a bridge."""
    stmt = (
        select(TrendRecord)
        .where(TrendRecord.bridge_id == osm_id)
        .order_by(desc(TrendRecord.assessed_at))
        .limit(1)
    )
    result = await session.execute(stmt)
    return result.scalar_one_or_none()


async def get_escalations(session: AsyncSession, limit: int = 20) -> list[TrendRecord]:
    """Get bridges with escalating risk trends."""
    stmt = (
        select(TrendRecord)
        .where(TrendRecord.direction == "escalating")
        .order_by(desc(TrendRecord.assessed_at))
        .limit(limit)
    )
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def save_audit_log(
    session: AsyncSession,
    action: str,
    bridge_id: str | None = None,
    user_ip: str | None = None,
    duration_ms: float | None = None,
    status: str = "success",
    extra: dict | None = None,
) -> AuditLogRecord:
    """Persist an audit log entry."""
    record = AuditLogRecord(
        action=action,
        bridge_id=bridge_id,
        user_ip=user_ip,
        duration_ms=duration_ms,
        status=status,
        extra_json=extra or {},
    )
    session.add(record)
    await session.flush()
    return record


async def get_audit_logs_db(
    session: AsyncSession,
    limit: int = 100,
) -> list[AuditLogRecord]:
    """Get recent audit logs from database."""
    stmt = select(AuditLogRecord).order_by(desc(AuditLogRecord.created_at)).limit(limit)
    result = await session.execute(stmt)
    return list(result.scalars().all())


async def get_bridge_evidence(session: AsyncSession, osm_id: str) -> list[dict]:
    """Get evidence records linked to the latest assessment for a bridge."""
    latest = await get_bridge_history(session, osm_id, limit=1)
    if not latest:
        return []

    assessment = latest[0]
    stmt = (
        select(EvidenceRecord)
        .join(
            AssessmentEvidenceLink,
            AssessmentEvidenceLink.evidence_id == EvidenceRecord.id,
        )
        .where(AssessmentEvidenceLink.assessment_id == assessment.id)
    )
    result = await session.execute(stmt)
    records = result.scalars().all()
    return [
        {
            "id": record.id,
            "source_type": record.source_type,
            "provider": record.provider,
            "source_url": record.source_url,
            "confidence": record.confidence,
            "captured_at": (
                record.captured_at.isoformat() if record.captured_at else None
            ),
        }
        for record in records
    ]


async def _update_trend(
    session: AsyncSession,
    bridge_id: str,
    current_score: float,
    current_tier: str,
) -> TrendRecord | None:
    """Compare with the previous assessment and record the bridge risk trend."""
    stmt = (
        select(AssessmentRecord)
        .where(AssessmentRecord.bridge_id == bridge_id)
        .order_by(desc(AssessmentRecord.created_at))
        .offset(1)
        .limit(1)
    )
    result = await session.execute(stmt)
    previous = result.scalar_one_or_none()
    if not previous:
        return None

    delta = current_score - previous.risk_score
    if abs(delta) < 0.3:
        direction = "stable"
    elif delta > 0:
        direction = "escalating"
    else:
        direction = "improving"

    trend = TrendRecord(
        bridge_id=bridge_id,
        previous_tier=previous.risk_tier,
        current_tier=current_tier,
        previous_score=previous.risk_score,
        current_score=current_score,
        direction=direction,
        delta=round(delta, 2),
    )
    session.add(trend)
    await session.flush()
    return trend
