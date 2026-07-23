from __future__ import annotations

import argparse
import csv
import json
import logging
import os
import re
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from typing import Iterable
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv

LOGGER = logging.getLogger("property-local-collector")
BASE_URL = "https://www.daft.ie"
COUNTIES = {
    "dublin": "Dublin",
    "carlow": "Carlow",
    "kildare": "Kildare",
    "wicklow": "Wicklow",
}
HEADERS = {
    "User-Agent": (
        "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
        "AppleWebKit/537.36 (KHTML, like Gecko) "
        "Chrome/150.0.0.0 Safari/537.36"
    ),
    "Accept": "text/html,application/xhtml+xml,application/xml;q=0.9,image/avif,image/webp,*/*;q=0.8",
    "Accept-Language": "en-IE,en;q=0.9",
    "Cache-Control": "no-cache",
    "Pragma": "no-cache",
    "Upgrade-Insecure-Requests": "1",
}
COLUMNS = [
    "scraped_at",
    "sale_date",
    "sold_price_eur",
    "asking_price_eur",
    "delta_eur",
    "delta_pct",
    "asking_band",
    "property_type",
    "bedrooms",
    "bathrooms",
    "size_sqm",
    "address",
    "county",
    "area",
    "detail_url",
    "source_page",
]


@dataclass(frozen=True)
class SaleRow:
    scraped_at: str
    sale_date: str
    sold_price_eur: int
    asking_price_eur: int
    delta_eur: int
    delta_pct: float
    asking_band: str
    property_type: str
    bedrooms: int | None
    bathrooms: int | None
    size_sqm: float | None
    address: str
    county: str
    area: str
    detail_url: str
    source_page: str


def clean_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", value or "").strip()


def parse_money(text: str, label: str) -> int | None:
    match = re.search(rf"\b{re.escape(label)}\s*:\s*€\s*([\d,]+)", text, re.I)
    return int(match.group(1).replace(",", "")) if match else None


def parse_number(text: str, label: str) -> int | None:
    match = re.search(rf"\b(\d+)\s+{re.escape(label)}s?\b", text, re.I)
    return int(match.group(1)) if match else None


def parse_sqm(text: str) -> float | None:
    match = re.search(r"\b(\d+(?:\.\d+)?)\s*(?:m²|m2|sq\.?\s*m)\b", text, re.I)
    return float(match.group(1)) if match else None


def asking_band(value: int) -> str:
    if value < 500_000:
        return "Under 500k"
    if value < 700_000:
        return "500-700k"
    if value < 900_000:
        return "700-900k"
    if value < 1_100_000:
        return "900-1100k"
    if value < 1_300_000:
        return "1100-1300k"
    return "1300k+"


def infer_area(address: str, county: str) -> str:
    parts = [clean_text(part) for part in address.split(",") if clean_text(part)]
    county_cf = county.casefold()
    candidates: list[str] = []
    for part in parts[1:]:
        folded = part.casefold().replace("county ", "").replace("co. ", "").replace("co ", "")
        if folded == county_cf:
            continue
        if re.fullmatch(r"[A-Z]\d{2}[A-Z0-9]{4}", part.replace(" ", ""), re.I):
            continue
        candidates.append(part)

    if county == "Dublin":
        for part in reversed(candidates):
            match = re.search(r"\bDublin\s+(\d{1,2}[A-Z]?)\b", part, re.I)
            if match:
                return f"Dublin {match.group(1).upper()}"

    return candidates[-1] if candidates else "Other"


def parse_card(card, county: str, source_page: str) -> SaleRow | None:
    address_node = card.select_one('[data-tracking="srp_address"]')
    price_node = card.select_one('[data-tracking="srp_price"]')
    meta_node = card.select_one('[data-tracking="srp_meta"]')
    link_node = card.select_one('a[href*="/sold/"]')

    address = clean_text(address_node.get_text(" ", strip=True) if address_node else "")
    price_text = clean_text(price_node.get_text(" ", strip=True) if price_node else "")
    meta_text = clean_text(meta_node.get_text(" ", strip=True) if meta_node else "")
    card_text = clean_text(card.get_text(" ", strip=True))
    href = clean_text(link_node.get("href") if link_node else "")

    date_match = re.search(r"\bSOLD\s+(\d{2}/\d{2}/\d{4})\b", card_text, re.I)
    sold = parse_money(price_text or card_text, "Sold")
    asking = parse_money(price_text or card_text, "Asking")

    spans = [clean_text(node.get_text(" ", strip=True)) for node in card.select('[data-tracking="srp_meta"] span')]
    property_type = "Unknown"
    for value in reversed(spans):
        if not re.search(r"\b(?:bed|bath|m²|m2|sq\.?\s*m)\b", value, re.I):
            property_type = value
            break

    if not all((date_match, sold, asking, address, href)):
        LOGGER.warning("Skipping incomplete card on %s: %s", source_page, card_text[:180])
        return None

    delta = sold - asking
    return SaleRow(
        scraped_at=datetime.now(timezone.utc).isoformat(),
        sale_date=date_match.group(1),
        sold_price_eur=sold,
        asking_price_eur=asking,
        delta_eur=delta,
        delta_pct=round((delta / asking) * 100, 4),
        asking_band=asking_band(asking),
        property_type=property_type,
        bedrooms=parse_number(meta_text, "Bed"),
        bathrooms=parse_number(meta_text, "Bath"),
        size_sqm=parse_sqm(meta_text),
        address=address,
        county=county,
        area=infer_area(address, county),
        detail_url=urljoin(BASE_URL, href),
        source_page=source_page,
    )


def fetch_page(session: requests.Session, county_slug: str, page_number: int, timeout: int) -> str:
    url = f"{BASE_URL}/sold-properties/{county_slug}"
    if page_number > 1:
        url = f"{url}?page={page_number}"

    response = session.get(url, timeout=timeout, allow_redirects=True)
    body_start = clean_text(response.text)[:180]
    if response.status_code != 200:
        raise RuntimeError(f"HTTP {response.status_code} for {url}; body starts: {body_start}")
    if "checking the security of your connection" in response.text.casefold():
        raise RuntimeError(f"Daft security check returned for {url}; plain HTTP collection cannot continue.")
    return response.text


def parse_page(html: str, county: str, source_page: str) -> list[SaleRow]:
    soup = BeautifulSoup(html, "html.parser")
    cards = soup.select('li[data-testid^="result-"]')
    rows = [row for card in cards if (row := parse_card(card, county, source_page)) is not None]
    return rows


def collect(county_slugs: Iterable[str], max_pages: int, delay: float, timeout: int) -> list[SaleRow]:
    session = requests.Session()
    session.headers.update(HEADERS)
    output: dict[str, SaleRow] = {}

    for slug in county_slugs:
        county = COUNTIES[slug]
        for page_number in range(1, max_pages + 1):
            source_page = f"{BASE_URL}/sold-properties/{slug}" + (f"?page={page_number}" if page_number > 1 else "")
            LOGGER.info("Fetching %s", source_page)
            html = fetch_page(session, slug, page_number, timeout)
            rows = parse_page(html, county, source_page)
            if not rows:
                if page_number == 1:
                    raise RuntimeError(f"No sold cards found on {source_page}")
                LOGGER.info("No rows on %s; stopping %s", source_page, county)
                break
            for row in rows:
                output[row.detail_url] = row
            LOGGER.info("%s page %s: %s valid rows", county, page_number, len(rows))
            time.sleep(delay)

    return list(output.values())


def write_csv(rows: list[SaleRow], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS)
        writer.writeheader()
        for row in rows:
            writer.writerow(asdict(row))


def send_to_sheet(rows: list[SaleRow], mode: str, endpoint: str, token: str, timeout: int) -> dict:
    payload = {
        "token": token,
        "mode": mode,
        "minimum_rows": 5,
        "rows": [asdict(row) for row in rows],
    }
    response = requests.post(endpoint, json=payload, timeout=timeout)
    response.raise_for_status()
    try:
        result = response.json()
    except json.JSONDecodeError as exc:
        raise RuntimeError(f"Apps Script returned non-JSON: {response.text[:300]}") from exc
    if not result.get("ok"):
        raise RuntimeError(f"Apps Script rejected upload: {result}")
    return result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(description="Collect Daft sold cards locally and send them to Google Sheets")
    parser.add_argument("--mode", choices=("full", "incremental"), default="incremental")
    parser.add_argument("--counties", default="dublin,carlow,kildare,wicklow")
    parser.add_argument("--max-pages", type=int, default=None)
    parser.add_argument("--delay", type=float, default=1.0)
    parser.add_argument("--timeout", type=int, default=45)
    parser.add_argument("--csv", default="output/property_sales.csv")
    parser.add_argument("--no-upload", action="store_true")
    return parser.parse_args()


def main() -> int:
    load_dotenv()
    logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
    args = parse_args()
    slugs = [token.strip().casefold() for token in args.counties.split(",") if token.strip()]
    invalid = [slug for slug in slugs if slug not in COUNTIES]
    if invalid:
        raise SystemExit(f"Unsupported counties: {', '.join(invalid)}")

    max_pages = args.max_pages if args.max_pages is not None else (10 if args.mode == "full" else 2)
    rows = collect(slugs, max_pages=max_pages, delay=args.delay, timeout=args.timeout)
    if len(rows) < 5:
        raise RuntimeError(f"Only {len(rows)} valid rows collected; refusing to continue.")

    csv_path = Path(args.csv)
    write_csv(rows, csv_path)
    LOGGER.info("Wrote %s rows to %s", len(rows), csv_path.resolve())

    if not args.no_upload:
        endpoint = os.getenv("APPS_SCRIPT_WEB_APP_URL", "").strip()
        token = os.getenv("COLLECTOR_TOKEN", "").strip()
        if not endpoint or not token:
            raise RuntimeError("APPS_SCRIPT_WEB_APP_URL and COLLECTOR_TOKEN must be set in .env")
        result = send_to_sheet(rows, args.mode, endpoint, token, args.timeout)
        LOGGER.info("Sheet upload complete: %s", result)

    return 0


if __name__ == "__main__":
    try:
        raise SystemExit(main())
    except Exception as exc:
        LOGGER.error("Collector failed: %s", exc)
        raise
