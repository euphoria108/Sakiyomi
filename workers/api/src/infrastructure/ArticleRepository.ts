import type { D1Database } from '@cloudflare/workers-types';
import type { IArticleRepository, ArticleWithReadState } from '../domain/repositories';
import type { ArticleEntity } from '../domain/entities';

interface ArticleRow {
  id: string;
  feed_id: string;
  title: string;
  url: string;
  published_at: number;
}

interface ArticleWithReadRow extends ArticleRow {
  feed_title: string;
  is_read: number;
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

  async findByUserId(userId: string, unreadOnly = false): Promise<ArticleWithReadState[]> {
    const query = `
      SELECT a.*, f.title AS feed_title,
             CASE WHEN r.article_id IS NOT NULL THEN 1 ELSE 0 END AS is_read
      FROM articles a
      JOIN feeds f ON a.feed_id = f.id
      JOIN subscriptions s ON s.feed_id = f.id AND s.user_id = ?1
      LEFT JOIN article_reads r ON r.article_id = a.id AND r.user_id = ?1
      WHERE 1 = 1
      ${unreadOnly ? 'AND r.article_id IS NULL' : ''}
      ORDER BY a.published_at DESC
      LIMIT 200
    `;
    const { results } = await this.db.prepare(query).bind(userId).all<ArticleWithReadRow>();
    return results.map((row) => ({
      ...this.toEntity(row),
      feedTitle: row.feed_title,
      isRead: row.is_read === 1,
    }));
  }

  async upsert(article: ArticleEntity): Promise<void> {
    await this.db.prepare(
      'INSERT OR IGNORE INTO articles (id, feed_id, title, url, published_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(article.id, article.feedId, article.title, article.url, article.publishedAt).run();
  }

  async markRead(userId: string, articleId: string, readAt: number): Promise<void> {
    await this.db.prepare(
      'INSERT OR IGNORE INTO article_reads (user_id, article_id, read_at) VALUES (?, ?, ?)'
    ).bind(userId, articleId, readAt).run();
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
    };
  }
}
