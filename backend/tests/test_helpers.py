from property_tracker.helpers import (
    asking_band,
    broad_property_type,
    infer_area,
    normalize_property_type,
    parse_money,
    parse_sale_date,
)


def test_money_and_date_parsing() -> None:
    assert parse_money("Asking: €1,250,000") == 1_250_000
    assert parse_sale_date("SOLD 22/12/2025").isoformat() == "2025-12-22"


def test_area_inference_uses_named_dublin_area() -> None:
    assert infer_area("12 Example Road, Blackrock, Co. Dublin") == "Blackrock"
    assert infer_area("4 Harbour View, Dún Laoghaire, Dublin") == "Dún Laoghaire"


def test_property_type_normalisation() -> None:
    assert normalize_property_type("3 Bed Semi-D") == "Semi-detached"
    assert broad_property_type("Apartment") == "Apartment"
    assert broad_property_type("Detached") == "House"


def test_asking_bands() -> None:
    assert asking_band(499_999) == "Under 500k"
    assert asking_band(500_000) == "500-700k"
    assert asking_band(1_300_000) == "1300k+"
    assert asking_band(None) == "Unknown"
