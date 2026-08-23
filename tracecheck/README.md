# TraceCheck

Privacy-first digital fingerprint self-audit for Cloudflare Pages.

## Privacy model
- Browser fingerprint attributes are collected and hashed in the browser.
- The fingerprint hash is not sent to the server.
- Previous-scan comparison data is stored only in browser localStorage.
- No database, login, analytics identifier, or server-side fingerprint history in this MVP.
- `/api/network` returns only an allow-list of connection metadata already visible to Cloudflare.

## Cloudflare Pages settings
- Repository: `thomasdavid/tommytools-site`
- Production branch: `main`
- Root directory: `tracecheck`
- Build command: `exit 0`
- Build output directory: `public`

Cloudflare Pages will discover the root `functions/` directory and deploy `/api/network` as a Pages Function.

## V1 tests
- Browser/user agent and platform
- Language and timezone
- Screen, pixel ratio, CPU cores, exposed device memory, touch capability
- Canvas rendering signal
- WebGL renderer/vendor
- Global Privacy Control and Do Not Track
- Cookie/local-storage availability
- Camera, microphone and location permission state without requesting permission
- Public IP, country, region/city, ASN/organisation, Cloudflare colo, TLS and HTTP protocol
- Local comparison with the previous scan

The identifiability score is an exposure estimate, not a population uniqueness statistic.
