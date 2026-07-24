# Local four-county property collector

This collector runs on the user's Windows PC, gathers the four-county sold-property data, saves a CSV backup, and posts validated rows to the Google Sheet `Raw` tab. A GitHub workflow then syncs the sheet into Render PostgreSQL.

## Counties

- Dublin
- Carlow
- Kildare
- Wicklow

## Files

- `collector.py` — local collector and card parser
- `PropertyReceiver.gs` — Apps Script web receiver that writes/upserts `Raw`
- `run_full.bat` — initial backfill
- `run_daily.bat` — immediate forced incremental run
- `run_scheduled.ps1` — due-check, catch-up depth, locking, logging and state tracking
- `install_scheduler.ps1` — installs the resilient Windows scheduled task
- `uninstall_scheduler.ps1` — removes the scheduled task
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
.\.venv\Scripts\python.exe -m pip install -r requirements.txt
Copy-Item .env.example .env
```

Edit `.env`:

```env
APPS_SCRIPT_WEB_APP_URL=https://script.google.com/macros/s/.../exec
COLLECTOR_TOKEN=<the same secret stored in Apps Script>
```

## 3. Test one page without uploading

```powershell
.\.venv\Scripts\python.exe collector.py --mode full --counties carlow --max-pages 1 --no-upload
```

Expected result:

- about 20 valid rows in `output/property_sales.csv`
- readable addresses
- asking and sold prices
- county `Carlow`
- area such as `Borris`

The collector exits without changing Google Sheets if it receives a blocked response, no cards, or fewer than five valid rows.

## 4. Initial four-county backfill

```powershell
.\.venv\Scripts\python.exe collector.py --mode full --counties dublin,carlow,kildare,wicklow --max-pages 10
```

Or double-click `run_full.bat`.

Full mode replaces `Raw` with the newly collected deduplicated set. The Apps Script receiver refuses uploads containing fewer than five valid rows.

## 5. Install the resilient scheduler

Open **PowerShell as Administrator** in this folder and run:

```powershell
Set-ExecutionPolicy -Scope Process Bypass
.\install_scheduler.ps1
```

Enter the Windows account password when prompted. Use the account password, not the Windows Hello PIN. The task is registered under the current Windows account so it can access the internet even when the user is logged out.

The installed task has two triggers:

- daily at 04:45;
- five minutes after Windows starts.

It also enables:

- **Start the task as soon as possible after a scheduled start is missed**;
- **Wake the computer to run this task**;
- **Run only when a network connection is available**;
- three automatic retries, 30 minutes apart;
- one active instance only.

Microsoft documents `StartWhenAvailable` as allowing Task Scheduler to start a task after its scheduled time has passed, while startup and daily triggers can coexist on one task.

### Catch-up behaviour

`run_scheduled.ps1` records the most recent successful run in `output/scheduler_state.json`.

- last success under 20 hours ago: skip;
- 20–72 hours ago: scan 2 pages per county;
- 3–7 days ago: scan 5 pages per county;
- over 7 days ago, or no successful run recorded: scan 10 pages per county.

This means the computer can be off for several days. When it next starts, the startup trigger runs a deeper catch-up scan automatically.

### Test the task

```powershell
Start-ScheduledTask -TaskName "TommyTools Property Collector"
```

Review:

```text
output\scheduled.log
output\scheduler_state.json
output\scheduler_last_failure.json
```

To force an immediate manual run:

```powershell
.\run_scheduled.ps1 -Force
```

To remove the task:

```powershell
.\uninstall_scheduler.ps1
```

## 6. Sheet-to-database sync

The GitHub `Sync property Google Sheet` workflow runs every three hours at 15 minutes past the hour. Therefore, when the computer comes online late and uploads fresh rows, PostgreSQL normally receives them within three hours rather than waiting until the next morning.

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
