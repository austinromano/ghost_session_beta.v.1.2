import { Hono } from 'hono';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { db } from '../db/index.js';
import { projects, projectMembers, tracks, users } from '../db/schema.js';
import { eq, or, and, desc, like } from 'drizzle-orm';
import { authMiddleware, type AuthUser } from '../middleware/auth.js';

const projectRoutes = new Hono();
projectRoutes.use('*', authMiddleware);

const createProjectSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(''),
  tempo: z.number().min(30).max(300).optional().default(140),
  key: z.string().max(10).optional().default('C'),
  timeSignature: z.string().max(10).optional().default('4/4'),
});

const updateProjectSchema = z.object({
  name: z.string().min(1).max(100).optional(),
  description: z.string().max(500).optional(),
  tempo: z.number().min(30).max(300).optional(),
  key: z.string().max(10).optional(),
  timeSignature: z.string().max(10).optional(),
});

const inviteMemberSchema = z.object({
  email: z.string().optional(),
  name: z.string().optional(),
  role: z.enum(['editor', 'viewer']).optional().default('editor'),
}).refine(d => d.email || d.name, { message: 'Provide email or name' });

projectRoutes.get('/', async (c) => {
  const user = c.get('user') as AuthUser;

  const memberOf = db.select({ projectId: projectMembers.projectId })
    .from(projectMembers)
    .where(eq(projectMembers.userId, user.id))
    .all();

  if (memberOf.length === 0) return c.json({ success: true, data: [] });

  const result = db.select().from(projects)
    .where(or(...memberOf.map((m) => eq(projects.id, m.projectId))))
    .orderBy(desc(projects.updatedAt))
    .all();

  return c.json({ success: true, data: result });
});

projectRoutes.post('/', async (c) => {
  const user = c.get('user') as AuthUser;
  const body = createProjectSchema.parse(await c.req.json());
  const now = new Date().toISOString();
  const id = crypto.randomUUID();

  db.insert(projects).values({
    id, ...body, ownerId: user.id, createdAt: now, updatedAt: now,
  }).run();

  db.insert(projectMembers).values({
    projectId: id, userId: user.id, role: 'owner', joinedAt: now,
  }).run();

  const [project] = db.select().from(projects).where(eq(projects.id, id)).all();
  return c.json({ success: true, data: project }, 201);
});

projectRoutes.get('/:id', async (c) => {
  const user = c.get('user') as AuthUser;
  const projectId = c.req.param('id');

  const membership = db.select().from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)))
    .limit(1).all();

  if (membership.length === 0) throw new HTTPException(403, { message: 'Not a member' });

  const [project] = db.select().from(projects).where(eq(projects.id, projectId)).limit(1).all();
  if (!project) throw new HTTPException(404, { message: 'Project not found' });

  const members = db.select({
    userId: projectMembers.userId,
    displayName: users.displayName,
    avatarUrl: users.avatarUrl,
    role: projectMembers.role,
    joinedAt: projectMembers.joinedAt,
  }).from(projectMembers)
    .innerJoin(users, eq(projectMembers.userId, users.id))
    .where(eq(projectMembers.projectId, projectId))
    .all();

  const projectTracks = db.select().from(tracks)
    .where(eq(tracks.projectId, projectId))
    .orderBy(tracks.position)
    .all();

  return c.json({ success: true, data: { ...project, members, tracks: projectTracks } });
});

projectRoutes.patch('/:id', async (c) => {
  const user = c.get('user') as AuthUser;
  const projectId = c.req.param('id');
  const body = updateProjectSchema.parse(await c.req.json());

  const membership = db.select().from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)))
    .limit(1).all();

  if (membership.length === 0 || membership[0].role === 'viewer') {
    throw new HTTPException(403, { message: 'No edit permission' });
  }

  db.update(projects).set({ ...body, updatedAt: new Date().toISOString() })
    .where(eq(projects.id, projectId)).run();

  const [updated] = db.select().from(projects).where(eq(projects.id, projectId)).all();
  return c.json({ success: true, data: updated });
});

projectRoutes.delete('/:id', async (c) => {
  const user = c.get('user') as AuthUser;
  const projectId = c.req.param('id');

  const [project] = db.select().from(projects).where(eq(projects.id, projectId)).limit(1).all();
  if (!project || project.ownerId !== user.id) {
    throw new HTTPException(403, { message: 'Only the owner can delete' });
  }

  db.delete(projects).where(eq(projects.id, projectId)).run();
  return c.json({ success: true });
});

projectRoutes.post('/:id/members', async (c) => {
  const user = c.get('user') as AuthUser;
  const projectId = c.req.param('id');
  const body = inviteMemberSchema.parse(await c.req.json());

  const membership = db.select().from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)))
    .limit(1).all();

  if (membership.length === 0 || membership[0].role === 'viewer') {
    throw new HTTPException(403, { message: 'No permission to invite' });
  }

  let invitee;
  if (body.email) {
    [invitee] = db.select().from(users).where(eq(users.email, body.email)).limit(1).all();
  } else if (body.name) {
    [invitee] = db.select().from(users).where(like(users.displayName, body.name)).limit(1).all();
  }
  if (!invitee) throw new HTTPException(404, { message: 'User not found' });

  // Insert or ignore if already a member
  try {
    db.insert(projectMembers).values({
      projectId, userId: invitee.id, role: body.role, joinedAt: new Date().toISOString(),
    }).run();
  } catch {}

  return c.json({ success: true });
});

export default projectRoutes;
