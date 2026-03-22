import { Hono } from 'hono';
import { z } from 'zod';
import { HTTPException } from 'hono/http-exception';
import { db } from '../db/index.js';
import { files, projectMembers } from '../db/schema.js';
import { eq, and } from 'drizzle-orm';
import { authMiddleware, type AuthUser } from '../middleware/auth.js';
import { getUploadUrl, getDownloadUrl, isR2Configured, uploadToR2, downloadFromR2 } from '../services/storage.js';
import { createReadStream } from 'node:fs';
import { mkdir, stat } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { Readable } from 'node:stream';

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

  const membership = await db.select().from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)))
    .limit(1).all();
  if (membership.length === 0 || membership[0].role === 'viewer') {
    throw new HTTPException(403, { message: 'No upload permission' });
  }

  const fileId = crypto.randomUUID();
  const s3Key = `projects/${projectId}/${fileId}/${body.fileName}`;

  await db.insert(files).values({
    id: fileId, projectId, uploadedBy: user.id,
    fileName: body.fileName, fileSize: body.fileSize, mimeType: body.mimeType,
    s3Key, createdAt: new Date().toISOString(),
  }).run();

  try {
    const url = await getUploadUrl(s3Key, body.mimeType);
    return c.json({ success: true, data: { fileId, uploadUrl: url } });
  } catch {
    return c.json({ success: true, data: { fileId, uploadUrl: null } });
  }
});

// Direct file upload (uploads to R2 if configured, otherwise local disk)
fileRoutes.post('/upload', async (c) => {
  const user = c.get('user') as AuthUser;
  const projectId = c.req.param('id');

  const membership = await db.select().from(projectMembers)
    .where(and(eq(projectMembers.projectId, projectId), eq(projectMembers.userId, user.id)))
    .limit(1).all();
  if (membership.length === 0 || membership[0].role === 'viewer') {
    throw new HTTPException(403, { message: 'No upload permission' });
  }

  const formData = await c.req.formData();
  const file = formData.get('file') as File | null;
  if (!file) throw new HTTPException(400, { message: 'No file provided' });

  const fileId = crypto.randomUUID();
  const buffer = Buffer.from(await file.arrayBuffer());
  const mimeType = file.type || 'audio/wav';

  let s3Key: string;

  if (isR2Configured()) {
    s3Key = `projects/${projectId}/${fileId}/${file.name}`;
    await uploadToR2(s3Key, buffer, mimeType);
  } else {
    const projectDir = join(UPLOADS_DIR, projectId);
    await mkdir(projectDir, { recursive: true });
    s3Key = join(projectDir, `${fileId}_${file.name}`);
    const fsp = await import('node:fs/promises');
    await fsp.writeFile(s3Key, buffer);
  }

  await db.insert(files).values({
    id: fileId, projectId, uploadedBy: user.id,
    fileName: file.name, fileSize: file.size, mimeType,
    s3Key, createdAt: new Date().toISOString(),
  }).run();

  return c.json({ success: true, data: { fileId, fileName: file.name } });
});

// Direct file download (streams from R2 if key looks like an S3 path, otherwise local disk)
fileRoutes.get('/:fileId/download', async (c) => {
  const fileId = c.req.param('fileId');
  const [file] = await db.select().from(files).where(eq(files.id, fileId)).limit(1).all();
  if (!file) throw new HTTPException(404, { message: 'File not found' });

  const isS3Path = file.s3Key.startsWith('projects/');

  if (isS3Path && isR2Configured()) {
    try {
      const { stream, contentLength, contentType } = await downloadFromR2(file.s3Key);
      return new Response(stream, {
        headers: {
          'Content-Type': contentType || file.mimeType || 'audio/wav',
          'Content-Disposition': `inline; filename="${file.fileName}"`,
          'Content-Length': contentLength.toString(),
          'Accept-Ranges': 'bytes',
        },
      });
    } catch {
      throw new HTTPException(404, { message: 'File not found in storage' });
    }
  }

  // Local disk fallback
  try {
    const fileStat = await stat(file.s3Key);
    const stream = createReadStream(file.s3Key);

    c.header('Content-Type', file.mimeType || 'audio/wav');
    c.header('Content-Disposition', `inline; filename="${file.fileName}"`);
    c.header('Content-Length', fileStat.size.toString());
    c.header('Accept-Ranges', 'bytes');

    return new Response(Readable.toWeb(stream) as ReadableStream, {
      headers: c.res.headers,
    });
  } catch {
    throw new HTTPException(404, { message: 'File not found on disk' });
  }
});

fileRoutes.get('/:fileId/download-url', async (c) => {
  const fileId = c.req.param('fileId');
  const [file] = await db.select().from(files).where(eq(files.id, fileId)).limit(1).all();
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
  const result = await db.select().from(files).where(eq(files.projectId, projectId)).all();
  return c.json({ success: true, data: result });
});

export default fileRoutes;
