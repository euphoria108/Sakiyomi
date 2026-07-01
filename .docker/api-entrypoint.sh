#!/usr/bin/env sh
# Boots the local API: install deps (api+shared only) -> migrate local D1 -> seed -> wrangler dev.
# All state lives in container-only named volumes; the host stays clean.
set -e

cd /workspace

# 1. Install only the API and its workspace deps (skip Expo/React Native to keep the image lean).
if [ ! -d node_modules/.pnpm ] || [ -z "$(ls -A node_modules/.pnpm 2>/dev/null)" ]; then
  echo "[entrypoint] installing dependencies (@sakiyomi/api + deps)..."
  pnpm install --filter "@sakiyomi/api..." --frozen-lockfile \
    || pnpm install --filter "@sakiyomi/api..."
else
  echo "[entrypoint] dependencies already present, skipping install."
fi

cd /workspace/workers/api

# 2. Local-only secret for wrangler dev.
if [ ! -f .dev.vars ]; then
  echo "[entrypoint] creating .dev.vars from .dev.vars.example..."
  cp .dev.vars.example .dev.vars
fi

# 3. Apply D1 migrations to the local (Miniflare) SQLite DB.
echo "[entrypoint] applying D1 migrations (local)..."
pnpm exec wrangler d1 migrations apply sakiyomi-db --local

# 4. Seed deterministic demo data (skip with SEED=false, e.g. in the test profile).
if [ "${SEED:-true}" != "false" ]; then
  echo "[entrypoint] seeding local D1..."
  pnpm exec wrangler d1 execute sakiyomi-db --local --file=./seed/seed.sql
fi

# 5. Start the dev server, reachable from the host on :8787.
echo "[entrypoint] starting wrangler dev on 0.0.0.0:8787..."
exec pnpm exec wrangler dev --ip 0.0.0.0 --port 8787
