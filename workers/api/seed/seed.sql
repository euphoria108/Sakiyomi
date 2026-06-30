-- Deterministic seed data for LOCAL development only (applied to local D1 via wrangler --local).
-- Idempotent: uses fixed UUIDs + INSERT OR IGNORE so re-running is safe.
--
-- Demo credentials:  demo@example.com / password123
-- The password_hash below is PBKDF2(SHA-256, 100000 iters, 16-byte salt), format `saltHex:hashHex`,
-- matching AuthUseCase.hashPassword in src/usecase/AuthUseCase.ts. Generated offline (fixed salt).

INSERT OR IGNORE INTO users (id, email, password_hash, push_token, created_at) VALUES
  ('00000000-0000-4000-8000-000000000001',
   'demo@example.com',
   '0123456789abcdef0123456789abcdef:8c11141fc5789a57f110d0b99e86d6ab0a9eb540f6c476dd7bbc534c70100b74',
   NULL,
   1700000000000);

-- NOTE: URL must NOT collide with the test fixture (http://feed-fixtures/sample-feed.xml),
-- otherwise addFeed's find-or-create would return this seed row instead of parsing the fixture.
INSERT OR IGNORE INTO feeds (id, url, title, last_fetched_at) VALUES
  ('00000000-0000-4000-8000-000000000010',
   'https://demo.sakiyomi.local/feed.xml',
   'Sakiyomi Demo Blog',
   1700000000000);

INSERT OR IGNORE INTO subscriptions (user_id, feed_id, created_at) VALUES
  ('00000000-0000-4000-8000-000000000001',
   '00000000-0000-4000-8000-000000000010',
   1700000000000);

INSERT OR IGNORE INTO articles (id, feed_id, title, url, published_at) VALUES
  ('00000000-0000-4000-8000-000000000011',
   '00000000-0000-4000-8000-000000000010',
   'はじめての Sakiyomi',
   'https://example.com/posts/1',
   1700000100000),
  ('00000000-0000-4000-8000-000000000012',
   '00000000-0000-4000-8000-000000000010',
   'RSS フィードの読み方',
   'https://example.com/posts/2',
   1700000200000),
  ('00000000-0000-4000-8000-000000000013',
   '00000000-0000-4000-8000-000000000010',
   'プッシュ通知のしくみ',
   'https://example.com/posts/3',
   1700000300000);
