from __future__ import annotations

import argparse
import logging
import os
import random
import re
import time
from dataclasses import dataclass
from datetime import datetime, timezone
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
    normalize_property_type,
    parse_money,
    parse_sale_date,
)
from .models import PropertySale, ScrapeRun

LOGGER = logging.getLogger("property-scraper")
BASE_URL = "https://www.daft.ie/sold-properties/dublin"


@dataclass
class Listing:
    detail_url: str
    source_page: str
    sale_date: object | None
    sold_price_eur: float | None
    asking_price_eur: float | None
    property_type: str
    bedrooms: int | None
    bathrooms: int | None
    size_sqm: float | None
    address: str


def money_after(label: str, text: str) -> float | None:
    match = re.search(rf"{re.escape(label)}\s*:?[\s\u00a0]*€\s*[\d,]+(?:\.\d{{1,2}})?", text, re.I)
    return parse_money(match.group(0)) if match else None


def text_or_empty(locator) -> str:
    try:
        return clean_text(locator.first.inner_text(timeout=2_000))
    except Exception:
        return ""


def extract_card(card, source_page: str) -> Listing | None:
    card_text = clean_text(card.inner_text(timeout=5_000))
    link = card.locator('a[href*="/sold/"]').first
    href = link.get_attribute("href")
    if not href:
        return None

    address = text_or_empty(card.locator('[data-tracking="srp_address"]'))
    price_text = text_or_empty(card.locator('[data-tracking="srp_price"]')) or card_text
    meta_text = text_or_empty(card.locator('[data-tracking="srp_meta"]')) or card_text

    sold = money_after("Sold", price_text)
    asking = money_after("Asking", price_text)
    property_type = extract_property_type(meta_text)

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
    )


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
    if not listing.address:
        listing.address = text_or_empty(page.locator("h1"))
    if listing.property_type == "Unknown":
        listing.property_type = extract_property_type(body)
    if listing.bedrooms is None:
        listing.bedrooms = extract_int(body, "bed")
    if listing.bathrooms is None:
        listing.bathrooms = extract_int(body, "bath")
    if listing.size_sqm is None:
        listing.size_sqm = extract_sqm(body)
    return listing


def list_url(page_number: int, start_year: int) -> str:
    return f"{BASE_URL}?{urlencode({'soldDate_from': start_year, 'page': page_number})}"


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

    values = {
        "source_page": listing.source_page,
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
        "area": infer_area(listing.address),
        "last_seen_at": now,
        "scraped_at": now,
    }

    if existing is None:
        session.add(PropertySale(detail_url=listing.detail_url, **values))
        return True

    for field, value in values.items():
        if value not in (None, "") or field in {"last_seen_at", "scraped_at"}:
            setattr(existing, field, value)
    return False


def needs_detail(listing: Listing) -> bool:
    return any(
        (
            listing.sold_price_eur is None,
            listing.asking_price_eur is None,
            not listing.address,
            listing.property_type == "Unknown",
        )
    )


def run_scrape(mode: str, max_pages: int | None, headless: bool = True) -> None:
    create_schema()
    start_year = int(os.getenv("SCRAPE_START_YEAR", "2025"))
    delay = float(os.getenv("SCRAPE_DELAY_SECONDS", "0.6"))
    detail_delay = float(os.getenv("DETAIL_DELAY_SECONDS", "0.35"))
    configured_incremental_pages = int(os.getenv("INCREMENTAL_MAX_PAGES", "20"))
    configured_full_pages = int(os.getenv("FULL_MAX_PAGES", "500"))
    page_limit = max_pages or (
        configured_incremental_pages if mode == "incremental" else configured_full_pages
    )

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
                unchanged_pages = 0

                for page_number in range(1, page_limit + 1):
                    source = list_url(page_number, start_year)
                    LOGGER.info("Fetching page %s: %s", page_number, source)
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
                            LOGGER.info("No cards on page %s; page text starts: %s", page_number, body[:180])
                            break

                        page_inserted = 0
                        page_updated = 0
                        for index in range(count):
                            run.listings_seen += 1
                            try:
                                listing = extract_card(cards.nth(index), source)
                                if listing is None:
                                    run.errors += 1
                                    continue
                                if needs_detail(listing):
                                    listing = enrich_from_detail(detail_page, listing)
                                    time.sleep(detail_delay + random.uniform(0, 0.25))
                                if upsert_sale(session, listing):
                                    page_inserted += 1
                                else:
                                    page_updated += 1
                            except Exception as exc:
                                run.errors += 1
                                LOGGER.warning("Listing failed on page %s: %s", page_number, exc)

                        run.pages_scanned += 1
                        run.inserted += page_inserted
                        run.updated += page_updated
                        session.commit()
                        LOGGER.info(
                            "Page %s complete: %s new, %s updated",
                            page_number,
                            page_inserted,
                            page_updated,
                        )

                        if page_inserted == 0:
                            unchanged_pages += 1
                        else:
                            unchanged_pages = 0
                        if mode == "incremental" and unchanged_pages >= 3:
                            LOGGER.info("Three consecutive pages without new listings; stopping.")
                            break
                        time.sleep(delay + random.uniform(0, 0.35))
                    except Exception as exc:
                        run.errors += 1
                        session.commit()
                        LOGGER.exception("Page %s failed: %s", page_number, exc)
                        if run.errors >= 10:
                            raise RuntimeError("Stopped after repeated scrape errors") from exc

                browser.close()

            run.status = "completed"
            run.completed_at = datetime.now(timezone.utc)
            run.message = "Scrape completed successfully"
            session.commit()
        except Exception as exc:
            run.status = "failed"
            run.completed_at = datetime.now(timezone.utc)
            run.message = str(exc)[:1000]
            session.commit()
            raise


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Scrape Dublin sold properties from Daft")
    parser.add_argument("--mode", choices=("incremental", "full"), default="incremental")
    parser.add_argument("--max-pages", type=int, default=None)
    parser.add_argument("--show-browser", action="store_true")
    return parser.parse_args()


def main() -> None:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    args = parse_args()
    run_scrape(args.mode, args.max_pages, headless=not args.show_browser)


if __name__ == "__main__":
    main()
