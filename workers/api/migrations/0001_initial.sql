CREATE TABLE users (
  id TEXT PRIMARY KEY,
  email TEXT UNIQUE NOT NULL,
  password_hash TEXT NOT NULL,
  push_token TEXT,
  created_at INTEGER NOT NULL
);

-- feeds: グローバル。1 URL = 1 行
CREATE TABLE feeds (
  id TEXT PRIMARY KEY,
  url TEXT UNIQUE NOT NULL,
  title TEXT NOT NULL,
  last_fetched_at INTEGER
);

-- subscriptions: ユーザー ↔ フィード（多対多 / 購読）
CREATE TABLE subscriptions (
  user_id TEXT NOT NULL,
  feed_id TEXT NOT NULL,
  created_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, feed_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
);

CREATE INDEX subscriptions_feed_id ON subscriptions(feed_id);

-- articles: グローバル。feed に属する
CREATE TABLE articles (
  id TEXT PRIMARY KEY,
  feed_id TEXT NOT NULL,
  title TEXT NOT NULL,
  url TEXT NOT NULL,
  published_at INTEGER NOT NULL,
  FOREIGN KEY (feed_id) REFERENCES feeds(id) ON DELETE CASCADE
);

CREATE UNIQUE INDEX articles_feed_url ON articles(feed_id, url);
CREATE INDEX articles_published_at ON articles(published_at DESC);

-- article_reads: ユーザーごとの閲覧履歴（推薦の基盤）
CREATE TABLE article_reads (
  user_id TEXT NOT NULL,
  article_id TEXT NOT NULL,
  read_at INTEGER NOT NULL,
  PRIMARY KEY (user_id, article_id),
  FOREIGN KEY (user_id) REFERENCES users(id) ON DELETE CASCADE,
  FOREIGN KEY (article_id) REFERENCES articles(id) ON DELETE CASCADE
);

CREATE INDEX article_reads_user_id ON article_reads(user_id);
