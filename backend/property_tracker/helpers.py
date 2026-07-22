from __future__ import annotations

import html
import re
from datetime import date, datetime


AREA_ALIASES: tuple[tuple[str, str], ...] = (
    ("dún laoghaire", "Dún Laoghaire"),
    ("dun laoghaire", "Dún Laoghaire"),
    ("blackrock", "Blackrock"),
    ("ballsbridge", "Ballsbridge"),
    ("ranelagh", "Ranelagh"),
    ("killiney", "Killiney"),
    ("dalkey", "Dalkey"),
    ("monkstown", "Monkstown"),
    ("sandycove", "Sandycove"),
    ("glasthule", "Glasthule"),
    ("sandymount", "Sandymount"),
    ("donnybrook", "Donnybrook"),
    ("foxrock", "Foxrock"),
    ("cabinteely", "Cabinteely"),
    ("shankill", "Shankill"),
    ("glenageary", "Glenageary"),
    ("deansgrange", "Deansgrange"),
    ("stillorgan", "Stillorgan"),
    ("mount merrion", "Mount Merrion"),
    ("goatstown", "Goatstown"),
    ("clonskeagh", "Clonskeagh"),
    ("milltown", "Milltown"),
    ("churchtown", "Churchtown"),
    ("dundrum", "Dundrum"),
    ("ballinteer", "Ballinteer"),
    ("rathfarnham", "Rathfarnham"),
    ("terenure", "Terenure"),
    ("rathgar", "Rathgar"),
    ("harold's cross", "Harold's Cross"),
    ("harolds cross", "Harold's Cross"),
    ("portobello", "Portobello"),
    ("ringsend", "Ringsend"),
    ("grand canal dock", "Grand Canal Dock"),
    ("citywest", "Citywest"),
    ("tallaght", "Tallaght"),
    ("clondalkin", "Clondalkin"),
    ("lucan", "Lucan"),
    ("palmerstown", "Palmerstown"),
    ("chapelizod", "Chapelizod"),
    ("castleknock", "Castleknock"),
    ("blanchardstown", "Blanchardstown"),
    ("clonsilla", "Clonsilla"),
    ("ongar", "Ongar"),
    ("finglas", "Finglas"),
    ("glasnevin", "Glasnevin"),
    ("phibsborough", "Phibsborough"),
    ("drumcondra", "Drumcondra"),
    ("clontarf", "Clontarf"),
    ("raheny", "Raheny"),
    ("killester", "Killester"),
    ("artane", "Artane"),
    ("coolock", "Coolock"),
    ("donaghmede", "Donaghmede"),
    ("howth", "Howth"),
    ("sutton", "Sutton"),
    ("portmarnock", "Portmarnock"),
    ("malahide", "Malahide"),
    ("swords", "Swords"),
    ("skerries", "Skerries"),
    ("rush", "Rush"),
    ("lusk", "Lusk"),
    ("balbriggan", "Balbriggan"),
)

PROPERTY_TYPE_PATTERNS: tuple[tuple[str, str], ...] = (
    (r"\bsemi[- ]detached\b|\bsemi-d\b", "Semi-detached"),
    (r"\bend of terrace\b", "End of terrace"),
    (r"\bterraced\b|\bterrace\b", "Terraced"),
    (r"\bdetached\b", "Detached"),
    (r"\bduplex\b", "Duplex"),
    (r"\bpenthouse\b", "Penthouse"),
    (r"\bstudio\b", "Studio"),
    (r"\bapartment\b|\bflat\b", "Apartment"),
    (r"\bbungalow\b", "Bungalow"),
    (r"\btownhouse\b", "Townhouse"),
    (r"\bcottage\b", "Cottage"),
    (r"\bsite\b", "Site"),
)


def clean_text(value: str | None) -> str:
    return re.sub(r"\s+", " ", html.unescape(value or "")).strip()


def parse_money(value: str | None) -> float | None:
    if not value:
        return None
    match = re.search(r"€\s*([\d,]+(?:\.\d{1,2})?)", value)
    if not match:
        return None
    return float(match.group(1).replace(",", ""))


def parse_sale_date(value: str | None) -> date | None:
    if not value:
        return None
    for pattern in (r"\b(\d{2}/\d{2}/\d{4})\b", r"\b(\d{4}-\d{2}-\d{2})\b"):
        match = re.search(pattern, value)
        if not match:
            continue
        token = match.group(1)
        try:
            return datetime.strptime(token, "%d/%m/%Y" if "/" in token else "%Y-%m-%d").date()
        except ValueError:
            pass
    return None


def asking_band(value: float | None) -> str:
    if value is None:
        return "Unknown"
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


def area_search_text(value: str | None) -> str:
    """Normalise normal addresses and Daft URL-style slugs for locality matching."""
    normal = clean_text(value).casefold().replace("–", "-")
    normal = re.sub(r"[-_/]+", " ", normal)
    return re.sub(r"\s+", " ", normal).strip()


def infer_area(address: str | None) -> str:
    """Return a locality or Dublin postal district, never an arbitrary address."""
    normal = area_search_text(address)
    if not normal:
        return "Other"

    for needle, label in AREA_ALIASES:
        normal_needle = area_search_text(needle)
        if re.search(rf"(?<!\w){re.escape(normal_needle)}(?!\w)", normal):
            return label

    # Daft slugs commonly end in forms such as "dublin-8-dublin".
    district_matches = re.findall(r"\bdublin\s+(\d{1,2}[a-z]?)\b", normal, re.I)
    if district_matches:
        district = district_matches[-1].upper()
        return f"Dublin {district}"

    # Eircode routing keys can also identify a broad Dublin postal district.
    routing_key = re.search(r"\bd0?(\d{1,2})([a-z]?)\b", normal, re.I)
    if routing_key:
        number = int(routing_key.group(1))
        suffix = routing_key.group(2).upper()
        if 1 <= number <= 24:
            return f"Dublin {number}{suffix}"

    return "Other"


def normalize_property_type(value: str | None) -> str:
    normal = clean_text(value)
    for pattern, label in PROPERTY_TYPE_PATTERNS:
        if re.search(pattern, normal, re.I):
            return label
    return normal[:120] if normal and normal.casefold() != "advantage" else "Unknown"


def broad_property_type(value: str | None) -> str:
    normal = normalize_property_type(value).casefold()
    if normal in {"apartment", "duplex", "penthouse", "studio"}:
        return "Apartment"
    if normal in {
        "semi-detached",
        "detached",
        "end of terrace",
        "terraced",
        "bungalow",
        "townhouse",
        "cottage",
    }:
        return "House"
    return "Other"


def extract_property_type(text: str | None) -> str:
    normal = clean_text(text)
    for pattern, label in PROPERTY_TYPE_PATTERNS:
        if re.search(pattern, normal, re.I):
            return label
    return "Unknown"


def extract_int(text: str | None, label: str) -> int | None:
    match = re.search(rf"\b(\d+)\s*{re.escape(label)}s?\b", clean_text(text), re.I)
    return int(match.group(1)) if match else None


def extract_sqm(text: str | None) -> float | None:
    match = re.search(r"\b(\d+(?:\.\d+)?)\s*(?:m²|m2|sq\.?\s*m)\b", clean_text(text), re.I)
    return float(match.group(1)) if match else None
