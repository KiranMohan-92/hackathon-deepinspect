"""
SQLAlchemy ORM models for bridge inspection persistence.

Tables:
  - bridges: Stable bridge identity (osm_id PK)
  - assessments: One row per analysis run
  - assessment_events: SSE events for audit trail
  - evidence_records: Data sources consumed (Street View, Overpass, Gemini)
  - assessment_evidence_links: Provenance: which evidence used in which assessment
  - trends: Tier escalation/improvement tracking
  - audit_logs: Replaces in-memory audit_logs list
"""
import uuid
from datetime import datetime, timezone

from sqlalchemy import Column, DateTime, Float, ForeignKey, Index, Integer, JSON, String
from sqlalchemy.orm import relationship

from db.base import Base


def _uuid() -> str:
    return uuid.uuid4().hex


class BridgeRecord(Base):
    """Stable bridge identity - one row per physical bridge."""

    __tablename__ = "bridges"

    osm_id = Column(String(32), primary_key=True)
    name = Column(String(255), nullable=True)
    lat = Column(Float, nullable=False)
    lon = Column(Float, nullable=False)
    road_class = Column(String(50), nullable=True)
    material = Column(String(100), nullable=True)
    construction_year = Column(Integer, nullable=True)
    max_weight_tons = Column(Float, nullable=True)
    first_seen_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    updated_at = Column(
        DateTime,
        default=lambda: datetime.now(timezone.utc),
        onupdate=lambda: datetime.now(timezone.utc),
    )

    assessments = relationship(
        "AssessmentRecord",
        back_populates="bridge",
        order_by="desc(AssessmentRecord.created_at)",
    )
    trends = relationship("TrendRecord", back_populates="bridge")


class AssessmentRecord(Base):
    """One completed bridge analysis run."""

    __tablename__ = "assessments"
    __table_args__ = (
        Index("ix_assessments_bridge_created", "bridge_id", "created_at"),
    )

    id = Column(String(32), primary_key=True, default=_uuid)
    bridge_id = Column(String(32), ForeignKey("bridges.osm_id"), nullable=False)
    risk_score = Column(Float, nullable=False)
    risk_tier = Column(String(20), nullable=False)
    confidence = Column(String(20), nullable=True)
    certificate_json = Column(JSON, nullable=True)
    report_json = Column(JSON, nullable=True)
    model_version = Column(String(20), default="3.0.0")
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    bridge = relationship("BridgeRecord", back_populates="assessments")
    events = relationship(
        "AssessmentEventRecord",
        back_populates="assessment",
        order_by="AssessmentEventRecord.sequence",
    )
    evidence_links = relationship(
        "AssessmentEvidenceLink",
        back_populates="assessment",
        cascade="all, delete-orphan",
    )


class AssessmentEventRecord(Base):
    """Individual SSE event within an assessment (audit trail)."""

    __tablename__ = "assessment_events"
    __table_args__ = (
        Index("ix_events_assessment_seq", "assessment_id", "sequence"),
    )

    id = Column(String(32), primary_key=True, default=_uuid)
    assessment_id = Column(String(32), ForeignKey("assessments.id"), nullable=False)
    agent = Column(String(50), nullable=False)
    event_type = Column(String(20), nullable=False)
    payload = Column(JSON, default=dict)
    sequence = Column(Integer, default=0)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    assessment = relationship("AssessmentRecord", back_populates="events")


class EvidenceRecord(Base):
    """Reusable evidence collected from external sources."""

    __tablename__ = "evidence_records"
    __table_args__ = (
        Index("ix_evidence_source_provider", "source_type", "provider"),
    )

    id = Column(String(32), primary_key=True, default=_uuid)
    source_type = Column(String(50), nullable=False)
    provider = Column(String(100), nullable=True)
    source_url = Column(String(1000), nullable=True)
    confidence = Column(Float, nullable=True)
    captured_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
    payload_json = Column(JSON, default=dict)

    assessment_links = relationship(
        "AssessmentEvidenceLink",
        back_populates="evidence_record",
    )


class AssessmentEvidenceLink(Base):
    """Provenance: which evidence records informed one assessment."""

    __tablename__ = "assessment_evidence_links"
    __table_args__ = (
        Index("ix_ael_assessment", "assessment_id"),
        Index("ix_ael_evidence", "evidence_id"),
    )

    id = Column(String(32), primary_key=True, default=_uuid)
    assessment_id = Column(String(32), ForeignKey("assessments.id"), nullable=False)
    evidence_id = Column(String(32), ForeignKey("evidence_records.id"), nullable=False)
    used_for = Column(String(50), nullable=True)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    assessment = relationship("AssessmentRecord", back_populates="evidence_links")
    evidence_record = relationship("EvidenceRecord", back_populates="assessment_links")


class TrendRecord(Base):
    """Tracks risk tier changes over time for a bridge."""

    __tablename__ = "trends"
    __table_args__ = (
        Index("ix_trends_bridge_assessed", "bridge_id", "assessed_at"),
        Index("ix_trends_direction_assessed", "direction", "assessed_at"),
    )

    id = Column(String(32), primary_key=True, default=_uuid)
    bridge_id = Column(String(32), ForeignKey("bridges.osm_id"), nullable=False)
    previous_tier = Column(String(20), nullable=True)
    current_tier = Column(String(20), nullable=False)
    previous_score = Column(Float, nullable=True)
    current_score = Column(Float, nullable=False)
    direction = Column(String(20), nullable=False)
    delta = Column(Float, nullable=False)
    assessed_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))

    bridge = relationship("BridgeRecord", back_populates="trends")


class AuditLogRecord(Base):
    """Immutable audit log - replaces in-memory audit_logs list."""

    __tablename__ = "audit_logs"
    __table_args__ = (
        Index("ix_audit_logs_created", "created_at"),
        Index("ix_audit_logs_action", "action"),
    )

    id = Column(String(32), primary_key=True, default=_uuid)
    action = Column(String(100), nullable=False)
    bridge_id = Column(String(32), nullable=True)
    user_ip = Column(String(45), nullable=True)
    duration_ms = Column(Float, nullable=True)
    status = Column(String(20), default="success")
    extra_json = Column(JSON, default=dict)
    created_at = Column(DateTime, default=lambda: datetime.now(timezone.utc))
