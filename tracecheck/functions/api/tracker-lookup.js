const MAX_DOMAINS = 40;
const REGION = 'US';

export async function onRequestPost(context) {
  let body;
  try { body = await context.request.json(); }
  catch { return json({ error: 'Invalid JSON' }, 400); }

  const input = Array.isArray(body?.domains) ? body.domains : [];
  const domains = [...new Set(input.map(normalizeDomain).filter(Boolean))].slice(0, MAX_DOMAINS);
  if (!domains.length) return json({ results: {} });

  const pairs = await Promise.all(domains.map(async (domain) => [domain, await lookupWithParents(domain)]));
  return json({ results: Object.fromEntries(pairs), source: 'DuckDuckGo Tracker Radar' });
}

export function onRequest() {
  return new Response('Method Not Allowed', { status: 405, headers: { 'Allow': 'POST', 'Cache-Control': 'no-store' } });
}

async function lookupWithParents(domain) {
  const parts = domain.split('.');
  const candidates = [domain];
  if (parts.length > 2) candidates.push(parts.slice(-2).join('.'));
  for (const candidate of candidates) {
    const result = await lookup(candidate);
    if (result) return result;
  }
  return { matched: false };
}

async function lookup(domain) {
  const url = `https://raw.githubusercontent.com/duckduckgo/tracker-radar/main/domains/${REGION}/${encodeURIComponent(domain)}.json`;
  try {
    const response = await fetch(url, { headers: { 'Accept': 'application/json', 'User-Agent': 'TraceCheck/2.0' } });
    if (response.status === 404) return null;
    if (!response.ok) return null;
    const data = await response.json();
    return {
      matched: true,
      domain: data.domain || domain,
      owner: data.owner?.displayName || data.owner?.name || 'Unknown owner',
      categories: Array.isArray(data.categories) ? data.categories.slice(0, 8) : [],
      prevalence: Number.isFinite(data.prevalence) ? data.prevalence : null,
      sites: Number.isFinite(data.sites) ? data.sites : null,
      cookies: Number.isFinite(data.cookies) ? data.cookies : null,
      fingerprinting: Number.isFinite(data.fingerprinting) ? data.fingerprinting : null
    };
  } catch {
    return null;
  }
}

function normalizeDomain(value) {
  const domain = String(value || '').trim().toLowerCase().replace(/^\.+/, '');
  if (!domain || domain.length > 253 || !/^[a-z0-9.-]+$/.test(domain) || domain.includes('..')) return '';
  return domain;
}

function json(body, status = 200) {
  return Response.json(body, { status, headers: { 'Cache-Control': 'no-store, max-age=0', 'X-Content-Type-Options': 'nosniff' } });
}
