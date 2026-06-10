import type { D1Database } from '@cloudflare/workers-types';
import type { IArticleRepository } from '../domain/repositories';
import type { ArticleEntity } from '../domain/entities';

interface ArticleRow {
  id: string;
  feed_id: string;
  title: string;
  url: string;
  published_at: number;
  is_read: number;
}

interface ArticleWithFeedRow extends ArticleRow {
  feed_title: string;
}

export class D1ArticleRepository implements IArticleRepository {
  constructor(private db: D1Database) {}

  async findByFeedId(feedId: string): Promise<ArticleEntity[]> {
    const { results } = await this.db
      .prepare('SELECT * FROM articles WHERE feed_id = ? ORDER BY published_at DESC')
      .bind(feedId)
      .all<ArticleRow>();
    return results.map(this.toEntity);
  }

  async findByUserId(userId: string, unreadOnly = false): Promise<(ArticleEntity & { feedTitle: string })[]> {
    const query = `
      SELECT a.*, f.title as feed_title
      FROM articles a
      JOIN feeds f ON a.feed_id = f.id
      WHERE f.user_id = ?
      ${unreadOnly ? 'AND a.is_read = 0' : ''}
      ORDER BY a.published_at DESC
      LIMIT 200
    `;
    const { results } = await this.db.prepare(query).bind(userId).all<ArticleWithFeedRow>();
    return results.map((row) => ({ ...this.toEntity(row), feedTitle: row.feed_title }));
  }

  async upsert(article: ArticleEntity): Promise<void> {
    await this.db.prepare(
      'INSERT OR IGNORE INTO articles (id, feed_id, title, url, published_at, is_read) VALUES (?, ?, ?, ?, ?, ?)'
    ).bind(article.id, article.feedId, article.title, article.url, article.publishedAt, article.isRead ? 1 : 0).run();
  }

  async markRead(id: string): Promise<void> {
    await this.db.prepare('UPDATE articles SET is_read = 1 WHERE id = ?').bind(id).run();
  }

  async findExistingUrls(feedId: string, urls: string[]): Promise<string[]> {
    if (urls.length === 0) return [];
    const placeholders = urls.map(() => '?').join(',');
    const { results } = await this.db
      .prepare(`SELECT url FROM articles WHERE feed_id = ? AND url IN (${placeholders})`)
      .bind(feedId, ...urls)
      .all<{ url: string }>();
    return results.map((r) => r.url);
  }

  private toEntity(row: ArticleRow): ArticleEntity {
    return {
      id: row.id,
      feedId: row.feed_id,
      title: row.title,
      url: row.url,
      publishedAt: row.published_at,
      isRead: row.is_read === 1,
    };
  }
}
