# TraceCheck Deep Scan extension

Developer-mode Chrome/Chromium extension for an explicit, privileged cookie metadata and browser privacy-settings scan.

## What it can read
Because the user grants the `cookies` permission plus `<all_urls>` host access, Chrome allows the extension to enumerate cookie metadata across accessible sites, including HttpOnly cookies. The `privacy` permission is used only to read relevant Chrome settings such as the global third-party-cookie preference, Topics setting and Related Website Sets setting when those properties are available.

## What it sends to the TraceCheck page
Only: cookie name, domain, path, Secure, HttpOnly, SameSite, session/expiry, store/partition metadata, byte size, and the supported boolean privacy settings above. Cookie **values are removed in the extension service worker** and never reach page JavaScript.

## Two-step consent
Deep Scan cannot be silently triggered by the webpage. Open the extension popup and choose **Authorize one Deep Scan**. That authorization expires after 60 seconds and is consumed by the next scan request.

## Install locally
1. Open `chrome://extensions`.
2. Enable Developer mode.
3. Choose **Load unpacked** and select this `extension` folder.
4. Reload `https://tracecheck-eus.pages.dev/`.
5. Open the TraceCheck extension and choose **Authorize one Deep Scan**.
6. Return to TraceCheck and click **Run Deep Cookie Scan**.

This is intentionally not auto-triggered. The user must install the extension, explicitly authorize one scan in the extension UI, and then request the scan on the TraceCheck page.
