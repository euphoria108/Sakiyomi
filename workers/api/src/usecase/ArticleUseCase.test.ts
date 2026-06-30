import { describe, it, expect, vi, beforeEach } from 'vitest';
import { ArticleUseCase } from './ArticleUseCase';
import type { IArticleRepository, ArticleWithReadState } from '../domain/repositories';

function makeArticleRepo() {
  return {
    findByFeedId: vi.fn<IArticleRepository['findByFeedId']>().mockResolvedValue([]),
    findByUserId: vi.fn<IArticleRepository['findByUserId']>().mockResolvedValue([]),
    upsert: vi.fn<IArticleRepository['upsert']>().mockResolvedValue(undefined),
    markRead: vi.fn<IArticleRepository['markRead']>().mockResolvedValue(undefined),
    findExistingUrls: vi.fn<IArticleRepository['findExistingUrls']>().mockResolvedValue([]),
  };
}

const baseArticle: ArticleWithReadState = {
  id: 'a1',
  feedId: 'f1',
  title: 'Post 1',
  url: 'https://example.com/1',
  publishedAt: 1000,
  isRead: false,
  feedTitle: 'My Feed',
};

describe('ArticleUseCase', () => {
  let articleRepo: ReturnType<typeof makeArticleRepo>;
  let useCase: ArticleUseCase;

  beforeEach(() => {
    vi.clearAllMocks();
    articleRepo = makeArticleRepo();
    useCase = new ArticleUseCase(articleRepo);
  });

  describe('getArticles', () => {
    it('unreadOnly=false で全記事を取得する', async () => {
      const articles = [baseArticle, { ...baseArticle, id: 'a2', isRead: true }];
      articleRepo.findByUserId.mockResolvedValue(articles);

      const result = await useCase.getArticles('user-1', false);

      expect(articleRepo.findByUserId).toHaveBeenCalledWith('user-1', false);
      expect(result).toBe(articles);
    });

    it('unreadOnly=true で未読記事のみ取得する', async () => {
      const unread = [baseArticle];
      articleRepo.findByUserId.mockResolvedValue(unread);

      const result = await useCase.getArticles('user-1', true);

      expect(articleRepo.findByUserId).toHaveBeenCalledWith('user-1', true);
      expect(result).toBe(unread);
    });
  });

  describe('markRead', () => {
    it('articleRepo.markRead(userId, articleId, readAt) を呼ぶ', async () => {
      await useCase.markRead('user-1', 'article-1');

      expect(articleRepo.markRead).toHaveBeenCalledWith('user-1', 'article-1', expect.any(Number));
    });
  });
});
