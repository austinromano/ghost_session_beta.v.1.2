import { Hono } from 'hono';
import { HTTPException } from 'hono/http-exception';
import { db } from '../db/index.js';
import { files, projectMembers, users } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, type AuthUser } from '../middleware/auth.js';
import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

const sessionRoutes = new Hono();
sessionRoutes.use('*', authMiddleware);

const UPLOAD_DIR = join(process.cwd(), 'uploads');

// Upload a session file (multipart)
sessionRoutes.post('/upload', async (c) => {
  const user = c.get('user') as AuthUser;
  const projectId = c.req.param('id');

  // Check membership
  const membership = db.select().from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)))
    .limit(1).all();
  if (membership.length === 0 || membership[0].role === 'viewer') {
    throw new HTTPException(403, { message: 'No upload permission' });
  }

  const formData = await c.req.parseBody();
  const file = formData['file'];
  if (!file || typeof file === 'string') {
    throw new HTTPException(400, { message: 'No file provided' });
  }

  const fileId = crypto.randomUUID();
  const fileName = (file as File).name || 'session';
  const buffer = Buffer.from(await (file as File).arrayBuffer());
  const fileSize = buffer.length;

  // Store locally
  const dir = join(UPLOAD_DIR, projectId);
  await mkdir(dir, { recursive: true });
  const localPath = join(dir, `${fileId}_${fileName}`);
  await writeFile(localPath, buffer);

  // Record in DB
  db.insert(files).values({
    id: fileId,
    projectId,
    uploadedBy: user.id,
    fileName,
    fileSize,
    mimeType: (file as File).type || 'application/octet-stream',
    s3Key: localPath,
    createdAt: new Date().toISOString(),
  }).run();

  return c.json({ success: true, data: { id: fileId, fileName, fileSize } }, 201);
});

// List session files for a project
sessionRoutes.get('/', async (c) => {
  const user = c.get('user') as AuthUser;
  const projectId = c.req.param('id');

  // Check membership
  const membership = db.select().from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)))
    .limit(1).all();
  if (membership.length === 0) {
    throw new HTTPException(403, { message: 'Not a member' });
  }

  const result = db.select({
    id: files.id,
    fileName: files.fileName,
    fileSize: files.fileSize,
    uploadedBy: files.uploadedBy,
    uploaderName: users.displayName,
    createdAt: files.createdAt,
  }).from(files)
    .innerJoin(users, eq(files.uploadedBy, users.id))
    .where(eq(files.projectId, projectId))
    .all();

  return c.json({ success: true, data: result });
});

export default sessionRoutes;
