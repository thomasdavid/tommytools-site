# Dublin Property Tracker

A Tommy Tools project for exploring Dublin sold-property prices and the difference between asking and achieved prices.

## Architecture

- **Frontend:** static HTML, CSS and JavaScript at `/projects/dublin-property-tracker/`
- **Charting:** Apache ECharts loaded from a CDN
- **API:** FastAPI in `backend/property_tracker/`
- **Database:** PostgreSQL on Render
- **Daily ingestion:** Playwright scraper run by GitHub Actions
- **Initial migration:** manual GitHub Actions workflow imports the existing Google Sheet
- **Public URL:** `https://tommytools.dev/projects/dublin-property-tracker/`
- **API URL:** `https://tommytools-property-api.onrender.com`

The API uses Render's standard `onrender.com` hostname, so this project consumes no additional custom domain.

## Repository structure

```text
backend/
  property_tracker/
    main.py           FastAPI endpoints
    scraper.py        Playwright Dublin sold scraper
    import_sheet.py   existing Google Sheet importer
    database.py       SQLAlchemy engine and sessions
    models.py         PostgreSQL tables
    helpers.py        parsing and metadata normalisation
  tests/
  requirements.txt
projects/dublin-property-tracker/
  index.html
  styles.css
  app.js
  config.js
.github/workflows/
  property-backend-tests.yml
  property-import-sheet.yml
  property-scrape.yml
render.yaml
```

## Render deployment

1. In Render, choose **New → Blueprint**.
2. Connect the GitHub repository `thomasdavid/tommytools-site`.
3. Render detects the root `render.yaml` file.
4. Apply the Blueprint.
5. It creates:
   - `tommytools-property-api`, a FastAPI web service;
   - `tommytools-property-db`, a PostgreSQL database.
6. Wait for the API deploy to complete.
7. Confirm that `/api/health` responds at the API's `onrender.com` URL.

The repository expects the hostname `tommytools-property-api.onrender.com`. If Render assigns a different hostname, update `projects/dublin-property-tracker/config.js`.

## Connect GitHub Actions to PostgreSQL

The Render web service receives the internal database URL automatically. GitHub Actions needs the database's **external** connection URL.

1. Open the Render database `tommytools-property-db`.
2. Copy its external PostgreSQL URL.
3. In GitHub open **Settings → Secrets and variables → Actions**.
4. Create a repository secret named:

```text
PROPERTY_DATABASE_URL
```

5. Paste the external PostgreSQL URL as the value.

Never commit the URL to the repository.

## Import the existing Google Sheet

The Raw sheet must be readable through its Google GViz CSV endpoint.

1. Open the repository's **Actions** tab.
2. Select **Import property Google Sheet**.
3. Select **Run workflow**.
4. Check the workflow log for inserted and updated row counts.

The workflow imports spreadsheet ID `1teB5wZq7-SiBlohTapD-etsHpJcvak3st_dZVIKUMDw`, tab `Raw`.

## Run the first Dublin scrape

1. Open **Actions → Dublin property scrape**.
2. Select **Run workflow**.
3. Choose `full`.
4. Initially set `max_pages` to `10` as a live test.
5. Check the database and dashboard output.
6. Run `full` again with a larger page limit after confirming the selectors still match Daft's current HTML.

Afterwards, the scheduled workflow runs every day at 05:20 UTC in `incremental` mode. It scans recent pages and stops after three consecutive pages with no newly discovered URLs.

## Local development

```bash
python -m venv .venv
source .venv/bin/activate        # Windows: .venv\Scripts\activate
pip install -r backend/requirements.txt
python -m playwright install chromium
```

Create a local `.env` from `.env.example`, then run:

```bash
set PYTHONPATH=backend            # Windows Command Prompt
set DATABASE_URL=sqlite:///./property_tracker.db
uvicorn property_tracker.main:app --reload --app-dir backend
```

For macOS or Linux:

```bash
export PYTHONPATH=backend
export DATABASE_URL=sqlite:///./property_tracker.db
uvicorn property_tracker.main:app --reload --app-dir backend
```

Run a small local scrape:

```bash
python -m property_tracker.scraper --mode full --max-pages 2 --show-browser
```

Serve the static site from the repository root:

```bash
python -m http.server 5500
```

Then open:

```text
http://localhost:5500/projects/dublin-property-tracker/
```

For local frontend development, temporarily set `apiBaseUrl` in `config.js` to `http://127.0.0.1:8000`. Do not commit that local change.

## API endpoints

- `GET /api/health`
- `GET /api/meta`
- `GET /api/summary`
- `GET /api/trends`
- `GET /api/properties`
- `GET /api/docs`

Filters use repeated query parameters, for example:

```text
/api/trends?areas=Dalkey&areas=Killiney&bands=700-900k&property_types=House&metric=delta_pct
```

## Important operational notes

- Daft can change its HTML structure. Start with a short test scrape before a large backfill.
- Use moderate delays and do not increase the request rate aggressively.
- PostgreSQL is authoritative after migration; the Google Sheet is no longer required for normal operation.
- Render's free database and web tiers have platform limitations. Upgrade the database before relying on it as a permanent archive.
