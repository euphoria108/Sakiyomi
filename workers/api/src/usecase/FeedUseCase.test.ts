import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeedUseCase } from './FeedUseCase';
import type { IFeedRepository, IArticleRepository, ISubscriptionRepository } from '../domain/repositories';
import type { FeedEntity } from '../domain/entities';

vi.mock('../infrastructure/FeedParser');

import { fetchAndParseFeed } from '../infrastructure/FeedParser';
const mockFetchAndParseFeed = vi.mocked(fetchAndParseFeed);

function makeFeedRepo() {
  return {
    findByUserId: vi.fn<IFeedRepository['findByUserId']>().mockResolvedValue([]),
    findById: vi.fn<IFeedRepository['findById']>().mockResolvedValue(null),
    findByUrl: vi.fn<IFeedRepository['findByUrl']>().mockResolvedValue(null),
    create: vi.fn<IFeedRepository['create']>().mockResolvedValue(undefined),
    updateLastFetchedAt: vi.fn<IFeedRepository['updateLastFetchedAt']>().mockResolvedValue(undefined),
    findAll: vi.fn<IFeedRepository['findAll']>().mockResolvedValue([]),
  };
}

function makeArticleRepo() {
  return {
    findByFeedId: vi.fn<IArticleRepository['findByFeedId']>().mockResolvedValue([]),
    findByUserId: vi.fn<IArticleRepository['findByUserId']>().mockResolvedValue([]),
    upsert: vi.fn<IArticleRepository['upsert']>().mockResolvedValue(undefined),
    markRead: vi.fn<IArticleRepository['markRead']>().mockResolvedValue(undefined),
    findExistingUrls: vi.fn<IArticleRepository['findExistingUrls']>().mockResolvedValue([]),
  };
}

function makeSubscriptionRepo() {
  return {
    subscribe: vi.fn<ISubscriptionRepository['subscribe']>().mockResolvedValue(undefined),
    unsubscribe: vi.fn<ISubscriptionRepository['unsubscribe']>().mockResolvedValue(undefined),
    findUserIdsByFeedId: vi.fn<ISubscriptionRepository['findUserIdsByFeedId']>().mockResolvedValue([]),
  };
}

describe('FeedUseCase', () => {
  let feedRepo: ReturnType<typeof makeFeedRepo>;
  let articleRepo: ReturnType<typeof makeArticleRepo>;
  let subscriptionRepo: ReturnType<typeof makeSubscriptionRepo>;
  let useCase: FeedUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    feedRepo = makeFeedRepo();
    articleRepo = makeArticleRepo();
    subscriptionRepo = makeSubscriptionRepo();
    useCase = new FeedUseCase(feedRepo, articleRepo, subscriptionRepo);
  });

  describe('addFeed（新規フィード）', () => {
    it('フィードと記事を作成し、購読を登録して FeedEntity を返す', async () => {
      const url = 'https://example.com/feed.rss';
      feedRepo.findByUrl.mockResolvedValue(null);
      mockFetchAndParseFeed.mockResolvedValue({
        title: 'My Blog',
        items: [
          { title: 'Article 1', url: 'https://example.com/1', publishedAt: 1000 },
          { title: 'Article 2', url: 'https://example.com/2', publishedAt: 2000 },
        ],
      });

      const feed = await useCase.addFeed('user-1', url);

      expect(feedRepo.create).toHaveBeenCalledOnce();
      expect(feedRepo.create).toHaveBeenCalledWith(expect.objectContaining({ url, title: 'My Blog' }));
      expect(articleRepo.upsert).toHaveBeenCalledTimes(2);
      expect(subscriptionRepo.subscribe).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-1', feedId: feed.id })
      );
      expect(feed.title).toBe('My Blog');
    });

    it('タイトルが空文字の場合、URL をタイトルとして使う', async () => {
      const url = 'https://example.com/feed.rss';
      feedRepo.findByUrl.mockResolvedValue(null);
      mockFetchAndParseFeed.mockResolvedValue({ title: '', items: [] });

      const feed = await useCase.addFeed('user-1', url);

      expect(feedRepo.create).toHaveBeenCalledWith(expect.objectContaining({ title: url }));
      expect(articleRepo.upsert).not.toHaveBeenCalled();
      expect(feed.title).toBe(url);
    });

    it('記事の feedId が返された feed.id と一致する', async () => {
      const url = 'https://example.com/feed.rss';
      feedRepo.findByUrl.mockResolvedValue(null);
      mockFetchAndParseFeed.mockResolvedValue({
        title: 'Blog',
        items: [{ title: 'Post', url: 'https://example.com/post', publishedAt: 1000 }],
      });

      const feed = await useCase.addFeed('user-1', url);

      const upsertedArticle = articleRepo.upsert.mock.calls[0][0];
      expect(upsertedArticle.feedId).toBe(feed.id);
    });
  });

  describe('addFeed（既存フィードの購読）', () => {
    it('既存フィードはフェッチ・作成せず購読のみ追加する', async () => {
      const url = 'https://example.com/feed.rss';
      const existing: FeedEntity = { id: 'feed-1', url, title: 'Existing', lastFetchedAt: 100 };
      feedRepo.findByUrl.mockResolvedValue(existing);

      const feed = await useCase.addFeed('user-2', url);

      expect(mockFetchAndParseFeed).not.toHaveBeenCalled();
      expect(feedRepo.create).not.toHaveBeenCalled();
      expect(articleRepo.upsert).not.toHaveBeenCalled();
      expect(subscriptionRepo.subscribe).toHaveBeenCalledWith(
        expect.objectContaining({ userId: 'user-2', feedId: 'feed-1' })
      );
      expect(feed).toBe(existing);
    });
  });

  describe('getFeeds', () => {
    it('feedRepo.findByUserId に委譲してそのまま返す', async () => {
      const feeds: FeedEntity[] = [
        { id: 'f1', url: 'https://a.com', title: 'A', lastFetchedAt: null },
      ];
      feedRepo.findByUserId.mockResolvedValue(feeds);

      const result = await useCase.getFeeds('user-1');

      expect(feedRepo.findByUserId).toHaveBeenCalledWith('user-1');
      expect(result).toBe(feeds);
    });
  });

  describe('deleteFeed', () => {
    it('subscriptionRepo.unsubscribe(userId, feedId) を呼ぶ', async () => {
      await useCase.deleteFeed('feed-1', 'user-1');

      expect(subscriptionRepo.unsubscribe).toHaveBeenCalledWith('user-1', 'feed-1');
    });
  });
});
