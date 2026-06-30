import type { D1Database } from '@cloudflare/workers-types';
import type { ISubscriptionRepository } from '../domain/repositories';
import type { SubscriptionEntity } from '../domain/entities';

export class D1SubscriptionRepository implements ISubscriptionRepository {
  constructor(private db: D1Database) {}

  async subscribe(subscription: SubscriptionEntity): Promise<void> {
    await this.db.prepare(
      'INSERT OR IGNORE INTO subscriptions (user_id, feed_id, created_at) VALUES (?, ?, ?)'
    ).bind(subscription.userId, subscription.feedId, subscription.createdAt).run();
  }

  async unsubscribe(userId: string, feedId: string): Promise<void> {
    await this.db.prepare('DELETE FROM subscriptions WHERE user_id = ? AND feed_id = ?').bind(userId, feedId).run();
  }

  async findUserIdsByFeedId(feedId: string): Promise<string[]> {
    const { results } = await this.db
      .prepare('SELECT user_id FROM subscriptions WHERE feed_id = ?')
      .bind(feedId)
      .all<{ user_id: string }>();
    return results.map((r) => r.user_id);
  }
}
