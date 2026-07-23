from __future__ import annotations

import argparse
import csv
import hashlib
import io
import logging
import os
from urllib.parse import quote
from urllib.request import Request, urlopen

from .database import SessionLocal, create_schema
from .helpers import clean_text, infer_county, parse_sale_date
from .quality import listing_quality
from .scraper import Listing, upsert_sale

LOGGER = logging.getLogger("sheet-import")


def optional_float(value: str | None) -> float | None:
    token = clean_text(value).replace("€", "").replace(",", "")
    if not token:
        return None
    try:
        return float(token)
    except ValueError:
        return None


def optional_int(value: str | None) -> int | None:
    number = optional_float(value)
    return int(number) if number is not None else None


def source_url(sheet_id: str, sheet_name: str) -> str:
    return (
        f"https://docs.google.com/spreadsheets/d/{sheet_id}/gviz/tq"
        f"?tqx=out:csv&sheet={quote(sheet_name)}"
    )


def download_csv(url: str) -> str:
    request = Request(url, headers={"User-Agent": "Mozilla/5.0"})
    with urlopen(request, timeout=60) as response:  # noqa: S310 - configured Google URL
        return response.read().decode("utf-8-sig")


def fallback_url(row: dict[str, str]) -> str:
    identity = "|".join(
        (
            clean_text(row.get("address")),
            clean_text(row.get("sale_date")),
            clean_text(row.get("sold_price_eur")),
        )
    )
    digest = hashlib.sha1(identity.encode("utf-8"), usedforsecurity=False).hexdigest()
    return f"sheet-import://{digest}"


def import_rows(csv_text: str, minimum_valid_rows: int = 1) -> tuple[int, int, int, int]:
    reader = csv.DictReader(io.StringIO(csv_text))
    rows = list(reader)
    if not rows:
        raise RuntimeError("The Google Sheet returned no data rows; refusing an empty import.")

    inserted = 0
    updated = 0
    skipped = 0
    valid_rows = 0

    with SessionLocal() as session:
        for row_number, row in enumerate(rows, start=2):
            detail_url = clean_text(row.get("detail_url")) or fallback_url(row)
            source_page = clean_text(row.get("source_page")) or "Google Sheet import"
            address = clean_text(row.get("address"))
            sale_date = parse_sale_date(row.get("sale_date"))
            sold_price = optional_float(row.get("sold_price_eur"))
            asking_price = optional_float(row.get("asking_price_eur"))
            quality_status, quality_notes = listing_quality(
                sale_date,
                sold_price,
                asking_price,
                address,
            )
            if quality_status != "valid":
                skipped += 1
                LOGGER.warning("Skipping sheet row %s: %s", row_number, quality_notes)
                continue

            county = infer_county(address, source_page, row.get("county"))
            listing = Listing(
                detail_url=detail_url,
                source_page=source_page,
                sale_date=sale_date,
                sold_price_eur=sold_price,
                asking_price_eur=asking_price,
                property_type=clean_text(row.get("property_type")) or "Unknown",
                bedrooms=optional_int(row.get("bedrooms")),
                bathrooms=optional_int(row.get("bathrooms")),
                size_sqm=optional_float(row.get("size_sqm")),
                address=address,
                county=county,
                source_kind="sheet_import",
            )
            valid_rows += 1
            if upsert_sale(session, listing):
                inserted += 1
            else:
                updated += 1

        if valid_rows < minimum_valid_rows:
            session.rollback()
            raise RuntimeError(
                f"Only {valid_rows} valid sheet rows were found; minimum required is "
                f"{minimum_valid_rows}. No database changes were committed."
            )

        session.commit()

    return inserted, updated, skipped, len(rows)


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Import the Raw Google Sheet into PostgreSQL")
    parser.add_argument("--csv", help="Local CSV file; otherwise the Google GViz CSV URL is used")
    parser.add_argument(
        "--sheet-id",
        default=os.getenv("GOOGLE_SHEET_ID", "1teB5wZq7-SiBlohTapD-etsHpJcvak3st_dZVIKUMDw"),
    )
    parser.add_argument("--sheet-name", default=os.getenv("GOOGLE_SHEET_NAME", "Raw"))
    parser.add_argument(
        "--min-valid-rows",
        type=int,
        default=int(os.getenv("MIN_VALID_SHEET_ROWS", "5")),
        help="Abort without committing if fewer valid rows are present",
    )
    return parser.parse_args()


def main() -> None:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    args = parse_args()
    create_schema()
    if args.csv:
        with open(args.csv, "r", encoding="utf-8-sig", newline="") as handle:
            csv_text = handle.read()
    else:
        url = source_url(args.sheet_id, args.sheet_name)
        LOGGER.info("Downloading %s", url)
        csv_text = download_csv(url)

    inserted, updated, skipped, total = import_rows(csv_text, args.min_valid_rows)
    LOGGER.info(
        "Import complete: %s inserted, %s updated, %s skipped, %s source rows",
        inserted,
        updated,
        skipped,
        total,
    )


if __name__ == "__main__":
    main()
