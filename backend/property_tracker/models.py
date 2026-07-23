from __future__ import annotations

from datetime import date, datetime, timezone

from sqlalchemy import Date, DateTime, Float, Index, Integer, String, Text
from sqlalchemy.orm import Mapped, mapped_column

from .database import Base


def utcnow() -> datetime:
    return datetime.now(timezone.utc)


class PropertySale(Base):
    __tablename__ = "property_sales"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    detail_url: Mapped[str] = mapped_column(Text, unique=True, nullable=False)
    source_page: Mapped[str | None] = mapped_column(Text)
    source_kind: Mapped[str] = mapped_column(String(32), default="unknown", index=True)
    quality_status: Mapped[str] = mapped_column(String(20), default="review", index=True)
    quality_notes: Mapped[str | None] = mapped_column(Text)
    sale_date: Mapped[date | None] = mapped_column(Date, index=True)
    sold_price_eur: Mapped[float | None] = mapped_column(Float)
    asking_price_eur: Mapped[float | None] = mapped_column(Float)
    delta_eur: Mapped[float | None] = mapped_column(Float)
    delta_pct: Mapped[float | None] = mapped_column(Float)
    asking_band: Mapped[str] = mapped_column(String(32), default="Unknown", index=True)
    property_type: Mapped[str] = mapped_column(String(120), default="Unknown", index=True)
    broad_property_type: Mapped[str] = mapped_column(String(32), default="Other", index=True)
    bedrooms: Mapped[int | None] = mapped_column(Integer)
    bathrooms: Mapped[int | None] = mapped_column(Integer)
    size_sqm: Mapped[float | None] = mapped_column(Float)
    address: Mapped[str] = mapped_column(Text, default="")
    county: Mapped[str] = mapped_column(String(60), default="Dublin", index=True)
    area: Mapped[str] = mapped_column(String(120), default="Other", index=True)
    first_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    last_seen_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    scraped_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)


Index("ix_property_sales_county_area_date", PropertySale.county, PropertySale.area, PropertySale.sale_date)
Index("ix_property_sales_quality_date", PropertySale.quality_status, PropertySale.sale_date)
Index("ix_property_sales_band_date", PropertySale.asking_band, PropertySale.sale_date)


class ScrapeRun(Base):
    __tablename__ = "scrape_runs"

    id: Mapped[int] = mapped_column(Integer, primary_key=True)
    mode: Mapped[str] = mapped_column(String(20), nullable=False)
    status: Mapped[str] = mapped_column(String(20), nullable=False, default="running")
    started_at: Mapped[datetime] = mapped_column(DateTime(timezone=True), default=utcnow)
    completed_at: Mapped[datetime | None] = mapped_column(DateTime(timezone=True))
    pages_scanned: Mapped[int] = mapped_column(Integer, default=0)
    listings_seen: Mapped[int] = mapped_column(Integer, default=0)
    inserted: Mapped[int] = mapped_column(Integer, default=0)
    updated: Mapped[int] = mapped_column(Integer, default=0)
    errors: Mapped[int] = mapped_column(Integer, default=0)
    message: Mapped[str | None] = mapped_column(Text)
