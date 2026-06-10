import type { D1Database } from '@cloudflare/workers-types';
import type { IFeedRepository } from '../domain/repositories';
import type { FeedEntity } from '../domain/entities';

interface FeedRow {
  id: string;
  user_id: string;
  url: string;
  title: string;
  last_fetched_at: number | null;
}

export class D1FeedRepository implements IFeedRepository {
  constructor(private db: D1Database) {}

  async findByUserId(userId: string): Promise<FeedEntity[]> {
    const { results } = await this.db.prepare('SELECT * FROM feeds WHERE user_id = ?').bind(userId).all<FeedRow>();
    return results.map(this.toEntity);
  }

  async findById(id: string): Promise<FeedEntity | null> {
    const row = await this.db.prepare('SELECT * FROM feeds WHERE id = ?').bind(id).first<FeedRow>();
    return row ? this.toEntity(row) : null;
  }

  async create(feed: FeedEntity): Promise<void> {
    await this.db.prepare(
      'INSERT INTO feeds (id, user_id, url, title, last_fetched_at) VALUES (?, ?, ?, ?, ?)'
    ).bind(feed.id, feed.userId, feed.url, feed.title, feed.lastFetchedAt).run();
  }

  async delete(id: string, userId: string): Promise<void> {
    await this.db.prepare('DELETE FROM feeds WHERE id = ? AND user_id = ?').bind(id, userId).run();
  }

  async updateLastFetchedAt(id: string, ts: number): Promise<void> {
    await this.db.prepare('UPDATE feeds SET last_fetched_at = ? WHERE id = ?').bind(ts, id).run();
  }

  async findAll(): Promise<FeedEntity[]> {
    const { results } = await this.db.prepare('SELECT * FROM feeds').all<FeedRow>();
    return results.map(this.toEntity);
  }

  private toEntity(row: FeedRow): FeedEntity {
    return {
      id: row.id,
      userId: row.user_id,
      url: row.url,
      title: row.title,
      lastFetchedAt: row.last_fetched_at,
    };
  }
}
