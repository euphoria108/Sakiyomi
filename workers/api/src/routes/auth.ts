import { Hono } from 'hono';
import { sign } from 'hono/jwt';
import type { Env } from '../types';
import { AuthUseCase } from '../usecase/AuthUseCase';
import { D1UserRepository } from '../infrastructure/UserRepository';

const auth = new Hono<{ Bindings: Env }>();

auth.post('/register', async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>();
  if (!email || !password) return c.json({ error: 'email and password required' }, 400);

  const useCase = new AuthUseCase(new D1UserRepository(c.env.DB));
  try {
    const user = await useCase.register(email, password);
    const token = await sign({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, c.env.JWT_SECRET);
    return c.json({ token, user: { id: user.id, email: user.email, createdAt: user.createdAt } }, 201);
  } catch (e) {
    if (e instanceof Error && e.message === 'EMAIL_EXISTS') return c.json({ error: 'Email already in use' }, 409);
    throw e;
  }
});

auth.post('/login', async (c) => {
  const { email, password } = await c.req.json<{ email: string; password: string }>();
  if (!email || !password) return c.json({ error: 'email and password required' }, 400);

  const useCase = new AuthUseCase(new D1UserRepository(c.env.DB));
  try {
    const user = await useCase.login(email, password);
    const token = await sign({ sub: user.id, exp: Math.floor(Date.now() / 1000) + 60 * 60 * 24 * 30 }, c.env.JWT_SECRET);
    return c.json({ token, user: { id: user.id, email: user.email, createdAt: user.createdAt } });
  } catch (e) {
    if (e instanceof Error && e.message === 'INVALID_CREDENTIALS') return c.json({ error: 'Invalid credentials' }, 401);
    throw e;
  }
});

export default auth;
