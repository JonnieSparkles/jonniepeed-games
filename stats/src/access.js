// Cloudflare Access guards /dash and signs a token onto every request it lets through (Cf-Access-Jwt-Assertion).
// Checking that token here means the dashboards can't be reached around Access.
// ACCESS_TEAM_DOMAIN (like "jonniepeed.cloudflareaccess.com") and ACCESS_AUD (the Access application's
// audience tag) are Worker secrets. Until both are set, the dashboards stay locked.
const encoder = new TextEncoder(), decoder = new TextDecoder();
const SKEW = 60; // seconds of clock difference allowed either way
let cached = { domain: '', keys: [], at: 0 };

function fromBase64Url(text) {
  const plain = text.replace(/-/g, '+').replace(/_/g, '/') + '='.repeat((4 - text.length % 4) % 4);
  return Uint8Array.from(atob(plain), c => c.charCodeAt(0));
}

// Access publishes its signing keys and rotates them now and then, so a key we don't know triggers one refetch.
async function signingKeys(domain, fetcher, fresh) {
  if (!fresh && cached.domain === domain && Date.now() - cached.at < 3600000) return cached.keys;
  const response = await fetcher(`https://${domain}/cdn-cgi/access/certs`);
  if (!response.ok) throw new Error('Access keys unavailable');
  const data = await response.json();
  cached = { domain, keys: Array.isArray(data.keys) ? data.keys : [], at: Date.now() };
  return cached.keys;
}

// Resolves to { user } when the request carries a valid Access token for this application,
// { locked: true } when Access isn't configured yet, and { denied: true } otherwise. Never throws.
export async function checkAccess(request, env, fetcher = fetch) {
  const domain = String(env.ACCESS_TEAM_DOMAIN || '').trim().replace(/^https?:\/\//, '').replace(/\/+$/, '');
  const audience = String(env.ACCESS_AUD || '').trim();
  if (!domain || !audience) return { locked: true };
  try {
    const parts = (request.headers.get('cf-access-jwt-assertion') || '').split('.');
    if (parts.length !== 3) return { denied: true };
    const header = JSON.parse(decoder.decode(fromBase64Url(parts[0])));
    const claims = JSON.parse(decoder.decode(fromBase64Url(parts[1])));
    const now = Date.now() / 1000;
    if (header.alg !== 'RS256' || typeof header.kid !== 'string') return { denied: true };
    if (claims.iss !== `https://${domain}`) return { denied: true };
    if (!(Array.isArray(claims.aud) ? claims.aud : [claims.aud]).includes(audience)) return { denied: true };
    if (typeof claims.exp !== 'number' || claims.exp < now - SKEW) return { denied: true };
    if (typeof claims.nbf === 'number' && claims.nbf > now + SKEW) return { denied: true };
    let jwk = (await signingKeys(domain, fetcher, false)).find(k => k.kid === header.kid);
    if (!jwk) jwk = (await signingKeys(domain, fetcher, true)).find(k => k.kid === header.kid);
    if (!jwk) return { denied: true };
    const key = await crypto.subtle.importKey('jwk', jwk, { name: 'RSASSA-PKCS1-v1_5', hash: 'SHA-256' }, false, ['verify']);
    const valid = await crypto.subtle.verify('RSASSA-PKCS1-v1_5', key, fromBase64Url(parts[2]), encoder.encode(parts[0] + '.' + parts[1]));
    return valid ? { user: String(claims.email || claims.common_name || claims.sub || 'access') } : { denied: true };
  } catch (_) {
    return { denied: true };
  }
}
