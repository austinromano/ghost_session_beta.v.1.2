import { S3Client, PutObjectCommand, GetObjectCommand, DeleteObjectCommand } from '@aws-sdk/client-s3';
import { getSignedUrl } from '@aws-sdk/s3-request-presigner';
import type { Readable } from 'node:stream';

const s3 = new S3Client({
  region: process.env.S3_REGION || 'auto',
  endpoint: process.env.S3_ENDPOINT,
  credentials: {
    accessKeyId: process.env.S3_ACCESS_KEY || '',
    secretAccessKey: process.env.S3_SECRET_KEY || '',
  },
});

const bucket = process.env.S3_BUCKET || 'ghost-session-files';

export function isR2Configured(): boolean {
  return !!(process.env.S3_ENDPOINT && process.env.S3_ACCESS_KEY && process.env.S3_SECRET_KEY);
}

export async function getUploadUrl(key: string, contentType: string): Promise<string> {
  const command = new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    ContentType: contentType,
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

export async function getDownloadUrl(key: string): Promise<string> {
  const command = new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  });
  return getSignedUrl(s3, command, { expiresIn: 3600 });
}

/** Upload a buffer directly to R2/S3 */
export async function uploadToR2(key: string, body: Buffer | Uint8Array, contentType: string): Promise<void> {
  await s3.send(new PutObjectCommand({
    Bucket: bucket,
    Key: key,
    Body: body,
    ContentType: contentType,
  }));
}

/** Download a file from R2/S3 as a readable stream */
export async function downloadFromR2(key: string): Promise<{ stream: ReadableStream; contentLength: number; contentType: string }> {
  const response = await s3.send(new GetObjectCommand({
    Bucket: bucket,
    Key: key,
  }));

  const stream = response.Body as Readable;
  return {
    stream: stream.transformToWebStream() as unknown as ReadableStream,
    contentLength: response.ContentLength || 0,
    contentType: response.ContentType || 'application/octet-stream',
  };
}

/** Delete a file from R2/S3 */
export async function deleteFromR2(key: string): Promise<void> {
  await s3.send(new DeleteObjectCommand({
    Bucket: bucket,
    Key: key,
  }));
}
