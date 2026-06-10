import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { ArticleUseCase } from '../usecase/ArticleUseCase';
import { D1ArticleRepository } from '../infrastructure/ArticleRepository';

const articles = new Hono<{ Bindings: Env; Variables: Variables }>();

articles.get('/', async (c) => {
  const userId = c.get('userId');
  const unreadOnly = c.req.query('unread') === 'true';
  const useCase = new ArticleUseCase(new D1ArticleRepository(c.env.DB));
  const list = await useCase.getArticles(userId, unreadOnly);
  return c.json({
    articles: list.map((a) => ({
      id: a.id,
      feedId: a.feedId,
      feedTitle: a.feedTitle,
      title: a.title,
      url: a.url,
      publishedAt: a.publishedAt,
      isRead: a.isRead,
    })),
  });
});

articles.patch('/:id/read', async (c) => {
  const articleId = c.req.param('id');
  const useCase = new ArticleUseCase(new D1ArticleRepository(c.env.DB));
  await useCase.markRead(articleId);
  return c.body(null, 204);
});

export default articles;
