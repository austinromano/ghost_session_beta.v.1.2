import { Hono } from 'hono';
import { db } from '../db/index.js';
import { socialPosts, socialPostLikes, socialPostComments, socialPostReactions, follows, users, projects, tracks } from '../db/schema.js';
import { eq, desc, and, ne } from 'drizzle-orm';
import { authMiddleware, type AuthUser } from '../middleware/auth.js';
import { isR2Configured, uploadToR2, downloadFromR2 } from '../services/storage.js';

const socialRoutes = new Hono();
socialRoutes.use('*', authMiddleware);

async function enrichPosts(rawPosts: any[], uid: string) {
  const enriched = [];
  for (const p of rawPosts) {
    const likes = await db.select().from(socialPostLikes).where(eq(socialPostLikes.postId, p.id)).all();
    const comments = await db.select().from(socialPostComments).where(eq(socialPostComments.postId, p.id)).all();
    const reactions = await db.select().from(socialPostReactions).where(eq(socialPostReactions.postId, p.id)).all();
    const rc: Record<string, number> = {};
    const ur: string[] = [];
    for (const r of reactions) { rc[r.emoji] = (rc[r.emoji] || 0) + 1; if (r.userId === uid) ur.push(r.emoji); }
    let projectName = null;
    if (p.projectId) {
      const [proj] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, p.projectId)).limit(1).all();
      projectName = proj?.name || null;
    }
    enriched.push({ ...p, likeCount: likes.length, commentCount: comments.length, liked: likes.some((l) => l.userId === uid), reactionCounts: rc, userReactions: ur, projectName });
  }
  return enriched;
}

socialRoutes.get('/feed', async (c) => {
  const user = c.get('user') as AuthUser;
  const results = await db.select({ id: socialPosts.id, text: socialPosts.text, audioFileId: socialPosts.audioFileId, projectId: socialPosts.projectId, userId: socialPosts.userId, displayName: users.displayName, avatarUrl: users.avatarUrl, createdAt: socialPosts.createdAt })
    .from(socialPosts).innerJoin(users, eq(socialPosts.userId, users.id)).orderBy(desc(socialPosts.createdAt)).limit(50).all();
  return c.json({ success: true, data: await enrichPosts(results, user.id) });
});

socialRoutes.post('/posts', async (c) => {
  const user = c.get('user') as AuthUser;
  const { text, projectId, audioFileId } = await c.req.json();
  if (!text?.trim()) return c.json({ success: false, error: 'Text required' }, 400);
  const id = crypto.randomUUID();
  const createdAt = new Date().toISOString();
  await db.insert(socialPosts).values({ id, userId: user.id, text: text.trim(), projectId: projectId || null, audioFileId: audioFileId || null, createdAt }).run();
  let projectName = null;
  if (projectId) { const [proj] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, projectId)).limit(1).all(); projectName = proj?.name || null; }
  return c.json({ success: true, data: { id, text: text.trim(), projectId, audioFileId: audioFileId || null, userId: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl, createdAt, likeCount: 0, commentCount: 0, liked: false, reactionCounts: {}, userReactions: [], projectName } });
});

socialRoutes.post('/posts/:postId/like', async (c) => {
  const user = c.get('user') as AuthUser;
  const postId = c.req.param('postId');
  const existing = await db.select().from(socialPostLikes).where(and(eq(socialPostLikes.postId, postId), eq(socialPostLikes.userId, user.id))).limit(1).all();
  if (existing.length > 0) { await db.delete(socialPostLikes).where(eq(socialPostLikes.id, existing[0].id)).run(); return c.json({ success: true, data: { liked: false } }); }
  await db.insert(socialPostLikes).values({ id: crypto.randomUUID(), postId, userId: user.id, createdAt: new Date().toISOString() }).run();
  return c.json({ success: true, data: { liked: true } });
});

socialRoutes.get('/posts/:postId/comments', async (c) => {
  const postId = c.req.param('postId');
  const results = await db.select({ id: socialPostComments.id, text: socialPostComments.text, userId: socialPostComments.userId, displayName: users.displayName, avatarUrl: users.avatarUrl, createdAt: socialPostComments.createdAt })
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
  await db.insert(socialPostComments).values({ id, postId, userId: user.id, text: text.trim(), createdAt }).run();
  return c.json({ success: true, data: { id, text: text.trim(), userId: user.id, displayName: user.displayName, avatarUrl: user.avatarUrl, createdAt } });
});

socialRoutes.post('/posts/:postId/reactions', async (c) => {
  const user = c.get('user') as AuthUser;
  const postId = c.req.param('postId');
  const { emoji } = await c.req.json();
  if (!['🔥', '🎧', '🎤', '💯', '❤️'].includes(emoji)) return c.json({ success: false, error: 'Invalid emoji' }, 400);
  const existing = await db.select().from(socialPostReactions).where(and(eq(socialPostReactions.postId, postId), eq(socialPostReactions.userId, user.id), eq(socialPostReactions.emoji, emoji))).limit(1).all();
  if (existing.length > 0) { await db.delete(socialPostReactions).where(eq(socialPostReactions.id, existing[0].id)).run(); return c.json({ success: true, data: { reacted: false, emoji } }); }
  await db.insert(socialPostReactions).values({ id: crypto.randomUUID(), postId, userId: user.id, emoji, createdAt: new Date().toISOString() }).run();
  return c.json({ success: true, data: { reacted: true, emoji } });
});

socialRoutes.post('/follow/:userId', async (c) => {
  const user = c.get('user') as AuthUser;
  const targetId = c.req.param('userId');
  if (targetId === user.id) return c.json({ success: false, error: 'Cannot follow yourself' }, 400);
  const existing = await db.select().from(follows).where(and(eq(follows.followerId, user.id), eq(follows.followingId, targetId))).limit(1).all();
  if (existing.length > 0) { await db.delete(follows).where(and(eq(follows.followerId, user.id), eq(follows.followingId, targetId))).run(); return c.json({ success: true, data: { following: false } }); }
  await db.insert(follows).values({ followerId: user.id, followingId: targetId, createdAt: new Date().toISOString() }).run();
  return c.json({ success: true, data: { following: true } });
});

// Upload audio for social post
socialRoutes.post('/upload', async (c) => {
  const user = c.get('user') as AuthUser;
  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  if (!file) return c.json({ success: false, error: 'No file' }, 400);

  const fileId = crypto.randomUUID();
  const buf = Buffer.from(await file.arrayBuffer());

  if (isR2Configured()) {
    const key = `social/${fileId}_${file.name}`;
    await uploadToR2(key, buf, file.type || 'audio/wav');
    return c.json({ success: true, data: { fileId, fileName: file.name, filePath: key } });
  } else {
    const { mkdir } = await import('node:fs/promises');
    const { resolve, join } = await import('node:path');
    const SOCIAL_UPLOADS = resolve(import.meta.dirname, '../../uploads/social');
    await mkdir(SOCIAL_UPLOADS, { recursive: true });
    const filePath = join(SOCIAL_UPLOADS, `${fileId}_${file.name}`);
    const fsp = await import('node:fs/promises');
    await fsp.writeFile(filePath, buf);
    return c.json({ success: true, data: { fileId, fileName: file.name, filePath } });
  }
});

// Stream social audio
socialRoutes.get('/audio/:fileId', async (c) => {
  const fileId = c.req.param('fileId');

  if (isR2Configured()) {
    // Try to find the file in R2 by listing with prefix
    // Since we store as social/{fileId}_{name}, we search by prefix
    try {
      // We need to find the full key. Try a common pattern:
      const { S3Client, ListObjectsV2Command } = await import('@aws-sdk/client-s3');
      const s3 = new S3Client({
        region: process.env.S3_REGION || 'auto',
        endpoint: process.env.S3_ENDPOINT,
        credentials: { accessKeyId: process.env.S3_ACCESS_KEY || '', secretAccessKey: process.env.S3_SECRET_KEY || '' },
      });
      const list = await s3.send(new ListObjectsV2Command({ Bucket: process.env.S3_BUCKET || 'ghost-session-files', Prefix: `social/${fileId}`, MaxKeys: 1 }));
      const key = list.Contents?.[0]?.Key;
      if (!key) return c.json({ success: false, error: 'Not found' }, 404);

      const { stream, contentLength } = await downloadFromR2(key);
      return new Response(stream, {
        headers: {
          'Content-Type': 'audio/wav',
          'Content-Disposition': `inline; filename="${key.split('/').pop()}"`,
          'Content-Length': contentLength.toString(),
        },
      });
    } catch {
      return c.json({ success: false, error: 'Not found' }, 404);
    }
  }

  // Local fallback
  const { resolve, join } = await import('node:path');
  const SOCIAL_UPLOADS = resolve(import.meta.dirname, '../../uploads/social');
  const fsp = await import('node:fs/promises');
  const fs = await import('node:fs');
  const allFiles = await fsp.readdir(SOCIAL_UPLOADS).catch(() => []);
  const match = (allFiles as string[]).find((f: string) => f.startsWith(fileId));
  if (!match) return c.json({ success: false, error: 'Not found' }, 404);

  const filePath = join(SOCIAL_UPLOADS, match);
  const fileStat = await fsp.stat(filePath);
  const stream = fs.createReadStream(filePath);
  const { Readable } = await import('node:stream');

  c.header('Content-Type', 'audio/wav');
  c.header('Content-Disposition', `inline; filename="${match}"`);
  c.header('Content-Length', fileStat.size.toString());
  return new Response(Readable.toWeb(stream) as ReadableStream, { headers: c.res.headers });
});

socialRoutes.get('/explore', async (c) => {
  const user = c.get('user') as AuthUser;
  const allUsers = await db.select({ id: users.id, displayName: users.displayName, avatarUrl: users.avatarUrl, createdAt: users.createdAt }).from(users).where(ne(users.id, user.id)).all();
  const myFollows = new Set((await db.select().from(follows).where(eq(follows.followerId, user.id)).all()).map(f => f.followingId));
  const data = [];
  for (const u of allUsers) {
    const followerCount = (await db.select().from(follows).where(eq(follows.followingId, u.id)).all()).length;
    const postCount = (await db.select().from(socialPosts).where(eq(socialPosts.userId, u.id)).all()).length;
    data.push({ ...u, followerCount, postCount, isFollowing: myFollows.has(u.id) });
  }
  return c.json({ success: true, data });
});

socialRoutes.get('/profile/:userId', async (c) => {
  const cur = c.get('user') as AuthUser;
  const tid = c.req.param('userId');
  const [tu] = await db.select().from(users).where(eq(users.id, tid)).limit(1).all();
  if (!tu) return c.json({ success: false, error: 'User not found' }, 404);
  const userPosts = await db.select({ id: socialPosts.id, text: socialPosts.text, projectId: socialPosts.projectId, userId: socialPosts.userId, displayName: users.displayName, avatarUrl: users.avatarUrl, createdAt: socialPosts.createdAt })
    .from(socialPosts).innerJoin(users, eq(socialPosts.userId, users.id)).where(eq(socialPosts.userId, tid)).orderBy(desc(socialPosts.createdAt)).limit(20).all();
  const followerCount = (await db.select().from(follows).where(eq(follows.followingId, tid)).all()).length;
  const followingCount = (await db.select().from(follows).where(eq(follows.followerId, tid)).all()).length;
  const isFollowing = (await db.select().from(follows).where(and(eq(follows.followerId, cur.id), eq(follows.followingId, tid))).limit(1).all()).length > 0;
  return c.json({ success: true, data: {
    id: tu.id, displayName: tu.displayName, avatarUrl: tu.avatarUrl, createdAt: tu.createdAt,
    followerCount, followingCount, postCount: userPosts.length, isFollowing,
    posts: await enrichPosts(userPosts, cur.id),
  } });
});

socialRoutes.get('/activity', async (c) => {
  const recentTracks = await db.select({ trackName: tracks.name, trackType: tracks.type, userId: tracks.ownerId, displayName: users.displayName, avatarUrl: users.avatarUrl, projectId: tracks.projectId, createdAt: tracks.createdAt })
    .from(tracks).innerJoin(users, eq(tracks.ownerId, users.id)).orderBy(desc(tracks.createdAt)).limit(20).all();
  const activities = [];
  for (const t of recentTracks) {
    const [proj] = await db.select({ name: projects.name }).from(projects).where(eq(projects.id, t.projectId)).limit(1).all();
    activities.push({ type: 'upload', message: `uploaded "${t.trackName}" to ${proj?.name || 'a project'}`, userId: t.userId, displayName: t.displayName, avatarUrl: t.avatarUrl, createdAt: t.createdAt });
  }
  return c.json({ success: true, data: activities });
});

// View a shared project (read-only)
socialRoutes.get('/project/:projectId', async (c) => {
  const pid = c.req.param('projectId');
  const [proj] = await db.select().from(projects).where(eq(projects.id, pid)).limit(1).all();
  if (!proj) return c.json({ success: false, error: 'Project not found' }, 404);
  const trackList = await db.select().from(tracks).where(eq(tracks.projectId, pid)).all();
  const [owner] = await db.select({ displayName: users.displayName, avatarUrl: users.avatarUrl }).from(users).where(eq(users.id, proj.ownerId)).limit(1).all();
  return c.json({ success: true, data: { ...proj, tracks: trackList, ownerName: owner?.displayName, ownerAvatar: owner?.avatarUrl } });
});

export default socialRoutes;
