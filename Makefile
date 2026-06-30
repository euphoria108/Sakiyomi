# Local, fully-isolated dev/test for the Sakiyomi API (Docker; host stays clean).
# See docs/local-dev.md for the full workflow.
.PHONY: up down logs seed test test-unit clean

## Start the local API (+ fixtures) at http://localhost:8787 for manual / frontend testing.
up:
	docker compose up --build api feed-fixtures

## Stop containers (keeps local D1/KV state in volumes).
down:
	docker compose down

## Tail API logs.
logs:
	docker compose logs -f api

## Re-apply the seed SQL to the running local D1.
seed:
	docker compose exec api pnpm -F @sakiyomi/api db:seed:local

## Deploy-gate: run integration tests against a fresh local API. Exits non-zero on failure.
test:
	docker compose --profile test down -v
	docker compose --profile test up --build --abort-on-container-exit --exit-code-from test; \
	  status=$$?; docker compose --profile test down -v; exit $$status

## Run backend unit tests in a container (no server needed).
test-unit:
	docker compose run --rm --no-deps --entrypoint sh api -lc "pnpm install --filter '@sakiyomi/api...' --frozen-lockfile && pnpm -F @sakiyomi/api test"

## Stop everything and wipe ALL local state (node_modules + D1/KV volumes).
clean:
	docker compose --profile test down -v
