import { Hono } from 'hono';
import { db } from '../db/index.js';
import { socialPosts, socialPostLikes, socialPostComments, socialPostReactions, follows, users, projects, tracks } from '../db/schema.js';
import { eq, desc, and, ne } from 'drizzle-orm';
import { authMiddleware, type AuthUser } from '../middleware/auth.js';
import { mkdir } from 'node:fs/promises';
import { resolve, join } from 'node:path';

const SOCIAL_UPLOADS = resolve(import.meta.dirname, '../../uploads/social');

const socialRoutes = new Hono();
socialRoutes.use('*', authMiddleware);

function enrichPosts(rawPosts: any[], uid: string) {
  return rawPosts.map((p) => {
    const likes = db.select().from(socialPostLikes).where(eq(socialPostLikes.postId, p.id)).all();
    const comments = db.select().from(socialPostComments).where(eq(socialPostComments.postId, p.id)).all();
    const reactions = db.select().from(socialPostReactions).where(eq(socialPostReactions.postId, p.id)).all();
    const rc: Record<string, number> = {};
    const ur: string[] = [];
    for (const r of reactions) { rc[r.emoji] = (rc[r.emoji] || 0) + 1; if (r.userId === uid) ur.push(r.emoji); }
    // Get project name if shared
    let projectName = null;
    if (p.projectId) {
      const [proj] = db.select({ name: projects.name }).from(projects).where(eq(projects.id, p.projectId)).limit(1).all();
      projectName = proj?.name || null;
    }
    return { ...p, likeCount: likes.length, commentCount: comments.length, liked: likes.some((l) => l.userId === uid), reactionCounts: rc, userReactions: ur, projectName };
  });
}

socialRoutes.get('/feed', async (c) => {
  const user = c.get('user') as AuthUser;
  const results = db.select({ id: socialPosts.id, text: socialPosts.text, audioFileId: socialPosts.audioFileId, projectId: socialPosts.projectId, userId: socialPosts.userId, displayName: users.displayName, avatarUrl: users.avatarUrl, createdAt: socialPosts.createdAt })
    .from(socialPosts).innerJoin(users, eq(socialPosts.userId, users.id)).orderBy(desc(socialPosts.createdAt)).limit(50).all();
  return c.json({ success: true, data: enrichPosts(results, user.id) });
});

socialRoutes.post('/posts', async (c) => {
  const user = c.get('user') as AuthUser;
  const { text, projectId, audioFileId } = await c.req.json();
  if (!text?.trim()) return c.json({ success: false, error: 'Text required' }, 400);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  db.insert(socialPosts).values({ id, userId: user.id, text: text.trim(), projectId: projectId || null, audioFileId: audioFileId || null, createdAt }).run();
  let projectName = null;
  if (projectId) { const [proj] = db.select({ name: projects.name }).from(projects).where(eq(projects.id, projectId)).limit(1).all(); projectName = proj?.name || null; }
  return c.json({ success: true, data: { id, text: text.trim(), projectId, audioFileId: audioFileId || null, userId: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl, createdAt, likeCount: 0, commentCount: 0, liked: false, reactionCounts: {}, userReactions: [], projectName } });
});

socialRoutes.post('/posts/:postId/like', async (c) => {
  const user = c.get('user') as AuthUser;
  const postId = c.req.param('postId');
  const existing = db.select().from(socialPostLikes).where(and(eq(socialPostLikes.postId, postId), eq(socialPostLikes.userId, user.id))).limit(1).all();
  if (existing.length > 0) { db.delete(socialPostLikes).where(eq(socialPostLikes.id, existing[0].id)).run(); return c.json({ success: true, data: { liked: false } }); }
  db.insert(socialPostLikes).values({ id: crypto.randomUUID(), postId, userId: user.id, createdAt: new Date().toISOString() }).run();
  return c.json({ success: true, data: { liked: true } });
});

socialRoutes.get('/posts/:postId/comments', async (c) => {
  const postId = c.req.param('postId');
  const results = db.select({ id: socialPostComments.id, text: socialPostComments.text, userId: socialPostComments.userId, displayName: users.displayName, avatarUrl: users.avatarUrl, createdAt: socialPostComments.createdAt })
    .from(socialPostComments).innerJoin(users, eq(socialPostComments.userId, users.id)).where(eq(socialPostComments.postId, postId)).orderBy(socialPostComments.createdAt).all();
  return c.json({ success: true, data: results });
});

socialRoutes.post('/posts/:postId/comments', async (c) => {
  const user = c.get('user') as AuthUser;
  const postId = c.req.param('postId');
  const { text } = await c.req.json();
  if (!text?.trim()) return c.json({ success: false, error: 'Text required' }, 400);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  db.insert(socialPostComments).values({ id, postId, userId: user.id, text: text.trim(), createdAt }).run();
  return c.json({ success: true, data: { id, text: text.trim(), userId: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl, createdAt } });
});

socialRoutes.post('/posts/:postId/reactions', async (c) => {
  const user = c.get('user') as AuthUser;
  const postId = c.req.param('postId');
  const { emoji } = await c.req.json();
  if (!['🔥', '🎧', '🎤', '💯', '❤️'].includes(emoji)) return c.json({ success: false, error: 'Invalid emoji' }, 400);
  const existing = db.select().from(socialPostReactions).where(and(eq(socialPostReactions.postId, postId), eq(socialPostReactions.userId, user.id), eq(socialPostReactions.emoji, emoji))).limit(1).all();
  if (existing.length > 0) { db.delete(socialPostReactions).where(eq(socialPostReactions.id, existing[0].id)).run(); return c.json({ success: true, data: { reacted: false, emoji } }); }
  db.insert(socialPostReactions).values({ id: crypto.randomUUID(), postId, userId: user.id, emoji, createdAt: new Date().toISOString() }).run();
  return c.json({ success: true, data: { reacted: true, emoji } });
});

socialRoutes.post('/follow/:userId', async (c) => {
  const user = c.get('user') as AuthUser;
  const targetId = c.req.param('userId');
  if (targetId === user.id) return c.json({ success: false, error: 'Cannot follow yourself' }, 400);
  const existing = db.select().from(follows).where(and(eq(follows.followerId, user.id), eq(follows.followingId, targetId))).limit(1).all();
  if (existing.length > 0) { db.delete(follows).where(and(eq(follows.followerId, user.id), eq(follows.followingId, targetId))).run(); return c.json({ success: true, data: { following: false } }); }
  db.insert(follows).values({ followerId: user.id, followingId: targetId, createdAt: new Date().toISOString() }).run();
  return c.json({ success: true, data: { following: true } });
});

// Upload audio for social post
socialRoutes.post('/upload', async (c) => {
  const user = c.get('user') as AuthUser;
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return c.json({ success: false, error: 'No file' }, 400);

  const fileId = crypto.randomUUID();
  await mkdir(SOCIAL_UPLOADS, { recursive: true });
  const filePath = join(SOCIAL_UPLOADS, `${fileId}_${file.name}`);
  const buf = Buffer.from(await file.arrayBuffer());
  await import('node:fs/promises').then(fsp => fsp.writeFile(filePath, buf));

  return c.json({ success: true, data: { fileId, fileName: file.name, filePath } });
});

// Stream social audio
socialRoutes.get('/audio/:fileId', async (c) => {
  const fileId = c.req.param('fileId');
  const fs = await import('node:fs');
  const fsp = await import('node:fs/promises');
  const files = await fsp.readdir(SOCIAL_UPLOADS).catch(() => []);
  const match = (files as string[]).find((f: string) => f.startsWith(fileId));
  if (!match) return c.json({ success: false, error: 'Not found' }, 404);

  const filePath = join(SOCIAL_UPLOADS, match);
  const stat = await fsp.stat(filePath);
  const stream = fs.createReadStream(filePath);
  const { Readable } = await import('node:stream');

  c.header('Content-Type', 'audio/wav');
  c.header('Content-Disposition', `inline; filename="${match}"`);
  c.header('Content-Length', stat.size.toString());
  return new Response(Readable.toWeb(stream) as ReadableStream, { headers: c.res.headers });
});

socialRoutes.get('/explore', async (c) => {
  const user = c.get('user') as AuthUser;
  const allUsers = db.select({ id: users.id, displayName: users.displayName, avatarUrl: users.avatarUrl, createdAt: users.createdAt }).from(users).where(ne(users.id, user.id)).all();
  const myFollows = new Set(db.select().from(follows).where(eq(follows.followerId, user.id)).all().map(f => f.followingId));
  return c.json({ success: true, data: allUsers.map(u => ({
    ...u,
    followerCount: db.select().from(follows).where(eq(follows.followingId, u.id)).all().length,
    postCount: db.select().from(socialPosts).where(eq(socialPosts.userId, u.id)).all().length,
    isFollowing: myFollows.has(u.id),
  })) });
});

socialRoutes.get('/profile/:userId', async (c) => {
  const cur = c.get('user') as AuthUser;
  const tid = c.req.param('userId');
  const [tu] = db.select().from(users).where(eq(users.id, tid)).limit(1).all();
  if (!tu) return c.json({ success: false, error: 'User not found' }, 404);
  const userPosts = db.select({ id: socialPosts.id, text: socialPosts.text, projectId: socialPosts.projectId, userId: socialPosts.userId, displayName: users.displayName, avatarUrl: users.avatarUrl, createdAt: socialPosts.createdAt })
    .from(socialPosts).innerJoin(users, eq(socialPosts.userId, users.id)).where(eq(socialPosts.userId, tid)).orderBy(desc(socialPosts.createdAt)).limit(20).all();
  return c.json({ success: true, data: {
    id: tu.id, displayName: tu.displayName, avatarUrl: tu.avatarUrl, createdAt: tu.createdAt,
    followerCount: db.select().from(follows).where(eq(follows.followingId, tid)).all().length,
    followingCount: db.select().from(follows).where(eq(follows.followerId, tid)).all().length,
    postCount: userPosts.length,
    isFollowing: db.select().from(follows).where(and(eq(follows.followerId, cur.id), eq(follows.followingId, tid))).limit(1).all().length > 0,
    posts: enrichPosts(userPosts, cur.id),
  } });
});

socialRoutes.get('/activity', async (c) => {
  const recentTracks = db.select({ trackName: tracks.name, trackType: tracks.type, userId: tracks.ownerId, displayName: users.displayName, avatarUrl: users.avatarUrl, projectId: tracks.projectId, createdAt: tracks.createdAt })
    .from(tracks).innerJoin(users, eq(tracks.ownerId, users.id)).orderBy(desc(tracks.createdAt)).limit(20).all();
  const activities = recentTracks.map(t => {
    const [proj] = db.select({ name: projects.name }).from(projects).where(eq(projects.id, t.projectId)).limit(1).all();
    return { type: 'upload', message: `uploaded "${t.trackName}" to ${proj?.name || 'a project'}`, userId: t.userId, displayName: t.displayName, avatarUrl: t.avatarUrl, createdAt: t.createdAt };
  });
  return c.json({ success: true, data: activities });
});

// View a shared project (read-only)
socialRoutes.get('/project/:projectId', async (c) => {
  const pid = c.req.param('projectId');
  const [proj] = db.select().from(projects).where(eq(projects.id, pid)).limit(1).all();
  if (!proj) return c.json({ success: false, error: 'Project not found' }, 404);
  const trackList = db.select().from(tracks).where(eq(tracks.projectId, pid)).all();
  const [owner] = db.select({ displayName: users.displayName, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, proj.ownerId)).limit(1).all();
  return c.json({ success: true, data: { ...proj, tracks: trackList, ownerName: owner?.displayName, ownerAvatar: owner?.avatarUrl } });
});

export default socialRoutes;
