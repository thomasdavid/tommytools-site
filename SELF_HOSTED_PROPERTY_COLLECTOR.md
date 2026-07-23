# Self-hosted property collector

The property dashboard still uses Daft sold listings because the project depends on both asking and achieved prices. GitHub-hosted runners receive `403 Forbidden` responses, while the listings remain available through a normal browser connection.

The scraper therefore runs through a repository-level **Windows self-hosted GitHub Actions runner** on a machine you control. The API and PostgreSQL database remain on Render.

## Resulting architecture

```text
GitHub Actions schedule/manual run
        ↓
Windows self-hosted runner labelled property-scraper
        ↓
Validated Playwright scraper
        ↓
Render PostgreSQL
        ↓
FastAPI + TommyTools dashboard
```

## One-time runner setup

1. Open `thomasdavid/tommytools-site` on GitHub.
2. Go to **Settings → Actions → Runners**.
3. Click **New self-hosted runner**.
4. Choose **Windows** and **x64**.
5. Open PowerShell as Administrator on the collector PC.
6. Follow the exact download, extraction and `config.cmd` commands GitHub displays. The registration token is temporary, so use the commands from the live GitHub screen rather than copying an old token.
7. Use `C:\actions-runner` as the installation folder.
8. When asked for additional labels, add:

```text
property-scraper
```

9. When asked whether to run as a Windows service, choose **Yes**. This lets scheduled jobs run after a restart without leaving a terminal open.
10. Confirm the runner appears as **Idle** under **Settings → Actions → Runners**.

The machine must be switched on and connected to the internet when a scheduled job is due.

## Use an existing Python installation

The collector supports **Python 3.13 or Python 3.12 x64**. Python 3.13 is preferred when both are installed.

The workflows look for these locations:

```text
C:\Program Files\Python313\python.exe
C:\Program Files\Python312\python.exe
C:\Python313\python.exe
C:\Python312\python.exe
```

They also try the Windows Python launcher and the runner service account's `PATH`.

Check where Python is installed from Administrator PowerShell:

```powershell
py -0p
where.exe python
python --version
```

A system-wide installation under `C:\Program Files\Python313` is the simplest arrangement. A Python installation under your personal `AppData` directory may not be visible to a runner service using `NT AUTHORITY\NETWORK SERVICE`.

After installing or changing Python, restart the runner service:

```powershell
Get-Service "actions.runner.*" | Restart-Service
```

Confirm Python 3.13, for example:

```powershell
& "C:\Program Files\Python313\python.exe" --version
& "C:\Program Files\Python313\python.exe" -m pip --version
```

## Machine requirements

- Windows 10 or Windows 11 x64
- Python 3.13 or 3.12 x64 visible to the runner service
- Enough disk space for the GitHub runner checkout and Playwright Chromium
- Access to the Render PostgreSQL external hostname

The workflow installs project dependencies and Playwright Chromium before each run, so no project checkout needs to be maintained manually.

## Repository secret

The existing repository secret must remain available:

```text
PROPERTY_DATABASE_URL
```

It must contain the Render database **External Database URL**.

## First recovery run

Open **Actions → Rebuild property dataset → Run workflow** and use:

```text
counties: dublin
max_pages: 3
remove_legacy: false
min_valid_per_county: 5
```

The job will wait in a queued state until the `property-scraper` runner is online.

After it completes, review:

```text
https://tommytools.dev/projects/dublin-property-tracker/source.html
```

## Regional backfill

Once the Dublin test is correct:

```text
counties: dublin,carlow,kildare,wicklow
max_pages: 25
remove_legacy: false
min_valid_per_county: 5
```

Increase `max_pages` later for a deeper backfill. Rerunning is safe because records are upserted by their unique Daft detail URL.

## Daily updates

`Regional property scrape` runs at 05:20 UTC. It uses incremental mode and checks at most five pages per county, stopping sooner after consecutive pages contain no new listings.

## Safety

The scraper validates sale date, asking price, achieved price and a human-readable address before writing a live record. Malformed records are rejected. Legacy cleanup remains guarded by a minimum-valid-record check and should remain disabled until the rebuilt data has been reviewed.

Because this repository is public, keep the runner repository-scoped, do not add it to unrelated repositories, and do not change these collector workflows to run on pull-request events.
