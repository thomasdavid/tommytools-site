from bs4 import BeautifulSoup

from collector import parse_card


def test_carlow_card_parsing() -> None:
    html = '''
    <li data-testid="result-1">
      <a href="/sold/1-station-road-borris-carlow/DUMMY">
        <span>SOLD 12/06/2026</span>
        <div data-tracking="srp_address">
          <p>1 Station Road, Borris, Carlow, Carlow</p>
        </div>
        <div data-tracking="srp_price">
          <p>Sold: €200,000 <span>Asking: €195,000</span></p>
        </div>
        <div data-tracking="srp_meta">
          <span>3 Bed</span><span>1 Bath</span><span>75.0 m²</span><span>End of Terrace</span>
        </div>
      </a>
    </li>
    '''
    card = BeautifulSoup(html, "html.parser").select_one("li")
    row = parse_card(card, "Carlow", "https://www.daft.ie/sold-properties/carlow")

    assert row is not None
    assert row.sale_date == "12/06/2026"
    assert row.sold_price_eur == 200_000
    assert row.asking_price_eur == 195_000
    assert row.property_type == "End of Terrace"
    assert row.bedrooms == 3
    assert row.bathrooms == 1
    assert row.size_sqm == 75.0
    assert row.address == "1 Station Road, Borris, Carlow, Carlow"
    assert row.county == "Carlow"
    assert row.area == "Borris"
