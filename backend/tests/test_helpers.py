from property_tracker.helpers import (
    asking_band,
    broad_property_type,
    infer_area,
    infer_county,
    normalize_property_type,
    parse_money,
    parse_sale_date,
)


def test_money_and_date_parsing() -> None:
    assert parse_money("Asking: €1,250,000") == 1_250_000
    assert parse_sale_date("SOLD 22/12/2025").isoformat() == "2025-12-22"


def test_county_inference() -> None:
    assert infer_county("18 The Crescent, Celbridge, Kildare") == "Kildare"
    assert infer_county("1 Station Road, Borris, Carlow") == "Carlow"
    assert infer_county("Apartment 4, Bray, Wicklow") == "Wicklow"
    assert infer_county("Unknown", "https://www.daft.ie/sold-properties/dublin?page=1") == "Dublin"
    assert infer_county("House, Graiguenamanagh, Co Kilkenny") == "Other"


def test_area_inference_uses_named_areas() -> None:
    assert infer_area("12 Example Road, Blackrock, Co. Dublin", "Dublin") == "Blackrock"
    assert infer_area("4 Harbour View, Dún Laoghaire, Dublin", "Dublin") == "Dún Laoghaire"
    assert infer_area("10-example-road-ballsbridge-dublin-4-dublin", "Dublin") == "Ballsbridge"
    assert infer_area("18 The Crescent, Oldtown Mill, Celbridge, Kildare", "Kildare") == "Celbridge"
    assert infer_area("1 Station Road, Borris, Carlow, Carlow", "Carlow") == "Borris"
    assert infer_area("26 The Avenue, Bellevue, Delgany, Wicklow", "Wicklow") == "Delgany"


def test_area_inference_handles_slug_postal_districts() -> None:
    assert (
        infer_area("apt-3-bishopsmede-lower-clanbrassil-st-dublin-8-dublin", "Dublin")
        == "Dublin 8"
    )
    assert (
        infer_area("apt-42-block-a-riverview-court-the-bottleworks-dublin-4-dublin", "Dublin")
        == "Dublin 4"
    )
    assert infer_area("Apartment 1, Example House, D06", "Dublin") == "Dublin 6"


def test_area_inference_never_returns_an_address() -> None:
    assert infer_area("Apartment 9, Unknown Development", "Dublin") == "Other"
    assert infer_area("") == "Other"


def test_property_type_normalisation() -> None:
    assert normalize_property_type("3 Bed Semi-D") == "Semi-detached"
    assert broad_property_type("Apartment") == "Apartment"
    assert broad_property_type("Detached") == "House"


def test_asking_bands() -> None:
    assert asking_band(499_999) == "Under 500k"
    assert asking_band(500_000) == "500-700k"
    assert asking_band(1_300_000) == "1300k+"
    assert asking_band(None) == "Unknown"
