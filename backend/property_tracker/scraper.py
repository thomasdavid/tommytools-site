from __future__ import annotations

import argparse
import logging
import os
import random
import re
import time
from dataclasses import dataclass
from datetime import date, datetime, timezone
from urllib.parse import urlencode, urljoin

from playwright.sync_api import Browser, Page, TimeoutError as PlaywrightTimeoutError, sync_playwright
from sqlalchemy import select
from sqlalchemy.orm import Session

from .database import SessionLocal, create_schema
from .helpers import (
    asking_band,
    broad_property_type,
    clean_text,
    extract_int,
    extract_property_type,
    extract_sqm,
    infer_area,
    infer_county,
    normalize_property_type,
    parse_money,
    parse_sale_date,
)
from .models import PropertySale, ScrapeRun
from .quality import address_from_card_text, human_address, listing_quality

LOGGER = logging.getLogger("property-scraper")
COUNTY_TARGETS = {
    "dublin": "Dublin",
    "carlow": "Carlow",
    "kildare": "Kildare",
    "wicklow": "Wicklow",
}


@dataclass
class Listing:
    detail_url: str
    source_page: str
    sale_date: date | None
    sold_price_eur: float | None
    asking_price_eur: float | None
    property_type: str
    bedrooms: int | None
    bathrooms: int | None
    size_sqm: float | None
    address: str
    county: str
    source_kind: str = "daft_live"


def money_after(label: str, text: str) -> float | None:
    match = re.search(rf"{re.escape(label)}\s*:?\s*€\s*[\d,]+(?:\.\d{{1,2}})?", text, re.I)
    return parse_money(match.group(0)) if match else None


def text_or_empty(locator) -> str:
    try:
        return clean_text(locator.first.inner_text(timeout=2_000))
    except Exception:
        return ""


def extract_card(card, source_page: str, source_county: str) -> Listing | None:
    card_text = clean_text(card.inner_text(timeout=5_000))
    link = card.locator('a[href*="/sold/"]').first
    href = link.get_attribute("href")
    if not href:
        return None

    address = text_or_empty(card.locator('[data-tracking="srp_address"]'))
    if not human_address(address):
        address = address_from_card_text(card_text)

    price_text = text_or_empty(card.locator('[data-tracking="srp_price"]')) or card_text
    meta_text = text_or_empty(card.locator('[data-tracking="srp_meta"]')) or card_text

    sold = money_after("Sold", price_text)
    asking = money_after("Asking", price_text)
    property_type = extract_property_type(meta_text)
    county = infer_county(address, source_page, source_county)

    return Listing(
        detail_url=urljoin("https://www.daft.ie", href),
        source_page=source_page,
        sale_date=parse_sale_date(card_text),
        sold_price_eur=sold,
        asking_price_eur=asking,
        property_type=property_type,
        bedrooms=extract_int(meta_text, "bed"),
        bathrooms=extract_int(meta_text, "bath"),
        size_sqm=extract_sqm(meta_text),
        address=address,
        county=county,
    )


def detail_address(page: Page) -> str:
    candidates = [text_or_empty(page.locator("h1"))]
    try:
        title = page.locator('meta[property="og:title"]').first.get_attribute("content") or ""
        title = re.sub(r"\s*\|\s*Daft.*$", "", clean_text(title), flags=re.I)
        candidates.append(title)
    except Exception:
        pass
    return next((candidate for candidate in candidates if human_address(candidate)), "")


def enrich_from_detail(page: Page, listing: Listing) -> Listing:
    page.goto(listing.detail_url, wait_until="domcontentloaded", timeout=60_000)
    page.wait_for_timeout(600)
    body = clean_text(page.locator("body").inner_text(timeout=10_000))

    if listing.sold_price_eur is None:
        listing.sold_price_eur = money_after("Sold", body) or money_after("Sold price", body)
    if listing.asking_price_eur is None:
        listing.asking_price_eur = money_after("Asking", body) or money_after("Asking price", body)
    if listing.sale_date is None:
        listing.sale_date = parse_sale_date(body)
    if not human_address(listing.address):
        listing.address = detail_address(page)
    if listing.property_type == "Unknown":
        listing.property_type = extract_property_type(body)
    if listing.bedrooms is None:
        listing.bedrooms = extract_int(body, "bed")
    if listing.bathrooms is None:
        listing.bathrooms = extract_int(body, "bath")
    if listing.size_sqm is None:
        listing.size_sqm = extract_sqm(body)
    listing.county = infer_county(listing.address, listing.source_page, listing.county)
    return listing


def list_url(county_slug: str, page_number: int, start_year: int) -> str:
    base = f"https://www.daft.ie/sold-properties/{county_slug}"
    return f"{base}?{urlencode({'soldDate_from': start_year, 'page': page_number})}"


def upsert_sale(session: Session, listing: Listing) -> bool:
    now = datetime.now(timezone.utc)
    existing = session.scalar(
        select(PropertySale).where(PropertySale.detail_url == listing.detail_url)
    )

    sold = listing.sold_price_eur
    asking = listing.asking_price_eur
    delta_eur = sold - asking if sold is not None and asking is not None else None
    delta_pct = (
        ((sold - asking) / asking) * 100
        if sold is not None and asking not in (None, 0)
        else None
    )
    property_type = normalize_property_type(listing.property_type)
    county = infer_county(listing.address, listing.source_page, listing.county)
    quality_status, quality_notes = listing_quality(
        listing.sale_date, sold, asking, listing.address
    )

    # Never let a legacy Sheet import overwrite a valid live Daft record.
    if (
        existing is not None
        and existing.source_kind == "daft_live"
        and existing.quality_status == "valid"
        and listing.source_kind != "daft_live"
    ):
        return False

    # A temporary bad response should not downgrade an already-valid live row.
    if (
        existing is not None
        and existing.quality_status == "valid"
        and quality_status != "valid"
        and listing.source_kind == "daft_live"
    ):
        existing.last_seen_at = now
        existing.scraped_at = now
        existing.source_page = listing.source_page
        return False

    values = {
        "source_page": listing.source_page,
        "source_kind": listing.source_kind,
        "quality_status": quality_status,
        "quality_notes": quality_notes,
        "sale_date": listing.sale_date,
        "sold_price_eur": sold,
        "asking_price_eur": asking,
        "delta_eur": delta_eur,
        "delta_pct": delta_pct,
        "asking_band": asking_band(asking),
        "property_type": property_type,
        "broad_property_type": broad_property_type(property_type),
        "bedrooms": listing.bedrooms,
        "bathrooms": listing.bathrooms,
        "size_sqm": listing.size_sqm,
        "address": listing.address,
        "county": county,
        "area": infer_area(listing.address, county),
        "last_seen_at": now,
        "scraped_at": now,
    }

    if existing is None:
        session.add(PropertySale(detail_url=listing.detail_url, **values))
        return True

    for field, value in values.items():
        if value not in (None, "") or field in {
            "last_seen_at", "scraped_at", "quality_notes", "quality_status"
        }:
            setattr(existing, field, value)
    return False


def needs_detail(listing: Listing) -> bool:
    return any(
        (
            listing.sold_price_eur is None,
            listing.asking_price_eur is None,
            listing.sale_date is None,
            not human_address(listing.address),
            listing.property_type == "Unknown",
        )
    )


def parse_counties(value: str | None) -> list[str]:
    requested = [token.strip().casefold() for token in (value or "").split(",") if token.strip()]
    if not requested:
        requested = list(COUNTY_TARGETS)
    invalid = [token for token in requested if token not in COUNTY_TARGETS]
    if invalid:
        raise ValueError(f"Unsupported counties: {', '.join(invalid)}")
    return list(dict.fromkeys(requested))


def run_scrape(
    mode: str,
    max_pages: int | None,
    counties: list[str] | None = None,
    headless: bool = True,
) -> None:
    create_schema()
    start_year = int(os.getenv("SCRAPE_START_YEAR", "2025"))
    delay = float(os.getenv("SCRAPE_DELAY_SECONDS", "0.6"))
    detail_delay = float(os.getenv("DETAIL_DELAY_SECONDS", "0.35"))
    configured_incremental_pages = int(os.getenv("INCREMENTAL_MAX_PAGES", "20"))
    configured_full_pages = int(os.getenv("FULL_MAX_PAGES", "500"))
    page_limit = max_pages or (
        configured_incremental_pages if mode == "incremental" else configured_full_pages
    )
    county_slugs = counties or parse_counties(os.getenv("SCRAPE_COUNTIES"))

    with SessionLocal() as session:
        run = ScrapeRun(mode=mode, status="running")
        session.add(run)
        session.commit()
        session.refresh(run)

        try:
            with sync_playwright() as playwright:
                browser: Browser = playwright.chromium.launch(headless=headless)
                context = browser.new_context(
                    locale="en-IE",
                    timezone_id="Europe/Dublin",
                    viewport={"width": 1440, "height": 1100},
                    user_agent=(
                        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                        "AppleWebKit/537.36 (KHTML, like Gecko) "
                        "Chrome/124.0.0.0 Safari/537.36"
                    ),
                )
                list_page = context.new_page()
                detail_page = context.new_page()

                for county_slug in county_slugs:
                    county_label = COUNTY_TARGETS[county_slug]
                    unchanged_pages = 0
                    LOGGER.info("Starting %s scrape", county_label)

                    for page_number in range(1, page_limit + 1):
                        source = list_url(county_slug, page_number, start_year)
                        LOGGER.info("Fetching %s page %s: %s", county_label, page_number, source)
                        try:
                            list_page.goto(source, wait_until="domcontentloaded", timeout=60_000)
                            try:
                                list_page.wait_for_selector(
                                    'li[data-testid^="result-"]', timeout=15_000
                                )
                            except PlaywrightTimeoutError:
                                pass

                            cards = list_page.locator('li[data-testid^="result-"]')
                            count = cards.count()
                            if count == 0:
                                body = clean_text(list_page.locator("body").inner_text(timeout=5_000))
                                LOGGER.info(
                                    "No cards on %s page %s; page starts: %s",
                                    county_label, page_number, body[:180],
                                )
                                break

                            page_inserted = 0
                            page_updated = 0
                            for index in range(count):
                                run.listings_seen += 1
                                try:
                                    listing = extract_card(cards.nth(index), source, county_label)
                                    if listing is None:
                                        run.errors += 1
                                        continue
                                    if needs_detail(listing):
                                        listing = enrich_from_detail(detail_page, listing)
                                        time.sleep(detail_delay + random.uniform(0, 0.25))
                                    quality_status, quality_notes = listing_quality(
                                        listing.sale_date,
                                        listing.sold_price_eur,
                                        listing.asking_price_eur,
                                        listing.address,
                                    )
                                    if quality_status != "valid":
                                        run.errors += 1
                                        LOGGER.warning(
                                            "Quarantining %s: %s", listing.detail_url, quality_notes
                                        )
                                    if upsert_sale(session, listing):
                                        page_inserted += 1
                                    else:
                                        page_updated += 1
                                except Exception as exc:
                                    run.errors += 1
                                    LOGGER.warning(
                                        "Listing failed on %s page %s: %s",
                                        county_label, page_number, exc,
                                    )

                            run.pages_scanned += 1
                            run.inserted += page_inserted
                            run.updated += page_updated
                            session.commit()
                            LOGGER.info(
                                "%s page %s complete: %s new, %s updated",
                                county_label, page_number, page_inserted, page_updated,
                            )

                            if page_inserted == 0:
                                unchanged_pages += 1
                            else:
                                unchanged_pages = 0
                            if mode == "incremental" and unchanged_pages >= 3:
                                LOGGER.info("Three unchanged %s pages; moving on.", county_label)
                                break
                            time.sleep(delay + random.uniform(0, 0.35))
                        except Exception as exc:
                            run.errors += 1
                            session.commit()
                            LOGGER.exception("%s page %s failed: %s", county_label, page_number, exc)
                            if run.errors >= 20:
                                raise RuntimeError("Stopped after repeated scrape errors") from exc

                browser.close()

            run.status = "completed"
            run.completed_at = datetime.now(timezone.utc)
            run.message = "Scrape completed for " + ", ".join(
                COUNTY_TARGETS[slug] for slug in county_slugs
            )
            session.commit()
        except Exception as exc:
            run.status = "failed"
            run.completed_at = datetime.now(timezone.utc)
            run.message = str(exc)[:1000]
            session.commit()
            raise


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scrape sold properties from Daft")
    parser.add_argument("--mode", choices=("incremental", "full"), default="incremental")
    parser.add_argument("--max-pages", type=int, default=None, help="Page limit per county")
    parser.add_argument(
        "--counties",
        default=os.getenv("SCRAPE_COUNTIES", "dublin,carlow,kildare,wicklow"),
        help="Comma-separated county slugs: dublin,carlow,kildare,wicklow",
    )
    parser.add_argument("--show-browser", action="store_true")
    return parser.parse_args()


def main() -> None:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    args = parse_args()
    run_scrape(
        args.mode,
        args.max_pages,
        counties=parse_counties(args.counties),
        headless=not args.show_browser,
    )


if __name__ == "__main__":
    main()
