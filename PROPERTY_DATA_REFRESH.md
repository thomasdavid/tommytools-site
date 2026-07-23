# Property data refresh

The original Google Sheet import is no longer treated as the authoritative dataset. Some imported rows contain Daft URL slugs instead of visible addresses and some are missing sale dates.

## Current ingestion approach

Daft's sold search page is server-rendered and already contains the fields needed for this project. The primary scraper now downloads that HTML directly and parses each sold card. This avoids depending on a headless browser successfully rendering the result list in GitHub Actions.

Each accepted row must contain:

- a sale date;
- sold price;
- asking price;
- a human-readable address rather than a URL slug.

The parser reads the structured address element first and falls back to the visible text between the `SOLD` date and the sold price. Incomplete cards are rejected rather than written to PostgreSQL.

## Safety rules

A scrape that finds no first-page cards or produces zero valid records fails loudly. It is not reported as successful.

Destructive legacy cleanup is also blocked unless every selected county already has at least the configured number of valid live Daft rows. The default is five per county. This prevents an empty or blocked scrape from deleting the existing dataset.

## Recover an empty database

Open **GitHub → Actions → Rebuild property dataset**.

Run a small Dublin recovery first:

```text
counties: dublin
max_pages: 3
remove_legacy: false
min_valid_per_county: 5
```

This should repopulate the database with roughly the first three pages of valid Dublin sold listings. Review them at:

```text
https://tommytools.dev/projects/dublin-property-tracker/source.html
```

If the workflow fails, open its log. No cleanup will run and the error will identify whether the page returned no cards or every card failed validation.

## Publish a regional dataset

After the Dublin recovery succeeds, run:

```text
counties: dublin,carlow,kildare,wicklow
max_pages: 25
remove_legacy: true
min_valid_per_county: 5
```

The workflow sequence is:

1. scrape fresh server-rendered sold cards;
2. fail if a selected county produces no valid rows;
3. audit all stored records;
4. verify that every selected county has enough valid live records;
5. only then remove malformed and legacy imports.

Increase `max_pages` later for a deeper historical backfill. The page limit applies separately to each county and rerunning does not duplicate rows because the Daft detail URL is unique.

## Daily updates

The **Regional property scrape** workflow runs incrementally each day using the same HTTP card parser. It fails rather than silently succeeding when the first result page cannot be parsed.
