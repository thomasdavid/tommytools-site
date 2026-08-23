// Show exact values for every cookie that ordinary TraceCheck page JavaScript can read.
// This does not bypass HttpOnly or same-origin browser protections.

parseVisibleCookies = function () {
  const raw = document.cookie.trim();
  if (!raw) return [];
  return raw.split(';').map((part) => {
    const item = part.trim();
    const index = item.indexOf('=');
    const name = index >= 0 ? item.slice(0, index).trim() : item;
    const value = index >= 0 ? item.slice(index + 1) : '';
    return {
      name,
      value,
      size: new Blob([`${name}=${value}`]).size
    };
  }).filter((cookie) => cookie.name && !cookie.name.startsWith('__tracecheck_cookie_test'));
};

renderOriginCookies = function (cookies) {
  if (!ui.originCookieList) return;
  const visible = Array.isArray(cookies?.visible) ? cookies.visible : parseVisibleCookies();
  if (!visible.length) {
    ui.originCookieList.innerHTML = '<div class="cookie-empty">No JavaScript-visible TraceCheck cookies are currently stored.</div>';
    return;
  }

  ui.originCookieList.innerHTML = '<div class="note">JavaScript-visible cookies on this origin — exact values shown</div>' + visible.map((cookie) => {
    const value = cookie.value === '' ? '<empty>' : cookie.value;
    return `<div class="cookie-item">
      <div class="cookie-item-top">
        <strong>${escapeHtml(cookie.name)}</strong>
        <span>${cookie.size} bytes</span>
      </div>
      <div class="cookie-value-label">Value</div>
      <code class="cookie-value">${escapeHtml(value)}</code>
      <div class="cookie-meta">
        <span class="chip">First-party</span>
        <span class="chip">JS-readable</span>
      </div>
    </div>`;
  }).join('');
};
