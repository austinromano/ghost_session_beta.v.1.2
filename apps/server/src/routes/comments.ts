import { Hono } from 'hono';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { db } from '../db/index.js';
import { comments, users, projectMembers } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { authMiddleware, type AuthUser } from '../middleware/auth.js';

const commentRoutes = new Hono();
commentRoutes.use('*', authMiddleware);

const addCommentSchema = z.object({
  text: z.string().min(1).max(2000),
  positionBeats: z.number().optional(),
  parentId: z.string().optional(),
});

const updateCommentSchema = z.object({ text: z.string().min(1).max(2000) });

commentRoutes.get('/', async (c) => {
  const projectId = c.req.param('id');
  const result = db.select({
    id: comments.id, projectId: comments.projectId, authorId: comments.authorId,
    authorName: users.displayName, authorAvatarUrl: users.avatarUrl,
    text: comments.text, positionBeats: comments.positionBeats,
    parentId: comments.parentId, createdAt: comments.createdAt, updatedAt: comments.updatedAt,
  }).from(comments)
    .innerJoin(users, eq(comments.authorId, users.id))
    .where(eq(comments.projectId, projectId))
    .orderBy(desc(comments.createdAt)).all();
  return c.json({ success: true, data: result });
});

commentRoutes.post('/', async (c) => {
  const user = c.get('user') as AuthUser;
  const projectId = c.req.param('id');
  const body = addCommentSchema.parse(await c.req.json());

  const membership = db.select().from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)))
    .limit(1).all();
  if (membership.length === 0) throw new HTTPException(403, { message: 'Not a member' });

  const id = crypto.randomUUID();
  const now = new Date().toISOString();
  db.insert(comments).values({
    id, projectId, authorId: user.id, text: body.text,
    positionBeats: body.positionBeats, parentId: body.parentId,
    createdAt: now, updatedAt: now,
  }).run();

  return c.json({
    success: true,
    data: { id, projectId, authorId: user.id, authorName: user.displayName, authorAvatarUrl: user.avatarUrl, text: body.text, positionBeats: body.positionBeats ?? null, parentId: body.parentId ?? null, createdAt: now, updatedAt: now },
  }, 201);
});

commentRoutes.patch('/:commentId', async (c) => {
  const user = c.get('user') as AuthUser;
  const commentId = c.req.param('commentId');
  const body = updateCommentSchema.parse(await c.req.json());

  const [existing] = db.select().from(comments).where(eq(comments.id, commentId)).limit(1).all();
  if (!existing || existing.authorId !== user.id) throw new HTTPException(403, { message: 'Cannot edit' });

  db.update(comments).set({ text: body.text, updatedAt: new Date().toISOString() })
    .where(eq(comments.id, commentId)).run();

  const [updated] = db.select().from(comments).where(eq(comments.id, commentId)).all();
  return c.json({ success: true, data: updated });
});

commentRoutes.delete('/:commentId', async (c) => {
  const user = c.get('user') as AuthUser;
  const commentId = c.req.param('commentId');

  const [existing] = db.select().from(comments).where(eq(comments.id, commentId)).limit(1).all();
  if (!existing || existing.authorId !== user.id) throw new HTTPException(403, { message: 'Cannot delete' });

  db.delete(comments).where(eq(comments.id, commentId)).run();
  return c.json({ success: true });
});

export default commentRoutes;
