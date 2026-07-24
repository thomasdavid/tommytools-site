# Area source coverage

The collector uses normal Daft sold-area routes such as:

```text
https://www.daft.ie/sold-properties/sandyford-dublin?sort=soldDateDesc
```

Daft's county result pages do not expose a complete, stable public index of every town and suburb in their rendered HTML. Therefore the production collector keeps a curated set of area slugs in `AREA_SOURCES` and validates each source by checking that sold-result cards appear.

The user does not need to supply this list manually. Add or remove slugs in `AREA_SOURCES` when coverage gaps are found. Results overlap between neighbouring area pages, so `detail_url` is always used for deduplication.
