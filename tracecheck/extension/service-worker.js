chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'TRACE_CHECK_GET_COOKIES') return;
  const origin = sender?.url || sender?.tab?.url || '';
  if (!origin.startsWith('https://tracecheck-eus.pages.dev/')) {
    sendResponse({ ok: false, error: 'Request origin is not TraceCheck.' });
    return;
  }

  chrome.cookies.getAll({}, (cookies) => {
    if (chrome.runtime.lastError) {
      sendResponse({ ok: false, error: chrome.runtime.lastError.message });
      return;
    }
    const safe = cookies.map((cookie) => ({
      name: cookie.name,
      domain: cookie.domain,
      path: cookie.path,
      secure: cookie.secure,
      httpOnly: cookie.httpOnly,
      sameSite: cookie.sameSite,
      session: cookie.session,
      expirationDate: cookie.expirationDate || null,
      storeId: cookie.storeId,
      partitioned: Boolean(cookie.partitionKey),
      size: new Blob([`${cookie.name}=${cookie.value}`]).size
    }));
    sendResponse({ ok: true, cookies: safe });
  });
  return true;
});
