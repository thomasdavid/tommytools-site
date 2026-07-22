from __future__ import annotations

import logging
import os

from sqlalchemy import select

from .database import SessionLocal, create_schema
from .helpers import infer_area
from .models import PropertySale

LOGGER = logging.getLogger("property-area-cleanup")


def main() -> None:
    logging.basicConfig(
        level=os.getenv("LOG_LEVEL", "INFO"),
        format="%(asctime)s %(levelname)s %(name)s: %(message)s",
    )
    create_schema()

    changed = 0
    unchanged = 0
    with SessionLocal() as session:
        sales = list(session.scalars(select(PropertySale)))
        for sale in sales:
            area = infer_area(sale.address)
            if sale.area == area:
                unchanged += 1
                continue
            LOGGER.info("%s -> %s (%s)", sale.area, area, sale.address)
            sale.area = area
            changed += 1
        session.commit()

    LOGGER.info(
        "Area cleanup complete: %s changed, %s unchanged, %s total",
        changed,
        unchanged,
        changed + unchanged,
    )


if __name__ == "__main__":
    main()
