from __future__ import annotations

import csv
import io
from collections import defaultdict
from datetime import date
from statistics import mean, median
from typing import Literal

from fastapi import Depends, FastAPI, Query
from fastapi.middleware.cors import CORSMiddleware
from fastapi.responses import StreamingResponse
from sqlalchemy import desc, func, or_, select
from sqlalchemy.orm import Session

from .config import PRICE_BANDS, get_settings
from .database import create_schema, get_session
from .models import PropertySale, ScrapeRun

settings = get_settings()
app = FastAPI(
    title="Tommy Tools Regional Property API",
    version="1.1.0",
    docs_url="/api/docs",
    redoc_url=None,
)
app.add_middleware(
    CORSMiddleware,
    allow_origins=list(settings.cors_origins),
    allow_credentials=False,
    allow_methods=["GET", "OPTIONS"],
    allow_headers=["*"],
)


@app.on_event("startup")
def startup() -> None:
    create_schema()


def filtered_sales_statement(
    counties: list[str],
    areas: list[str],
    bands: list[str],
    property_types: list[str],
    date_from: date | None,
    date_to: date | None,
    search: str | None = None,
):
    statement = select(PropertySale)
    if counties:
        statement = statement.where(PropertySale.county.in_(counties))
    if areas:
        statement = statement.where(PropertySale.area.in_(areas))
    if bands:
        statement = statement.where(PropertySale.asking_band.in_(bands))
    if property_types:
        statement = statement.where(PropertySale.broad_property_type.in_(property_types))
    if date_from:
        statement = statement.where(PropertySale.sale_date >= date_from)
    if date_to:
        statement = statement.where(PropertySale.sale_date <= date_to)
    if search and search.strip():
        token = f"%{search.strip()}%"
        statement = statement.where(
            or_(
                PropertySale.address.ilike(token),
                PropertySale.area.ilike(token),
                PropertySale.county.ilike(token),
                PropertySale.property_type.ilike(token),
            )
        )
    return statement


def finite_values(rows: list[PropertySale], field: str) -> list[float]:
    values: list[float] = []
    for row in rows:
        value = getattr(row, field)
        if isinstance(value, (int, float)):
            values.append(float(value))
    return values


def serialise_sale(row: PropertySale) -> dict[str, object]:
    return {
        "sale_date": row.sale_date.isoformat() if row.sale_date else None,
        "sold_price_eur": row.sold_price_eur,
        "asking_price_eur": row.asking_price_eur,
        "delta_eur": row.delta_eur,
        "delta_pct": row.delta_pct,
        "asking_band": row.asking_band,
        "property_type": row.property_type,
        "broad_property_type": row.broad_property_type,
        "bedrooms": row.bedrooms,
        "bathrooms": row.bathrooms,
        "size_sqm": row.size_sqm,
        "address": row.address,
        "county": row.county,
        "area": row.area,
        "detail_url": row.detail_url,
        "source_page": row.source_page,
        "first_seen_at": row.first_seen_at.isoformat() if row.first_seen_at else None,
        "last_seen_at": row.last_seen_at.isoformat() if row.last_seen_at else None,
        "scraped_at": row.scraped_at.isoformat() if row.scraped_at else None,
    }


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": "Tommy Tools Regional Property API",
        "health": "/api/health",
        "docs": "/api/docs",
        "source_data": "/api/properties",
        "csv_export": "/api/export.csv",
    }


@app.get("/api/health")
def health(session: Session = Depends(get_session)) -> dict[str, object]:
    total = session.scalar(select(func.count()).select_from(PropertySale)) or 0
    return {"status": "ok", "property_count": total}


@app.get("/api/meta")
def meta(session: Session = Depends(get_session)) -> dict[str, object]:
    counties = list(
        session.scalars(select(PropertySale.county).distinct().order_by(PropertySale.county))
    )
    area_rows = list(
        session.execute(
            select(PropertySale.county, PropertySale.area)
            .distinct()
            .order_by(PropertySale.county, PropertySale.area)
        )
    )
    types = list(
        session.scalars(
            select(PropertySale.broad_property_type)
            .distinct()
            .order_by(PropertySale.broad_property_type)
        )
    )
    last_run = session.scalar(select(ScrapeRun).order_by(desc(ScrapeRun.started_at)).limit(1))
    latest_sale = session.scalar(select(func.max(PropertySale.sale_date)))
    latest_scrape = session.scalar(select(func.max(PropertySale.scraped_at)))

    areas_by_county: dict[str, list[str]] = defaultdict(list)
    for county, area in area_rows:
        if county and area:
            areas_by_county[county].append(area)
    all_areas = sorted({area for values in areas_by_county.values() for area in values})

    return {
        "counties": [value for value in counties if value],
        "default_counties": [county for county in settings.default_counties if county in counties],
        "areas": all_areas,
        "areas_by_county": dict(areas_by_county),
        "default_areas": [area for area in settings.default_areas if area in all_areas],
        "price_bands": list(PRICE_BANDS),
        "property_types": [value for value in types if value],
        "latest_sale_date": latest_sale.isoformat() if latest_sale else None,
        "latest_scraped_at": latest_scrape.isoformat() if latest_scrape else None,
        "last_run": None
        if last_run is None
        else {
            "status": last_run.status,
            "mode": last_run.mode,
            "started_at": last_run.started_at.isoformat(),
            "completed_at": last_run.completed_at.isoformat() if last_run.completed_at else None,
            "pages_scanned": last_run.pages_scanned,
            "listings_seen": last_run.listings_seen,
            "inserted": last_run.inserted,
            "updated": last_run.updated,
            "errors": last_run.errors,
            "message": last_run.message,
        },
    }


@app.get("/api/summary")
def summary(
    counties: list[str] = Query(default=[]),
    areas: list[str] = Query(default=[]),
    bands: list[str] = Query(default=[]),
    property_types: list[str] = Query(default=[]),
    date_from: date | None = None,
    date_to: date | None = None,
    session: Session = Depends(get_session),
) -> dict[str, object]:
    rows = list(
        session.scalars(
            filtered_sales_statement(counties, areas, bands, property_types, date_from, date_to)
        )
    )
    sold = finite_values(rows, "sold_price_eur")
    asking = finite_values(rows, "asking_price_eur")
    delta_eur = finite_values(rows, "delta_eur")
    delta_pct = finite_values(rows, "delta_pct")

    return {
        "count": len(rows),
        "average_sold_price": mean(sold) if sold else None,
        "average_asking_price": mean(asking) if asking else None,
        "average_delta_eur": mean(delta_eur) if delta_eur else None,
        "median_delta_eur": median(delta_eur) if delta_eur else None,
        "average_delta_pct": mean(delta_pct) if delta_pct else None,
        "median_delta_pct": median(delta_pct) if delta_pct else None,
    }


@app.get("/api/trends")
def trends(
    metric: Literal["delta_eur", "delta_pct", "sold_price_eur", "asking_price_eur"] = "delta_pct",
    statistic: Literal["mean", "median"] = "mean",
    group_by: Literal["asking_band", "county", "area", "property_type", "all"] = "asking_band",
    min_count: int = Query(default=1, ge=1, le=1000),
    counties: list[str] = Query(default=[]),
    areas: list[str] = Query(default=[]),
    bands: list[str] = Query(default=[]),
    property_types: list[str] = Query(default=[]),
    date_from: date | None = None,
    date_to: date | None = None,
    session: Session = Depends(get_session),
) -> dict[str, object]:
    rows = list(
        session.scalars(
            filtered_sales_statement(counties, areas, bands, property_types, date_from, date_to)
            .where(PropertySale.sale_date.is_not(None))
            .order_by(PropertySale.sale_date)
        )
    )

    buckets: dict[tuple[str, str], list[float]] = defaultdict(list)
    for row in rows:
        value = getattr(row, metric)
        if not isinstance(value, (int, float)) or row.sale_date is None:
            continue
        month = row.sale_date.replace(day=1).isoformat()[:7]
        if group_by == "asking_band":
            group = row.asking_band
        elif group_by == "county":
            group = row.county
        elif group_by == "area":
            group = row.area
        elif group_by == "property_type":
            group = row.broad_property_type
        else:
            group = "All selected properties"
        buckets[(group or "Unknown", month)].append(float(value))

    grouped: dict[str, list[dict[str, object]]] = defaultdict(list)
    for (group, month), values in buckets.items():
        if len(values) < min_count:
            continue
        aggregate = mean(values) if statistic == "mean" else median(values)
        grouped[group].append({"month": month, "value": aggregate, "count": len(values)})

    series = [
        {"name": group, "points": sorted(points, key=lambda point: point["month"])}
        for group, points in sorted(grouped.items())
    ]
    return {
        "metric": metric,
        "statistic": statistic,
        "group_by": group_by,
        "series": series,
    }


@app.get("/api/properties")
def properties(
    limit: int = Query(default=100, ge=1, le=1000),
    offset: int = Query(default=0, ge=0),
    counties: list[str] = Query(default=[]),
    areas: list[str] = Query(default=[]),
    bands: list[str] = Query(default=[]),
    property_types: list[str] = Query(default=[]),
    search: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    session: Session = Depends(get_session),
) -> dict[str, object]:
    base = filtered_sales_statement(
        counties, areas, bands, property_types, date_from, date_to, search
    )
    total = session.scalar(select(func.count()).select_from(base.subquery())) or 0
    rows = list(
        session.scalars(
            base.order_by(desc(PropertySale.sale_date), PropertySale.address)
            .offset(offset)
            .limit(limit)
        )
    )
    return {
        "offset": offset,
        "limit": limit,
        "total": total,
        "items": [serialise_sale(row) for row in rows],
    }


@app.get("/api/export.csv")
def export_csv(
    limit: int = Query(default=50_000, ge=1, le=100_000),
    counties: list[str] = Query(default=[]),
    areas: list[str] = Query(default=[]),
    bands: list[str] = Query(default=[]),
    property_types: list[str] = Query(default=[]),
    search: str | None = None,
    date_from: date | None = None,
    date_to: date | None = None,
    session: Session = Depends(get_session),
) -> StreamingResponse:
    rows = list(
        session.scalars(
            filtered_sales_statement(
                counties, areas, bands, property_types, date_from, date_to, search
            )
            .order_by(desc(PropertySale.sale_date), PropertySale.county, PropertySale.area)
            .limit(limit)
        )
    )

    output = io.StringIO(newline="")
    writer = csv.writer(output)
    writer.writerow(
        [
            "sale_date", "county", "area", "address", "property_type",
            "broad_property_type", "bedrooms", "bathrooms", "size_sqm",
            "asking_price_eur", "sold_price_eur", "delta_eur", "delta_pct",
            "asking_band", "detail_url", "source_page", "first_seen_at",
            "last_seen_at", "scraped_at",
        ]
    )
    for row in rows:
        item = serialise_sale(row)
        writer.writerow([item[key] for key in (
            "sale_date", "county", "area", "address", "property_type",
            "broad_property_type", "bedrooms", "bathrooms", "size_sqm",
            "asking_price_eur", "sold_price_eur", "delta_eur", "delta_pct",
            "asking_band", "detail_url", "source_page", "first_seen_at",
            "last_seen_at", "scraped_at",
        )])

    headers = {"Content-Disposition": 'attachment; filename="property-sales.csv"'}
    return StreamingResponse(iter([output.getvalue()]), media_type="text/csv", headers=headers)
