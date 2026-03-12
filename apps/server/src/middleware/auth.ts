import { Context, Next } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { validateSession } from '../services/auth.js';

export interface AuthUser {
  id: string;
  email: string;
  displayName: string;
  avatarUrl: string | null;
  createdAt: string;
}

export async function authMiddleware(c: Context, next: Next) {
  const header = c.req.header('Authorization');
  if (!header?.startsWith('Bearer ')) {
    throw new HTTPException(401, { message: 'Missing auth token' });
  }

  const token = header.slice(7);
  const user = validateSession(token);
  if (!user) {
    throw new HTTPException(401, { message: 'Invalid or expired token' });
  }

  c.set('user', user);
  c.set('token', token);
  await next();
}
