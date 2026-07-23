from __future__ import annotations

from collections.abc import Generator

from sqlalchemy import create_engine, inspect, text
from sqlalchemy.orm import DeclarativeBase, Session, sessionmaker

from .config import get_settings


class Base(DeclarativeBase):
    pass


settings = get_settings()
connect_args = {"check_same_thread": False} if settings.database_url.startswith("sqlite") else {}
engine = create_engine(
    settings.database_url,
    pool_pre_ping=True,
    connect_args=connect_args,
)
SessionLocal = sessionmaker(bind=engine, autoflush=False, expire_on_commit=False)


def get_session() -> Generator[Session, None, None]:
    with SessionLocal() as session:
        yield session


def create_schema() -> None:
    from . import models  # noqa: F401

    Base.metadata.create_all(bind=engine)

    # create_all does not add columns to an existing table. These small,
    # idempotent migrations keep the Render database compatible without a
    # separate migration service.
    inspector = inspect(engine)
    if "property_sales" not in inspector.get_table_names():
        return

    columns = {column["name"] for column in inspector.get_columns("property_sales")}
    additions = {
        "county": "VARCHAR(60) DEFAULT 'Dublin'",
        "source_kind": "VARCHAR(32) DEFAULT 'unknown'",
        "quality_status": "VARCHAR(20) DEFAULT 'review'",
        "quality_notes": "TEXT",
    }
    with engine.begin() as connection:
        for name, definition in additions.items():
            if name not in columns:
                connection.execute(text(f"ALTER TABLE property_sales ADD COLUMN {name} {definition}"))

        connection.execute(
            text("UPDATE property_sales SET county = 'Dublin' WHERE county IS NULL OR county = ''")
        )
        connection.execute(
            text(
                """
                UPDATE property_sales
                SET source_kind = CASE
                    WHEN detail_url LIKE 'sheet-import://%' OR source_page = 'Google Sheet import'
                        THEN 'sheet_import'
                    ELSE COALESCE(NULLIF(source_kind, ''), 'unknown')
                END
                WHERE source_kind IS NULL OR source_kind = '' OR source_kind = 'unknown'
                """
            )
        )
        connection.execute(
            text(
                "UPDATE property_sales SET quality_status = 'review' "
                "WHERE quality_status IS NULL OR quality_status = ''"
            )
        )
