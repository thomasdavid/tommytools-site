# Google Sheets property pipeline

The production dashboard keeps Daft asking-price data by using the existing Google Apps Script collector in the `Raw` tab, then syncing that tab into Render PostgreSQL with Python.

```text
Daft sold pages
      ↓
Google Apps Script in the existing spreadsheet
      ↓
Raw sheet
      ↓
GitHub-hosted Python importer
      ↓
Render PostgreSQL
      ↓
FastAPI + TommyTools dashboard
```

This replaces the browser-based self-hosted collector. No Chrome window or local GitHub runner is required for the normal pipeline.

## Spreadsheet

```text
Spreadsheet ID: 1teB5wZq7-SiBlohTapD-etsHpJcvak3st_dZVIKUMDw
Data tab: Raw
```

The `Raw` tab should include these columns where available:

```text
scraped_at
sale_date
sold_price_eur
asking_price_eur
delta_eur
delta_pct
asking_band
property_type
size_sqm
address
area
county
detail_url
source_page
bedrooms
bathrooms
```

The Python importer recalculates county, area, price difference and broad property type when records are written to PostgreSQL.

## Daily operation

1. The Google Apps Script collector refreshes or extends the `Raw` tab.
2. The GitHub workflow **Sync property Google Sheet** runs daily at 06:15 UTC.
3. It downloads the `Raw` tab through Google GViz CSV.
4. It rejects rows without a sale date, asking price, achieved price or human-readable address.
5. It upserts valid rows by `detail_url` and leaves historical records in PostgreSQL.

The workflow refuses to commit an empty or unexpectedly small import. The default minimum is five valid rows.

## Manual recovery

After the Apps Script has populated `Raw`:

1. Open **GitHub → Actions → Sync property Google Sheet**.
2. Click **Run workflow**.
3. Leave `minimum_valid_rows` at `5` unless testing a very small sheet.
4. Review the log for inserted, updated and skipped counts.
5. Open:

```text
https://tommytools.dev/projects/dublin-property-tracker/source.html
```

## Google Apps Script trigger

In the spreadsheet, open **Extensions → Apps Script → Triggers** and create a time-driven trigger for the working refresh function. Schedule it before 06:15 UTC so the Python sync reads the latest completed `Raw` data.

A suitable order is:

```text
05:15 UTC  Apps Script refresh
06:15 UTC  GitHub Python sync
```

## Safety

- Do not enable browser-based property scrape workflows.
- Do not delete the PostgreSQL table before a new import succeeds.
- Keep the `PROPERTY_DATABASE_URL` GitHub repository secret.
- Keep the spreadsheet accessible to the GViz CSV endpoint used by the importer.
- Review skipped rows in the workflow log before changing validation rules.
