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

They also try the Windows Python launcher and the runner account's `PATH`.

Check where Python is installed:

```powershell
py -0p
where.exe python
python --version
```

A system-wide installation under `C:\Program Files\Python313` is simplest for service operation. A personal installation under `C:\Users\buddy\AppData` works when the runner is started interactively with `run.cmd` under the `buddy` account.

## Daft security-check browser profile

Daft may show a page saying **“We are checking the security of your connection”** to a fresh automated browser. The rebuild workflow therefore supports a visible Chrome window and a dedicated persistent profile:

```text
C:\actions-runner\daft-browser-profile
```

For the first successful scrape:

1. Stop the Windows runner service if it is running.
2. Start `C:\actions-runner\run.cmd` from a normal PowerShell window under the `buddy` account.
3. Run **Rebuild property dataset** with `interactive_browser=true`.
4. A Chrome window will open. Complete any security check manually.
5. Leave the window and runner open until the scrape finishes.

The profile retains the resulting session cookies for later runs. Scheduled headless runs reuse the same profile. If Daft presents another security check, the scheduled run fails safely rather than reporting a false success or deleting data; run another interactive rebuild to refresh the session.

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
interactive_browser: true
challenge_wait_seconds: 300
remove_legacy: false
min_valid_per_county: 5
```

Watch the collector PC. If Chrome displays a security check, complete it manually. The workflow waits for the sold-property cards to appear and then continues.

After it completes, review:

```text
https://tommytools.dev/projects/dublin-property-tracker/source.html
```

## Regional backfill

Once the Dublin test is correct:

```text
counties: dublin,carlow,kildare,wicklow
max_pages: 25
interactive_browser: false
challenge_wait_seconds: 300
remove_legacy: false
min_valid_per_county: 5
```

If the saved profile is challenged again, repeat the run with `interactive_browser=true`.

Increase `max_pages` later for a deeper backfill. Rerunning is safe because records are upserted by their unique Daft detail URL.

## Daily updates

`Regional property scrape` runs at 05:20 UTC. It uses incremental mode, the saved browser profile and at most five pages per county. It stops sooner after consecutive pages contain no new listings.

## Safety

The scraper validates sale date, asking price, achieved price and a human-readable address before writing a live record. A first page with no cards now fails the workflow. A county producing zero valid records also fails. Legacy cleanup remains guarded and should remain disabled until the rebuilt data has been reviewed.

Because this repository is public, keep the runner repository-scoped, do not add it to unrelated repositories, and do not change these collector workflows to run on pull-request events.
