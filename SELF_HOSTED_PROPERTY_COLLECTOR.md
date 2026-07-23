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

## Install Python once

Do not rely on `actions/setup-python` on this runner. Install **Python 3.12 x64 system-wide** using the official Windows installer.

During installation:

- choose **Customize installation**;
- enable **Install for all users**;
- enable **Add Python to environment variables**;
- keep the default all-users path, normally `C:\Program Files\Python312`;
- include `pip` and the Python launcher.

After installation, restart the runner service from Administrator PowerShell:

```powershell
Get-Service "actions.runner.*" | Restart-Service
```

Confirm the system installation:

```powershell
& "C:\Program Files\Python312\python.exe" --version
& "C:\Program Files\Python312\python.exe" -m pip --version
```

The workflows locate Python in `C:\Program Files\Python312`, `C:\Python312`, the runner account's local Python folder, or the service account's `PATH`. They fail with a clear message if Python 3.12 cannot be found.

## Machine requirements

- Windows 10 or Windows 11 x64
- Python 3.12 x64 installed for all users
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
