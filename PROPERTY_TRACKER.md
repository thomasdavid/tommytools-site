# Regional Property Sale Tracker

A Tommy Tools project for exploring sold-property prices and the difference between asking and achieved prices across Dublin, Carlow, Kildare and Wicklow.

## Public pages

- Dashboard: `https://tommytools.dev/projects/dublin-property-tracker/`
- Source-data browser: `https://tommytools.dev/projects/dublin-property-tracker/source.html`
- API documentation: `https://tommytools-property-api.onrender.com/api/docs`
- CSV export: `https://tommytools-property-api.onrender.com/api/export.csv`

The source-data browser shows 100 records per page, supports county, area, price-band, property-type and text filters, links back to the Daft detail page, and downloads the complete filtered selection as CSV.

## Architecture

- Static HTML, CSS and JavaScript frontend
- Apache ECharts dashboard
- FastAPI JSON and CSV API
- PostgreSQL database on Render
- Playwright scraper run by GitHub Actions
- Existing Google Sheet importer for initial migration

The API uses Render's standard `onrender.com` hostname, so it consumes no additional custom domain.

## County and area model

Every record stores both:

- `county`: Dublin, Carlow, Kildare, Wicklow or Other
- `area`: a town, suburb, village or Dublin postal district

The dashboard county selector controls which areas appear in the area selector. Leaving the area selection empty means **all areas in the selected counties**, allowing whole-county analysis. Selecting specific areas narrows the results.

## Render deployment

1. In Render choose **New → Blueprint**.
2. Connect `thomasdavid/tommytools-site`.
3. Apply the root `render.yaml`.
4. Confirm `tommytools-property-api` and `tommytools-property-db` are available.
5. Confirm `/api/health` returns `status: ok`.

The existing database is upgraded automatically with a `county` field when the API starts.

## Connect GitHub Actions to PostgreSQL

Create a repository Actions secret named:

```text
PROPERTY_DATABASE_URL
```

Use the Render database's **External Database URL**. Never commit it.

## Review the stored source data

Open:

```text
https://tommytools.dev/projects/dublin-property-tracker/source.html
```

Use the filters to inspect records or click **Download filtered CSV**. The CSV includes dates, county, area, address, property metadata, asking and sold prices, differences, Daft URLs, source pages and scrape timestamps.

The API can also be reviewed directly:

```text
/api/properties?counties=Dublin&areas=Dalkey&limit=100
/api/export.csv?counties=Kildare
```

## Import the existing Google Sheet

Open **Actions → Import property Google Sheet → Run workflow**. The importer reads spreadsheet ID `1teB5wZq7-SiBlohTapD-etsHpJcvak3st_dZVIKUMDw`, tab `Raw`, and upserts rows into PostgreSQL.

## Reclassify existing records

After deploying changes to the county or locality rules, run:

```text
Actions → Reclassify property areas → Run workflow
```

This recalculates both county and area for records already stored in PostgreSQL.

## Scrape current data

Open:

```text
Actions → Regional property scrape → Run workflow
```

Inputs:

- `mode`: `incremental` or `full`
- `counties`: comma-separated slugs such as `dublin,carlow,kildare,wicklow`
- `max_pages`: page limit **per county**

Recommended first regional test:

```text
mode: full
counties: carlow,kildare,wicklow
max_pages: 3
```

After confirming the workflow succeeds, run a larger backfill, for example:

```text
mode: full
counties: carlow,kildare,wicklow
max_pages: 25
```

Run additional batches with a larger page limit if more history is required. The scraper upserts by detail URL, so rerunning does not duplicate records.

The scheduled workflow runs daily at 05:20 UTC in incremental mode for all four counties. For each county it stops after three consecutive pages contain no newly discovered listings.

## Local development

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
python -m playwright install chromium
```

Set `PYTHONPATH=backend` and `DATABASE_URL=sqlite:///./property_tracker.db`, then run:

```bash
uvicorn property_tracker.main:app --reload --app-dir backend
```

Example local scrape:

```bash
python -m property_tracker.scraper --mode full --counties dublin,carlow --max-pages 2 --show-browser
```

Serve the static site from the repository root:

```bash
python -m http.server 5500
```

## API endpoints

- `GET /api/health`
- `GET /api/meta`
- `GET /api/summary`
- `GET /api/trends`
- `GET /api/properties`
- `GET /api/export.csv`
- `GET /api/docs`

Filters use repeated query parameters:

```text
/api/trends?counties=Dublin&counties=Wicklow&areas=Dalkey&bands=700-900k&property_types=House&metric=delta_pct
```

## Operational notes

- Daft can change its HTML structure. Always start with a short live test.
- Use moderate delays and do not increase request rates aggressively.
- PostgreSQL is authoritative after migration.
- Render's free database has platform limitations and is not suitable as a permanent archive without upgrading.
