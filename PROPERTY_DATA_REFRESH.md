# Property data refresh

The original Google Sheet import is no longer treated as the authoritative dataset. Some imported rows contain Daft URL slugs instead of visible addresses and some are missing sale dates.

## New ingestion rules

The live Playwright scraper now:

1. reads the visible sold-listing card;
2. extracts the full address between the SOLD date and the sold price if the address locator fails;
3. uses the detail page only as a fallback;
4. validates sale date, sold price, asking price and address;
5. rejects malformed live rows before they are published;
6. protects an existing valid live record from being overwritten by a bad response or a legacy Sheet import.

Legacy rows already in PostgreSQL are audited separately. Incomplete records are marked `quality_status=review` so the cleanup step can remove them safely.

## Controlled rebuild

Open **GitHub → Actions → Rebuild property dataset**.

### Test run

Use:

```text
counties: dublin
max_pages: 3
remove_legacy: false
```

Review the resulting records in:

```text
https://tommytools.dev/projects/dublin-property-tracker/source.html
```

### Publish a fresh dataset

After the test succeeds, run:

```text
counties: dublin,carlow,kildare,wicklow
max_pages: 25
remove_legacy: true
```

The workflow always scrapes first. Cleanup runs only after the scraper finishes successfully. With `remove_legacy=true`, rows for the selected counties are removed when they are incomplete, have URL-style addresses, or are non-live legacy records. Valid fresh Daft rows remain.

Increase `max_pages` in later runs for a deeper historical backfill. The page limit applies separately to each county.

## Data quality audit

The rebuild workflow audits every stored record after scraping. A valid analysis row must have:

- sale date;
- sold price;
- asking price;
- a human-readable address rather than a URL slug.

Rows failing these checks are marked `review` and can be removed by a rebuild with `remove_legacy=true`.

## Daily updates

The existing **Regional property scrape** workflow continues to run incrementally each day. It now uses the same validation rules and rejects malformed responses instead of allowing them into the dataset.
