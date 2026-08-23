export async function onRequestGet(context) {
  const request = context.request;
  const cf = request.cf || {};
  const payload = {
    available: true,
    ip: request.headers.get('CF-Connecting-IP') || 'Unavailable',
    country: cf.country || request.headers.get('CF-IPCountry') || 'Unavailable',
    region: cf.region || '',
    city: cf.city || '',
    asn: cf.asn || '',
    organization: cf.asOrganization || '',
    colo: cf.colo || 'Unavailable',
    tlsVersion: cf.tlsVersion || 'Unavailable',
    httpProtocol: cf.httpProtocol || 'Unavailable'
  };
  return Response.json(payload, {
    headers: {
      'Cache-Control': 'no-store, max-age=0',
      'X-Content-Type-Options': 'nosniff'
    }
  });
}

export function onRequest() {
  return new Response('Method Not Allowed', {
    status: 405,
    headers: { 'Allow': 'GET', 'Cache-Control': 'no-store' }
  });
}
