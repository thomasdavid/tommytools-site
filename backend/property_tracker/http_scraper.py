from __future__ import annotations

import argparse
import logging
import os
import random
import time
from datetime import datetime, timezone
from urllib.parse import urljoin

import httpx
from bs4 import BeautifulSoup

from .database import SessionLocal, create_schema
from .helpers import (
    clean_text,
    extract_int,
    extract_property_type,
    extract_sqm,
    infer_county,
    parse_sale_date,
)
from .models import ScrapeRun
from .quality import address_from_card_text, human_address, listing_quality
from .scraper import (
    COUNTY_TARGETS,
    Listing,
    list_url,
    money_after,
    parse_counties,
    upsert_sale,
)

LOGGER = logging.getLogger("property-http-scraper")

HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/124.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8",
    "Accept-Language": "en-IE,en;q=0.9",
    "Cache-Control": "no-cache",
}


def node_text(node) -> str:
    return clean_text(node.get_text(" ", strip=True)) if node is not None else ""


def parse_cards(html: str, source_page: str, source_county: str) -> list[Listing]:
    soup = BeautifulSoup(html, "html.parser")
    listings: list[Listing] = []

    for card in soup.select('li[data-testid^="result-"]'):
        link = card.select_one('a[href*="/sold/"]')
        href = clean_text(link.get("href") if link else "")
        if not href:
            continue

        card_text = node_text(card)
        address = node_text(card.select_one('[data-tracking="srp_address"]'))
        if not human_address(address):
            address = address_from_card_text(card_text)

        price_text = node_text(card.select_one('[data-tracking="srp_price"]')) or card_text
        meta_text = node_text(card.select_one('[data-tracking="srp_meta"]')) or card_text
        county = infer_county(address, source_page, source_county)

        listings.append(
            Listing(
                detail_url=urljoin("https://www.daft.ie", href),
                source_page=source_page,
                sale_date=parse_sale_date(card_text),
                sold_price_eur=money_after("Sold", price_text),
                asking_price_eur=money_after("Asking", price_text),
                property_type=extract_property_type(meta_text),
                bedrooms=extract_int(meta_text, "bed"),
                bathrooms=extract_int(meta_text, "bath"),
                size_sqm=extract_sqm(meta_text),
                address=address,
                county=county,
                source_kind="daft_live",
            )
        )

    return listings


def fetch_page(client: httpx.Client, url: str) -> str:
    response = client.get(url)
    response.raise_for_status()
    return response.text


def run_http_scrape(
    mode: str,
    max_pages: int | None,
    counties: list[str] | None = None,
) -> None:
    create_schema()
    start_year = int(os.getenv("SCRAPE_START_YEAR", "2025"))
    delay = float(os.getenv("SCRAPE_DELAY_SECONDS", "0.6"))
    configured_incremental_pages = int(os.getenv("INCREMENTAL_MAX_PAGES", "20"))
    configured_full_pages = int(os.getenv("FULL_MAX_PAGES", "500"))
    page_limit = max_pages or (
        configured_incremental_pages if mode == "incremental" else configured_full_pages
    )
    county_slugs = counties or parse_counties(os.getenv("SCRAPE_COUNTIES"))

    with SessionLocal() as session:
        run = ScrapeRun(mode=f"http-{mode}", status="running")
        session.add(run)
        session.commit()
        session.refresh(run)

        accepted_total = 0
        rejected_total = 0

        try:
            with httpx.Client(
                headers=HEADERS,
                follow_redirects=True,
                timeout=60.0,
            ) as client:
                for county_slug in county_slugs:
                    county_label = COUNTY_TARGETS[county_slug]
                    unchanged_pages = 0
                    county_accepted = 0
                    LOGGER.info("Starting HTTP scrape for %s", county_label)

                    for page_number in range(1, page_limit + 1):
                        source = list_url(county_slug, page_number, start_year)
                        LOGGER.info("Fetching %s page %s: %s", county_label, page_number, source)
                        html = fetch_page(client, source)
                        listings = parse_cards(html, source, county_label)

                        if not listings:
                            if page_number == 1:
                                raise RuntimeError(
                                    f"No sold listing cards found for {county_label} page 1; "
                                    "refusing to continue or clean existing data"
                                )
                            LOGGER.info("No cards on %s page %s; stopping county", county_label, page_number)
                            break

                        page_inserted = 0
                        page_updated = 0
                        page_rejected = 0
                        for listing in listings:
                            run.listings_seen += 1
                            quality_status, quality_notes = listing_quality(
                                listing.sale_date,
                                listing.sold_price_eur,
                                listing.asking_price_eur,
                                listing.address,
                            )
                            if quality_status != "valid":
                                page_rejected += 1
                                run.errors += 1
                                LOGGER.warning(
                                    "Rejected malformed listing %s: %s",
                                    listing.detail_url,
                                    quality_notes,
                                )
                                continue

                            if upsert_sale(session, listing):
                                page_inserted += 1
                            else:
                                page_updated += 1

                        accepted = page_inserted + page_updated
                        county_accepted += accepted
                        accepted_total += accepted
                        rejected_total += page_rejected
                        run.pages_scanned += 1
                        run.inserted += page_inserted
                        run.updated += page_updated
                        session.commit()

                        LOGGER.info(
                            "%s page %s: %s new, %s updated, %s rejected",
                            county_label,
                            page_number,
                            page_inserted,
                            page_updated,
                            page_rejected,
                        )

                        if accepted == 0:
                            unchanged_pages += 1
                        else:
                            unchanged_pages = 0
                        if mode == "incremental" and unchanged_pages >= 3:
                            break
                        time.sleep(delay + random.uniform(0, 0.35))

                    if county_accepted == 0:
                        raise RuntimeError(
                            f"Scrape produced zero valid records for {county_label}; "
                            "refusing to report success"
                        )

            if accepted_total == 0:
                raise RuntimeError("Scrape produced zero valid records")

            run.status = "completed"
            run.completed_at = datetime.now(timezone.utc)
            run.message = (
                f"HTTP scrape completed: {accepted_total} valid records processed, "
                f"{rejected_total} rejected"
            )
            session.commit()
        except Exception as exc:
            run.status = "failed"
            run.completed_at = datetime.now(timezone.utc)
            run.message = str(exc)[:1000]
            session.commit()
            raise


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scrape Daft sold cards over HTTP")
    parser.add_argument("--mode", choices=("incremental", "full"), default="incremental")
    parser.add_argument("--max-pages", type=int, default=None, help="Page limit per county")
    parser.add_argument(
        "--counties",
        default=os.getenv("SCRAPE_COUNTIES", "dublin,carlow,kildare,wicklow"),
        help="Comma-separated county slugs",
    )
    return parser.parse_args()


def main() -> None:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    args = parse_args()
    run_http_scrape(args.mode, args.max_pages, parse_counties(args.counties))


if __name__ == "__main__":
    main()
