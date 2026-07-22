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

    # create_all does not add columns to existing tables. Keep this small migration
    # here so existing Render databases gain the county field automatically.
    inspector = inspect(engine)
    if "property_sales" not in inspector.get_table_names():
        return
    columns = {column["name"] for column in inspector.get_columns("property_sales")}
    if "county" not in columns:
        with engine.begin() as connection:
            connection.execute(
                text("ALTER TABLE property_sales ADD COLUMN county VARCHAR(60) DEFAULT 'Dublin'")
            )
    with engine.begin() as connection:
        connection.execute(
            text("UPDATE property_sales SET county = 'Dublin' WHERE county IS NULL OR county = ''")
        )
