window.addEventListener('message', (event) => {
  if (event.source !== window || event.data?.source !== 'tracecheck-page' || event.data?.type !== 'TRACE_CHECK_DEEP_SCAN') return;
  const token = event.data.token;
  chrome.runtime.sendMessage({ type: 'TRACE_CHECK_GET_COOKIES' }, (reply) => {
    const response = chrome.runtime.lastError
      ? { ok: false, error: chrome.runtime.lastError.message }
      : reply || { ok: false, error: 'No response from extension.' };
    window.postMessage({ source: 'tracecheck-extension', token, ...response }, '*');
  });
});
