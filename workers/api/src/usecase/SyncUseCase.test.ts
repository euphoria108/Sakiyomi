import { describe, it, expect, vi, beforeEach, afterEach } from 'vitest';
import { SyncUseCase } from './SyncUseCase';
import type { IFeedRepository, IArticleRepository, IUserRepository } from '../domain/repositories';
import type { FeedEntity, UserEntity } from '../domain/entities';

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

function makeUserRepo() {
  return {
    findById: vi.fn<IUserRepository['findById']>().mockResolvedValue(null),
    findByEmail: vi.fn<IUserRepository['findByEmail']>().mockResolvedValue(null),
    create: vi.fn<IUserRepository['create']>().mockResolvedValue(undefined),
    updatePushToken: vi.fn<IUserRepository['updatePushToken']>().mockResolvedValue(undefined),
  };
}

const feed1: FeedEntity = {
  id: 'feed-1',
  userId: 'user-1',
  url: 'https://example.com/feed.rss',
  title: 'Example Blog',
  lastFetchedAt: null,
};

const userWithToken: UserEntity = {
  id: 'user-1',
  email: 'user@example.com',
  passwordHash: 'hash',
  pushToken: 'ExponentPushToken[xxx]',
  createdAt: 1000,
};

const userWithoutToken: UserEntity = {
  ...userWithToken,
  pushToken: null,
};

describe('SyncUseCase', () => {
  let feedRepo: ReturnType<typeof makeFeedRepo>;
  let articleRepo: ReturnType<typeof makeArticleRepo>;
  let userRepo: ReturnType<typeof makeUserRepo>;
  let useCase: SyncUseCase;
  let mockFetch: ReturnType<typeof vi.fn>;

  beforeEach(() => {
    vi.clearAllMocks();
    mockFetch = vi.fn().mockResolvedValue({ ok: true });
    vi.stubGlobal('fetch', mockFetch);
    feedRepo = makeFeedRepo();
    articleRepo = makeArticleRepo();
    userRepo = makeUserRepo();
    useCase = new SyncUseCase(feedRepo, articleRepo, userRepo);
  });

  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it('フィードが0件の場合、何も起きない', async () => {
    feedRepo.findAll.mockResolvedValue([]);

    await useCase.syncAll();

    expect(mockFetchAndParseFeed).not.toHaveBeenCalled();
    expect(articleRepo.upsert).not.toHaveBeenCalled();
  });

  it('新記事のみ upsert される（URL重複は除外）', async () => {
    feedRepo.findAll.mockResolvedValue([feed1]);
    mockFetchAndParseFeed.mockResolvedValue({
      title: 'Blog',
      items: [
        { title: 'Old Post', url: 'https://example.com/old', publishedAt: 1000 },
        { title: 'New Post', url: 'https://example.com/new', publishedAt: 2000 },
      ],
    });
    articleRepo.findExistingUrls.mockResolvedValue(['https://example.com/old']);
    userRepo.findById.mockResolvedValue(userWithoutToken);

    await useCase.syncAll();

    expect(articleRepo.upsert).toHaveBeenCalledOnce();
    expect(articleRepo.upsert.mock.calls[0][0].url).toBe('https://example.com/new');
    expect(feedRepo.updateLastFetchedAt).toHaveBeenCalledWith('feed-1', expect.any(Number));
  });

  it('新記事あり + pushToken あり → Expo API に fetch が送られる', async () => {
    feedRepo.findAll.mockResolvedValue([feed1]);
    mockFetchAndParseFeed.mockResolvedValue({
      title: 'Blog',
      items: [{ title: 'New Post', url: 'https://example.com/new', publishedAt: 2000 }],
    });
    articleRepo.findExistingUrls.mockResolvedValue([]);
    userRepo.findById.mockResolvedValue(userWithToken);

    await useCase.syncAll();

    expect(mockFetch).toHaveBeenCalledOnce();
    expect(mockFetch).toHaveBeenCalledWith(
      'https://exp.host/--/api/v2/push/send',
      expect.objectContaining({ method: 'POST' })
    );
    const body = JSON.parse(mockFetch.mock.calls[0][1].body as string);
    expect(body.to).toBe('ExponentPushToken[xxx]');
    expect(body.title).toBe('Example Blog');
  });

  it('pushToken が null の場合、fetch は呼ばれない', async () => {
    feedRepo.findAll.mockResolvedValue([feed1]);
    mockFetchAndParseFeed.mockResolvedValue({
      title: 'Blog',
      items: [{ title: 'New Post', url: 'https://example.com/new', publishedAt: 2000 }],
    });
    articleRepo.findExistingUrls.mockResolvedValue([]);
    userRepo.findById.mockResolvedValue(userWithoutToken);

    await useCase.syncAll();

    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('新記事が0件の場合、userRepo.findById も fetch も呼ばれない', async () => {
    feedRepo.findAll.mockResolvedValue([feed1]);
    mockFetchAndParseFeed.mockResolvedValue({
      title: 'Blog',
      items: [{ title: 'Existing', url: 'https://example.com/existing', publishedAt: 1000 }],
    });
    articleRepo.findExistingUrls.mockResolvedValue(['https://example.com/existing']);

    await useCase.syncAll();

    expect(userRepo.findById).not.toHaveBeenCalled();
    expect(mockFetch).not.toHaveBeenCalled();
  });

  it('1フィードがエラーでも他のフィードが処理される', async () => {
    const failingFeed: FeedEntity = { ...feed1, id: 'feed-fail', url: 'https://fail.com/feed' };
    const successFeed: FeedEntity = { ...feed1, id: 'feed-ok', url: 'https://ok.com/feed' };

    feedRepo.findAll.mockResolvedValue([failingFeed, successFeed]);
    mockFetchAndParseFeed.mockImplementation((url) => {
      if (url === failingFeed.url) return Promise.reject(new Error('timeout'));
      return Promise.resolve({
        title: 'OK Blog',
        items: [{ title: 'Post', url: 'https://ok.com/post', publishedAt: 1000 }],
      });
    });
    articleRepo.findExistingUrls.mockResolvedValue([]);
    userRepo.findById.mockResolvedValue(userWithoutToken);

    await expect(useCase.syncAll()).resolves.toBeUndefined();

    expect(articleRepo.upsert).toHaveBeenCalledOnce();
    expect(feedRepo.updateLastFetchedAt).toHaveBeenCalledWith('feed-ok', expect.any(Number));
    expect(feedRepo.updateLastFetchedAt).not.toHaveBeenCalledWith('feed-fail', expect.anything());
  });
});
