import { Hono } from 'hono';
import type { Context, Next } from 'hono';
import { cors } from 'hono/cors';
import { verify } from 'hono/jwt';
import type { Env, Variables } from './types';
import authRoutes from './routes/auth';
import feedRoutes from './routes/feeds';
import articleRoutes from './routes/articles';
import { D1UserRepository } from './infrastructure/UserRepository';
import { D1FeedRepository } from './infrastructure/FeedRepository';
import { D1ArticleRepository } from './infrastructure/ArticleRepository';
import { D1SubscriptionRepository } from './infrastructure/SubscriptionRepository';
import { SyncUseCase } from './usecase/SyncUseCase';

const app = new Hono<{ Bindings: Env; Variables: Variables }>();

app.use('*', cors({ origin: '*', allowHeaders: ['Content-Type', 'Authorization'] }));

app.route('/auth', authRoutes);

app.use('/feeds/*', authMiddleware);
app.use('/articles/*', authMiddleware);
app.use('/push-token', authMiddleware);

app.route('/feeds', feedRoutes);
app.route('/articles', articleRoutes);

app.post('/push-token', async (c) => {
  const userId = c.get('userId');
  const { token } = await c.req.json<{ token: string }>();
  if (!token) return c.json({ error: 'token required' }, 400);
  const userRepo = new D1UserRepository(c.env.DB);
  await userRepo.updatePushToken(userId, token);
  return c.body(null, 204);
});

app.get('/health', (c) => c.json({ ok: true }));

async function authMiddleware(c: Context<{ Bindings: Env; Variables: Variables }>, next: Next) {
  const auth = c.req.header('Authorization');
  if (!auth?.startsWith('Bearer ')) return c.json({ error: 'Unauthorized' }, 401);
  try {
    const payload = await verify(auth.slice(7), c.env.JWT_SECRET, 'HS256') as { sub: string };
    c.set('userId', payload.sub);
    await next();
  } catch {
    return c.json({ error: 'Unauthorized' }, 401);
  }
}

export default {
  fetch: app.fetch,
  async scheduled(_event: ScheduledEvent, env: Env, _ctx: ExecutionContext) {
    const syncUseCase = new SyncUseCase(
      new D1FeedRepository(env.DB),
      new D1ArticleRepository(env.DB),
      new D1SubscriptionRepository(env.DB),
      new D1UserRepository(env.DB)
    );
    await syncUseCase.syncAll();
  },
};
