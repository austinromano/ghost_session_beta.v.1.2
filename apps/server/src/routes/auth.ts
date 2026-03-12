import { Hono } from 'hono';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { eq } from 'drizzle-orm';
import { hashPassword, verifyPassword, createSession, invalidateSession } from '../services/auth.js';
import { authMiddleware } from '../middleware/auth.js';

const auth = new Hono();

const registerSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8),
  displayName: z.string().min(1).max(50),
});

const loginSchema = z.object({
  email: z.string().email(),
  password: z.string(),
});

auth.post('/register', async (c) => {
  const body = registerSchema.parse(await c.req.json());

  const existing = db.select().from(users).where(eq(users.email, body.email)).limit(1).all();
  if (existing.length > 0) {
    throw new HTTPException(409, { message: 'Email already registered' });
  }

  const id = crypto.randomUUID();
  db.insert(users).values({
    id,
    email: body.email,
    displayName: body.displayName,
    hashedPassword: hashPassword(body.password),
    createdAt: new Date().toISOString(),
  }).run();

  const token = createSession(id);

  return c.json({
    success: true,
    data: {
      token,
      user: { id, email: body.email, displayName: body.displayName, avatarUrl: null, createdAt: new Date().toISOString() },
    },
  });
});

auth.post('/login', async (c) => {
  const body = loginSchema.parse(await c.req.json());

  const results = db.select().from(users).where(eq(users.email, body.email)).limit(1).all();
  const user = results[0];
  if (!user || !verifyPassword(body.password, user.hashedPassword)) {
    throw new HTTPException(401, { message: 'Invalid email or password' });
  }

  const token = createSession(user.id);

  return c.json({
    success: true,
    data: {
      token,
      user: {
        id: user.id,
        email: user.email,
        displayName: user.displayName,
        avatarUrl: user.avatarUrl,
        createdAt: user.createdAt,
      },
    },
  });
});

auth.post('/logout', authMiddleware, async (c) => {
  const token = c.get('token') as string;
  invalidateSession(token);
  return c.json({ success: true });
});

auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  return c.json({ success: true, data: user });
});

export default auth;
