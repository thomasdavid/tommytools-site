from datetime import date

from property_tracker.quality import (
    address_from_card_text,
    human_address,
    listing_quality,
    looks_like_slug_address,
)


def test_extracts_visible_address_from_sold_card_text() -> None:
    text = (
        "Agent Name SOLD 06/07/2026 40 Kincora Rd, Clontarf, Dublin 3, Dublin "
        "Sold: €1,280,000 Asking: €1,350,000 3 Bed 2 Bath 154.0 m² Semi-D"
    )
    assert address_from_card_text(text) == "40 Kincora Rd, Clontarf, Dublin 3, Dublin"


def test_slug_addresses_are_not_human_addresses() -> None:
    slug = "107-hampton-park-st-helens-wood-booterstown-dublin"
    assert looks_like_slug_address(slug)
    assert not human_address(slug)
    assert human_address("107 Hampton Park, St Helen's Wood, Booterstown, Dublin")


def test_listing_quality_quarantines_missing_or_slug_data() -> None:
    status, notes = listing_quality(None, 500_000, 475_000, "19-goldenbridge-terrace-inchicore")
    assert status == "review"
    assert "missing sale date" in notes
    assert "URL-style slug" in notes


def test_listing_quality_accepts_complete_live_card_data() -> None:
    status, notes = listing_quality(
        date(2026, 7, 6),
        1_280_000,
        1_350_000,
        "40 Kincora Rd, Clontarf, Dublin 3, Dublin",
    )
    assert status == "valid"
    assert notes is None
