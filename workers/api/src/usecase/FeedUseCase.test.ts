import { describe, it, expect, vi, beforeEach } from 'vitest';
import { FeedUseCase } from './FeedUseCase';
import type { IFeedRepository, IArticleRepository } from '../domain/repositories';
import type { FeedEntity } from '../domain/entities';

vi.mock('../infrastructure/FeedParser');

import { fetchAndParseFeed } from '../infrastructure/FeedParser';
const mockFetchAndParseFeed = vi.mocked(fetchAndParseFeed);

function makeFeedRepo() {
  return {
    findByUserId: vi.fn<IFeedRepository['findByUserId']>().mockResolvedValue([]),
    findById: vi.fn<IFeedRepository['findById']>().mockResolvedValue(null),
    create: vi.fn<IFeedRepository['create']>().mockResolvedValue(undefined),
    delete: vi.fn<IFeedRepository['delete']>().mockResolvedValue(undefined),
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

describe('FeedUseCase', () => {
  let feedRepo: ReturnType<typeof makeFeedRepo>;
  let articleRepo: ReturnType<typeof makeArticleRepo>;
  let useCase: FeedUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    feedRepo = makeFeedRepo();
    articleRepo = makeArticleRepo();
    useCase = new FeedUseCase(feedRepo, articleRepo);
  });

  describe('addFeed', () => {
    it('フィードと記事を作成して FeedEntity を返す', async () => {
      const url = 'https://example.com/feed.rss';
      mockFetchAndParseFeed.mockResolvedValue({
        title: 'My Blog',
        items: [
          { title: 'Article 1', url: 'https://example.com/1', publishedAt: 1000 },
          { title: 'Article 2', url: 'https://example.com/2', publishedAt: 2000 },
        ],
      });

      const feed = await useCase.addFeed('user-1', url);

      expect(feedRepo.create).toHaveBeenCalledOnce();
      expect(feedRepo.create).toHaveBeenCalledWith(expect.objectContaining({
        userId: 'user-1',
        url,
        title: 'My Blog',
      }));
      expect(articleRepo.upsert).toHaveBeenCalledTimes(2);
      expect(feed.title).toBe('My Blog');
      expect(feed.userId).toBe('user-1');
    });

    it('タイトルが空文字の場合、URL をタイトルとして使う', async () => {
      const url = 'https://example.com/feed.rss';
      mockFetchAndParseFeed.mockResolvedValue({ title: '', items: [] });

      const feed = await useCase.addFeed('user-1', url);

      expect(feedRepo.create).toHaveBeenCalledWith(expect.objectContaining({ title: url }));
      expect(articleRepo.upsert).not.toHaveBeenCalled();
      expect(feed.title).toBe(url);
    });

    it('記事の feedId が返された feed.id と一致する', async () => {
      const url = 'https://example.com/feed.rss';
      mockFetchAndParseFeed.mockResolvedValue({
        title: 'Blog',
        items: [{ title: 'Post', url: 'https://example.com/post', publishedAt: 1000 }],
      });

      const feed = await useCase.addFeed('user-1', url);

      const upsertedArticle = articleRepo.upsert.mock.calls[0][0];
      expect(upsertedArticle.feedId).toBe(feed.id);
    });
  });

  describe('getFeeds', () => {
    it('feedRepo.findByUserId に委譲してそのまま返す', async () => {
      const feeds: FeedEntity[] = [
        { id: 'f1', userId: 'user-1', url: 'https://a.com', title: 'A', lastFetchedAt: null },
      ];
      feedRepo.findByUserId.mockResolvedValue(feeds);

      const result = await useCase.getFeeds('user-1');

      expect(feedRepo.findByUserId).toHaveBeenCalledWith('user-1');
      expect(result).toBe(feeds);
    });
  });

  describe('deleteFeed', () => {
    it('feedRepo.delete(feedId, userId) を呼ぶ', async () => {
      await useCase.deleteFeed('feed-1', 'user-1');

      expect(feedRepo.delete).toHaveBeenCalledWith('feed-1', 'user-1');
    });
  });
});
