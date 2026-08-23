// Deploy this Worker on a DIFFERENT registrable domain from the main TraceCheck site.
// The main app can then call this endpoint to test genuine cross-site cookie behaviour.
export default {
  async fetch(request) {
    const url = new URL(request.url);
    const headers = {
      'Access-Control-Allow-Origin': 'https://tracecheck-eus.pages.dev',
      'Access-Control-Allow-Credentials': 'true',
      'Cache-Control': 'no-store',
      'Content-Type': 'application/json',
      'Vary': 'Origin'
    };
    if (url.pathname === '/set') {
      headers['Set-Cookie'] = 'tc_cross_site=1; Path=/; Max-Age=300; Secure; SameSite=None';
      return new Response(JSON.stringify({ set: true }), { headers });
    }
    if (url.pathname === '/read') {
      const found = /(?:^|;\s*)tc_cross_site=1(?:;|$)/.test(request.headers.get('Cookie') || '');
      return new Response(JSON.stringify({ cookieReturned: found }), { headers });
    }
    return new Response(JSON.stringify({ ok: true }), { headers });
  }
};
