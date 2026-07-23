from __future__ import annotations

import re
from datetime import date

from .helpers import clean_text


def looks_like_slug_address(value: str | None) -> bool:
    text = clean_text(value)
    if not text:
        return False
    if "," in text:
        return False
    hyphens = text.count("-")
    words = [part for part in text.split("-") if part]
    return hyphens >= 3 and len(words) >= 5


def human_address(value: str | None) -> bool:
    text = clean_text(value)
    if len(text) < 5 or looks_like_slug_address(text):
        return False
    return bool(re.search(r"[A-Za-zÀ-ÿ]", text))


def address_from_card_text(value: str | None) -> str:
    """Extract the visible address between the SOLD date and Sold price."""
    text = clean_text(value)
    match = re.search(
        r"\bSOLD\s+\d{2}/\d{2}/\d{4}\s+(.+?)\s+Sold\s*:\s*€",
        text,
        re.I,
    )
    return clean_text(match.group(1)) if match else ""


def listing_quality(
    sale_date: date | None,
    sold_price_eur: float | None,
    asking_price_eur: float | None,
    address: str | None,
) -> tuple[str, str | None]:
    reasons: list[str] = []
    if sale_date is None:
        reasons.append("missing sale date")
    if sold_price_eur is None or sold_price_eur <= 0:
        reasons.append("missing sold price")
    if asking_price_eur is None or asking_price_eur <= 0:
        reasons.append("missing asking price")
    if not human_address(address):
        reasons.append("address missing or URL-style slug")
    if sold_price_eur is not None and sold_price_eur > 100_000_000:
        reasons.append("implausible sold price")
    if asking_price_eur is not None and asking_price_eur > 100_000_000:
        reasons.append("implausible asking price")
    return ("valid", None) if not reasons else ("review", "; ".join(reasons))
