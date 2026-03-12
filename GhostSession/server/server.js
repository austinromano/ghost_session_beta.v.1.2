const express = require('express');
const cors = require('cors');
const crypto = require('crypto');

const app = express();
app.use(express.json());
app.use(cors());

// ─── In-memory stores ───────────────────────────────────────────────
const users       = new Map(); // userId -> { userId, email, password, displayName }
const tokens      = new Map(); // token (userId string for MVP) -> userId
const sessions    = new Map(); // sessionId -> session object
const codeToId    = new Map(); // inviteCode -> sessionId
const comments    = new Map(); // sessionId -> [comment, ...]
const versions    = new Map(); // sessionId -> [version, ...]
const plugins     = new Map(); // sessionId -> [plugin, ...]

// ─── Helpers ────────────────────────────────────────────────────────
function generateCode() {
    const chars = 'ABCDEFGHJKLMNPQRSTUVWXYZ23456789';
    let code = '';
    for (let i = 0; i < 6; i++)
        code += chars[Math.floor(Math.random() * chars.length)];
    return code;
}

function requireAuth(req, res, next) {
    const header = req.headers.authorization || '';
    const token = header.replace('Bearer ', '');
    const userId = tokens.get(token);
    if (!userId) return res.status(401).json({ error: 'Unauthorized' });
    req.userId = userId;
    req.user = users.get(userId);
    next();
}

// ─── AUTH ───────────────────────────────────────────────────────────
app.post('/v1/auth/register', (req, res) => {
    const { email, password, displayName } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    // Check duplicate email
    for (const u of users.values()) {
        if (u.email === email) {
            return res.status(409).json({ error: 'Email already registered' });
        }
    }

    const userId = crypto.randomUUID();
    const name = displayName || email.split('@')[0];
    const user = { userId, email, password, displayName: name };
    users.set(userId, user);

    // Token is just userId for MVP
    const token = userId;
    tokens.set(token, userId);

    console.log(`[Auth] Register: ${name} (${userId})`);
    res.json({ userId, token, displayName: name });
});

app.post('/v1/auth/login', (req, res) => {
    const { email, password } = req.body;
    if (!email || !password) {
        return res.status(400).json({ error: 'Email and password are required' });
    }

    let found = null;
    for (const u of users.values()) {
        if (u.email === email) { found = u; break; }
    }

    if (!found || found.password !== password) {
        return res.status(401).json({ error: 'Invalid credentials' });
    }

    const token = found.userId;
    tokens.set(token, found.userId);

    console.log(`[Auth] Login: ${found.displayName} (${found.userId})`);
    res.json({ userId: found.userId, token, displayName: found.displayName });
});

// ─── SESSIONS ───────────────────────────────────────────────────────
app.post('/v1/sessions', requireAuth, (req, res) => {
    const { name, dawType, tempo, key } = req.body;
    const sessionId = crypto.randomUUID();
    const inviteCode = generateCode();

    const session = {
        sessionId,
        inviteCode,
        name: name || 'Untitled Session',
        dawType: dawType || null,
        tempo: tempo || 120,
        key: key || 'C',
        ownerId: req.userId,
        collaborators: [{
            userId: req.userId,
            displayName: req.user.displayName,
            role: 'owner',
            joinedAt: new Date().toISOString()
        }],
        createdAt: new Date().toISOString()
    };

    sessions.set(sessionId, session);
    codeToId.set(inviteCode.toUpperCase(), sessionId);
    comments.set(sessionId, []);
    versions.set(sessionId, []);
    plugins.set(sessionId, []);

    console.log(`[Session] Created: "${session.name}" code=${inviteCode} by ${req.user.displayName}`);
    res.json({
        sessionId,
        inviteCode,
        name: session.name,
        dawType: session.dawType,
        tempo: session.tempo,
        key: session.key,
        createdAt: session.createdAt
    });
});

app.get('/v1/sessions', requireAuth, (req, res) => {
    const userSessions = [];
    for (const s of sessions.values()) {
        if (s.collaborators.some(c => c.userId === req.userId)) {
            userSessions.push({
                sessionId: s.sessionId,
                name: s.name,
                dawType: s.dawType,
                tempo: s.tempo,
                key: s.key,
                inviteCode: s.inviteCode,
                collaboratorCount: s.collaborators.length,
                createdAt: s.createdAt
            });
        }
    }
    res.json(userSessions);
});

app.get('/v1/sessions/:id', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json({
        sessionId: session.sessionId,
        inviteCode: session.inviteCode,
        name: session.name,
        dawType: session.dawType,
        tempo: session.tempo,
        key: session.key,
        ownerId: session.ownerId,
        collaborators: session.collaborators,
        createdAt: session.createdAt
    });
});

app.post('/v1/sessions/join', requireAuth, (req, res) => {
    const { inviteCode } = req.body;
    const code = (inviteCode || '').toUpperCase();
    const sessionId = codeToId.get(code);

    if (!sessionId || !sessions.has(sessionId)) {
        return res.status(404).json({ error: 'Session not found. Check the invite code.' });
    }

    const session = sessions.get(sessionId);

    // Don't add if already a collaborator
    if (!session.collaborators.some(c => c.userId === req.userId)) {
        session.collaborators.push({
            userId: req.userId,
            displayName: req.user.displayName,
            role: 'collaborator',
            joinedAt: new Date().toISOString()
        });
    }

    console.log(`[Session] ${req.user.displayName} joined "${session.name}"`);
    res.json({
        sessionId: session.sessionId,
        inviteCode: session.inviteCode,
        name: session.name,
        tempo: session.tempo,
        key: session.key
    });
});

// ─── COLLABORATORS ──────────────────────────────────────────────────
app.get('/v1/sessions/:id/collaborators', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(session.collaborators);
});

// ─── COMMENTS ───────────────────────────────────────────────────────
app.get('/v1/sessions/:id/comments', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(comments.get(req.params.id) || []);
});

app.post('/v1/sessions/:id/comments', requireAuth, (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const { body, parentId } = req.body;
    if (!body) return res.status(400).json({ error: 'Comment body is required' });

    const comment = {
        commentId: crypto.randomUUID(),
        sessionId: req.params.id,
        userId: req.userId,
        displayName: req.user.displayName,
        body,
        parentId: parentId || null,
        createdAt: new Date().toISOString()
    };

    const list = comments.get(req.params.id) || [];
    list.push(comment);
    comments.set(req.params.id, list);

    res.json(comment);
});

// ─── VERSIONS ───────────────────────────────────────────────────────
app.get('/v1/sessions/:id/versions', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(versions.get(req.params.id) || []);
});

app.post('/v1/sessions/:id/versions', requireAuth, (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const { label } = req.body;
    const list = versions.get(req.params.id) || [];
    const versionNumber = list.length + 1;

    const version = {
        versionId: crypto.randomUUID(),
        sessionId: req.params.id,
        versionNumber,
        label: label || `v${String(versionNumber).padStart(2, '0')}`,
        createdBy: req.userId,
        displayName: req.user.displayName,
        createdAt: new Date().toISOString()
    };

    list.push(version);
    versions.set(req.params.id, list);

    res.json(version);
});

// ─── PLUGINS ────────────────────────────────────────────────────────
app.get('/v1/sessions/:id/plugins', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });
    res.json(plugins.get(req.params.id) || []);
});

app.post('/v1/sessions/:id/plugins', (req, res) => {
    const session = sessions.get(req.params.id);
    if (!session) return res.status(404).json({ error: 'Session not found' });

    const { plugins: pluginList } = req.body;
    if (!Array.isArray(pluginList)) {
        return res.status(400).json({ error: 'plugins must be an array' });
    }

    plugins.set(req.params.id, pluginList.map(p => ({
        name: p.name,
        vendor: p.vendor || null,
        pluginId: p.pluginId || null,
        status: p.status || 'unknown'
    })));

    res.json(plugins.get(req.params.id));
});

// ─── SEED DATA ──────────────────────────────────────────────────────
function seedData() {
    // Users
    const alexId   = 'seed-alex-001';
    const jordanId = 'seed-jordan-002';
    const kaiId    = 'seed-kai-003';

    users.set(alexId,   { userId: alexId,   email: 'alex@ghost.fm',   password: 'pass', displayName: 'Alex' });
    users.set(jordanId, { userId: jordanId, email: 'jordan@ghost.fm', password: 'pass', displayName: 'Jordan' });
    users.set(kaiId,    { userId: kaiId,    email: 'kai@ghost.fm',    password: 'pass', displayName: 'Kai' });

    // Tokens (userId = token for MVP)
    tokens.set(alexId, alexId);
    tokens.set(jordanId, jordanId);
    tokens.set(kaiId, kaiId);

    // Session: Lunar Drift
    const sessionId = 'seed-session-lunar-drift';
    const inviteCode = 'LUNAR1';

    const session = {
        sessionId,
        inviteCode,
        name: 'Lunar Drift',
        dawType: 'Ableton Live',
        tempo: 140,
        key: 'Cm',
        ownerId: alexId,
        collaborators: [
            { userId: alexId,   displayName: 'Alex',   role: 'owner',        joinedAt: '2026-03-09T10:00:00.000Z' },
            { userId: jordanId, displayName: 'Jordan', role: 'collaborator', joinedAt: '2026-03-09T10:05:00.000Z' },
            { userId: kaiId,    displayName: 'Kai',    role: 'collaborator', joinedAt: '2026-03-09T10:10:00.000Z' }
        ],
        createdAt: '2026-03-09T10:00:00.000Z'
    };

    sessions.set(sessionId, session);
    codeToId.set(inviteCode, sessionId);

    // Comments
    const comment1Id = 'seed-comment-001';
    const comment2Id = 'seed-comment-002';
    const comment3Id = 'seed-comment-003';

    comments.set(sessionId, [
        {
            commentId: comment1Id,
            sessionId,
            userId: alexId,
            displayName: 'Alex',
            body: 'The bass needs more reverb',
            parentId: null,
            createdAt: '2026-03-09T11:00:00.000Z'
        },
        {
            commentId: comment2Id,
            sessionId,
            userId: jordanId,
            displayName: 'Jordan',
            body: 'Can you tighten up the hi-hats here?',
            parentId: null,
            createdAt: '2026-03-09T11:05:00.000Z'
        },
        {
            commentId: comment3Id,
            sessionId,
            userId: kaiId,
            displayName: 'Kai',
            body: "Got it, I'll fix that!",
            parentId: comment2Id,
            createdAt: '2026-03-09T11:10:00.000Z'
        }
    ]);

    // Versions
    versions.set(sessionId, [
        { versionId: 'seed-ver-001', sessionId, versionNumber: 9,  label: 'Initial Mix',   createdBy: alexId,   displayName: 'Alex',   createdAt: '2026-03-09T10:30:00.000Z' },
        { versionId: 'seed-ver-002', sessionId, versionNumber: 10, label: 'Synth Layers',   createdBy: jordanId, displayName: 'Jordan', createdAt: '2026-03-09T11:00:00.000Z' },
        { versionId: 'seed-ver-003', sessionId, versionNumber: 11, label: 'Drum Edits',     createdBy: kaiId,    displayName: 'Kai',    createdAt: '2026-03-09T11:30:00.000Z' },
        { versionId: 'seed-ver-004', sessionId, versionNumber: 12, label: 'Chorus Update',  createdBy: alexId,   displayName: 'Alex',   createdAt: '2026-03-09T12:00:00.000Z' }
    ]);

    // Plugins
    plugins.set(sessionId, [
        { name: 'FabFilter Pro-Q3', vendor: 'FabFilter',         pluginId: 'fabfilter-proq3',       status: 'missing'   },
        { name: 'Serum',            vendor: 'Xfer Records',      pluginId: 'xfer-serum',            status: 'loaded'    },
        { name: 'Valhalla VintageVerb', vendor: 'Valhalla DSP',  pluginId: 'valhalla-vintageverb',  status: 'rendered'  }
    ]);

    console.log('[Seed] Created demo session "Lunar Drift" with 3 collaborators, 3 comments, 4 versions, 3 plugins');
}

seedData();

// ─── Start ──────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3000;
app.listen(PORT, '0.0.0.0', () => {
    console.log(`\n  Ghost Session Server v1.0`);
    console.log(`  ────────────────────────`);
    console.log(`  REST API: http://localhost:${PORT}/v1`);
    console.log(`  Ready for connections!\n`);
});
