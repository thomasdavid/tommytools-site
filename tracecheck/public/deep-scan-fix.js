(() => {
  const oldButton = document.getElementById('deepScanButton');
  if (!oldButton) return;
  const button = oldButton.cloneNode(true);
  oldButton.replaceWith(button);
  ui.deepScanButton = button;

  async function runDeepScanV2() {
    button.disabled = true;
    button.textContent = 'Querying extension…';
    const reply = await requestDeepScan();

    if (!reply) {
      ui.deepScanBox.innerHTML = '<strong>TraceCheck Deep Scan extension not detected</strong><p>The website cannot read other sites’ cookies itself. Install the unpacked extension from the repository, then reload this page.</p>';
      button.disabled = false;
      button.textContent = 'Run Deep Cookie Scan';
      return;
    }

    if (!reply.ok) {
      ui.deepScanBox.innerHTML = `<strong>Deep Scan authorization required</strong><p>${escapeHtml(reply.error || 'Open the TraceCheck extension, choose Authorize one Deep Scan, then try again within 60 seconds.')}</p>`;
      button.disabled = false;
      button.textContent = 'Run Deep Cookie Scan';
      return;
    }

    const cookies = Array.isArray(reply.cookies) ? reply.cookies : [];
    const grouped = groupCookies(cookies);
    ui.deepScanBox.innerHTML = `<strong>${cookies.length} cookie records across ${grouped.length} domains</strong><p>Cookie values were removed inside the extension. Only the first 40 domain names are sent to TraceCheck’s same-origin lookup endpoint for Tracker Radar classification.</p>`;

    const intel = await classifyDomains(grouped.map(([domain]) => domain));
    const trackerGroups = grouped.slice(0, 40).filter(([domain]) => intel[domain]?.matched);
    const thirdPartyCapable = cookies.filter((cookie) => {
      const sameSite = String(cookie.sameSite).toLowerCase();
      return sameSite === 'no_restriction' || sameSite === 'none';
    }).length;

    ui.deepCookieResults.innerHTML = `<div class="deep-summary"><div><strong>${cookies.length}</strong><span>Cookies</span></div><div><strong>${grouped.length}</strong><span>Domains</span></div><div><strong>${trackerGroups.length}</strong><span>Tracker matches in top 40</span></div><div><strong>${thirdPartyCapable}</strong><span>SameSite=None</span></div></div>` +
      grouped.slice(0, 60).map(([domain, list], index) => {
        const match = intel[domain];
        const checked = index < 40;
        const categories = match?.categories?.join(', ') || (checked ? 'Not classified' : 'Not queried this pass');
        const owner = match?.owner || (checked ? 'Unknown owner' : '—');
        const detail = match?.matched
          ? `Tracker Radar match. Observed prevalence: ${escapeHtml(match.prevalence ?? 'unknown')}; fingerprinting score: ${escapeHtml(match.fingerprinting ?? 'unknown')}.`
          : checked
            ? 'No Tracker Radar match found for this exact/parent domain.'
            : 'Not cross-referenced because this pass is capped at the 40 most cookie-heavy domains.';

        return `<div class="tracker-domain"><div class="tracker-head"><div><h4>${escapeHtml(domain)}</h4><p>${escapeHtml(owner)} · ${escapeHtml(categories)}</p></div><span class="tracker-count">${list.length} cookie${list.length === 1 ? '' : 's'}</span></div><div class="tracker-details">${detail}</div><div class="tracker-cookies">${list.slice(0, 12).map((cookie) => `<span class="chip ${cookie.httpOnly ? 'good' : ''}">${escapeHtml(cookie.name)} · ${cookie.size} B · ${escapeHtml(cookie.sameSite || 'SameSite unspecified')}${cookie.httpOnly ? ' · HttpOnly' : ''}${cookie.secure ? ' · Secure' : ''}${cookie.session ? ' · Session' : ' · Persistent'}</span>`).join('')}${list.length > 12 ? `<span class="chip">+${list.length - 12} more</span>` : ''}</div></div>`;
      }).join('');

    button.disabled = false;
    button.textContent = 'Run Deep Cookie Scan';
  }

  button.addEventListener('click', runDeepScanV2);
})();
