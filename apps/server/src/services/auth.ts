import { randomBytes, scryptSync, timingSafeEqual } from 'node:crypto';
import { db } from '../db/index.js';
import { users, authSessions } from '../db/schema.js';
import { eq } from 'drizzle-orm';

export function hashPassword(password: string): string {
  const salt = randomBytes(16).toString('hex');
  const hash = scryptSync(password, salt, 64).toString('hex');
  return `${salt}:${hash}`;
}

export function verifyPassword(password: string, stored: string): boolean {
  const [salt, hash] = stored.split(':');
  const hashBuffer = Buffer.from(hash, 'hex');
  const testHash = scryptSync(password, salt, 64);
  return timingSafeEqual(hashBuffer, testHash);
}

export function generateSessionToken(): string {
  return randomBytes(32).toString('hex');
}

export function createSession(userId: string): string {
  const token = generateSessionToken();
  const expiresAt = new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();
  db.insert(authSessions).values({ id: token, userId, expiresAt }).run();
  return token;
}

export function validateSession(token: string) {
  const results = db
    .select()
    .from(authSessions)
    .where(eq(authSessions.id, token))
    .limit(1)
    .all();

  const session = results[0];
  if (!session || new Date(session.expiresAt) < new Date()) {
    if (session) {
      db.delete(authSessions).where(eq(authSessions.id, token)).run();
    }
    return null;
  }

  const userResults = db
    .select({
      id: users.id,
      email: users.email,
      displayName: users.displayName,
      avatarUrl: users.avatarUrl,
      createdAt: users.createdAt,
    })
    .from(users)
    .where(eq(users.id, session.userId))
    .limit(1)
    .all();

  return userResults[0] || null;
}

export function invalidateSession(token: string) {
  db.delete(authSessions).where(eq(authSessions.id, token)).run();
}
