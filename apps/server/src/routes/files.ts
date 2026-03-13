import { Hono } from 'hono';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { db } from '../db/index.js';
import { files, projectMembers } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, type AuthUser } from '../middleware/auth.js';
import { getUploadUrl, getDownloadUrl } from '../services/storage.js';
import { createReadStream, createWriteStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Readable } from 'node:stream';
import { pipeline } from 'node:stream/promises';

const UPLOADS_DIR = resolve(import.meta.dirname, '../../uploads');

const fileRoutes = new Hono();
fileRoutes.use('*', authMiddleware);

const uploadUrlSchema = z.object({
  fileName: z.string().min(1),
  fileSize: z.number().positive(),
  mimeType: z.string().min(1),
});

fileRoutes.post('/upload-url', async (c) => {
  const user = c.get('user') as AuthUser;
  const projectId = c.req.param('id');
  const body = uploadUrlSchema.parse(await c.req.json());

  const membership = db.select().from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)))
    .limit(1).all();
  if (membership.length === 0 || membership[0].role === 'viewer') {
    throw new HTTPException(403, { message: 'No upload permission' });
  }

  const fileId = crypto.randomUUID();
  const s3Key = `projects/${projectId}/${fileId}/${body.fileName}`;

  db.insert(files).values({
    id: fileId, projectId, uploadedBy: user.id,
    fileName: body.fileName, fileSize: body.fileSize, mimeType: body.mimeType,
    s3Key, createdAt: new Date().toISOString(),
  }).run();

  try {
    const url = await getUploadUrl(s3Key, body.mimeType);
    return c.json({ success: true, data: { fileId, uploadUrl: url } });
  } catch {
    // S3 not configured — return fileId anyway for MVP
    return c.json({ success: true, data: { fileId, uploadUrl: null } });
  }
});

// Direct file upload (local storage fallback when S3 is not configured)
fileRoutes.post('/upload', async (c) => {
  const user = c.get('user') as AuthUser;
  const projectId = c.req.param('id');

  const membership = db.select().from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)))
    .limit(1).all();
  if (membership.length === 0 || membership[0].role === 'viewer') {
    throw new HTTPException(403, { message: 'No upload permission' });
  }

  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  if (!file) throw new HTTPException(400, { message: 'No file provided' });

  const fileId = crypto.randomUUID();
  const projectDir = join(UPLOADS_DIR, projectId);
  await mkdir(projectDir, { recursive: true });

  const filePath = join(projectDir, `${fileId}_${file.name}`);
  const arrayBuffer = await file.arrayBuffer();
  const buffer = Buffer.from(arrayBuffer);
  const ws = createWriteStream(filePath);
  await new Promise<void>((resolve, reject) => {
    ws.write(buffer, (err) => { if (err) reject(err); else { ws.end(); resolve(); } });
  });

  db.insert(files).values({
    id: fileId, projectId, uploadedBy: user.id,
    fileName: file.name, fileSize: file.size, mimeType: file.type || 'audio/wav',
    s3Key: filePath, createdAt: new Date().toISOString(),
  }).run();

  return c.json({ success: true, data: { fileId, fileName: file.name } });
});

// Direct file download (local storage)
fileRoutes.get('/:fileId/download', async (c) => {
  const fileId = c.req.param('fileId');
  const [file] = db.select().from(files).where(eq(files.id, fileId)).limit(1).all();
  if (!file) throw new HTTPException(404, { message: 'File not found' });

  const filePath = file.s3Key;

  try {
    const fileStat = await stat(filePath);
    const stream = createReadStream(filePath);

    c.header('Content-Type', file.mimeType || 'application/octet-stream');
    c.header('Content-Disposition', `attachment; filename="${file.fileName}"`);
    c.header('Content-Length', fileStat.size.toString());

    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: c.res.headers,
    });
  } catch {
    throw new HTTPException(404, { message: 'File not found on disk' });
  }
});

fileRoutes.get('/:fileId/download-url', async (c) => {
  const fileId = c.req.param('fileId');
  const [file] = db.select().from(files).where(eq(files.id, fileId)).limit(1).all();
  if (!file) throw new HTTPException(404, { message: 'File not found' });

  try {
    const url = await getDownloadUrl(file.s3Key);
    return c.json({ success: true, data: { downloadUrl: url } });
  } catch {
    return c.json({ success: true, data: { downloadUrl: null } });
  }
});

fileRoutes.get('/', async (c) => {
  const projectId = c.req.param('id');
  const result = db.select().from(files).where(eq(files.projectId, projectId)).all();
  return c.json({ success: true, data: result });
});

export default fileRoutes;
