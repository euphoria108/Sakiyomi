import type { IFeedRepository, IArticleRepository } from '../domain/repositories';
import type { FeedEntity, ArticleEntity } from '../domain/entities';
import { fetchAndParseFeed } from '../infrastructure/FeedParser';

export class FeedUseCase {
  constructor(
    private feedRepo: IFeedRepository,
    private articleRepo: IArticleRepository
  ) {}

  async addFeed(userId: string, url: string): Promise<FeedEntity> {
    const parsed = await fetchAndParseFeed(url);

    const feed: FeedEntity = {
      id: crypto.randomUUID(),
      userId,
      url,
      title: parsed.title || url,
      lastFetchedAt: Date.now(),
    };
    await this.feedRepo.create(feed);

    const articles: ArticleEntity[] = parsed.items.map((item) => ({
      id: crypto.randomUUID(),
      feedId: feed.id,
      title: item.title,
      url: item.url,
      publishedAt: item.publishedAt,
      isRead: false,
    }));
    for (const article of articles) {
      await this.articleRepo.upsert(article);
    }

    return feed;
  }

  async getFeeds(userId: string): Promise<FeedEntity[]> {
    return this.feedRepo.findByUserId(userId);
  }

  async deleteFeed(feedId: string, userId: string): Promise<void> {
    await this.feedRepo.delete(feedId, userId);
  }
}
