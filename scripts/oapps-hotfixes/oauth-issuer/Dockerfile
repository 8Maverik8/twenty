FROM twentycrm/twenty@sha256:17bf71cccde520a63bb4937f03ec1e8563f5fded35a487b546e51387bc68d1a3
COPY --chown=1000:1000 patch.mjs patch.json /tmp/oapps-oauth-issuer/
RUN node /tmp/oapps-oauth-issuer/patch.mjs /app/packages/twenty-server/dist/engine/core-modules/auth/services/auth.service.js \
    && node --check /app/packages/twenty-server/dist/engine/core-modules/auth/services/auth.service.js \
    && rm -r /tmp/oapps-oauth-issuer
