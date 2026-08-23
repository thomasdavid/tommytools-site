# TraceCheck cross-site and DNS probe infrastructure

The web app exposes honest "not configured" states for these two tests until infrastructure exists.

## Third-party cookie probe
Deploy `third-party-cookie-worker.js` on a genuinely different registrable domain from the TraceCheck page. The browser must treat it as cross-site. Then wire the probe URL into the main app.

## DNS leak probe
A real DNS leak test needs an authoritative DNS zone you control. Generate a unique subdomain per test, cause the browser to resolve it, and correlate the authoritative DNS query source/resolver with the browser session. Do not infer DNS resolvers from ordinary HTTP metadata.
