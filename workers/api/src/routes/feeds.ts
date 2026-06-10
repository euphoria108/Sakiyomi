import { Hono } from 'hono';
import type { Env, Variables } from '../types';
import { FeedUseCase } from '../usecase/FeedUseCase';
import { D1FeedRepository } from '../infrastructure/FeedRepository';
import { D1ArticleRepository } from '../infrastructure/ArticleRepository';

const feeds = new Hono<{ Bindings: Env; Variables: Variables }>();

feeds.get('/', async (c) => {
  const userId = c.get('userId');
  const useCase = new FeedUseCase(new D1FeedRepository(c.env.DB), new D1ArticleRepository(c.env.DB));
  const feedList = await useCase.getFeeds(userId);
  return c.json({ feeds: feedList });
});

feeds.post('/', async (c) => {
  const { url } = await c.req.json<{ url: string }>();
  if (!url) return c.json({ error: 'url required' }, 400);

  const userId = c.get('userId');
  const useCase = new FeedUseCase(new D1FeedRepository(c.env.DB), new D1ArticleRepository(c.env.DB));
  try {
    const feed = await useCase.addFeed(userId, url);
    return c.json({ feed }, 201);
  } catch {
    return c.json({ error: 'Failed to fetch feed. Please check the URL.' }, 422);
  }
});

feeds.delete('/:id', async (c) => {
  const userId = c.get('userId');
  const feedId = c.req.param('id');
  const useCase = new FeedUseCase(new D1FeedRepository(c.env.DB), new D1ArticleRepository(c.env.DB));
  await useCase.deleteFeed(feedId, userId);
  return c.body(null, 204);
});

export default feeds;
