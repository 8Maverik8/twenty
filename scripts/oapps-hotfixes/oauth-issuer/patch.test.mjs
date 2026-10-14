import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import crypto from 'node:crypto';
import vm from 'node:vm';
import { patchSource, spec } from './patch.mjs';

const original = readFileSync(new URL('./auth-service-v2.4.0.fixture.js', import.meta.url), 'utf8');
function service(source) {
  const start = source.indexOf('async generateAuthorizationCode(');
  const end = source.indexOf('async updatePassword(', start);
  assert(start > 0 && end > start);
  const context = { URL, _nodecrypto: { default: crypto }, _datefns: { addMilliseconds: (a,b) => new Date(a+b) },
    _ms: { default: () => 300000 }, _apptokenentity: { AppTokenType: { AuthorizationCode: 'AUTHORIZATION_CODE' } },
    _authexception: { AuthException: Error, AuthExceptionCode: {} },
    _validateredirecturiutil: { validateRedirectUri: value => ({ valid: true, parsed: new URL(value) }) } };
  const Klass = vm.runInNewContext('(class {' + source.slice(start,end) + '})', context);
  const instance = new Klass(); const records = [];
  instance.twentyConfigService = { get: key => { assert.equal(key,'SERVER_URL'); return 'https://crm.oapps.io'; } };
  instance.applicationRegistrationService = { findOneByClientId: async () => ({ oAuthClientId:'test-client', oAuthClientSecretHash:null, oAuthRedirectUris:['https://client.test/callback?kept=yes'], oAuthScopes:['api','profile'] }) };
  instance.appTokenRepository = { create: value => value, save: async value => records.push(value) };
  return { instance, records };
}
const request = { clientId:'test-client', codeChallenge:'test-s256-challenge', redirectUrl:'https://client.test/callback?kept=yes', state:'original-state' };
test('unpatched runtime reproduces missing issuer; patched response matches discovery', async () => {
  const old = service(original);
  const oldUrl = new URL((await old.instance.generateAuthorizationCode(request,{id:'u'},{id:'w'})).redirectUrl);
  assert.equal(oldUrl.searchParams.has('iss'),false);
  const fresh = service(patchSource(original));
  const result = new URL((await fresh.instance.generateAuthorizationCode(request,{id:'u'},{id:'w'})).redirectUrl);
  assert.equal(result.searchParams.get('iss'),'https://crm.oapps.io');
  assert.equal(result.searchParams.get('state'),request.state);
  assert.equal(result.searchParams.get('kept'),'yes');
  assert.equal(result.searchParams.get('code').length,84);
  assert.equal(fresh.records.length,1);
  assert.equal(fresh.records[0].value,crypto.createHash('sha256').update(result.searchParams.get('code')).digest('hex'));
  assert.equal(fresh.records[0].context.codeChallenge,request.codeChallenge);
});
test('public PKCE and registered redirect protections remain enforced', async () => {
  for (const bad of [{...request,codeChallenge:null},{...request,redirectUrl:'https://attacker.test/callback'}]) {
    const fresh = service(patchSource(original));
    await assert.rejects(fresh.instance.generateAuthorizationCode(bad,{id:'u'},{id:'w'}));
    assert.equal(fresh.records.length,0);
  }
});
test('patch is exact, idempotent, and rejects drift', () => {
  const patched = patchSource(original);
  assert.equal(patchSource(patched),patched);
  assert.throws(()=>patchSource(original+'\n'),/Unreviewed runtime source/);
  assert.equal(crypto.createHash('sha256').update(patched).digest('hex'),spec.after_sha256);
});
