# Local four-county property collector

This collector replaces the blocked Google `UrlFetchApp` and browser-automation approaches.

It runs as normal Python on the user's Windows PC, fetches only the county sold-result pages, parses the visible result cards, saves a CSV backup, and posts validated rows to a Google Apps Script web app. The existing GitHub workflow then syncs the `Raw` sheet into Render PostgreSQL.

## Counties

- Dublin
- Carlow
- Kildare
- Wicklow

## Files

- `collector.py` — local HTTP collector and card parser
- `PropertyReceiver.gs` — Apps Script web receiver that writes/upserts `Raw`
- `run_full.bat` — initial backfill, 10 pages per county
- `run_daily.bat` — daily incremental collection, 2 pages per county
- `.env.example` — endpoint and shared-secret template

## 1. Deploy the Apps Script receiver

1. Open the existing property spreadsheet.
2. Open **Extensions → Apps Script**.
3. Replace the existing scraping code with `PropertyReceiver.gs`.
4. In **Project Settings → Script properties**, add:

   ```text
   COLLECTOR_TOKEN=<a long random secret>
   ```

5. Choose **Deploy → New deployment → Web app**.
6. Execute as **Me**.
7. Allow access to **Anyone**.
8. Copy the `/exec` web-app URL.

The endpoint is publicly reachable, but uploads are rejected unless the JSON body contains the matching secret token.

## 2. Install the local collector

From PowerShell:

```powershell
cd <repo>\tools\property_local_collector
py -3.13 -m venv .venv
.\.venv\Scripts\Activate.ps1
python -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env`:

```env
APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/.../exec
COLLECTOR_TOKEN=<the same secret stored in Apps Script>
```

## 3. Test one page without uploading

```powershell
python collector.py --mode full --counties carlow --max-pages 1 --no-upload
```

Expected result:

- about 20 valid rows in `output/property_sales.csv`
- readable addresses
- asking and sold prices
- county `Carlow`
- area such as `Borris`

If this command returns HTTP 403 or a Daft security-check error, plain local HTTP access is also blocked and the collector exits without changing Google Sheets.

## 4. Initial four-county backfill

```powershell
python collector.py --mode full --counties dublin,carlow,kildare,wicklow --max-pages 10
```

Or double-click `run_full.bat`.

Full mode replaces the `Raw` data with the newly collected deduplicated set. The Apps Script receiver refuses uploads containing fewer than five valid rows.

## 5. Daily incremental update

```powershell
python collector.py --mode incremental --counties dublin,carlow,kildare,wicklow --max-pages 2
```

Incremental mode merges new rows into the existing `Raw` sheet using `detail_url` as the unique key.

`run_daily.bat` can be scheduled with Windows Task Scheduler. Run it before the GitHub `Sync property Google Sheet` job at 06:15 UTC.

## Data fields

```text
scraped_at
sale_date
sold_price_eur
asking_price_eur
delta_eur
delta_pct
asking_band
property_type
bedrooms
bathrooms
size_sqm
address
county
area
detail_url
source_page
```

No detail pages are opened. All fields come from the county result-card HTML.
