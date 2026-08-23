// Cookie-ID demonstration layer. The old Deep Scan UI is intentionally hidden in the current product flow.
(() => {
  const CONSENT_NAME = 'tracecheck_consent';
  const DEMO_ID_NAME = 'tracecheck_demo_id';
  const COOKIE_DAYS = 180;

  function readCookie(name) {
    const part = document.cookie.split(';').map((x) => x.trim()).find((x) => x.startsWith(`${name}=`));
    return part ? decodeURIComponent(part.slice(name.length + 1)) : '';
  }

  function writeCookie(name, value) {
    document.cookie = `${name}=${encodeURIComponent(value)}; Path=/; Max-Age=${COOKIE_DAYS * 86400}; SameSite=Lax; Secure`;
  }

  function deleteCookie(name) {
    document.cookie = `${name}=; Path=/; Max-Age=0; SameSite=Lax; Secure`;
  }

  function ensureDemoVisitorId() {
    if (readCookie(CONSENT_NAME) !== 'full') {
      deleteCookie(DEMO_ID_NAME);
      return '';
    }
    let id = readCookie(DEMO_ID_NAME);
    if (!id) {
      id = `TC-${crypto.randomUUID()}`;
      writeCookie(DEMO_ID_NAME, id);
    }
    return id;
  }

  // Full diagnostics gets a persistent demonstration identifier. Essential-only mode does not.
  ensureDemoVisitorId();

  // Consent buttons are created dynamically by safe-overrides.js. Update the demo ID after that handler runs.
  document.addEventListener('click', (event) => {
    const target = event.target instanceof Element ? event.target.closest('button') : null;
    if (!target) return;
    if (target.id === 'consentFull') {
      setTimeout(() => {
        ensureDemoVisitorId();
        if (window.__tracecheckLast?.browser) {
          const cookies = cookieDiagnostics();
          window.__tracecheckLast.browser.cookies = cookies;
          renderOriginCookies(cookies);
        }
      }, 0);
    }
    if (target.id === 'consentEssential') {
      setTimeout(() => {
        deleteCookie(DEMO_ID_NAME);
        if (window.__tracecheckLast?.browser) {
          const cookies = cookieDiagnostics();
          window.__tracecheckLast.browser.cookies = cookies;
          renderOriginCookies(cookies);
        }
      }, 0);
    }
  }, true);

  // Include values internally so TraceCheck can display only its own known-safe demonstration values.
  parseVisibleCookies = function () {
    const raw = document.cookie.trim();
    if (!raw) return [];
    return raw.split(';').map((part) => {
      const i = part.indexOf('=');
      const name = (i >= 0 ? part.slice(0, i) : part).trim();
      const rawValue = i >= 0 ? part.slice(i + 1) : '';
      let value = rawValue;
      try { value = decodeURIComponent(rawValue); } catch {}
      return {
        name,
        value,
        size: new Blob([`${name}=${rawValue}`]).size
      };
    }).filter((cookie) => cookie.name && !cookie.name.startsWith('__tracecheck_cookie_test'));
  };

  renderOriginCookies = function (cookies) {
    if (!cookies.visible.length) {
      ui.originCookieList.innerHTML = '<div class="cookie-empty">No JavaScript-visible TraceCheck cookies are currently stored.</div>';
      return;
    }

    ui.originCookieList.innerHTML = '<div class="note">Visible cookies on this origin</div>' + cookies.visible.map((cookie) => {
      const isConsent = cookie.name === CONSENT_NAME;
      const isDemoId = cookie.name === DEMO_ID_NAME;
      const canShow = isConsent || isDemoId;
      const valueLabel = isDemoId ? 'Demo visitor ID' : isConsent ? 'Consent value' : 'Cookie value';
      const valueHtml = canShow
        ? `<div class="cookie-value"><span>${escapeHtml(valueLabel)}</span><code>${escapeHtml(cookie.value)}</code></div>`
        : '<div class="cookie-meta"><span class="chip">Value hidden</span></div>';
      const chips = [
        '<span class="chip">First-party</span>',
        '<span class="chip">JS-readable</span>',
        isDemoId ? '<span class="chip warn">Persistent identifier demo</span>' : ''
      ].filter(Boolean).join('');

      return `<div class="cookie-item">
        <div class="cookie-item-top"><strong>${escapeHtml(cookie.name)}</strong><span>${cookie.size} bytes</span></div>
        ${valueHtml}
        <div class="cookie-meta">${chips}</div>
      </div>`;
    }).join('') + '<div class="note">The TraceCheck demo visitor ID shows how a site can recognise the same browser on a later visit. It is sent back to this TraceCheck origin like a normal first-party cookie, but TraceCheck does not build or retain a server-side browsing profile against it.</div>';
  };
})();
