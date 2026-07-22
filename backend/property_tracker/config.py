from __future__ import annotations

import os
from dataclasses import dataclass


SUPPORTED_COUNTIES = (
    "Dublin",
    "Carlow",
    "Kildare",
    "Wicklow",
)

DEFAULT_COUNTIES = ("Dublin",)

DEFAULT_AREAS = (
    "Blackrock",
    "Ballsbridge",
    "Ranelagh",
    "Killiney",
    "Dalkey",
    "Monkstown",
)

PRICE_BANDS = (
    "Under 500k",
    "500-700k",
    "700-900k",
    "900-1100k",
    "1100-1300k",
    "1300k+",
    "Unknown",
)


@dataclass(frozen=True)
class Settings:
    database_url: str
    cors_origins: tuple[str, ...]
    default_counties: tuple[str, ...]
    default_areas: tuple[str, ...]


def get_settings() -> Settings:
    database_url = os.getenv("DATABASE_URL", "sqlite:///./property_tracker.db").strip()
    if database_url.startswith("postgres://"):
        database_url = "postgresql+psycopg://" + database_url.removeprefix("postgres://")
    elif database_url.startswith("postgresql://"):
        database_url = "postgresql+psycopg://" + database_url.removeprefix("postgresql://")

    origins = tuple(
        value.strip()
        for value in os.getenv(
            "CORS_ORIGINS",
            "https://tommytools.dev,https://www.tommytools.dev,http://localhost:5500,http://127.0.0.1:5500",
        ).split(",")
        if value.strip()
    )

    default_counties = tuple(
        value.strip()
        for value in os.getenv("DEFAULT_COUNTIES", ",".join(DEFAULT_COUNTIES)).split(",")
        if value.strip()
    )

    defaults = tuple(
        value.strip()
        for value in os.getenv("DEFAULT_AREAS", ",".join(DEFAULT_AREAS)).split(",")
        if value.strip()
    )

    return Settings(
        database_url=database_url,
        cors_origins=origins,
        default_counties=default_counties,
        default_areas=defaults,
    )
