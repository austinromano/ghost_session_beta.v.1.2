import { Hono } from 'hono';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { db } from '../db/index.js';
import { versions, projectMembers, users, files, tracks } from '../db/schema.js';
import { eq, and, desc } from 'drizzle-orm';
import { authMiddleware, type AuthUser } from '../middleware/auth.js';

const versionRoutes = new Hono();
versionRoutes.use('*', authMiddleware);

const createVersionSchema = z.object({
  name: z.string().min(1).max(100),
  description: z.string().max(500).optional().default(''),
});

versionRoutes.get('/', async (c) => {
  const projectId = c.req.param('id');
  const result = db.select({
    id: versions.id,
    projectId: versions.projectId,
    versionNumber: versions.versionNumber,
    name: versions.name,
    description: versions.description,
    createdBy: versions.createdBy,
    createdByName: users.displayName,
    fileManifestJson: versions.fileManifestJson,
    createdAt: versions.createdAt,
  }).from(versions)
    .innerJoin(users, eq(versions.createdBy, users.id))
    .where(eq(versions.projectId, projectId))
    .orderBy(desc(versions.versionNumber))
    .all();
  return c.json({ success: true, data: result });
});

versionRoutes.post('/', async (c) => {
  const user = c.get('user') as AuthUser;
  const projectId = c.req.param('id');
  const body = createVersionSchema.parse(await c.req.json());

  const membership = db.select().from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)))
    .limit(1).all();
  if (membership.length === 0 || membership[0].role === 'viewer') {
    throw new HTTPException(403, { message: 'No edit permission' });
  }

  const existing = db.select().from(versions)
    .where(eq(versions.projectId, projectId))
    .orderBy(desc(versions.versionNumber))
    .limit(1).all();
  const nextVersion = existing.length > 0 ? existing[0].versionNumber + 1 : 1;

  const projectFiles = db.select().from(files).where(eq(files.projectId, projectId)).all();
  const projectTracks = db.select().from(tracks).where(eq(tracks.projectId, projectId)).all();

  const manifest = projectFiles.map((f) => {
    const track = projectTracks.find((t) => t.fileId === f.id);
    return { fileId: f.id, fileName: f.fileName, trackId: track?.id || null, trackName: track?.name || null, fileSize: f.fileSize };
  });

  const id = crypto.randomUUID();
  db.insert(versions).values({
    id, projectId, versionNumber: nextVersion, name: body.name,
    description: body.description, createdBy: user.id,
    fileManifestJson: manifest, createdAt: new Date().toISOString(),
  }).run();

  const [version] = db.select().from(versions).where(eq(versions.id, id)).all();
  return c.json({ success: true, data: version }, 201);
});

versionRoutes.get('/:versionId', async (c) => {
  const versionId = c.req.param('versionId');
  const result = db.select({
    id: versions.id, projectId: versions.projectId,
    versionNumber: versions.versionNumber, name: versions.name,
    description: versions.description, createdBy: versions.createdBy,
    createdByName: users.displayName, fileManifestJson: versions.fileManifestJson,
    createdAt: versions.createdAt,
  }).from(versions)
    .innerJoin(users, eq(versions.createdBy, users.id))
    .where(eq(versions.id, versionId)).limit(1).all();

  if (result.length === 0) throw new HTTPException(404, { message: 'Version not found' });
  return c.json({ success: true, data: result[0] });
});

export default versionRoutes;
