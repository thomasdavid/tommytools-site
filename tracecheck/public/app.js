const $ = (id) => document.getElementById(id);
const wait = (ms) => new Promise((resolve) => setTimeout(resolve, ms));

const ui = {
  scanButton: $('scanButton'), privacyButton: $('privacyButton'), scanShell: $('scanShell'), results: $('results'),
  scanTitle: $('scanTitle'), scanStatus: $('scanStatus'), progressBar: $('progressBar'), rescanButton: $('rescanButton'),
  identScore: $('identScore'), privacyScore: $('privacyScore'), networkScore: $('networkScore'),
  identMeter: $('identMeter'), privacyMeter: $('privacyMeter'), networkMeter: $('networkMeter'),
  identText: $('identText'), privacyText: $('privacyText'), networkText: $('networkText'),
  headline: $('headline'), summary: $('summary'), networkList: $('networkList'), fingerprintList: $('fingerprintList'),
  privacyList: $('privacyList'), cookieList: $('cookieList'), fingerprintHash: $('fingerprintHash'), compareBox: $('compareBox'),
  clearHistoryButton: $('clearHistoryButton'), recommendationList: $('recommendationList')
};

const metricHelp = {
  'Identifiability': 'An exposure estimate based on stable browser attributes this page can observe. It is not a claim that your browser is unique among all users.',
  'Privacy protection': 'A score based on browser-visible privacy controls such as Global Privacy Control, Do Not Track, cookies and local storage availability.',
  'Network consistency': 'Checks whether browser-reported signals such as timezone and language broadly agree with metadata seen at the Cloudflare edge.',
  'Public IP': 'The public Internet Protocol address seen by this website. Sites commonly use it for routing, approximate location, abuse prevention and account-risk checks.',
  'Country': 'Country inferred by Cloudflare from the public IP address. It is approximate and can differ when using VPNs, proxies or mobile networks.',
  'Region / city': 'Approximate IP-based location supplied by Cloudflare. It is not GPS location and may be inaccurate.',
  'IP-derived timezone': 'Timezone associated with the public IP according to Cloudflare. A mismatch with the browser timezone can occur when travelling or using a VPN.',
  'Network / ASN': 'The Autonomous System Number and organisation announcing your IP address. This usually identifies your ISP, mobile carrier, VPN provider or hosting network.',
  'Cloudflare edge': 'The Cloudflare data-centre location that handled this request. This describes the route to TraceCheck, not your physical location.',
  'TLS': 'The TLS protocol version used to encrypt the HTTPS connection between your browser and TraceCheck.',
  'TLS cipher': 'The cryptographic cipher suite negotiated for this HTTPS connection. It can contribute to a network/client fingerprint.',
  'HTTP': 'The HTTP protocol version used for the request, such as HTTP/2 or HTTP/3.',
  'IP reputation': 'Whether reputation services associate the public IP with spam, abuse, automation or other suspicious activity. TraceCheck does not query a provider yet.',
  'VPN / proxy': 'Whether the connection appears to originate from a VPN, proxy, Tor exit or hosting network. A specialist classification source is required for a reliable result.',
  'Browser / UA': 'The browser User-Agent string. It can reveal browser family/version, operating system and device class, although modern browsers increasingly reduce its detail.',
  'Platform': 'The operating-system or platform label exposed by the browser.',
  'Timezone': 'The timezone reported by the browser through JavaScript. It is a useful consistency and fingerprinting signal.',
  'Languages': 'The preferred browser languages exposed to websites. The combination and order can help distinguish users.',
  'Screen': 'The screen resolution and device pixel ratio exposed to the page. These values can contribute to fingerprinting.',
  'CPU cores': 'The logical processor count exposed through navigator.hardwareConcurrency. Browsers may reduce or cap this value.',
  'Device memory': 'Approximate device RAM exposed by supported browsers. It is intentionally coarse rather than an exact memory measurement.',
  'Touch points': 'The maximum number of simultaneous touch contacts the browser reports, helping sites infer device capabilities.',
  'Automation flag': 'navigator.webdriver tells websites when the browser exposes that it is being controlled by automation such as WebDriver.',
  'WebGL renderer': 'Graphics renderer information exposed through WebGL. GPU/driver details can be a relatively stable fingerprinting signal.',
  'Canvas signal': 'A hash of an image rendered locally in a canvas. Small differences in graphics, fonts and rendering can produce a repeatable browser signal.',
  'Global Privacy Control': 'GPC is a browser signal expressing a preference not to have personal data sold or shared where participating laws and sites recognise it.',
  'Do Not Track': 'An older browser preference asking sites not to track the user. Sites are not generally required to honour it.',
  'Cookies': 'navigator.cookieEnabled reports whether the browser says cookies are enabled. The active first-party test below is a stronger practical check.',
  'Local storage': 'Web Storage lets a site persist key/value data in the browser for its own origin. It can be used for preferences, sessions or tracking.',
  'Camera access': 'Whether this origin can use camera APIs. TraceCheck deliberately blocks camera access through its own Permissions-Policy.',
  'Microphone access': 'Whether this origin can use microphone APIs. TraceCheck deliberately blocks microphone access through its own Permissions-Policy.',
  'Location access': 'Whether this origin can request geolocation. TraceCheck deliberately blocks geolocation through its own Permissions-Policy.',
  'Third-party cookies': 'Cookies belonging to a different site embedded in the current page. A reliable test requires a second cross-site origin, so a single-origin page cannot truthfully infer the setting.',
  'Browser cookie flag': 'The browser-level navigator.cookieEnabled value. It is useful but does not guarantee every kind of cookie will be accepted.',
  'First-party cookie test': 'TraceCheck briefly creates a same-site Secure, SameSite=Lax test cookie, reads it back, then deletes it. This verifies practical first-party cookie access.',
  'JS-visible cookies': 'The number of cookies for this TraceCheck origin readable through document.cookie. Cookie values are never displayed.',
  'Cookie Store API': 'Whether this browser exposes the newer asynchronous Cookie Store API. It is an alternative to synchronous document.cookie access.',
  'Secure context': 'Whether the page is running in a browser secure context, normally HTTPS. Some modern browser APIs require this.',
  'HttpOnly visibility': 'HttpOnly cookies are intentionally hidden from page JavaScript, which helps protect sensitive session cookies from script access.',
  'Cross-site cookie test': 'A definitive third-party-cookie test requires another origin embedded or called cross-site. TraceCheck does not perform that external test yet.'
};

function escapeHtml(value) {
  return String(value ?? 'Unavailable').replace(/[&<>'"]/g, (c) => ({
    '&': '&amp;', '<': '&lt;', '>': '&gt;', "'": '&#39;', '"': '&quot;'
  }[c]));
}

function metricLabel(label, help = metricHelp[label]) {
  if (!help) return escapeHtml(label);
  return `<span class="metric-name">${escapeHtml(label)}</span><button class="metric-help" type="button" aria-label="About ${escapeHtml(label)}"><span aria-hidden="true">?</span><span class="metric-tooltip" role="tooltip">${escapeHtml(help)}</span></button>`;
}

function row(label, value, className = '', help = metricHelp[label]) {
  return `<div><dt>${metricLabel(label, help)}</dt><dd class="${className}">${escapeHtml(value)}</dd></div>`;
}

function decorateScoreLabels() {
  document.querySelectorAll('.score-label').forEach((el) => {
    const label = el.textContent.trim();
    if (metricHelp[label]) el.innerHTML = metricLabel(label);
  });
}

async function sha256(input) {
  const data = new TextEncoder().encode(input);
  const digest = await crypto.subtle.digest('SHA-256', data);
  return [...new Uint8Array(digest)].map((b) => b.toString(16).padStart(2, '0')).join('');
}

async function canvasSignal() {
  try {
    const canvas = document.createElement('canvas');
    canvas.width = 320;
    canvas.height = 80;
    const ctx = canvas.getContext('2d');
    ctx.textBaseline = 'top';
    ctx.font = '16px Arial';
    ctx.fillStyle = '#f60';
    ctx.fillRect(8, 8, 120, 30);
    ctx.fillStyle = '#069';
    ctx.fillText('TraceCheck 🔐 123', 12, 15);
    ctx.globalCompositeOperation = 'multiply';
    ctx.fillStyle = 'rgba(100,190,80,.72)';
    ctx.beginPath();
    ctx.arc(180, 35, 25, 0, Math.PI * 2);
    ctx.fill();
    return (await sha256(canvas.toDataURL())).slice(0, 16);
  } catch {
    return 'blocked';
  }
}

function webglSignal() {
  try {
    const canvas = document.createElement('canvas');
    const gl = canvas.getContext('webgl') || canvas.getContext('experimental-webgl');
    if (!gl) return { renderer: 'Unavailable', vendor: 'Unavailable' };
    const ext = gl.getExtension('WEBGL_debug_renderer_info');
    return {
      renderer: ext ? gl.getParameter(ext.UNMASKED_RENDERER_WEBGL) : gl.getParameter(gl.RENDERER),
      vendor: ext ? gl.getParameter(ext.UNMASKED_VENDOR_WEBGL) : gl.getParameter(gl.VENDOR)
    };
  } catch {
    return { renderer: 'Blocked', vendor: 'Blocked' };
  }
}

function storageSupport() {
  try {
    const key = '__tracecheck_test__';
    localStorage.setItem(key, '1');
    localStorage.removeItem(key);
    return true;
  } catch {
    return false;
  }
}

function cookieDiagnostics() {
  const navFlag = navigator.cookieEnabled === true;
  const testName = '__tracecheck_cookie_test';
  let writeRead = false;
  let visibleCount = 0;

  try {
    document.cookie = `${testName}=1; Path=/; Max-Age=60; SameSite=Lax; Secure`;
    writeRead = document.cookie.split(';').some((part) => part.trim().startsWith(`${testName}=`));
    document.cookie = `${testName}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
    const visible = document.cookie.trim();
    visibleCount = visible ? visible.split(';').filter(Boolean).length : 0;
  } catch {
    writeRead = false;
  }

  return {
    browserFlag: navFlag,
    firstPartyWriteRead: writeRead,
    jsVisibleCount: visibleCount,
    cookieStore: 'cookieStore' in window,
    secureContext: window.isSecureContext === true,
    httpOnlyVisibility: 'Hidden from JavaScript by design',
    crossSiteTest: 'Requires a second origin'
  };
}

function featurePolicyStatus(feature) {
  try {
    const policy = document.permissionsPolicy || document.featurePolicy;
    if (policy?.allowsFeature && policy.allowsFeature(feature) === false) return 'Blocked by TraceCheck policy';
  } catch {}
  return 'Not requested';
}

async function collectBrowser() {
  const webgl = webglSignal();
  const canvas = await canvasSignal();
  const nav = navigator;
  const tz = Intl.DateTimeFormat().resolvedOptions().timeZone || 'Unavailable';
  const screenInfo = `${screen.width}×${screen.height} @ ${window.devicePixelRatio || 1}x`;
  const cookies = cookieDiagnostics();

  const fingerprint = {
    userAgent: nav.userAgent,
    platform: nav.userAgentData?.platform || nav.platform || 'Unavailable',
    languages: (nav.languages || [nav.language]).filter(Boolean),
    timezone: tz,
    screen: screenInfo,
    colorDepth: screen.colorDepth,
    cpuCores: nav.hardwareConcurrency ?? 'Unavailable',
    memoryGB: nav.deviceMemory ?? 'Unavailable',
    touchPoints: nav.maxTouchPoints ?? 0,
    webdriver: nav.webdriver === true,
    pdfViewer: nav.pdfViewerEnabled ?? 'Unavailable',
    webglRenderer: webgl.renderer,
    webglVendor: webgl.vendor,
    canvasHash: canvas
  };

  const privacy = {
    cookiesEnabled: nav.cookieEnabled,
    localStorage: storageSupport(),
    doNotTrack: nav.doNotTrack === '1',
    globalPrivacyControl: nav.globalPrivacyControl === true,
    thirdPartyCookies: 'Cross-site test required',
    cameraPermission: featurePolicyStatus('camera'),
    microphonePermission: featurePolicyStatus('microphone'),
    locationPermission: featurePolicyStatus('geolocation')
  };

  const canonical = JSON.stringify(fingerprint, Object.keys(fingerprint).sort());
  const hash = await sha256(canonical);
  return { fingerprint, privacy, cookies, hash };
}

async function collectNetwork() {
  try {
    const response = await fetch('/api/network', { cache: 'no-store', headers: { Accept: 'application/json' } });
    if (!response.ok) throw new Error(`HTTP ${response.status}`);
    return await response.json();
  } catch {
    return {
      available: false, ip: 'Unavailable', country: 'Unavailable', asn: 'Unavailable', organization: 'Unavailable',
      colo: 'Unavailable', tlsVersion: 'Unavailable', tlsCipher: 'Unavailable', httpProtocol: 'Unavailable',
      networkTimezone: '', acceptLanguage: ''
    };
  }
}

function identifiabilityScore(fp) {
  let score = 20;
  if (fp.canvasHash && fp.canvasHash !== 'blocked') score += 18;
  if (!['Unavailable', 'Blocked'].includes(fp.webglRenderer)) score += 18;
  if (fp.screen !== 'Unavailable') score += 10;
  if (fp.cpuCores !== 'Unavailable') score += 8;
  if (fp.memoryGB !== 'Unavailable') score += 7;
  if (fp.languages?.length) score += Math.min(7, fp.languages.length * 2);
  if (fp.touchPoints > 0) score += 4;
  if (fp.pdfViewer !== 'Unavailable') score += 3;
  if (fp.webdriver) score += 5;
  return Math.min(100, score);
}

function privacyProtectionScore(p, cookies) {
  let score = 30;
  if (p.globalPrivacyControl) score += 30;
  if (p.doNotTrack) score += 10;
  if (!cookies.firstPartyWriteRead) score += 12;
  if (!p.localStorage) score += 8;
  return Math.min(100, score);
}

function primaryLanguage(value) {
  return String(value || '').split(',')[0].trim().split(';')[0].toLowerCase();
}

function networkConsistencyScore(network, fp) {
  if (!network?.available) return 0;
  let score = 55;

  if (network.networkTimezone && fp.timezone) {
    if (network.networkTimezone === fp.timezone) score += 25;
    else if (network.networkTimezone.split('/')[0] === fp.timezone.split('/')[0]) score += 8;
    else score -= 10;
  }

  const headerLanguage = primaryLanguage(network.acceptLanguage);
  const browserLanguage = primaryLanguage(fp.languages?.[0]);
  if (headerLanguage && browserLanguage) {
    if (headerLanguage === browserLanguage) score += 10;
    else if (headerLanguage.split('-')[0] === browserLanguage.split('-')[0]) score += 6;
    else score -= 5;
  }

  if (network.tlsVersion && network.tlsVersion !== 'Unavailable') score += 5;
  if (network.organization) score += 5;
  return Math.max(0, Math.min(100, score));
}

function scoreLabel(score, inverse = false) {
  if (inverse) return score >= 70 ? 'High' : score >= 45 ? 'Moderate' : 'Low';
  return score >= 70 ? 'Strong' : score >= 45 ? 'Moderate' : 'Limited';
}

function setScore(el, meter, value) {
  el.textContent = value === 0 ? '—' : value;
  meter.style.width = `${value}%`;
}

function render(data) {
  const { fingerprint: fp, privacy: p, cookies, hash } = data.browser;
  const n = data.network;
  const ident = identifiabilityScore(fp);
  const privacy = privacyProtectionScore(p, cookies);
  const consistency = networkConsistencyScore(n, fp);

  setScore(ui.identScore, ui.identMeter, ident);
  setScore(ui.privacyScore, ui.privacyMeter, privacy);
  setScore(ui.networkScore, ui.networkMeter, consistency);

  ui.identText.textContent = `${scoreLabel(ident, true)} identifiability: this browser exposes several stable attributes.`;
  ui.privacyText.textContent = `${scoreLabel(privacy)} visible privacy protection based on browser-exposed controls.`;
  ui.networkText.textContent = n.available
    ? `${scoreLabel(consistency)} agreement between network-derived and browser-exposed signals.`
    : 'Network endpoint was unavailable for this scan.';

  ui.headline.textContent = ident >= 70
    ? 'Your browser exposes a distinctive set of signals.'
    : ident >= 45
      ? 'Your browser exposes a moderate amount of identifying detail.'
      : 'Your browser exposes relatively little identifying detail.';

  ui.summary.textContent = 'This is an exposure estimate, not a population uniqueness claim. True uniqueness requires comparison against a large reference population.';

  ui.networkList.innerHTML = [
    row('Public IP', n.ip),
    row('Country', n.country),
    row('Region / city', [n.region, n.city].filter(Boolean).join(', ') || 'Unavailable'),
    row('IP-derived timezone', n.networkTimezone || 'Unavailable'),
    row('Network / ASN', n.asn && n.organization ? `AS${n.asn} — ${n.organization}` : n.organization || n.asn || 'Unavailable'),
    row('Cloudflare edge', n.colo),
    row('TLS', n.tlsVersion),
    row('TLS cipher', n.tlsCipher),
    row('HTTP', n.httpProtocol),
    row('IP reputation', 'Not checked', 'status-muted'),
    row('VPN / proxy', 'Not checked', 'status-muted')
  ].join('');

  ui.fingerprintList.innerHTML = [
    row('Browser / UA', fp.userAgent),
    row('Platform', fp.platform),
    row('Timezone', fp.timezone),
    row('Languages', fp.languages.join(', ')),
    row('Screen', fp.screen),
    row('CPU cores', fp.cpuCores),
    row('Device memory', fp.memoryGB === 'Unavailable' ? 'Unavailable' : `${fp.memoryGB} GB`),
    row('Touch points', fp.touchPoints),
    row('Automation flag', fp.webdriver ? 'Exposed as automated' : 'Not exposed'),
    row('WebGL renderer', fp.webglRenderer),
    row('Canvas signal', fp.canvasHash)
  ].join('');
  ui.fingerprintHash.textContent = `${hash.slice(0, 16)}…${hash.slice(-12)}`;

  ui.privacyList.innerHTML = [
    row('Global Privacy Control', p.globalPrivacyControl ? 'Enabled' : 'Not detected', p.globalPrivacyControl ? 'status-good' : 'status-muted'),
    row('Do Not Track', p.doNotTrack ? 'Enabled' : 'Not detected', p.doNotTrack ? 'status-good' : 'status-muted'),
    row('Cookies', p.cookiesEnabled ? 'Enabled' : 'Disabled', p.cookiesEnabled ? 'status-warn' : 'status-good'),
    row('Local storage', p.localStorage ? 'Available' : 'Blocked', p.localStorage ? 'status-warn' : 'status-good'),
    row('Camera access', p.cameraPermission),
    row('Microphone access', p.microphonePermission),
    row('Location access', p.locationPermission),
    row('Third-party cookies', p.thirdPartyCookies, 'status-muted')
  ].join('');

  if (ui.cookieList) {
    ui.cookieList.innerHTML = [
      row('Browser cookie flag', cookies.browserFlag ? 'Enabled' : 'Disabled', cookies.browserFlag ? 'status-warn' : 'status-good'),
      row('First-party cookie test', cookies.firstPartyWriteRead ? 'Write + read allowed' : 'Blocked', cookies.firstPartyWriteRead ? 'status-warn' : 'status-good'),
      row('JS-visible cookies', `${cookies.jsVisibleCount} on this origin`),
      row('Cookie Store API', cookies.cookieStore ? 'Available' : 'Not exposed'),
      row('Secure context', cookies.secureContext ? 'Yes — HTTPS' : 'No'),
      row('HttpOnly visibility', cookies.httpOnlyVisibility, 'status-muted'),
      row('Cross-site cookie test', cookies.crossSiteTest, 'status-muted')
    ].join('');
  }

  const previous = loadPrevious();
  if (!previous) {
    ui.compareBox.innerHTML = '<strong>No earlier scan found</strong><p>Your fingerprint hash is stored only in this browser so your next scan can be compared locally.</p>';
  } else if (previous.hash === hash) {
    ui.compareBox.innerHTML = `<strong class="status-good">Fingerprint matches your previous scan</strong><p>The locally calculated fingerprint hash is unchanged since ${escapeHtml(new Date(previous.time).toLocaleString())}. Your public IP may still have changed.</p>`;
  } else {
    ui.compareBox.innerHTML = `<strong class="status-warn">Fingerprint changed since your previous scan</strong><p>At least one browser-exposed attribute changed since ${escapeHtml(new Date(previous.time).toLocaleString())}. This can happen after browser, display, hardware or privacy-setting changes.</p>`;
  }
  savePrevious(hash);

  const recs = [];
  if (!p.globalPrivacyControl) recs.push(['Consider Global Privacy Control', 'A browser or extension that supports GPC can communicate an opt-out preference to participating sites.']);
  if (ident >= 70) recs.push(['Avoid random fingerprint tweaks', 'Changing one or two unusual values can make a browser more distinctive. Prefer coherent anti-fingerprinting protections.']);
  if (n.available && n.networkTimezone && fp.timezone && n.networkTimezone !== fp.timezone) recs.push(['Review the timezone mismatch', `Your IP maps to ${n.networkTimezone}, while the browser reports ${fp.timezone}. Travel, VPNs or manual timezone settings can cause this.`]);
  if (fp.webdriver) recs.push(['Browser automation is visible', 'This browser exposes navigator.webdriver=true, a signal anti-bot systems can observe.']);
  if (!cookies.firstPartyWriteRead) recs.push(['First-party cookies are blocked', 'Some logins and site preferences may fail when even same-site cookies cannot be written and read.']);
  if (!n.available) recs.push(['Retry the network test', 'The Cloudflare edge endpoint did not respond, so network consistency could not be assessed.']);
  recs.push(['Compare another setup', 'Try the same device in private mode, another browser, or on mobile data and compare the local fingerprint result.']);

  ui.recommendationList.innerHTML = recs.slice(0, 3).map(([a, b]) =>
    `<div class="recommendation"><strong>${escapeHtml(a)}</strong><p>${escapeHtml(b)}</p></div>`
  ).join('');
}

function loadPrevious() {
  try { return JSON.parse(localStorage.getItem('tracecheck:lastScan')); }
  catch { return null; }
}

function savePrevious(hash) {
  try { localStorage.setItem('tracecheck:lastScan', JSON.stringify({ hash, time: Date.now() })); }
  catch {}
}

async function runScan() {
  ui.results.classList.add('hidden');
  ui.scanShell.classList.remove('hidden');
  ui.scanShell.scrollIntoView({ behavior: 'smooth', block: 'center' });
  ui.progressBar.style.width = '8%';
  ui.scanTitle.textContent = 'Scanning your browser…';
  ui.scanStatus.textContent = 'Reading browser-exposed attributes and testing first-party storage locally.';
  await wait(250);

  ui.progressBar.style.width = '30%';
  const browserPromise = collectBrowser();
  await wait(250);

  ui.scanStatus.textContent = 'Checking network metadata at the Cloudflare edge.';
  ui.progressBar.style.width = '55%';
  const networkPromise = collectNetwork();
  const [browser, network] = await Promise.all([browserPromise, networkPromise]);

  ui.scanStatus.textContent = 'Calculating exposure and consistency scores.';
  ui.progressBar.style.width = '82%';
  await wait(300);
  render({ browser, network });

  ui.progressBar.style.width = '100%';
  ui.scanTitle.textContent = 'Scan complete';
  ui.scanStatus.textContent = 'No browser fingerprint or cookie values were uploaded.';
  await wait(350);

  ui.scanShell.classList.add('hidden');
  ui.results.classList.remove('hidden');
  ui.results.scrollIntoView({ behavior: 'smooth', block: 'start' });
}

decorateScoreLabels();
ui.scanButton.addEventListener('click', runScan);
ui.rescanButton.addEventListener('click', runScan);
ui.privacyButton.addEventListener('click', () => document.getElementById('privacySection').scrollIntoView({ behavior: 'smooth' }));
ui.clearHistoryButton.addEventListener('click', () => {
  try { localStorage.removeItem('tracecheck:lastScan'); } catch {}
  ui.compareBox.innerHTML = '<strong>Local comparison data cleared</strong><p>Your next scan will be treated as the first scan on this browser.</p>';
});
