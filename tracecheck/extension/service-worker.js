chrome.runtime.onMessage.addListener((message, sender, sendResponse) => {
  if (message?.type !== 'TRACE_CHECK_GET_COOKIES') return;
  const origin = sender?.url || sender?.tab?.url || '';
  if (!origin.startsWith('https://tracecheck-eus.pages.dev/')) {
    sendResponse({ ok: false, error: 'Request origin is not TraceCheck.' });
    return;
  }

  chrome.storage.session.get('deepScanAuthorizedAt', (state) => {
    const authorizedAt = Number(state?.deepScanAuthorizedAt || 0);
    const fresh = Date.now() - authorizedAt < 60000;
    if (!fresh) {
      sendResponse({ ok: false, error: 'Open the TraceCheck Deep Scan extension and authorize one scan first.' });
      return;
    }

    chrome.storage.session.remove('deepScanAuthorizedAt', () => {
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

        readPrivacySettings((privacySettings) => {
          sendResponse({ ok: true, cookies: safe, privacySettings });
        });
      });
    });
  });
  return true;
});

function readPrivacySettings(done) {
  const settings = {
    thirdPartyCookiesAllowed: 'Unavailable',
    topicsEnabled: 'Unavailable',
    relatedWebsiteSetsEnabled: 'Unavailable'
  };
  const jobs = [];

  jobs.push(readSetting(chrome.privacy?.websites?.thirdPartyCookiesAllowed, 'thirdPartyCookiesAllowed', settings));
  jobs.push(readSetting(chrome.privacy?.websites?.topicsEnabled, 'topicsEnabled', settings));
  jobs.push(readSetting(chrome.privacy?.websites?.relatedWebsiteSetsEnabled, 'relatedWebsiteSetsEnabled', settings));

  Promise.all(jobs).then(() => done(settings));
}

function readSetting(setting, key, target) {
  return new Promise((resolve) => {
    if (!setting?.get) {
      resolve();
      return;
    }
    setting.get({}, (details) => {
      if (!chrome.runtime.lastError && typeof details?.value === 'boolean') {
        target[key] = details.value;
      }
      resolve();
    });
  });
}
