from __future__ import annotations

import argparse
import logging
import os

from sqlalchemy import delete, select

from .database import SessionLocal, create_schema
from .helpers import infer_area, infer_county
from .models import PropertySale
from .quality import listing_quality
from .scraper import COUNTY_TARGETS, parse_counties

LOGGER = logging.getLogger("property-data-maintenance")


def audit() -> tuple[int, int]:
    valid = 0
    review = 0
    with SessionLocal() as session:
        rows = list(session.scalars(select(PropertySale)))
        for row in rows:
            if row.detail_url.startswith("sheet-import://") or row.source_page == "Google Sheet import":
                row.source_kind = "sheet_import"
            elif row.source_kind in (None, "", "unknown"):
                row.source_kind = "daft_live" if row.detail_url.startswith("http") else "unknown"

            row.county = infer_county(row.address, row.source_page, row.county)
            row.area = infer_area(row.address, row.county)
            row.quality_status, row.quality_notes = listing_quality(
                row.sale_date,
                row.sold_price_eur,
                row.asking_price_eur,
                row.address,
            )
            if row.quality_status == "valid":
                valid += 1
            else:
                review += 1
        session.commit()
    LOGGER.info("Audit complete: %s valid, %s review", valid, review)
    return valid, review


def cleanup(county_slugs: list[str], remove_legacy: bool) -> int:
    counties = [COUNTY_TARGETS[slug] for slug in county_slugs]
    with SessionLocal() as session:
        statement = delete(PropertySale).where(PropertySale.county.in_(counties))
        if remove_legacy:
            statement = statement.where(
                (PropertySale.quality_status != "valid")
                | (PropertySale.source_kind != "daft_live")
            )
        else:
            statement = statement.where(PropertySale.quality_status != "valid")
        result = session.execute(statement)
        session.commit()
        deleted = int(result.rowcount or 0)
    LOGGER.info("Deleted %s records for %s", deleted, ", ".join(counties))
    return deleted


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Audit or clean stored property records")
    parser.add_argument("action", choices=("audit", "cleanup"))
    parser.add_argument(
        "--counties",
        default="dublin,carlow,kildare,wicklow",
        help="Comma-separated county slugs",
    )
    parser.add_argument(
        "--remove-legacy",
        action="store_true",
        help="Also remove non-live legacy imports after a successful scrape",
    )
    return parser.parse_args()


def main() -> None:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    create_schema()
    args = parse_args()
    if args.action == "audit":
        audit()
    else:
        audit()
        cleanup(parse_counties(args.counties), args.remove_legacy)


if __name__ == "__main__":
    main()
