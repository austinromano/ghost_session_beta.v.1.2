import { Hono } from 'hono';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { db } from '../db/index.js';
import { users, authSessions, projects, projectMembers, tracks, versions, comments, invitations, files, chatMessages, notifications, trackLikes, samplePacks, samplePackItems } from '../db/schema.js';
import { eq, inArray } from 'drizzle-orm';
import { hashPassword, verifyPassword, createSession, invalidateSession } from '../services/auth.js';
import { authMiddleware } from '../middleware/auth.js';
import { isR2Configured, uploadToR2, downloadFromR2 } from '../services/storage.js';

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

  const existing = await db.select().from(users).where(eq(users.email, body.email)).limit(1).all();
  if (existing.length > 0) {
    throw new HTTPException(409, { message: 'Email already registered' });
  }

  const id = crypto.randomUUID();
  await db.insert(users).values({
    id,
    email: body.email,
    displayName: body.displayName,
    hashedPassword: hashPassword(body.password),
    createdAt: new Date().toISOString(),
  }).run();

  const token = await createSession(id);

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

  const results = await db.select().from(users).where(eq(users.email, body.email)).limit(1).all();
  const user = results[0];
  if (!user || !verifyPassword(body.password, user.hashedPassword)) {
    throw new HTTPException(401, { message: 'Invalid email or password' });
  }

  const token = await createSession(user.id);

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
  await invalidateSession(token);
  return c.json({ success: true });
});

auth.get('/me', authMiddleware, async (c) => {
  const user = c.get('user');
  return c.json({ success: true, data: user });
});

auth.post('/avatar', authMiddleware, async (c) => {
  const user = c.get('user') as { id: string };
  const body = await c.req.parseBody();
  const file = body['file'];

  if (!(file instanceof File)) {
    throw new HTTPException(400, { message: 'No file provided' });
  }

  const ext = file.name.split('.').pop() || 'jpg';
  const fileName = `${user.id}.${ext}`;
  const buffer = Buffer.from(await file.arrayBuffer());

  if (isR2Configured()) {
    const key = `avatars/${fileName}`;
    await uploadToR2(key, buffer, file.type || 'image/jpeg');
    const avatarUrl = `/api/v1/auth/avatars/${fileName}`;
    await db.update(users).set({ avatarUrl }).where(eq(users.id, user.id)).run();
    return c.json({ success: true, data: { avatarUrl } });
  } else {
    const { mkdir, writeFile } = await import('node:fs/promises');
    const { resolve } = await import('node:path');
    const AVATARS_DIR = resolve(import.meta.dirname, '../../uploads/avatars');
    await mkdir(AVATARS_DIR, { recursive: true });
    const filePath = resolve(AVATARS_DIR, fileName);
    await writeFile(filePath, buffer);
    const avatarUrl = `/api/v1/auth/avatars/${fileName}`;
    await db.update(users).set({ avatarUrl }).where(eq(users.id, user.id)).run();
    return c.json({ success: true, data: { avatarUrl } });
  }
});

auth.get('/avatars/:fileName', async (c) => {
  const fileName = c.req.param('fileName');
  const ext = fileName.split('.').pop() || 'jpg';
  const mimeMap: Record<string, string> = { jpg: 'image/jpeg', jpeg: 'image/jpeg', png: 'image/png', gif: 'image/gif', webp: 'image/webp' };

  if (isR2Configured()) {
    try {
      const { stream, contentType } = await downloadFromR2(`avatars/${fileName}`);
      return new Response(stream, { headers: { 'Content-Type': contentType || mimeMap[ext] || 'image/jpeg', 'Cache-Control': 'public, max-age=86400' } });
    } catch {
      throw new HTTPException(404, { message: 'Avatar not found' });
    }
  } else {
    const { resolve } = await import('node:path');
    const AVATARS_DIR = resolve(import.meta.dirname, '../../uploads/avatars');
    const filePath = resolve(AVATARS_DIR, fileName);
    try {
      const { readFile } = await import('node:fs/promises');
      const data = await readFile(filePath);
      return new Response(data, { headers: { 'Content-Type': mimeMap[ext] || 'image/jpeg', 'Cache-Control': 'public, max-age=86400' } });
    } catch {
      throw new HTTPException(404, { message: 'Avatar not found' });
    }
  }
});

auth.delete('/account', authMiddleware, async (c) => {
  const user = c.get('user') as { id: string };

  // Get all projects owned by this user
  const ownedProjects = await db.select({ id: projects.id }).from(projects).where(eq(projects.ownerId, user.id)).all();
  const ownedIds = ownedProjects.map((p) => p.id);

  if (ownedIds.length > 0) {
    // Delete all data within owned projects
    for (const pid of ownedIds) {
      await db.delete(chatMessages).where(eq(chatMessages.projectId, pid)).run();
      await db.delete(comments).where(eq(comments.projectId, pid)).run();
      await db.delete(versions).where(eq(versions.projectId, pid)).run();
      await db.delete(tracks).where(eq(tracks.projectId, pid)).run();
      await db.delete(files).where(eq(files.projectId, pid)).run();
      await db.delete(invitations).where(eq(invitations.projectId, pid)).run();
      await db.delete(projectMembers).where(eq(projectMembers.projectId, pid)).run();
      await db.delete(projects).where(eq(projects.id, pid)).run();
    }
  }

  // Delete user's memberships in other projects
  await db.delete(projectMembers).where(eq(projectMembers.userId, user.id)).run();
  await db.delete(notifications).where(eq(notifications.userId, user.id)).run();
  await db.delete(samplePacks).where(eq(samplePacks.ownerId, user.id)).run();
  await db.delete(authSessions).where(eq(authSessions.userId, user.id)).run();
  await db.delete(users).where(eq(users.id, user.id)).run();

  return c.json({ success: true });
});

export default auth;
