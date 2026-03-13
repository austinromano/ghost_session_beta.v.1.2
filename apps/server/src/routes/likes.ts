import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { db } from '../db/index.js';
import { trackLikes, tracks, notifications, users } from '../db/schema.js';
import { eq, and, count } from 'drizzle-orm';
import { authMiddleware, type AuthUser } from '../middleware/auth.js';

const likeRoutes = new Hono();
likeRoutes.use('*', authMiddleware);

// Toggle like on a track
likeRoutes.post('/:trackId/like', async (c) => {
  const user = c.get('user') as AuthUser;
  const trackId = c.req.param('trackId');

  // Check track exists
  const [track] = db.select().from(tracks).where(eq(tracks.id, trackId)).limit(1).all();
  if (!track) throw new HTTPException(404, { message: 'Track not found' });

  // Check if already liked
  const [existing] = db.select().from(trackLikes)
    .where(and(eq(trackLikes.trackId, trackId), eq(trackLikes.userId, user.id)))
    .limit(1).all();

  if (existing) {
    // Unlike
    db.delete(trackLikes)
      .where(and(eq(trackLikes.trackId, trackId), eq(trackLikes.userId, user.id)))
      .run();
    const [{ total }] = db.select({ total: count() }).from(trackLikes).where(eq(trackLikes.trackId, trackId)).all();
    return c.json({ success: true, data: { liked: false, count: total } });
  } else {
    // Like
    db.insert(trackLikes).values({
      trackId,
      userId: user.id,
      createdAt: new Date().toISOString(),
    }).run();

    // Notify the track owner (if not liking your own track)
    if (track.ownerId !== user.id) {
      db.insert(notifications).values({
        id: crypto.randomUUID(),
        userId: track.ownerId,
        type: 'like',
        message: `${user.displayName} liked your track "${track.name}"`,
        read: false,
        createdAt: new Date().toISOString(),
      }).run();
    }

    const [{ total }] = db.select({ total: count() }).from(trackLikes).where(eq(trackLikes.trackId, trackId)).all();
    return c.json({ success: true, data: { liked: true, count: total } });
  }
});

// Get like status for a track
likeRoutes.get('/:trackId/like', async (c) => {
  const user = c.get('user') as AuthUser;
  const trackId = c.req.param('trackId');

  const [existing] = db.select().from(trackLikes)
    .where(and(eq(trackLikes.trackId, trackId), eq(trackLikes.userId, user.id)))
    .limit(1).all();

  const [{ total }] = db.select({ total: count() }).from(trackLikes).where(eq(trackLikes.trackId, trackId)).all();

  return c.json({ success: true, data: { liked: !!existing, count: total } });
});

export default likeRoutes;
