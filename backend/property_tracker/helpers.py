from __future__ import annotations

import html
import re
from datetime import date, datetime


COUNTY_SLUGS = {
    "dublin": "Dublin",
    "carlow": "Carlow",
    "kildare": "Kildare",
    "wicklow": "Wicklow",
}

IRISH_COUNTIES = (
    "Antrim", "Armagh", "Carlow", "Cavan", "Clare", "Cork", "Derry", "Donegal",
    "Down", "Dublin", "Fermanagh", "Galway", "Kerry", "Kildare", "Kilkenny",
    "Laois", "Leitrim", "Limerick", "Longford", "Louth", "Mayo", "Meath",
    "Monaghan", "Offaly", "Roscommon", "Sligo", "Tipperary", "Tyrone",
    "Waterford", "Westmeath", "Wexford", "Wicklow",
)

AREA_ALIASES_BY_COUNTY: dict[str, tuple[tuple[str, str], ...]] = {
    "Dublin": (
        ("dún laoghaire", "Dún Laoghaire"), ("dun laoghaire", "Dún Laoghaire"),
        ("blackrock", "Blackrock"), ("ballsbridge", "Ballsbridge"),
        ("ranelagh", "Ranelagh"), ("killiney", "Killiney"), ("dalkey", "Dalkey"),
        ("monkstown", "Monkstown"), ("sandycove", "Sandycove"),
        ("glasthule", "Glasthule"), ("sandymount", "Sandymount"),
        ("donnybrook", "Donnybrook"), ("foxrock", "Foxrock"),
        ("cabinteely", "Cabinteely"), ("shankill", "Shankill"),
        ("glenageary", "Glenageary"), ("deansgrange", "Deansgrange"),
        ("stillorgan", "Stillorgan"), ("mount merrion", "Mount Merrion"),
        ("goatstown", "Goatstown"), ("clonskeagh", "Clonskeagh"),
        ("milltown", "Milltown"), ("churchtown", "Churchtown"),
        ("dundrum", "Dundrum"), ("ballinteer", "Ballinteer"),
        ("rathfarnham", "Rathfarnham"), ("terenure", "Terenure"),
        ("rathgar", "Rathgar"), ("harold's cross", "Harold's Cross"),
        ("harolds cross", "Harold's Cross"), ("portobello", "Portobello"),
        ("ringsend", "Ringsend"), ("grand canal dock", "Grand Canal Dock"),
        ("citywest", "Citywest"), ("tallaght", "Tallaght"),
        ("clondalkin", "Clondalkin"), ("lucan", "Lucan"),
        ("palmerstown", "Palmerstown"), ("chapelizod", "Chapelizod"),
        ("castleknock", "Castleknock"), ("blanchardstown", "Blanchardstown"),
        ("clonsilla", "Clonsilla"), ("ongar", "Ongar"), ("finglas", "Finglas"),
        ("glasnevin", "Glasnevin"), ("phibsborough", "Phibsborough"),
        ("drumcondra", "Drumcondra"), ("clontarf", "Clontarf"),
        ("raheny", "Raheny"), ("killester", "Killester"), ("artane", "Artane"),
        ("coolock", "Coolock"), ("donaghmede", "Donaghmede"),
        ("howth", "Howth"), ("sutton", "Sutton"),
        ("portmarnock", "Portmarnock"), ("malahide", "Malahide"),
        ("swords", "Swords"), ("skerries", "Skerries"), ("rush", "Rush"),
        ("lusk", "Lusk"), ("balbriggan", "Balbriggan"),
    ),
    "Carlow": (
        ("carlow town", "Carlow Town"), ("graiguecullen", "Graiguecullen"),
        ("tullow", "Tullow"), ("bagenalstown", "Bagenalstown"),
        ("muine bheag", "Bagenalstown"), ("borris", "Borris"),
        ("hacketstown", "Hacketstown"), ("leighlinbridge", "Leighlinbridge"),
        ("ballon", "Ballon"), ("rathvilly", "Rathvilly"),
        ("clonegal", "Clonegal"), ("myshall", "Myshall"),
        ("fenagh", "Fenagh"), ("old leighlin", "Old Leighlin"),
        ("tinryland", "Tinryland"), ("bennekerry", "Bennekerry"),
    ),
    "Kildare": (
        ("kildare town", "Kildare Town"), ("newbridge", "Newbridge"),
        ("naas", "Naas"), ("maynooth", "Maynooth"), ("celbridge", "Celbridge"),
        ("leixlip", "Leixlip"), ("athy", "Athy"), ("kilcock", "Kilcock"),
        ("clane", "Clane"), ("sallins", "Sallins"),
        ("monasterevin", "Monasterevin"), ("rathangan", "Rathangan"),
        ("prosperous", "Prosperous"), ("straffan", "Straffan"),
        ("kilcullen", "Kilcullen"), ("castledermot", "Castledermot"),
        ("allenwood", "Allenwood"), ("robertstown", "Robertstown"),
        ("johnstown", "Johnstown"), ("kill", "Kill"),
        ("curragh", "The Curragh"), ("narraghmore", "Narraghmore"),
        ("rathmore", "Rathmore"), ("ardclough", "Ardclough"),
        ("caragh", "Caragh"), ("moone", "Moone"),
    ),
    "Wicklow": (
        ("wicklow town", "Wicklow Town"), ("newtownmountkennedy", "Newtownmountkennedy"),
        ("bray", "Bray"), ("greystones", "Greystones"), ("arklow", "Arklow"),
        ("blessington", "Blessington"), ("enniskerry", "Enniskerry"),
        ("delgany", "Delgany"), ("kilcoole", "Kilcoole"),
        ("rathnew", "Rathnew"), ("ashford", "Ashford"), ("avoca", "Avoca"),
        ("aughrim", "Aughrim"), ("baltinglass", "Baltinglass"),
        ("tinahely", "Tinahely"), ("rathdrum", "Rathdrum"),
        ("roundwood", "Roundwood"), ("laragh", "Laragh"),
        ("hollywood", "Hollywood"), ("shillelagh", "Shillelagh"),
        ("dunlavin", "Dunlavin"), ("newcastle", "Newcastle"),
        ("kilmacanogue", "Kilmacanogue"), ("glendalough", "Glendalough"),
    ),
}

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
    normal = clean_text(value).casefold().replace("–", "-")
    normal = re.sub(r"[-_/]+", " ", normal)
    return re.sub(r"\s+", " ", normal).strip()


def normalize_county(value: str | None) -> str | None:
    token = clean_text(value).casefold()
    for slug, label in COUNTY_SLUGS.items():
        if token in {slug, label.casefold(), f"co {slug}", f"county {slug}"}:
            return label
    return None


def infer_county(
    address: str | None,
    source_page: str | None = None,
    explicit: str | None = None,
) -> str:
    explicit_county = normalize_county(explicit)
    if explicit_county:
        return explicit_county

    normal_address = area_search_text(address)
    for county in IRISH_COUNTIES:
        needle = county.casefold()
        if re.search(rf"(?<!\w)(?:co\s+|county\s+)?{re.escape(needle)}(?!\w)", normal_address):
            return county if county in COUNTY_SLUGS.values() else "Other"

    source_match = re.search(r"/sold-properties/(dublin|carlow|kildare|wicklow)(?:[/?#]|$)", source_page or "", re.I)
    if source_match:
        return COUNTY_SLUGS[source_match.group(1).casefold()]
    return "Dublin"


def infer_area(address: str | None, county: str | None = None) -> str:
    normal = area_search_text(address)
    if not normal:
        return "Other"

    resolved_county = normalize_county(county) or infer_county(address)
    aliases = AREA_ALIASES_BY_COUNTY.get(resolved_county, ())
    for needle, label in aliases:
        normal_needle = area_search_text(needle)
        if re.search(rf"(?<!\w){re.escape(normal_needle)}(?!\w)", normal):
            return label

    if resolved_county == "Dublin":
        district_matches = re.findall(r"\bdublin\s+(\d{1,2}[a-z]?)\b", normal, re.I)
        if district_matches:
            return f"Dublin {district_matches[-1].upper()}"
        routing_key = re.search(r"\bd0?(\d{1,2})([a-z]?)\b", normal, re.I)
        if routing_key:
            number = int(routing_key.group(1))
            suffix = routing_key.group(2).upper()
            if 1 <= number <= 24:
                return f"Dublin {number}{suffix}"

    display = clean_text(address)
    if "," not in display:
        return "Other"

    ignored = {name.casefold() for name in IRISH_COUNTIES}
    ignored.update({f"co {name.casefold()}" for name in IRISH_COUNTIES})
    ignored.update({f"co. {name.casefold()}" for name in IRISH_COUNTIES})
    streetish = re.compile(
        r"^(?:apt|apartment|unit|no\.?|house|flat)?\s*\d+\b|\b(?:road|rd|street|st|avenue|ave|court|ct|drive|dr|terrace|place|lane|close|crescent|park|gardens|grove|view|rise|way|square|quay)\b",
        re.I,
    )
    for part in reversed([clean_text(part) for part in display.split(",") if clean_text(part)]):
        folded = part.casefold().rstrip(".")
        if folded in ignored or folded in {"ireland", "other"}:
            continue
        if re.fullmatch(r"dublin\s+\d{1,2}[a-z]?", part, re.I):
            continue
        if re.fullmatch(r"[a-z]\d{2}\s*[a-z0-9]{4}", part, re.I):
            continue
        if streetish.search(part):
            continue
        return part[:120]
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
        "semi-detached", "detached", "end of terrace", "terraced", "bungalow",
        "townhouse", "cottage",
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
