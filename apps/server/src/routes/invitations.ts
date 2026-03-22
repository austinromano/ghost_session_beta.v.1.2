import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { db } from '../db/index.js';
import { invitations, projects, projectMembers, users } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, type AuthUser } from '../middleware/auth.js';

const invitationRoutes = new Hono();
invitationRoutes.use('*', authMiddleware);

// GET /invitations — get my pending invitations
invitationRoutes.get('/', async (c) => {
  const user = c.get('user') as AuthUser;

  const pending = await db.select({
    id: invitations.id,
    projectId: invitations.projectId,
    projectName: projects.name,
    inviterName: users.displayName,
    role: invitations.role,
    status: invitations.status,
    createdAt: invitations.createdAt,
  })
    .from(invitations)
    .innerJoin(projects, eq(invitations.projectId, projects.id))
    .innerJoin(users, eq(invitations.inviterId, users.id))
    .where(and(eq(invitations.inviteeId, user.id), eq(invitations.status, 'pending')))
    .all();

  return c.json({ success: true, data: pending });
});

// POST /invitations/:id/accept
invitationRoutes.post('/:id/accept', async (c) => {
  const user = c.get('user') as AuthUser;
  const invitationId = c.req.param('id');

  const [inv] = await db.select().from(invitations)
    .where(and(eq(invitations.id, invitationId), eq(invitations.inviteeId, user.id)))
    .limit(1).all();

  if (!inv) throw new HTTPException(404, { message: 'Invitation not found' });
  if (inv.status !== 'pending') throw new HTTPException(400, { message: 'Invitation already ' + inv.status });

  await db.update(invitations).set({ status: 'accepted' })
    .where(eq(invitations.id, invitationId)).run();

  try {
    await db.insert(projectMembers).values({
      projectId: inv.projectId,
      userId: user.id,
      role: inv.role,
      joinedAt: new Date().toISOString(),
    }).run();
  } catch {} // already a member

  return c.json({ success: true });
});

// POST /invitations/:id/decline
invitationRoutes.post('/:id/decline', async (c) => {
  const user = c.get('user') as AuthUser;
  const invitationId = c.req.param('id');

  const [inv] = await db.select().from(invitations)
    .where(and(eq(invitations.id, invitationId), eq(invitations.inviteeId, user.id)))
    .limit(1).all();

  if (!inv) throw new HTTPException(404, { message: 'Invitation not found' });

  await db.update(invitations).set({ status: 'declined' })
    .where(eq(invitations.id, invitationId)).run();

  return c.json({ success: true });
});

export default invitationRoutes;
