// Integration / smoke tests that exercise a RUNNING local API (wrangler dev + local D1/KV).
//
//   Docker:   `make test`  (compose sets API_BASE_URL=http://api:8787)
//   Host:     start `make up`, then `pnpm -F @sakiyomi/api test:integration`
//
// These are intentionally tolerant of pre-seeded data: each run registers a unique user,
// so re-runs against the same dev DB stay green.
import { describe, it, expect, beforeAll } from 'vitest';

const BASE_URL = process.env.API_BASE_URL ?? 'http://localhost:8787';
const FIXTURE_FEED_URL = process.env.FIXTURE_FEED_URL ?? 'http://feed-fixtures/sample-feed.xml';

const email = `it-${Date.now()}@example.com`;
const password = 'password123';

interface AuthResponse {
  token: string;
  user: { id: string; email: string; createdAt: number };
}
interface Article {
  id: string;
  feedId: string;
  feedTitle: string;
  title: string;
  url: string;
  publishedAt: number;
  isRead: boolean;
}

async function waitForHealth(retries = 30): Promise<void> {
  for (let i = 0; i < retries; i++) {
    try {
      const res = await fetch(`${BASE_URL}/health`);
      if (res.ok) return;
    } catch {
      /* server not up yet */
    }
    await new Promise((r) => setTimeout(r, 1000));
  }
  throw new Error(`API not healthy at ${BASE_URL} after ${retries}s`);
}

describe('API integration (live wrangler dev + local D1)', () => {
  let token: string;

  beforeAll(async () => {
    await waitForHealth();
  }, 40000);

  it('GET /health returns ok', async () => {
    const res = await fetch(`${BASE_URL}/health`);
    expect(res.status).toBe(200);
  });

  it('rejects unauthenticated access to /articles', async () => {
    const res = await fetch(`${BASE_URL}/articles`);
    expect(res.status).toBe(401);
  });

  it('registers a new user and returns a token', async () => {
    const res = await fetch(`${BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    expect(res.status).toBe(201);
    const body = (await res.json()) as AuthResponse;
    expect(body.token).toBeTruthy();
    expect(body.user.email).toBe(email);
    token = body.token;
  });

  it('logs in with the same credentials', async () => {
    const res = await fetch(`${BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ email, password }),
    });
    expect(res.status).toBe(200);
    const body = (await res.json()) as AuthResponse;
    expect(body.token).toBeTruthy();
  });

  it('subscribes to the fixture feed and parses its articles (offline)', async () => {
    const subRes = await fetch(`${BASE_URL}/feeds`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` },
      body: JSON.stringify({ url: FIXTURE_FEED_URL }),
    });
    expect(subRes.status).toBe(201);

    const listRes = await fetch(`${BASE_URL}/articles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(listRes.status).toBe(200);
    const { articles } = (await listRes.json()) as { articles: Article[] };
    const fixtureArticles = articles.filter((a) => a.feedTitle === 'Sakiyomi Fixture Feed');
    expect(fixtureArticles.length).toBeGreaterThanOrEqual(3);

    // Mark the first one read.
    const markRes = await fetch(`${BASE_URL}/articles/${fixtureArticles[0].id}/read`, {
      method: 'PATCH',
      headers: { Authorization: `Bearer ${token}` },
    });
    expect(markRes.status).toBe(204);

    const afterRes = await fetch(`${BASE_URL}/articles`, {
      headers: { Authorization: `Bearer ${token}` },
    });
    const { articles: after } = (await afterRes.json()) as { articles: Article[] };
    const marked = after.find((a) => a.id === fixtureArticles[0].id);
    expect(marked?.isRead).toBe(true);
  });
});
