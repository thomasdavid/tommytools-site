from __future__ import annotations

import argparse
import csv
import hashlib
import json
import logging
import os
import re
import time
from dataclasses import asdict, dataclass
from datetime import datetime, timezone
from pathlib import Path
from urllib.parse import urljoin

import requests
from bs4 import BeautifulSoup
from dotenv import load_dotenv
from playwright.sync_api import TimeoutError as PlaywrightTimeoutError
from playwright.sync_api import sync_playwright

LOGGER = logging.getLogger("property-county-playwright-collector")
BASE_URL = "https://www.daft.ie"
CACHE_DIR = Path("cache_html")
PROFILE_DIR = Path("browser_profile")

COUNTY_LABELS = {
    "dublin": "Dublin",
    "carlow": "Carlow",
    "kildare": "Kildare",
    "wicklow": "Wicklow",
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

DUBLIN_AREAS = [
    "Sandyford", "Sandyford Village", "Stepaside", "Leopardstown", "Foxrock",
    "Stillorgan", "Blackrock", "Monkstown", "Dún Laoghaire", "Dun Laoghaire",
    "Dalkey", "Killiney", "Sandycove", "Glasthule", "Sandymount", "Ballsbridge",
    "Ranelagh", "Rathmines", "Rathgar", "Terenure", "Rathfarnham", "Dundrum",
    "Churchtown", "Clonskeagh", "Donnybrook", "Booterstown", "Mount Merrion",
    "Clontarf", "Raheny", "Howth", "Malahide", "Swords", "Lucan", "Tallaght",
    "Castleknock", "Blanchardstown", "Clondalkin", "Drumcondra", "Phibsborough",
    "Dublin City Centre", "Harolds Cross", "Harold's Cross", "Blackglen Road",
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
    if county == "Dublin":
        folded = address.casefold()
        for label in DUBLIN_AREAS:
            if label.casefold() in folded:
                if label == "Dun Laoghaire":
                    return "Dún Laoghaire"
                if label == "Harold's Cross":
                    return "Harolds Cross"
                return label

    parts = [clean_text(part) for part in address.split(",") if clean_text(part)]
    candidates: list[str] = []
    county_folded = county.casefold()

    for part in parts[1:]:
        normalised = (
            part.casefold()
            .replace("county ", "")
            .replace("co. ", "")
            .replace("co ", "")
        )
        if normalised == county_folded:
            continue
        if re.fullmatch(r"Dublin\s+\d{1,2}[A-Z]?", part, re.I):
            continue
        if re.fullmatch(r"[A-Z]\d{2}[A-Z0-9]{4}", part.replace(" ", ""), re.I):
            continue
        candidates.append(part)

    return candidates[-1] if candidates else "Other"


def address_matches_county(address: str, county: str) -> bool:
    return re.search(rf"\b{re.escape(county)}\b", address, re.I) is not None


def complete_card_anchors(soup: BeautifulSoup):
    cards = []
    for anchor in soup.select('a[href*="/sold/"]'):
        if not anchor.select_one('[data-testid="card-container"]'):
            continue
        if not anchor.select_one('[data-tracking="srp_address"]'):
            continue
        if not anchor.select_one('[data-tracking="srp_price"]'):
            continue
        cards.append(anchor)
    return cards


def parse_card(card, county: str, source_page: str) -> SaleRow | None:
    address_node = card.select_one('[data-tracking="srp_address"]')
    price_node = card.select_one('[data-tracking="srp_price"]')
    meta_node = card.select_one('[data-tracking="srp_meta"]')

    address = clean_text(address_node.get_text(" ", strip=True) if address_node else "")
    price_text = clean_text(price_node.get_text(" ", strip=True) if price_node else "")
    meta_text = clean_text(meta_node.get_text(" ", strip=True) if meta_node else "")
    card_text = clean_text(card.get_text(" ", strip=True))
    href = clean_text(card.get("href"))

    date_match = re.search(r"\bSOLD\s+(\d{2}/\d{2}/\d{4})\b", card_text, re.I)
    sold = parse_money(price_text or card_text, "Sold")
    asking = parse_money(price_text or card_text, "Asking")

    spans = [
        clean_text(node.get_text(" ", strip=True))
        for node in card.select('[data-tracking="srp_meta"] span')
    ]
    property_type = "Unknown"
    for value in reversed(spans):
        if not re.search(r"\b(?:bed|bath|m²|m2|sq\.?\s*m)\b", value, re.I):
            property_type = value
            break

    missing = []
    if not date_match:
        missing.append("sale_date")
    if sold is None:
        missing.append("sold_price")
    if asking is None:
        missing.append("asking_price")
    if not address:
        missing.append("address")
    if not href:
        missing.append("detail_url")

    if missing:
        LOGGER.info("Skipping incomplete card (%s) on %s", ", ".join(missing), source_page)
        return None

    if not address_matches_county(address, county):
        LOGGER.info("Skipping cross-county card: %s", address)
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


def parse_page(html: str, county: str, source_page: str) -> list[SaleRow]:
    soup = BeautifulSoup(html, "lxml")
    cards = complete_card_anchors(soup)
    LOGGER.info("Found %s enriched sold-property cards on %s", len(cards), source_page)
    return [
        row
        for card in cards
        if (row := parse_card(card, county, source_page)) is not None
    ]


def cache_path_for(url: str) -> Path:
    digest = hashlib.sha256(url.encode("utf-8")).hexdigest()[:24]
    return CACHE_DIR / f"{digest}.html"


def is_security_page(html: str) -> bool:
    folded = html.casefold()
    phrases = (
        "checking the security of your connection",
        "verify you are human",
        "just a moment",
        "cf-chl-",
    )
    return any(phrase in folded for phrase in phrases)


def get_html(page, url: str, use_cache: bool, timeout_ms: int) -> str:
    path = cache_path_for(url)
    if use_cache and path.exists():
        return path.read_text(encoding="utf-8", errors="ignore")

    LOGGER.info("Browsing %s", url)
    page.goto(url, wait_until="domcontentloaded", timeout=timeout_ms)

    try:
        page.wait_for_selector(
            'a[href*="/sold/"] [data-testid="card-container"]',
            timeout=timeout_ms,
        )
    except PlaywrightTimeoutError:
        html = page.content()
        if is_security_page(html):
            raise RuntimeError(f"Daft security check returned for {url}")
        raise RuntimeError(f"No sold-property cards appeared on {url}")

    page.wait_for_timeout(1200)
    html = page.content()
    if is_security_page(html):
        raise RuntimeError(f"Daft security check returned for {url}")

    CACHE_DIR.mkdir(parents=True, exist_ok=True)
    path.write_text(html, encoding="utf-8")
    return html


def county_url(county_slug: str, page_number: int) -> str:
    # Do not add sort=soldDateDesc. Daft's "Most Recent" view returns limited
    # register-only cards without asking price or property metadata.
    base = f"{BASE_URL}/sold-properties/{county_slug}"
    return base if page_number == 1 else f"{base}?page={page_number}"


def collect(
    counties: list[str],
    max_pages: int,
    delay: float,
    timeout_seconds: int,
    use_cache: bool,
    headed: bool,
    profile_dir: Path,
) -> list[SaleRow]:
    output: dict[str, SaleRow] = {}

    with sync_playwright() as playwright:
        profile_dir.mkdir(parents=True, exist_ok=True)
        context = playwright.chromium.launch_persistent_context(
            user_data_dir=str(profile_dir.resolve()),
            headless=not headed,
            locale="en-IE",
            viewport={"width": 1440, "height": 1000},
            user_agent=(
                "Mozilla/5.0 (Windows NT 10.0; Win64; x64) "
                "AppleWebKit/537.36 (KHTML, like Gecko) "
                "Chrome/150.0.0.0 Safari/537.36"
            ),
        )
        page = context.pages[0] if context.pages else context.new_page()

        try:
            for county_slug in counties:
                county = COUNTY_LABELS[county_slug]
                for page_number in range(1, max_pages + 1):
                    source_page = county_url(county_slug, page_number)
                    html = get_html(page, source_page, use_cache, timeout_seconds * 1000)
                    rows = parse_page(html, county, source_page)
                    LOGGER.info(
                        "%s page %s: %s valid asking-price rows",
                        county,
                        page_number,
                        len(rows),
                    )
                    if not rows:
                        break
                    for row in rows:
                        output[row.detail_url] = row
                    time.sleep(delay)
        finally:
            context.close()

    return list(output.values())


def sale_date_key(row: SaleRow) -> datetime:
    try:
        return datetime.strptime(row.sale_date, "%d/%m/%Y")
    except ValueError:
        return datetime.min


def write_csv(rows: list[SaleRow], path: Path) -> None:
    path.parent.mkdir(parents=True, exist_ok=True)
    sorted_rows = sorted(rows, key=sale_date_key, reverse=True)
    with path.open("w", newline="", encoding="utf-8-sig") as handle:
        writer = csv.DictWriter(handle, fieldnames=COLUMNS)
        writer.writeheader()
        for row in sorted_rows:
            writer.writerow(asdict(row))


def send_to_sheet(rows: list[SaleRow], mode: str, endpoint: str, token: str, timeout: int) -> dict:
    sorted_rows = sorted(rows, key=sale_date_key, reverse=True)
    payload = {
        "token": token,
        "mode": mode,
        "minimum_rows": 5,
        "rows": [asdict(row) for row in sorted_rows],
    }
    response = requests.post(endpoint, json=payload, timeout=timeout)
    response.raise_for_status()
    result = response.json()
    if not result.get("ok"):
        raise RuntimeError(f"Apps Script rejected upload: {result}")
    return result


def parse_args() -> argparse.Namespace:
    parser = argparse.ArgumentParser(
        description="Collect enriched Daft sold cards from county pages"
    )
    parser.add_argument("--mode", choices=("full", "incremental"), default="incremental")
    parser.add_argument("--counties", default="dublin,carlow,kildare,wicklow")
    parser.add_argument("--max-pages", type=int, default=None)
    parser.add_argument("--delay", type=float, default=1.0)
    parser.add_argument("--timeout", type=int, default=60)
    parser.add_argument("--csv", default="output/property_sales.csv")
    parser.add_argument("--profile-dir", default=str(PROFILE_DIR))
    parser.add_argument("--headed", action="store_true")
    parser.add_argument("--no-cache", action="store_true")
    parser.add_argument("--no-upload", action="store_true")
    return parser.parse_args()


def main() -> int:
    load_dotenv()
    logging.basicConfig(
        level=logging.INFO,
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    args = parse_args()

    counties = [token.strip().casefold() for token in args.counties.split(",") if token.strip()]
    invalid = [county for county in counties if county not in COUNTY_LABELS]
    if invalid:
        raise SystemExit(f"Unsupported counties: {', '.join(invalid)}")

    # The default Daft view is not strictly chronological. We scan a fixed
    # page window, deduplicate by detail URL, then sort locally by sale date.
    max_pages = args.max_pages if args.max_pages is not None else (10 if args.mode == "full" else 3)
    rows = collect(
        counties=counties,
        max_pages=max_pages,
        delay=args.delay,
        timeout_seconds=args.timeout,
        use_cache=not args.no_cache,
        headed=args.headed,
        profile_dir=Path(args.profile_dir),
    )

    if not rows:
        raise RuntimeError("No valid asking-price rows were collected.")

    csv_path = Path(args.csv)
    write_csv(rows, csv_path)
    LOGGER.info("Wrote %s deduplicated rows to %s", len(rows), csv_path.resolve())

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
