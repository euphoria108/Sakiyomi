# Toolchain image for running the Cloudflare Workers API locally (wrangler dev / Miniflare).
# Dependencies are installed at runtime by the entrypoint into named volumes so the
# macOS host's node_modules are never touched and never conflict with linux binaries.
FROM node:20-bookworm-slim

# curl is used by the compose healthcheck against /health.
RUN apt-get update \
  && apt-get install -y --no-install-recommends curl ca-certificates \
  && rm -rf /var/lib/apt/lists/*

# Pin pnpm via corepack (reproducible, independent of the host pnpm version).
RUN corepack enable && corepack prepare pnpm@9.15.9 --activate

ENV CI=true \
    WRANGLER_SEND_METRICS=false \
    PNPM_HOME=/pnpm \
    PATH=/pnpm:$PATH

WORKDIR /workspace

COPY .docker/api-entrypoint.sh /usr/local/bin/api-entrypoint.sh
RUN chmod +x /usr/local/bin/api-entrypoint.sh

EXPOSE 8787
ENTRYPOINT ["/usr/local/bin/api-entrypoint.sh"]
