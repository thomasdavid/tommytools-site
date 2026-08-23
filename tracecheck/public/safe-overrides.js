// Security/privacy hardening loaded after app.js and before user interaction.
// These overrides keep the default scan local-first while preserving the public API used by app.js.

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

// Default WebRTC test uses no external STUN/TURN service.
webrtcSignal = function () {
  return tracecheckGatherIce([], 1400);
};

(function addOptInStunTest() {
  const list = document.getElementById('webrtcList');
  const panel = list?.closest('.panel');
  if (!panel || document.getElementById('stunTestButton')) return;
  const actions = document.createElement('div');
  actions.className = 'panel-actions';
  actions.innerHTML = '<button class="secondary full" id="stunTestButton">Run external STUN check</button><div class="note">Optional: contacts Google\'s public STUN service to see whether WebRTC reveals a server-reflexive/public candidate. No cookies or TraceCheck fingerprint hash are sent, but Google will see the network request.</div>';
  panel.appendChild(actions);
  const button = actions.querySelector('#stunTestButton');
  button.addEventListener('click', async () => {
    button.disabled = true;
    button.textContent = 'Checking…';
    const result = await tracecheckGatherIce([{ urls: 'stun:stun.l.google.com:19302' }], 2600);
    ui.webrtcList.innerHTML = [
      row('WebRTC candidates', result.supported ? result.total : 'Unsupported'),
      row('Host candidates', result.host),
      row('Reflexive candidates', result.srflx),
      row('Relay candidates', result.relay),
      row('Candidate addresses', result.addresses.length ? result.addresses.join(', ') : 'None exposed')
    ].join('');
    button.disabled = false;
    button.textContent = 'Run external STUN check';
  });
})();
