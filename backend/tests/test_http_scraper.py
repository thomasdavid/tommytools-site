from property_tracker.http_scraper import parse_cards


def test_parse_server_rendered_sold_card() -> None:
    html = """
    <ul>
      <li data-testid="result-1">
        <a href="/sold/house-40-kincora-rd-clontarf-dublin/12345">
          <div data-tracking="srp_address">40 Kincora Rd, Clontarf, Dublin 3, Dublin</div>
          <div>SOLD 06/07/2026</div>
          <div data-tracking="srp_price">Sold: €1,280,000 Asking: €1,350,000</div>
          <div data-tracking="srp_meta">3 Bed 2 Bath 154.0 m² Semi-D</div>
        </a>
      </li>
    </ul>
    """

    listings = parse_cards(
        html,
        "https://www.daft.ie/sold-properties/dublin?soldDate_from=2025&page=1",
        "Dublin",
    )

    assert len(listings) == 1
    listing = listings[0]
    assert listing.sale_date.isoformat() == "2026-07-06"
    assert listing.address == "40 Kincora Rd, Clontarf, Dublin 3, Dublin"
    assert listing.sold_price_eur == 1_280_000
    assert listing.asking_price_eur == 1_350_000
    assert listing.property_type == "Semi-detached"
    assert listing.bedrooms == 3
    assert listing.bathrooms == 2
    assert listing.size_sqm == 154.0
    assert listing.county == "Dublin"


def test_card_text_fallback_recovers_address() -> None:
    html = """
    <li data-testid="result-2">
      <a href="/sold/apartment-example/67890">
        SOLD 07/07/2026 58 Grangeview Place, Clondalkin, Dublin 22, Dublin
        <div data-tracking="srp_price">Sold: €304,000 Asking: €275,000</div>
        <div data-tracking="srp_meta">2 Bed 1 Bath Apartment</div>
      </a>
    </li>
    """

    listing = parse_cards(
        html,
        "https://www.daft.ie/sold-properties/dublin?page=1",
        "Dublin",
    )[0]

    assert listing.address == "58 Grangeview Place, Clondalkin, Dublin 22, Dublin"
    assert listing.sold_price_eur == 304_000
    assert listing.asking_price_eur == 275_000
