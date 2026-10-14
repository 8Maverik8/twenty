# OAP-1792: CRM OAuth issuer response

Production Twenty v2.4.0 advertises RFC 9207 support but returns only `code` and
`state`. The inspected browser callback lacked `iss`; strict clients must reject
such a response before exchanging its code. Successful authorization now returns
the configured `SERVER_URL`, matching `https://crm.oapps.io` discovery.
Errors remain GraphQL errors displayed on the consent page; no redirected OAuth
error response exists in this handler.

The fork's TypeScript implementation includes the same change. Production uses a
new image extending the exact existing Twenty image digest, with no CRM version
upgrade or dependency installation. The patch refuses every source file other
than the inspected hash or its already-patched hash. The public upstream compiled
fixture is AGPL-3.0, as is Twenty; it contains source, not live user data.

`node --test scripts/oapps-hotfixes/oauth-issuer/patch.test.mjs` reproduces the
original failure and exercises the actual compiled method after patching: issuer,
state, existing redirect query, hashed authorization code, PKCE and registered
redirect rejection. This is protocol regression coverage, not full CRM acceptance.

This deployment supports the canonical CRM origin only. Do not use it for a
different workspace/custom hostname whose discovery issuer differs from
`SERVER_URL`. Verify that equality before building or deploying. Future upstream
changes invalidate the hash and require a new review.

Build the image only after exact-SHA own-server CI and release gate approval.
Deploy through the existing Compose configuration with a scoped server image
override. Preserve the original image for rollback. Authorised production
acceptance must cover OAuth through ChatGPT, an actual MCP read, existing CRM
screens and disposable test-record persistence/cleanup. A healthy container alone
does not establish acceptance.
