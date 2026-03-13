import { Hono } from 'hono';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { db } from '../db/index.js';
import { tracks, projectMembers } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, type AuthUser } from '../middleware/auth.js';

const trackRoutes = new Hono();
trackRoutes.use('*', authMiddleware);

const addTrackSchema = z.object({
  name: z.string().min(1).max(100),
  type: z.enum(['audio', 'midi', 'drum', 'loop', 'fullmix']).default('audio'),
  fileId: z.string().optional(),
  fileName: z.string().optional(),
  bpm: z.number().optional(),
  key: z.string().optional(),
});

const updateTrackSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  volume: z.number().min(0).max(1).optional(),
  pan: z.number().min(-1).max(1).optional(),
  muted: z.boolean().optional(),
  soloed: z.boolean().optional(),
  fileId: z.string().optional(),
  fileName: z.string().optional(),
});

trackRoutes.get('/', async (c) => {
  const projectId = c.req.param('id');
  const result = db.select().from(tracks)
    .where(eq(tracks.projectId, projectId))
    .orderBy(tracks.position).all();
  return c.json({ success: true, data: result });
});

trackRoutes.post('/', async (c) => {
  const user = c.get('user') as AuthUser;
  const projectId = c.req.param('id');
  const body = addTrackSchema.parse(await c.req.json());

  const membership = db.select().from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)))
    .limit(1).all();
  if (membership.length === 0 || membership[0].role === 'viewer') {
    throw new HTTPException(403, { message: 'No edit permission' });
  }

  const existing = db.select().from(tracks).where(eq(tracks.projectId, projectId)).all();
  const id = crypto.randomUUID();

  db.insert(tracks).values({
    id, ...body, projectId, ownerId: user.id,
    position: existing.length, createdAt: new Date().toISOString(),
  }).run();

  const [track] = db.select().from(tracks).where(eq(tracks.id, id)).all();
  return c.json({ success: true, data: track }, 201);
});

trackRoutes.patch('/:trackId', async (c) => {
  const user = c.get('user') as AuthUser;
  const projectId = c.req.param('id');
  const trackId = c.req.param('trackId');
  const body = updateTrackSchema.parse(await c.req.json());

  const membership = db.select().from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)))
    .limit(1).all();
  if (membership.length === 0 || membership[0].role === 'viewer') {
    throw new HTTPException(403, { message: 'No edit permission' });
  }

  db.update(tracks).set(body)
    .where(and(eq(tracks.id, trackId), eq(tracks.projectId, projectId))).run();

  const [updated] = db.select().from(tracks)
    .where(and(eq(tracks.id, trackId), eq(tracks.projectId, projectId))).all();
  if (!updated) throw new HTTPException(404, { message: 'Track not found' });

  return c.json({ success: true, data: updated });
});

trackRoutes.delete('/:trackId', async (c) => {
  const user = c.get('user') as AuthUser;
  const projectId = c.req.param('id');
  const trackId = c.req.param('trackId');

  const [track] = db.select().from(tracks)
    .where(and(eq(tracks.id, trackId), eq(tracks.projectId, projectId))).limit(1).all();
  if (!track) throw new HTTPException(404, { message: 'Track not found' });

  if (track.ownerId !== user.id) {
    const membership = db.select().from(projectMembers)
      .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)))
      .limit(1).all();
    if (membership.length === 0 || membership[0].role === 'viewer') {
      throw new HTTPException(403, { message: 'No permission' });
    }
  }

  db.delete(tracks).where(eq(tracks.id, trackId)).run();
  return c.json({ success: true });
});

export default trackRoutes;
