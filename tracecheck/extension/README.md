# TraceCheck Deep Scan extension

Developer-mode Chrome/Chromium extension for an explicit, privileged cookie metadata scan.

## What it can read
Because the user grants the `cookies` permission plus `<all_urls>` host access, Chrome allows the extension to enumerate cookie metadata across accessible sites, including HttpOnly cookies.

## What it sends to the TraceCheck page
Only: cookie name, domain, path, Secure, HttpOnly, SameSite, session/expiry, store/partition metadata, and byte size. Cookie **values are removed in the extension service worker** and never reach page JavaScript.

## Install locally
1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked** and select this `extension` folder.
4. Reload `https://tracecheck-eus.pages.dev/`.
5. Run a normal scan, then click **Run Deep Cookie Scan**.

This is intentionally not auto-triggered. The user must both install the extension and click the Deep Scan button.
