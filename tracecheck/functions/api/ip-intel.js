export async function onRequestPost(context) {
  const request = context.request;
  const ip = request.headers.get('CF-Connecting-IP');
  if (!ip) return json({ error: 'Client IP unavailable' }, 400);

  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), 4500);
  try {
    const upstream = await fetch(`https://api.ipapi.is/?q=${encodeURIComponent(ip)}`, {
      headers: { 'Accept': 'application/json', 'User-Agent': 'TraceCheck/2.0' },
      signal: controller.signal
    });
    if (!upstream.ok) return json({ error: `IP intelligence provider returned ${upstream.status}` }, 502);
    const data = await upstream.json();
    return json({
      is_vpn: data.is_vpn === true,
      is_proxy: data.is_proxy === true,
      is_tor: data.is_tor === true,
      is_datacenter: data.is_datacenter === true,
      is_abuser: data.is_abuser === true,
      is_mobile: data.is_mobile === true,
      provider: data.asn?.type || data.company?.type || '',
      vpn_service: data.vpn?.service || '',
      source: 'ipapi.is'
    });
  } catch (error) {
    return json({ error: error?.name === 'AbortError' ? 'IP intelligence timed out' : 'IP intelligence failed' }, 502);
  } finally {
    clearTimeout(timer);
  }
}

export function onRequest() {
  return new Response('Method Not Allowed', { status: 405, headers: { 'Allow': 'POST', 'Cache-Control': 'no-store' } });
}

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' } });
}
