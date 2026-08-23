# TraceCheck

Privacy-first browser/network self-audit for Cloudflare Pages.

## Privacy model
- Core browser fingerprint attributes are collected and hashed in the browser.
- The local fingerprint hash is not sent to the server.
- Previous-scan comparison data is stored only in browser localStorage.
- No login or server-side fingerprint history is required for the core scan.
- `/api/network` returns an allow-list of connection metadata already visible to Cloudflare.
- External IP intelligence is opt-in and sends only the visitor's public IP to `ipapi.is` after a button click.
- The tracker/ad-block test is opt-in and performs credential-free requests to a small, disclosed set of tracking endpoints.

## Cloudflare Pages settings
- Repository: `thomasdavid/tommytools-site`
- Production branch: `main`
- Root directory: `tracecheck`
- Build command: `exit 0`
- Build output directory: `public`

## V2 web scan
- Browser/User-Agent and platform
- Language, timezone, screen, pixel ratio, CPU cores, device memory and touch capability
- Canvas rendering signal
- WebGL renderer/vendor
- OfflineAudioContext signal
- Controlled installed-font detection
- User-Agent Client Hints high-entropy values when supported
- WebRTC ICE/STUN candidate exposure
- Global Privacy Control and Do Not Track
- First-party cookie write/read test and JavaScript-visible cookie metadata for TraceCheck only
- localStorage, sessionStorage, IndexedDB, Cache Storage, Service Worker and storage quota/persistence audit
- Public IP, geolocation, ASN/organisation, Cloudflare colo, TLS and HTTP protocol
- Opt-in IP VPN/proxy/Tor/datacenter/abuse classification through `ipapi.is`
- Opt-in tracker/ad-block reachability test
- Local previous-fingerprint comparison

## Deep Cookie Scan extension
The `extension/` directory contains an optional Manifest V3 Chrome/Chromium extension. Chrome's `cookies` API requires the `cookies` permission plus host permissions for the cookie domains being queried. The extension asks for `<all_urls>` because Deep Scan is specifically intended to enumerate cookie metadata across accessible sites.

The extension removes cookie values inside its service worker before returning anything to the TraceCheck page. The page receives only metadata such as name, domain, path, Secure, HttpOnly, SameSite, session/expiry, store/partition state and byte size.

Deep Scan uses two-step consent: after installing the extension, the user must open its popup and choose **Authorize one Deep Scan**. That authorization expires after 60 seconds and is consumed by the next scan request. The website cannot silently trigger a browser-wide cookie enumeration.

Deep Scan groups cookies by domain and sends only the 40 most cookie-heavy domain names to `/api/tracker-lookup` in each pass. That Pages Function cross-references DuckDuckGo Tracker Radar and returns owner/category/prevalence/fingerprinting metadata. It does not attempt to retrieve a tracker company's private server-side user profile.

## Cross-site cookie and DNS probes
A true third-party-cookie test requires a second registrable domain. A true DNS leak test requires an authoritative DNS zone that can correlate unique test hostnames with the recursive resolver that queried them. Source/scaffolding lives under `probes/`; the live UI reports these as not configured until that infrastructure exists rather than guessing.

## Data sources
- Cloudflare request metadata for edge/network signals.
- `ipapi.is` for opt-in IP security intelligence; its anonymous free tier currently documents up to 1,000 requests/day.
- DuckDuckGo Tracker Radar for tracker domain ownership/categories and prevalence metadata (Apache-2.0 project).

The identifiability score is an exposure estimate, not a population uniqueness statistic.
