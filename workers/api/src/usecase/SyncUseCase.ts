import type { IFeedRepository, IArticleRepository, IUserRepository } from '../domain/repositories';
import type { ArticleEntity } from '../domain/entities';
import { fetchAndParseFeed } from '../infrastructure/FeedParser';

export class SyncUseCase {
  constructor(
    private feedRepo: IFeedRepository,
    private articleRepo: IArticleRepository,
    private userRepo: IUserRepository
  ) {}

  async syncAll(): Promise<void> {
    const feeds = await this.feedRepo.findAll();

    for (const feed of feeds) {
      try {
        const parsed = await fetchAndParseFeed(feed.url);
        const incomingUrls = parsed.items.map((i) => i.url);
        const existingUrls = new Set(await this.articleRepo.findExistingUrls(feed.id, incomingUrls));

        const newArticles = parsed.items
          .filter((item) => !existingUrls.has(item.url))
          .map((item): ArticleEntity => ({
            id: crypto.randomUUID(),
            feedId: feed.id,
            title: item.title,
            url: item.url,
            publishedAt: item.publishedAt,
            isRead: false,
          }));

        for (const article of newArticles) {
          await this.articleRepo.upsert(article);
        }

        await this.feedRepo.updateLastFetchedAt(feed.id, Date.now());

        if (newArticles.length > 0) {
          const user = await this.userRepo.findById(feed.userId);
          if (user?.pushToken) {
            await sendPushNotification(user.pushToken, feed.title, `${newArticles.length} 件の新しい記事があります`);
          }
        }
      } catch {
        // 1 フィードの失敗が他に影響しないよう継続
      }
    }
  }
}

async function sendPushNotification(token: string, title: string, body: string): Promise<void> {
  await fetch('https://exp.host/--/api/v2/push/send', {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ to: token, title, body, sound: 'default' }),
  });
}
