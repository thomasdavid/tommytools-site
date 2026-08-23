// Security/privacy hardening loaded after app.js and before user interaction.

escapeHtml = function (value) {
  return String(value ?? 'Unavailable').replace(/[&<>"']/g, (char) => ({
    '&': '&amp;',
    '<': '&lt;',
    '>': '&gt;',
    '"': '&quot;',
    "'": '&#39;'
  }[char]));
};

fontSignal = function () {
  const fonts = [
    'Arial','Arial Black','Calibri','Cambria','Candara','Comic Sans MS','Courier New','Georgia','Helvetica','Impact',
    'Palatino','Segoe UI','Tahoma','Times New Roman','Trebuchet MS','Verdana','Roboto','Ubuntu','Noto Sans',
    'Liberation Sans','Menlo','Monaco','Consolas'
  ];
  const canvas = document.createElement('canvas');
  const ctx = canvas.getContext('2d');
  if (!ctx) return { count: 0, names: [], supported: false };
  const sample = 'mmmmmmmmmmlliWWMM0123456789';
  const bases = ['monospace','sans-serif','serif'];
  const measure = (family) => {
    ctx.font = `72px ${family}`;
    return ctx.measureText(sample).width;
  };
  const baseline = bases.map(measure);
  const names = fonts.filter((font) => bases.some((base, index) => {
    const width = measure(`"${font}",${base}`);
    return Math.abs(width - baseline[index]) > 0.01;
  }));
  return { count: names.length, names, supported: true };
};

async function tracecheckGatherIce(iceServers, timeout = 1800) {
  if (!window.RTCPeerConnection) return { supported: false, total: 0, host: 0, srflx: 0, relay: 0, addresses: [] };
  const pc = new RTCPeerConnection({ iceServers });
  const candidates = [];
  try {
    pc.createDataChannel('tc');
    pc.onicecandidate = (event) => { if (event.candidate) candidates.push(event.candidate.candidate); };
    const offer = await pc.createOffer();
    await pc.setLocalDescription(offer);
    await Promise.race([
      new Promise((resolve) => {
        pc.onicegatheringstatechange = () => { if (pc.iceGatheringState === 'complete') resolve(); };
      }),
      wait(timeout)
    ]);
  } catch {} finally {
    pc.close();
  }
  const parsed = candidates.map((candidate) => {
    const parts = candidate.split(' ');
    const typeIndex = parts.indexOf('typ');
    return { address: parts[4] || '', type: typeIndex >= 0 ? parts[typeIndex + 1] : 'unknown' };
  });
  return {
    supported: true,
    total: parsed.length,
    host: parsed.filter((x) => x.type === 'host').length,
    srflx: parsed.filter((x) => x.type === 'srflx').length,
    relay: parsed.filter((x) => x.type === 'relay').length,
    addresses: [...new Set(parsed.map((x) => x.address).filter(Boolean))].slice(0, 6)
  };
}

// The core browser scan remains local. Public STUN is run automatically only after full consent.
webrtcSignal = function () {
  return tracecheckGatherIce([], 1400);
};

(function setupTraceCheckConsentAndAutomaticDiagnostics() {
  const css = document.createElement('link');
  css.rel = 'stylesheet';
  css.href = '/consent.css';
  document.head.appendChild(css);

  Object.assign(metricHelp, {
    'Hardware device ID': 'A permanent hardware device identifier is not exposed to ordinary websites by modern browsers.',
    'MAC address': 'The network adapter MAC address is not exposed to ordinary websites. WebRTC does not reveal the MAC address.',
    'Media device IDs': 'Browsers may expose origin-scoped identifiers for cameras and microphones. These are not hardware serial numbers and are often restricted until permission is granted.',
    'Advertising ID': 'Mobile/OS advertising identifiers are not normally exposed directly to ordinary web pages.',
    'Probabilistic device fingerprint': 'A locally calculated combination of browser, graphics, audio, fonts and hardware-like signals that can support repeat recognition without a true device ID.',
    'Diagnostic consent': 'Your TraceCheck consent choice. Full diagnostics permits the disclosed external network tests; Essential only keeps the scan local.'
  });

  const CONSENT_NAME = 'tracecheck_consent';
  const CONSENT_DAYS = 180;
  let externalRunId = 0;

  function getConsent() {
    const part = document.cookie.split(';').map((x) => x.trim()).find((x) => x.startsWith(`${CONSENT_NAME}=`));
    return part ? decodeURIComponent(part.slice(CONSENT_NAME.length + 1)) : '';
  }

  function setConsent(value) {
    document.cookie = `${CONSENT_NAME}=${encodeURIComponent(value)}; Path=/; Max-Age=${CONSENT_DAYS * 86400}; SameSite=Lax; Secure`;
  }

  function hasFullConsent() { return getConsent() === 'full'; }

  function updateConsentRows() {
    if (!ui.cookieList) return;
    const value = hasFullConsent() ? 'Full diagnostics accepted' : 'Essential only';
    ui.cookieList.insertAdjacentHTML('beforeend', row('Diagnostic consent', value, hasFullConsent() ? 'status-good' : 'status-muted'));
  }

  function setExternalUiForConsent() {
    if (ui.ipIntelButton) ui.ipIntelButton.hidden = true;
    if (ui.trackerTestButton) ui.trackerTestButton.hidden = true;
    const stunButton = document.getElementById('stunTestButton');
    if (stunButton?.closest('.panel-actions')) stunButton.closest('.panel-actions').hidden = true;

    const deepPanel = document.querySelector('.deep-panel');
    if (deepPanel) deepPanel.hidden = true;

    const hero = document.querySelector('.hero-copy');
    if (hero) hero.textContent = 'TraceCheck inspects browser, network, storage, fingerprinting and tracking signals. After your consent choice, a full scan can automatically run the disclosed external network checks.';

    if (ui.ipIntelNote) {
      ui.ipIntelNote.textContent = hasFullConsent()
        ? 'Runs automatically after the local scan. Your public IP is sent to ipapi.is for VPN, proxy, Tor, hosting and abuse classification.'
        : 'External IP intelligence is disabled because Essential only is selected.';
    }
    if (ui.trackerTestBox && !hasFullConsent()) {
      ui.trackerTestBox.innerHTML = '<strong>Not run — Essential only</strong><p>No requests are made to external tracker test endpoints.</p>';
    }
  }

  async function renderDeviceIdentifiers() {
    let mediaStatus = 'Not exposed';
    try {
      if (navigator.mediaDevices?.enumerateDevices) {
        const devices = await navigator.mediaDevices.enumerateDevices();
        const ids = devices.filter((d) => d.deviceId && d.deviceId !== 'default').length;
        mediaStatus = ids ? `${ids} origin-scoped ID${ids === 1 ? '' : 's'} exposed` : 'None exposed without permission';
      }
    } catch {
      mediaStatus = 'Blocked / unavailable';
    }
    const hash = window.__tracecheckLast?.browser?.hash;
    const list = document.getElementById('deviceIdentifierList');
    if (!list) return;
    list.innerHTML = [
      row('Hardware device ID', 'Not exposed to websites', 'status-good'),
      row('MAC address', 'Not exposed to websites', 'status-good'),
      row('Media device IDs', mediaStatus),
      row('Advertising ID', 'Not exposed to ordinary web pages', 'status-good'),
      row('Probabilistic device fingerprint', hash ? `${hash.slice(0, 16)}…` : 'Calculated after scan')
    ].join('');
  }

  function addDevicePanel() {
    const grid = document.querySelector('.panel-grid');
    if (!grid || document.getElementById('deviceIdentifierList')) return;
    const panel = document.createElement('article');
    panel.className = 'panel';
    panel.innerHTML = '<div class="panel-title"><span class="icon">#</span><div><h3>Device identifiers</h3><p>True IDs vs probabilistic recognition</p></div></div><dl id="deviceIdentifierList"></dl><div class="note">Websites generally cannot read a MAC address or permanent hardware ID. They can still recognise a browser probabilistically using many weaker signals together.</div>';
    const fingerprintPanel = ui.fingerprintList?.closest('.panel');
    if (fingerprintPanel?.nextSibling) grid.insertBefore(panel, fingerprintPanel.nextSibling);
    else grid.appendChild(panel);
    renderDeviceIdentifiers();
  }

  async function runAutomaticStun() {
    const result = await tracecheckGatherIce([{ urls: 'stun:stun.l.google.com:19302' }], 2600);
    if (!ui.webrtcList) return;
    ui.webrtcList.innerHTML = [
      row('WebRTC candidates', result.supported ? result.total : 'Unsupported'),
      row('Host candidates', result.host),
      row('Reflexive candidates', result.srflx),
      row('Relay candidates', result.relay),
      row('Candidate addresses', result.addresses.length ? result.addresses.join(', ') : 'None exposed')
    ].join('');
    const panel = ui.webrtcList.closest('.panel');
    const note = panel?.querySelector('.note');
    if (note) note.textContent = 'External STUN check completed automatically after consent. Google’s public STUN service received the network request.';
  }

  async function runTrackerTestParallel() {
    if (!ui.trackerTestBox) return;
    ui.trackerTestBox.innerHTML = '<strong>Running automatically…</strong><p>Testing whether disclosed tracking endpoints are reachable from this browser.</p>';
    const results = await Promise.all(trackerTargets.map(async ([name, url]) => [name, await probeUrl(url)]));
    const blocked = results.filter(([, ok]) => !ok).length;
    ui.trackerTestBox.innerHTML = `<strong>${blocked} of ${results.length} test endpoints blocked</strong><p>${results.map(([name, ok]) => `${escapeHtml(name)}: ${ok ? 'reachable' : 'blocked/unreachable'}`).join(' · ')}</p>`;
  }

  function runAllAvailableExternalChecks() {
    if (!hasFullConsent() || !window.__tracecheckLast) return;
    const thisRun = ++externalRunId;
    if (ui.ipIntelNote) ui.ipIntelNote.textContent = 'Running external IP intelligence automatically…';
    Promise.allSettled([
      runIpIntel(),
      runTrackerTestParallel(),
      runAutomaticStun()
    ]).then(() => {
      if (thisRun !== externalRunId) return;
      if (ui.ipIntelNote && !ui.ipIntelNote.textContent.includes('failed')) {
        // runIpIntel replaces this with the provider result on success.
      }
    });
  }

  function showConsentDialog() {
    document.getElementById('tracecheckConsentOverlay')?.remove();
    const overlay = document.createElement('div');
    overlay.id = 'tracecheckConsentOverlay';
    overlay.className = 'consent-overlay';
    overlay.innerHTML = `
      <section class="consent-card" role="dialog" aria-modal="true" aria-labelledby="consentTitle">
        <div class="eyebrow">PRIVACY CHOICE</div>
        <h2 id="consentTitle">Choose how TraceCheck runs.</h2>
        <p>TraceCheck uses one first-party cookie to remember this choice. A <strong>full diagnostic</strong> also automatically contacts disclosed external services during a scan:</p>
        <ul>
          <li><strong>ipapi.is</strong> — public-IP VPN/proxy/Tor/reputation classification</li>
          <li><strong>Google public STUN</strong> — WebRTC public-address exposure test</li>
          <li><strong>Five disclosed tracker endpoints</strong> — ad/tracker blocking reachability test, with credentials omitted</li>
        </ul>
        <p class="consent-small">TraceCheck does not send your local fingerprint hash or cookie values to these services. Essential-only scans remain local except for the TraceCheck/Cloudflare connection needed to load and use the site.</p>
        <div class="consent-actions">
          <button class="primary" id="consentFull">Accept full diagnostics</button>
          <button class="secondary" id="consentEssential">Essential only</button>
        </div>
      </section>`;
    document.body.appendChild(overlay);
    overlay.querySelector('#consentFull').addEventListener('click', () => {
      setConsent('full');
      overlay.remove();
      setExternalUiForConsent();
      if (window.__tracecheckLast) runAllAvailableExternalChecks();
    });
    overlay.querySelector('#consentEssential').addEventListener('click', () => {
      setConsent('essential');
      overlay.remove();
      setExternalUiForConsent();
    });
  }

  function addCookieSettingsButton() {
    if (document.getElementById('cookieSettingsButton')) return;
    const button = document.createElement('button');
    button.id = 'cookieSettingsButton';
    button.className = 'cookie-settings-button';
    button.type = 'button';
    button.textContent = 'Cookie settings';
    button.addEventListener('click', showConsentDialog);
    const header = document.querySelector('.site-header');
    header?.appendChild(button);
  }

  function replaceScanButton(id) {
    const oldButton = document.getElementById(id);
    if (!oldButton) return;
    const button = oldButton.cloneNode(true);
    oldButton.replaceWith(button);
    ui[id] = button;
    button.addEventListener('click', async () => {
      if (!getConsent()) {
        showConsentDialog();
        return;
      }
      button.disabled = true;
      await runScan();
      updateConsentRows();
      await renderDeviceIdentifiers();
      setExternalUiForConsent();
      if (hasFullConsent()) runAllAvailableExternalChecks();
      button.disabled = false;
    });
  }

  addDevicePanel();
  addCookieSettingsButton();
  replaceScanButton('scanButton');
  replaceScanButton('rescanButton');
  setExternalUiForConsent();

  if (!getConsent()) showConsentDialog();
})();
