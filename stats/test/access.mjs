// Unit test for the Cloudflare Access check (src/access.js), with keys made here and a stand-in for Access's
// key endpoint. Plain Node 22: `node stats/test/access.mjs`. Never contacts Cloudflare.
import assert from 'node:assert/strict';
import { checkAccess } from '../src/access.js';

const DOMAIN = 'jonniepeed.cloudflareaccess.com', AUD = 'aud-tag-for-dash';
const env = { ACCESS_TEAM_DOMAIN: DOMAIN, ACCESS_AUD: AUD };
const b64 = data => Buffer.from(typeof data === 'string' ? data : JSON.stringify(data)).toString('base64url');
async function keyPair(kid) {
  const pair = await crypto.subtle.generateKey({ name: 'RSASSA-PKCS1-v1_5', modulusLength: 2048, publicExponent: new Uint8Array([1, 0, 1]), hash: 'SHA-256' }, true, ['sign', 'verify']);
  return { kid, privateKey: pair.privateKey, jwk: { ...(await crypto.subtle.exportKey('jwk', pair.publicKey)), kid, alg: 'RS256', use: 'sig' } };
}
async function sign(key, claims, header = {}) {
  const head = b64({ alg: 'RS256', kid: key.kid, typ: 'JWT', ...header }), body = b64(claims);
  const sig = await crypto.subtle.sign('RSASSA-PKCS1-v1_5', key.privateKey, new TextEncoder().encode(head + '.' + body));
  return `${head}.${body}.${Buffer.from(sig).toString('base64url')}`;
}
const now = () => Math.floor(Date.now() / 1000);
const claims = (changes = {}) => ({ iss: `https://${DOMAIN}`, aud: [AUD], email: 'jonnie@example.com', iat: now(), exp: now() + 600, ...changes });
const request = token => new Request('https://stats.jonniepeed.games/dash/', { headers: token ? { 'cf-access-jwt-assertion': token } : {} });

const current = await keyPair('key-1'), rotated = await keyPair('key-2'), stranger = await keyPair('key-1');
let published = [current.jwk], fetches = 0;
const fetcher = async url => {
  assert.equal(url, `https://${DOMAIN}/cdn-cgi/access/certs`);
  fetches++;
  return new Response(JSON.stringify({ keys: published }), { headers: { 'Content-Type': 'application/json' } });
};
const check = (token, e = env) => checkAccess(request(token), e, fetcher).then(r => (r.denied ? { denied: true } : r));

let failures = 0;
async function test(name, fn) {
  try { await fn(); console.log(`PASS ${name}`); } catch (error) { failures++; console.error(`FAIL ${name}: ${error.message}`); }
}

await test('locked until both settings exist', async () => {
  assert.deepEqual(await check(await sign(current, claims()), {}), { locked: true });
  assert.deepEqual(await check(await sign(current, claims()), { ACCESS_TEAM_DOMAIN: DOMAIN }), { locked: true });
});
await test('a valid token lets its user in', async () => {
  assert.deepEqual(await check(await sign(current, claims())), { user: 'jonnie@example.com' });
});
await test('the team domain may be written as a URL', async () => {
  assert.deepEqual(await check(await sign(current, claims()), { ...env, ACCESS_TEAM_DOMAIN: `https://${DOMAIN}/` }), { user: 'jonnie@example.com' });
});
await test('a missing or malformed token is denied', async () => {
  assert.deepEqual(await check(null), { denied: true });
  assert.deepEqual(await check('a.b'), { denied: true });
  assert.deepEqual(await check('!!.!!.!!'), { denied: true });
});
await test('another application, issuer or algorithm is denied', async () => {
  assert.deepEqual(await check(await sign(current, claims({ aud: ['some-other-app'] }))), { denied: true });
  // The issuer must be a cloudflareaccess.com team address; the refusal says why.
  assert.deepEqual(await checkAccess(request(await sign(current, claims({ iss: 'https://evil.example.com' }))), env, fetcher), { denied: true, reason: 'issuer' });
  assert.deepEqual(await check(await sign(current, claims(), { alg: 'HS256' })), { denied: true });
});
await test('a token from before a team rename is accepted, if this team signed it', async () => {
  assert.deepEqual(await check(await sign(current, claims({ iss: 'https://super-hall-d326.cloudflareaccess.com' }))), { user: 'jonnie@example.com' });
});
await test('expired and not-yet-valid tokens are denied', async () => {
  assert.deepEqual(await check(await sign(current, claims({ exp: now() - 120 }))), { denied: true });
  assert.deepEqual(await check(await sign(current, claims({ nbf: now() + 600 }))), { denied: true });
});
await test('a token signed by the wrong key is denied', async () => {
  assert.deepEqual(await check(await sign(stranger, claims())), { denied: true });
  const token = await sign(current, claims()), [h, , s] = token.split('.');
  assert.deepEqual(await check(`${h}.${b64(claims({ email: 'someone@else.com' }))}.${s}`), { denied: true });
});
await test('a rotated key is fetched once, then cached', async () => {
  published = [current.jwk, rotated.jwk];
  const before = fetches;
  assert.deepEqual(await check(await sign(rotated, claims())), { user: 'jonnie@example.com' });
  assert.equal(fetches, before + 1);
  assert.deepEqual(await check(await sign(rotated, claims())), { user: 'jonnie@example.com' });
  assert.equal(fetches, before + 1);
});
await test('an unreachable key endpoint denies rather than throws', async () => {
  const down = async () => new Response('no', { status: 500 });
  const other = { ACCESS_TEAM_DOMAIN: 'other.cloudflareaccess.com', ACCESS_AUD: AUD };
  const token = await sign(current, claims({ iss: 'https://other.cloudflareaccess.com' }));
  const result = await checkAccess(request(token), other, down);
  assert.equal(result.denied, true);
  assert.match(result.reason, /Access keys unavailable/);
});

console.log(failures ? `${failures} failed` : 'all passed');
process.exit(failures ? 1 : 0);
