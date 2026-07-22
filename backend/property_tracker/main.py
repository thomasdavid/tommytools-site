from __future__ import annotations

from collections import defaultdict
from datetime import date
from statistics import mean, median
from typing import Literal

from fastapi import Depends, FastAPI, HTTPException, Query
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy import desc, func, select
from sqlalchemy.orm import Session

from .config import PRICE_BANDS, get_settings
from .database import create_schema, get_session
from .models import PropertySale, ScrapeRun

settings = get_settings()
app = FastAPI(
    title="Tommy Tools Dublin Property API",
    version="1.0.0",
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
    areas: list[str],
    bands: list[str],
    property_types: list[str],
    date_from: date | None,
    date_to: date | None,
):
    statement = select(PropertySale)
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
    return statement


def finite_values(rows: list[PropertySale], field: str) -> list[float]:
    values: list[float] = []
    for row in rows:
        value = getattr(row, field)
        if isinstance(value, (int, float)):
            values.append(float(value))
    return values


@app.get("/")
def root() -> dict[str, str]:
    return {
        "name": "Tommy Tools Dublin Property API",
        "health": "/api/health",
        "docs": "/api/docs",
    }


@app.get("/api/health")
def health(session: Session = Depends(get_session)) -> dict[str, object]:
    total = session.scalar(select(func.count()).select_from(PropertySale)) or 0
    return {"status": "ok", "property_count": total}


@app.get("/api/meta")
def meta(session: Session = Depends(get_session)) -> dict[str, object]:
    areas = list(session.scalars(select(PropertySale.area).distinct().order_by(PropertySale.area)))
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

    return {
        "areas": [value for value in areas if value],
        "default_areas": [area for area in settings.default_areas if area in areas],
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
    areas: list[str] = Query(default=[]),
    bands: list[str] = Query(default=[]),
    property_types: list[str] = Query(default=[]),
    date_from: date | None = None,
    date_to: date | None = None,
    session: Session = Depends(get_session),
) -> dict[str, object]:
    rows = list(
        session.scalars(
            filtered_sales_statement(areas, bands, property_types, date_from, date_to)
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
    group_by: Literal["asking_band", "area", "property_type", "all"] = "asking_band",
    min_count: int = Query(default=1, ge=1, le=1000),
    areas: list[str] = Query(default=[]),
    bands: list[str] = Query(default=[]),
    property_types: list[str] = Query(default=[]),
    date_from: date | None = None,
    date_to: date | None = None,
    session: Session = Depends(get_session),
) -> dict[str, object]:
    rows = list(
        session.scalars(
            filtered_sales_statement(areas, bands, property_types, date_from, date_to)
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
        grouped[group].append(
            {"month": month, "value": aggregate, "count": len(values)}
        )

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
    limit: int = Query(default=100, ge=1, le=500),
    offset: int = Query(default=0, ge=0),
    areas: list[str] = Query(default=[]),
    bands: list[str] = Query(default=[]),
    property_types: list[str] = Query(default=[]),
    date_from: date | None = None,
    date_to: date | None = None,
    session: Session = Depends(get_session),
) -> dict[str, object]:
    base = filtered_sales_statement(areas, bands, property_types, date_from, date_to)
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
        "items": [
            {
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
                "area": row.area,
                "detail_url": row.detail_url,
            }
            for row in rows
        ],
    }
