"""
Database engine and session factory.
Supports async SQLAlchemy with both PostgreSQL (production) and SQLite (demo mode).
"""
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine
from sqlalchemy.orm import DeclarativeBase

from config import settings


class Base(DeclarativeBase):
    pass


def _normalized_database_url(raw_url: str) -> str:
    if raw_url.startswith("postgres://"):
        return raw_url.replace("postgres://", "postgresql+asyncpg://", 1)
    if raw_url.startswith("postgresql://") and "+asyncpg" not in raw_url:
        return raw_url.replace("postgresql://", "postgresql+asyncpg://", 1)
    return raw_url


DATABASE_URL = _normalized_database_url(settings.DATABASE_URL)

engine_kwargs = {
    "echo": settings.LOG_LEVEL == "DEBUG",
    "pool_pre_ping": True,
}
if DATABASE_URL.startswith("sqlite"):
    pass
elif not DATABASE_URL.startswith("sqlite"):
    engine_kwargs.update(
        {
            "pool_size": 5,
            "max_overflow": 10,
            "pool_timeout": 30,
        }
    )

engine = create_async_engine(DATABASE_URL, **engine_kwargs)

async_session_factory = async_sessionmaker(
    engine,
    class_=AsyncSession,
    expire_on_commit=False,
)


async def get_session() -> AsyncSession:
    """Dependency for FastAPI endpoints."""
    async with async_session_factory() as session:
        yield session


async def init_db():
    """Create all tables (dev/demo mode)."""
    from db import models  # noqa: F401

    async with engine.begin() as conn:
        await conn.run_sync(Base.metadata.create_all)
