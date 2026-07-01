import type { IFeedRepository, ISubscriptionRepository, IArticleRepository } from '../domain/repositories';
import type { FeedEntity, ArticleEntity } from '../domain/entities';
import { fetchAndParseFeed } from '../infrastructure/FeedParser';

export class FeedUseCase {
  constructor(
    private feedRepo: IFeedRepository,
    private articleRepo: IArticleRepository,
    private subscriptionRepo: ISubscriptionRepository
  ) {}

  async addFeed(userId: string, url: string): Promise<FeedEntity> {
    // 同一 URL のフィードはグローバルに 1 件だけ存在する（find-or-create）
    let feed = await this.feedRepo.findByUrl(url);

    if (!feed) {
      const parsed = await fetchAndParseFeed(url);

      feed = {
        id: crypto.randomUUID(),
        url,
        title: parsed.title || url,
        lastFetchedAt: Date.now(),
      };
      await this.feedRepo.create(feed);

      const articles: ArticleEntity[] = parsed.items.map((item) => ({
        id: crypto.randomUUID(),
        feedId: feed!.id,
        title: item.title,
        url: item.url,
        publishedAt: item.publishedAt,
      }));
      for (const article of articles) {
        await this.articleRepo.upsert(article);
      }
    }

    await this.subscriptionRepo.subscribe({
      userId,
      feedId: feed.id,
      createdAt: Date.now(),
    });

    return feed;
  }

  async getFeeds(userId: string): Promise<FeedEntity[]> {
    return this.feedRepo.findByUserId(userId);
  }

  async deleteFeed(feedId: string, userId: string): Promise<void> {
    await this.subscriptionRepo.unsubscribe(userId, feedId);
  }
}
