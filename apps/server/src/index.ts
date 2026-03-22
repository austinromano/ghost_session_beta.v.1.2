import 'dotenv/config';
import { Hono } from 'hono';
import { cors } from 'hono/cors';
import { HTTPException } from 'hono/http-exception';
import { serve } from '@hono/node-server';
import { createServer } from 'node:http';
import { ZodError } from 'zod';
import auth from './routes/auth.js';
import projectRoutes from './routes/projects.js';
import trackRoutes from './routes/tracks.js';
import versionRoutes from './routes/versions.js';
import commentRoutes from './routes/comments.js';
import fileRoutes from './routes/files.js';
import sessionRoutes from './routes/sessions.js';
import invitationRoutes from './routes/invitations.js';
import userRoutes from './routes/users.js';
import likeRoutes from './routes/likes.js';
import samplePackRoutes from './routes/samplepacks.js';
import notificationRoutes from './routes/notifications.js';
import socialRoutes from './routes/social.js';
import { setupWebSocket } from './ws/index.js';
import { initDatabase } from './db/index.js';

// Initialize database tables (async now with Turso)
await initDatabase();

const app = new Hono();

// Global middleware
app.use('*', cors());

// Debug endpoint for client-side logging
app.post('/api/v1/debug', async (c) => {
  const body = await c.req.text();
  const fs = await import('node:fs');
  fs.appendFileSync('C:\\Users\\austi\\ghost_client_debug.log', new Date().toISOString() + ' ' + body + '\n');
  return c.json({ ok: true });
});

// API routes
app.route('/api/v1/auth', auth);
app.route('/api/v1/projects', projectRoutes);
app.route('/api/v1/projects/:id/tracks', trackRoutes);
app.route('/api/v1/projects/:id/versions', versionRoutes);
app.route('/api/v1/projects/:id/comments', commentRoutes);
app.route('/api/v1/projects/:id/files', fileRoutes);
app.route('/api/v1/projects/:id/sessions', sessionRoutes);
app.route('/api/v1/invitations', invitationRoutes);
app.route('/api/v1/users', userRoutes);
app.route('/api/v1/tracks', likeRoutes);
app.route('/api/v1/sample-packs', samplePackRoutes);
app.route('/api/v1/notifications', notificationRoutes);
app.route('/api/v1/social', socialRoutes);

// Serve the desktop app build
import { serveStatic } from '@hono/node-server/serve-static';
// Try local public folder first (Railway), then ../desktop/dist (local dev)
app.use('/app/*', serveStatic({ root: './public', rewriteRequestPath: (p) => p.replace('/app', '') }));
app.use('/app/*', serveStatic({ root: '../desktop/dist', rewriteRequestPath: (p) => p.replace('/app', '') }));
app.get('/app', serveStatic({ root: './public', path: '/index.html' }));
app.get('/app', serveStatic({ root: '../desktop/dist', path: '/index.html' }));

// Serve at root for VST3 plugin and direct access
app.use('/assets/*', serveStatic({ root: './public' }));
app.use('/assets/*', serveStatic({ root: '../desktop/dist' }));
app.get('/', serveStatic({ root: './public', path: '/index.html' }));
app.get('/', serveStatic({ root: '../desktop/dist', path: '/index.html' }));

// One-time DB reset
app.delete('/api/v1/admin/reset-all', async (c) => {
  const { client } = await import('./db/index.js');
  try {
    await client.executeMultiple(`
      DELETE FROM social_post_reactions;
      DELETE FROM social_post_comments;
      DELETE FROM social_post_likes;
      DELETE FROM social_posts;
      DELETE FROM chat_messages;
      DELETE FROM notifications;
      DELETE FROM invitations;
      DELETE FROM tracks;
      DELETE FROM versions;
      DELETE FROM project_members;
      DELETE FROM projects;
      DELETE FROM follows;
      DELETE FROM auth_sessions;
      DELETE FROM users;
    `);
    return c.json({ success: true, message: 'All data deleted' });
  } catch (err) {
    return c.json({ error: 'Reset failed' }, 500);
  }
});

// Public stats endpoint — no auth required
app.get('/api/v1/stats', async (c) => {
  const { db: database } = await import('./db/index.js');
  const { users, projects, tracks } = await import('./db/schema.js');
  const { sql } = await import('drizzle-orm');
  const [userCount] = await database.select({ count: sql<number>`count(*)` }).from(users).all();
  const [projectCount] = await database.select({ count: sql<number>`count(*)` }).from(projects).all();
  const [trackCount] = await database.select({ count: sql<number>`count(*)` }).from(tracks).all();
  return c.json({
    users: userCount.count,
    projects: projectCount.count,
    tracks: trackCount.count,
    timestamp: new Date().toISOString(),
  });
});

// Health check
app.get('/health', (c) => c.json({ status: 'ok', timestamp: new Date().toISOString() }));

// Global error handler
app.onError((err, c) => {
  if (err instanceof HTTPException) {
    return c.json({ success: false, error: err.message }, err.status);
  }
  if (err instanceof ZodError) {
    return c.json({
      success: false,
      error: 'Validation error',
      details: err.errors.map((e) => ({ path: e.path.join('.'), message: e.message })),
    }, 400);
  }
  console.error('[Server Error]', err);
  return c.json({ success: false, error: 'Internal server error' }, 500);
});

// Start server
const port = parseInt(process.env.PORT || '3000', 10);

const server = serve({ fetch: app.fetch, port }, (info) => {
  console.log(`\n  Ghost Session API running on http://localhost:${info.port}`);
  console.log(`  WebSocket ready on ws://localhost:${info.port}\n`);
});

// Attach Socket.IO to the HTTP server
setupWebSocket(server as any);
