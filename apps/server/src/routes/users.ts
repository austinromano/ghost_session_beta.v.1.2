import { Hono } from 'hono';
import { db } from '../db/index.js';
import { users } from '../db/schema.js';
import { ne } from 'drizzle-orm';
import { authMiddleware, type AuthUser } from '../middleware/auth.js';

const userRoutes = new Hono();
userRoutes.use('*', authMiddleware);

// List all users (excluding current user) — acts as "friends" for now
userRoutes.get('/', async (c) => {
  const user = c.get('user') as AuthUser;
  const result = db.select({
    id: users.id,
    displayName: users.displayName,
    email: users.email,
    avatarUrl: users.avatarUrl,
  }).from(users).where(ne(users.id, user.id)).all();
  return c.json({ success: true, data: result });
});

export default userRoutes;
