require('dotenv').config();
const express = require('express');
const cors = require('cors');
const sqlite3 = require('sqlite3').verbose();
const path = require('path');
const http = require('http');
const jwt = require('jsonwebtoken');
const bcrypt = require('bcryptjs');
const { WebSocketServer } = require('ws');
const crypto = require('crypto');
const axios = require('axios');

const app = express();
app.set('trust proxy', true);
const PORT = process.env.PORT || 5174;
const JWT_SECRET = process.env.JWT_SECRET || 'dev-secret-change';
const JWT_TTL = process.env.JWT_TTL || '7d';
const allowedOrigins = (process.env.CORS_ORIGIN || 'http://localhost:5173')
  .split(',')
  .map((value) => value.trim())
  .filter(Boolean);

app.disable('x-powered-by');
app.use(
  cors({
    origin: (origin, callback) => {
      if (!origin || allowedOrigins.includes(origin)) {
        callback(null, true);
        return;
      }
      callback(new Error('CORS_NOT_ALLOWED'));
    },
    credentials: true,
  })
);
app.use(express.json({ limit: '15mb' }));

const dbPath = path.join(__dirname, 'data.db');
const db = new sqlite3.Database(dbPath);

const run = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.run(sql, params, function (err) {
      if (err) reject(err);
      else resolve(this);
    });
  });
const get = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.get(sql, params, (err, row) => {
      if (err) reject(err);
      else resolve(row);
    });
  });
const all = (sql, params = []) =>
  new Promise((resolve, reject) => {
    db.all(sql, params, (err, rows) => {
      if (err) reject(err);
      else resolve(rows);
    });
  });

const nowStamp = () => {
  const now = new Date();
  return now.toLocaleDateString('ru-RU') + ' ' + now.toLocaleTimeString('ru-RU', { hour: '2-digit', minute: '2-digit' });
};

const isPasswordHash = (value) => typeof value === 'string' && value.startsWith('$2');
const signToken = (user) => jwt.sign({ id: user.id, role: user.role }, JWT_SECRET, { expiresIn: JWT_TTL });
const generateTempPassword = () => {
  const raw = crypto.randomBytes(10).toString('base64');
  return raw.replace(/[^a-zA-Z0-9]/g, '').slice(0, 12) || crypto.randomBytes(8).toString('hex');
};

const authRequired = async (req, res, next) => {
  const header = req.headers.authorization || '';
  const token = header.startsWith('Bearer ') ? header.slice(7) : null;
  if (!token) return res.status(401).json({ error: 'unauthorized' });
  try {
    const payload = jwt.verify(token, JWT_SECRET);
    const user = await get(
      'SELECT id, username, email, role, subscription_role, subscription_until, premium_until FROM users WHERE id = ?',
      [payload.id]
    );
    if (!user) return res.status(401).json({ error: 'unauthorized' });
    req.user = user;
    return next();
  } catch {
    return res.status(401).json({ error: 'unauthorized' });
  }
};

const normalizeKey = (raw) => {
  const cleaned = String(raw || '').trim().toUpperCase();
  if (!cleaned) return '';
  let code = cleaned.startsWith('RC-') ? cleaned.slice(3) : cleaned;
  const parts = code.split('-').filter(Boolean);
  if (parts.length === 3) {
    let hash = 0;
    for (let i = 0; i < code.length; i += 1) {
      hash = (hash * 31 + code.charCodeAt(i)) >>> 0;
    }
    const block4 = (hash % 1679616).toString(36).toUpperCase().padStart(4, '0');
    return `${parts[0]}-${parts[1]}-${parts[2]}-${block4}`;
  }
  if (parts.length >= 4) {
    return parts.slice(0, 4).join('-');
  }
  return code;
};

const ensureColumn = async (table, columnName, columnDef) => {
  const cols = await all(`PRAGMA table_info(${table})`);
  if (!cols.some((c) => c.name === columnName)) {
    await run(`ALTER TABLE ${table} ADD COLUMN ${columnDef}`);
  }
};

const ensureSchema = async () => {
  await run(`CREATE TABLE IF NOT EXISTS users (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    username TEXT UNIQUE,
    email TEXT UNIQUE,
    password TEXT,
    role TEXT DEFAULT 'DEFAULT',
    subscription_role TEXT,
    subscription_until TEXT,
    created_at TEXT
  )`);
  await run(`CREATE TABLE IF NOT EXISTS keys (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    code TEXT UNIQUE,
    role TEXT,
    days INTEGER,
    created_at TEXT,
    activated_by INTEGER,
    activated_at TEXT
  )`);
  await run(`CREATE TABLE IF NOT EXISTS tickets (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    title TEXT,
    status TEXT DEFAULT 'open',
    created_at TEXT,
    updated_at TEXT
  )`);
  await run(`CREATE TABLE IF NOT EXISTS ticket_messages (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    ticket_id INTEGER,
    sender_id INTEGER,
    sender_role TEXT,
    message TEXT,
    attachments TEXT,
    created_at TEXT
  )`);
  await run(`CREATE TABLE IF NOT EXISTS actions (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    actor_id INTEGER,
    actor_role TEXT,
    action TEXT,
    target TEXT,
    meta TEXT,
    created_at TEXT
  )`);
  await run(`CREATE TABLE IF NOT EXISTS telegram_2fa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER UNIQUE,
    telegram_id TEXT,
    telegram_username TEXT,
    enabled INTEGER DEFAULT 1,
    linked_at TEXT
  )`);
  await run(`CREATE TABLE IF NOT EXISTS login_history (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    user_id INTEGER,
    login_id TEXT,
    ip TEXT,
    user_agent TEXT,
    status TEXT,
    created_at TEXT
  )`);
  await run(`CREATE TABLE IF NOT EXISTS pending_2fa (
    id INTEGER PRIMARY KEY AUTOINCREMENT,
    session_id TEXT UNIQUE,
    user_id INTEGER,
    ip TEXT,
    user_agent TEXT,
    status TEXT DEFAULT 'pending',
    created_at TEXT
  )`);
  await ensureColumn('users', 'premium_until', 'premium_until TEXT');
  await ensureColumn('ticket_messages', 'attachments', 'attachments TEXT');
};

const ensureSeed = async () => {
  const row = await get('SELECT COUNT(*) as count FROM users');
  if (!row || row.count === 0) {
    const hashed = await bcrypt.hash('dev', 10);
    await run(
      'INSERT INTO users (username, email, password, role, created_at) VALUES (?, ?, ?, ?, ?)',
      ['developer', 'dev@local', hashed, 'DEVELOPER', nowStamp()]
    );
  }
};

const addAction = async (actorId, action, target, meta, actorRoleOverride) => {
  const actorRole = actorRoleOverride
    || (await get('SELECT role FROM users WHERE id = ?', [actorId]))?.role
    || 'DEFAULT';
  await run(
    'INSERT INTO actions (actor_id, actor_role, action, target, meta, created_at) VALUES (?, ?, ?, ?, ?, ?)',
    [actorId, actorRole, action, target || '', meta || '', nowStamp()]
  );
};

const requireAdmin = (user) => !!user && (user.role === 'ADMIN' || user.role === 'DEVELOPER');

const getUserRole = async (id) => {
  if (!id) return null;
  return get('SELECT id, role FROM users WHERE id = ?', [id]);
};

const isDeveloper = (user) => !!user && user.role === 'DEVELOPER';

const isStaffRole = (role) => role === 'ADMIN' || role === 'DEVELOPER' || role === 'MODERATOR';
const isStaff = (user) => !!user && isStaffRole(user.role);

const roleRank = {
  DEVELOPER: 4,
  ADMIN: 3,
  MODERATOR: 2,
  YOUTUBE: 1,
  BETA: 1,
  PREMIUM: 1,
  USER: 1,
  DEFAULT: 0,
  BANNED: -1,
};

const canAssignRole = (actorRole, nextRole) => {
  if (!actorRole || !nextRole) return false;
  const actorRank = roleRank[actorRole] ?? -1;
  const nextRank = roleRank[nextRole] ?? -1;
  if (nextRole === 'DEVELOPER' && actorRole !== 'DEVELOPER') return false;
  return actorRank >= nextRank;
};

const server = http.createServer(app);
const wss = new WebSocketServer({ server });

const broadcastToTicket = async (ticketId, payload) => {
  const ticket = await get('SELECT user_id FROM tickets WHERE id = ?', [ticketId]);
  const ownerId = ticket?.user_id;
  wss.clients.forEach((client) => {
    if (client.readyState !== 1) return;
    if (!client.userId) return;
    if (isStaffRole(client.role) || client.userId === ownerId) {
      client.send(JSON.stringify(payload));
    }
  });
};

const pending2FALogins = new Map();
const pendingLinkCodes = new Map();

let telegramBot = null;
try {
  telegramBot = require('./bot');
} catch (e) {
  console.log('Telegram bot not loaded:', e.message);
}

wss.on('connection', (ws) => {
  ws.userId = null;
  ws.role = null;
  ws.sessionId = null;
  ws.on('message', async (raw) => {
    try {
      const data = JSON.parse(String(raw || ''));
      if (data.type === 'auth') {
        const token = data.token;
        if (!token) return;
        let payload;
        try {
          payload = jwt.verify(token, JWT_SECRET);
        } catch {
          return;
        }
        const user = await get('SELECT id, role FROM users WHERE id = ?', [payload.id]);
        if (!user) return;
        ws.userId = user.id;
        ws.role = user.role;
        ws.send(JSON.stringify({ type: 'auth_ok', role: user.role }));
      }
      if (data.type === '2fa_subscribe') {
        ws.sessionId = data.sessionId;
      }
    } catch {
    }
  });
});

const broadcast2FAStatus = (sessionId, status) => {
  wss.clients.forEach((client) => {
    if (client.readyState === 1 && client.sessionId === sessionId) {
      client.send(JSON.stringify({ type: '2fa_status', status }));
    }
  });
};

const normalizeIp = (raw) => {
  if (!raw) return 'Unknown';
  let ip = Array.isArray(raw) ? raw[0] : raw;
  if (typeof ip !== 'string') ip = String(ip);
  if (ip.includes(',')) ip = ip.split(',')[0].trim();
  if (ip.startsWith('::ffff:')) ip = ip.replace('::ffff:', '');
  if (ip === '::1') ip = '127.0.0.1';
  return ip.trim() || 'Unknown';
};

const getClientIP = (req) => {
  const forwarded = req.headers['x-forwarded-for'];
  const real = req.headers['x-real-ip'];
  const cf = req.headers['cf-connecting-ip'];
  const candidate = forwarded || real || cf || req.ip || req.connection?.remoteAddress || req.socket?.remoteAddress;
  return normalizeIp(candidate);
};

const verifyCaptcha = async (token) => {
  if (!token) return false;
  try {
    const secretKey = '6Lf4Y2AsAAAAAHK8Y2AsAAAAAK8Y2AsAAAAA'; // This should be your secret key
    const response = await axios.post(
      'https://www.google.com/recaptcha/api/siteverify',
      `secret=${secretKey}&response=${token}`,
      { headers: { 'Content-Type': 'application/x-www-form-urlencoded' } }
    );
    return response.data.success;
  } catch (error) {
    console.error('Captcha verification failed:', error);
    return false;
  }
};

app.post('/api/register', async (req, res) => {
  try {
    const { username, email, password } = req.body || {};
    if (!username || !email || !password) {
      return res.status(400).json({ error: 'missing_fields' });
    }
    if (String(username).length < 3 || String(username).length > 32) {
      return res.status(400).json({ error: 'invalid_username' });
    }
    if (String(password).length < 6 || String(password).length > 128) {
      return res.status(400).json({ error: 'invalid_password' });
    }
    const hashed = await bcrypt.hash(password, 10);
    const createdAt = nowStamp();
    const result = await run(
      'INSERT INTO users (username, email, password, role, created_at) VALUES (?, ?, ?, ?, ?)',
      [username, email, hashed, 'DEFAULT', createdAt]
    );
    const user = await get('SELECT id, username, email, role, subscription_role, subscription_until, premium_until FROM users WHERE id = ?', [result.lastID]);
    const token = signToken(user);
    res.json({ user, token });
  } catch (err) {
    console.error('Registration error:', err);
    if (err.code === 'SQLITE_CONSTRAINT_UNIQUE') {
      if (err.message.includes('username')) {
        return res.status(400).json({ error: 'username_exists' });
      } else if (err.message.includes('email')) {
        return res.status(400).json({ error: 'email_exists' });
      } else {
        return res.status(400).json({ error: 'user_exists' });
      }
    }
    res.status(500).json({ error: 'register_failed' });
  }
});

app.post('/api/login', async (req, res) => {
  try {
    const { login, password } = req.body || {};
    const user = await get('SELECT * FROM users WHERE (username = ? OR email = ?)', [login, login]);
    if (!user) return res.status(401).json({ error: 'invalid_credentials' });
    let valid = false;
    if (isPasswordHash(user.password)) {
      valid = await bcrypt.compare(password, user.password);
    } else {
      valid = String(user.password) === String(password);
    }
    if (!valid) return res.status(401).json({ error: 'invalid_credentials' });
    if (!isPasswordHash(user.password)) {
      const hashed = await bcrypt.hash(password, 10);
      await run('UPDATE users SET password = ? WHERE id = ?', [hashed, user.id]);
    }

    const twoFA = await get('SELECT * FROM telegram_2fa WHERE user_id = ? AND enabled = 1', [user.id]);

    if (twoFA && twoFA.telegram_id) {
      const sessionId = crypto.randomBytes(16).toString('hex');
      const ip = getClientIP(req);
      const userAgent = req.headers['user-agent'] || 'Unknown';

      await run('INSERT INTO pending_2fa (session_id, user_id, ip, user_agent, status, created_at) VALUES (?, ?, ?, ?, ?, ?)',
        [sessionId, user.id, ip, userAgent, 'pending', nowStamp()]);

      pending2FALogins.set(sessionId, {
        userId: user.id,
        ip,
        userAgent,
        status: 'pending',
        createdAt: Date.now()
      });

      setTimeout(async () => {
        const data = pending2FALogins.get(sessionId);
        if (data && data.status === 'pending') {
          data.status = 'timeout';
          pending2FALogins.delete(sessionId);
          await run('UPDATE pending_2fa SET status = ? WHERE session_id = ?', ['timeout', sessionId]);
          broadcast2FAStatus(sessionId, 'timeout');
        }
      }, 2 * 60 * 1000);

      if (telegramBot && telegramBot.requestLoginApproval) {
        telegramBot.requestLoginApproval(user.id, twoFA.telegram_id, ip, userAgent)
          .then(async (result) => {
            const data = pending2FALogins.get(sessionId);
            if (data) {
              data.status = result;
              pending2FALogins.delete(sessionId);
              await run('UPDATE pending_2fa SET status = ? WHERE session_id = ?', [result, sessionId]);
              broadcast2FAStatus(sessionId, result);
            }
          });
      }

      return res.json({
        requires2FA: true,
        sessionId,
        message: 'Подтвердите вход в Telegram'
      });
    }

    const token = signToken(user);
    res.json({
      user: {
        id: user.id,
        username: user.username,
        email: user.email,
        role: user.role,
        subscription_role: user.subscription_role,
        subscription_until: user.subscription_until,
        premium_until: user.premium_until,
      },
      token,
    });
  } catch (err) {
    res.status(500).json({ error: 'login_failed' });
  }
});

app.post('/api/2fa/check', async (req, res) => {
  try {
    const { sessionId } = req.body || {};
    if (!sessionId) return res.status(400).json({ error: 'missing_session' });

    const pending = await get('SELECT * FROM pending_2fa WHERE session_id = ?', [sessionId]);
    if (!pending) return res.status(404).json({ error: 'session_not_found' });

    if (pending.status === 'pending') {
      return res.json({ status: 'pending' });
    }

    if (pending.status === 'approved') {
      const user = await get('SELECT * FROM users WHERE id = ?', [pending.user_id]);
      if (!user) return res.status(404).json({ error: 'user_not_found' });

      await run('DELETE FROM pending_2fa WHERE session_id = ?', [sessionId]);

      const token = signToken(user);
      return res.json({
        status: 'approved',
        user: {
          id: user.id,
          username: user.username,
          email: user.email,
          role: user.role,
          subscription_role: user.subscription_role,
          subscription_until: user.subscription_until,
          premium_until: user.premium_until,
        },
        token,
      });
    }

    if (pending.status === 'denied') {
      await run('DELETE FROM pending_2fa WHERE session_id = ?', [sessionId]);
      return res.json({ status: 'denied' });
    }

    if (pending.status === 'timeout') {
      await run('DELETE FROM pending_2fa WHERE session_id = ?', [sessionId]);
      return res.json({ status: 'timeout' });
    }

    return res.json({ status: pending.status });
  } catch (err) {
    res.status(500).json({ error: '2fa_check_failed' });
  }
});

app.get('/api/2fa/status', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    const twoFA = await get('SELECT * FROM telegram_2fa WHERE user_id = ?', [userId]);

    if (!twoFA) {
      return res.json({ enabled: false, linked: false });
    }

    return res.json({
      enabled: !!twoFA.enabled,
      linked: !!twoFA.telegram_id,
      telegramUsername: twoFA.telegram_username || null,
      linkedAt: twoFA.linked_at || null
    });
  } catch (err) {
    res.status(500).json({ error: '2fa_status_failed' });
  }
});

app.post('/api/2fa/generate-link', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;

    if (req.user.role !== 'ADMIN' && req.user.role !== 'DEVELOPER') {
      return res.status(403).json({ error: 'forbidden' });
    }

    const code = crypto.randomBytes(16).toString('hex');

    pendingLinkCodes.set(code, {
      userId,
      createdAt: Date.now()
    });

    if (telegramBot && telegramBot.pendingLinks) {
      telegramBot.pendingLinks.set(code, {
        userId,
        createdAt: Date.now()
      });
    }

    setTimeout(() => {
      pendingLinkCodes.delete(code);
      if (telegramBot && telegramBot.pendingLinks) {
        telegramBot.pendingLinks.delete(code);
      }
    }, 30 * 1000);

    const botUsername = 'a8x3n_service_bot';
    const linkUrl = `https://t.me/${botUsername}?start=link_${code}`;

    await addAction(userId, '2fa_link_generate', '', '', req.user.role);

    res.json({
      linkUrl,
      code,
      expiresIn: 30
    });
  } catch (err) {
    res.status(500).json({ error: 'generate_link_failed' });
  }
});

app.post('/api/2fa/unlink', authRequired, async (req, res) => {
  return res.status(403).json({ error: 'unlink_disabled' });
});

app.post('/api/2fa/toggle', authRequired, async (req, res) => {
  return res.status(403).json({ error: 'toggle_disabled' });
});

app.get('/api/2fa/history', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    const history = await all('SELECT * FROM login_history WHERE user_id = ? ORDER BY id DESC LIMIT 20', [userId]);
    res.json({ history });
  } catch (err) {
    res.status(500).json({ error: 'history_failed' });
  }
});

app.get('/api/profile/:id', authRequired, async (req, res) => {
  try {
    const id = Number(req.params.id);
    if (!isStaff(req.user) && req.user.id !== id) {
      return res.status(403).json({ error: 'forbidden' });
    }
    const user = await get('SELECT id, username, email, role, subscription_role, subscription_until, premium_until, created_at FROM users WHERE id = ?', [id]);
    if (!user) return res.status(404).json({ error: 'not_found' });
    const now = new Date();
    let subscriptionActive = false;
    let premiumActive = false;
    let premiumUntil = user.premium_until;
    if (user.subscription_role === 'PREMIUM') {
      premiumUntil = user.subscription_until || user.premium_until;
      premiumActive = !premiumUntil || new Date(premiumUntil) > now;
      subscriptionActive = false;
    } else {
      subscriptionActive = !!(user.subscription_role && (!user.subscription_until || new Date(user.subscription_until) > now));
      premiumActive = !!(premiumUntil && new Date(premiumUntil) > now);
    }
    res.json({ user: { ...user, premium_until: premiumUntil }, subscriptionActive, premiumActive });
  } catch (err) {
    res.status(500).json({ error: 'profile_failed' });
  }
});

app.post('/api/keys/generate', authRequired, async (req, res) => {
  try {
    const { role, days, count } = req.body || {};
    if (!requireAdmin(req.user)) return res.status(403).json({ error: 'forbidden' });
    const total = Math.max(1, Math.min(99, Number(count) || 1));
    const createdAt = nowStamp();
    const keys = [];
    for (let i = 0; i < total; i += 1) {
      const block = () => Math.random().toString(36).substring(2, 6).toUpperCase();
      const code = `${block()}-${block()}-${block()}-${block()}`;
      await run('INSERT INTO keys (code, role, days, created_at) VALUES (?, ?, ?, ?)', [code, role, days === '∞' ? null : Number(days), createdAt]);
      keys.push(code);
    }
    await addAction(req.user.id, 'key_generate', `role:${role}`, `count:${total}`, req.user.role);
    res.json({ keys });
  } catch (err) {
    res.status(500).json({ error: 'generate_failed' });
  }
});

app.post('/api/keys/activate', authRequired, async (req, res) => {
  try {
    const { code } = req.body || {};
    const userId = req.user.id;
    const user = await get('SELECT role FROM users WHERE id = ?', [userId]);
    if (user?.role === 'BANNED') return res.status(403).json({ error: 'banned' });
    const normalizedCode = normalizeKey(code);
    if (!normalizedCode) return res.status(400).json({ error: 'key_not_found' });
    const key = await get('SELECT * FROM keys WHERE code = ?', [normalizedCode]);
    if (!key) return res.status(404).json({ error: 'key_not_found' });
    if (key.activated_by) return res.status(400).json({ error: 'key_used' });
    const activatedAt = nowStamp();
    await run('UPDATE keys SET activated_by = ?, activated_at = ? WHERE id = ?', [userId, activatedAt, key.id]);
    let until = null;
    if (key.days && Number.isFinite(key.days)) {
      const now = new Date();
      now.setDate(now.getDate() + Number(key.days));
      until = now.toISOString();
    }
    if (key.role === 'PREMIUM') {
      await run('UPDATE users SET premium_until = ? WHERE id = ?', [until, userId]);
      await addAction(userId, 'key_activate', `key:${code}`, `role:${key.role}`, req.user.role);
      return res.json({ premium_until: until });
    }
    await run('UPDATE users SET subscription_role = ?, subscription_until = ? WHERE id = ?', [key.role, until, userId]);
    await addAction(userId, 'key_activate', `key:${code}`, `role:${key.role}`, req.user.role);
    res.json({ subscription_role: key.role, subscription_until: until });
  } catch (err) {
    res.status(500).json({ error: 'activate_failed' });
  }
});

app.get('/api/admin/keys', authRequired, async (req, res) => {
  try {
    if (!requireAdmin(req.user)) return res.status(403).json({ error: 'forbidden' });
    const rows = await all('SELECT code, role, days, created_at, activated_by, activated_at FROM keys ORDER BY id DESC');
    res.json({ keys: rows });
  } catch (err) {
    res.status(500).json({ error: 'keys_failed' });
  }
});

app.post('/api/admin/keys/clear', authRequired, async (req, res) => {
  try {
    if (!requireAdmin(req.user)) return res.status(403).json({ error: 'forbidden' });
    await run('DELETE FROM keys');
    await addAction(req.user.id, 'key_clear', 'keys', 'all', req.user.role);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'clear_failed' });
  }
});

app.get('/api/admin/users', authRequired, async (req, res) => {
  try {
    if (!requireAdmin(req.user)) return res.status(403).json({ error: 'forbidden' });
    const role = req.query.role || null;
    const rows = role
      ? await all('SELECT id, username, email, role FROM users WHERE role = ? ORDER BY id DESC', [role])
      : await all('SELECT id, username, email, role FROM users ORDER BY id DESC');
    res.json({ users: rows });
  } catch (err) {
    res.status(500).json({ error: 'users_failed' });
  }
});

app.get('/api/admin/stats', authRequired, async (req, res) => {
  try {
    if (!requireAdmin(req.user)) return res.status(403).json({ error: 'forbidden' });
    const total = await get('SELECT COUNT(*) as count FROM users');
    const keys = await get('SELECT COUNT(*) as count FROM keys');
    res.json({ users: total?.count || 0, keys: keys?.count || 0, revenue: 0, downloads: 0 });
  } catch (err) {
    res.status(500).json({ error: 'stats_failed' });
  }
});

app.get('/api/admin/journal', authRequired, async (req, res) => {
  try {
    if (!requireAdmin(req.user)) return res.status(403).json({ error: 'forbidden' });
    const rows = await all(
      'SELECT actions.*, users.username as actor_name FROM actions LEFT JOIN users ON actions.actor_id = users.id ORDER BY actions.id DESC'
    );
    res.json({ actions: rows });
  } catch (err) {
    res.status(500).json({ error: 'journal_failed' });
  }
});

app.post('/api/admin/journal/clear', authRequired, async (req, res) => {
  try {
    if (!isDeveloper(req.user)) return res.status(403).json({ error: 'forbidden' });
    await run('DELETE FROM actions');
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'clear_failed' });
  }
});

app.post('/api/admin/ban', authRequired, async (req, res) => {
  try {
    const { userId, banned } = req.body || {};
    if (!requireAdmin(req.user)) return res.status(403).json({ error: 'forbidden' });
    const actor = await getUserRole(req.user.id);
    const target = await getUserRole(userId);
    if (!actor || !target) return res.status(404).json({ error: 'not_found' });
    if (actor.id === target.id) return res.status(403).json({ error: 'self_forbidden' });
    if (target.role === 'DEVELOPER') {
      return res.status(403).json({ error: 'forbidden' });
    }
    const role = banned ? 'BANNED' : 'DEFAULT';
    if (banned) {
      await run('UPDATE users SET role = ?, subscription_role = NULL, subscription_until = NULL, premium_until = NULL WHERE id = ?', [role, userId]);
      await addAction(req.user.id, 'sub_remove', `uid:${userId}`, '', req.user.role);
    } else {
      await run('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    }
    await addAction(req.user.id, banned ? 'ban' : 'unban', `uid:${userId}`, '', req.user.role);
    res.json({ ok: true, role });
  } catch (err) {
    res.status(500).json({ error: 'ban_failed' });
  }
});

app.post('/api/admin/role', authRequired, async (req, res) => {
  try {
    const { userId, role } = req.body || {};
    if (!requireAdmin(req.user)) return res.status(403).json({ error: 'forbidden' });
    const actor = await getUserRole(req.user.id);
    const target = await getUserRole(userId);
    if (!actor || !target) return res.status(404).json({ error: 'not_found' });
    if (actor.id === target.id) return res.status(403).json({ error: 'self_forbidden' });
    if (target.role === 'DEVELOPER') {
      return res.status(403).json({ error: 'forbidden' });
    }
    if (!canAssignRole(actor.role, role)) {
      return res.status(403).json({ error: 'forbidden' });
    }
    await run('UPDATE users SET role = ? WHERE id = ?', [role, userId]);
    await addAction(req.user.id, 'role_set', `uid:${userId}`, role, req.user.role);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'role_failed' });
  }
});

app.post('/api/admin/subscription/remove', authRequired, async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!requireAdmin(req.user)) return res.status(403).json({ error: 'forbidden' });
    const actor = await getUserRole(req.user.id);
    const target = await getUserRole(userId);
    if (!actor || !target) return res.status(404).json({ error: 'not_found' });
    if (target.role === 'DEVELOPER') {
      return res.status(403).json({ error: 'forbidden' });
    }
    await run('UPDATE users SET subscription_role = NULL, subscription_until = NULL, premium_until = NULL WHERE id = ?', [userId]);
    await addAction(req.user.id, 'sub_remove', `uid:${userId}`, '', req.user.role);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'sub_failed' });
  }
});

app.post('/api/admin/reset-password', authRequired, async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!requireAdmin(req.user)) return res.status(403).json({ error: 'forbidden' });
    const actor = await getUserRole(req.user.id);
    const target = await getUserRole(userId);
    if (!actor || !target) return res.status(404).json({ error: 'not_found' });
    if (target.role === 'DEVELOPER') {
      return res.status(403).json({ error: 'forbidden' });
    }
    if (actor.role === 'ADMIN' && target.role === 'ADMIN' && actor.id !== target.id) {
      return res.status(403).json({ error: 'forbidden' });
    }
    const newPassword = generateTempPassword();
    const hashed = await bcrypt.hash(String(newPassword), 10);
    await run('UPDATE users SET password = ? WHERE id = ?', [hashed, userId]);
    await addAction(req.user.id, 'password_reset', `uid:${userId}`, '', req.user.role);
    let delivered = false;
    let linked = false;
    const telegram = await get('SELECT telegram_id FROM telegram_2fa WHERE user_id = ?', [userId]);
    if (telegram?.telegram_id) {
      linked = true;
      if (telegramBot?.bot?.sendMessage) {
        try {
          await telegramBot.bot.sendMessage(
            telegram.telegram_id,
            `🔐 Ваш новый пароль: ${newPassword}\n\nПосле входа рекомендуем сменить его в профиле.`
          );
          delivered = true;
        } catch {
          delivered = false;
        }
      }
    }
    res.json({ ok: true, delivered, linked });
  } catch (err) {
    res.status(500).json({ error: 'reset_failed' });
  }
});

app.post('/api/admin/reset-hwid', authRequired, async (req, res) => {
  try {
    const { userId } = req.body || {};
    if (!requireAdmin(req.user)) return res.status(403).json({ error: 'forbidden' });
    const target = await getUserRole(userId);
    if (!target) return res.status(404).json({ error: 'not_found' });
    if (target.role === 'DEVELOPER') return res.status(403).json({ error: 'forbidden' });
    await addAction(req.user.id, 'hwid_reset', `uid:${userId}`, '', req.user.role);
    res.json({ ok: true });
  } catch (err) {
    res.status(500).json({ error: 'hwid_failed' });
  }
});

app.get('/api/tickets', authRequired, async (req, res) => {
  try {
    const userId = req.user.id;
    const tickets = await all(
      'SELECT id, title, status, created_at, updated_at FROM tickets WHERE user_id = ? ORDER BY updated_at DESC, id DESC',
      [userId]
    );
    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ error: 'tickets_failed' });
  }
});

app.get('/api/admin/tickets', authRequired, async (req, res) => {
  try {
    if (!isStaff(req.user)) return res.status(403).json({ error: 'forbidden' });
    const tickets = await all(
      'SELECT tickets.id, tickets.title, tickets.status, tickets.created_at, tickets.updated_at, users.username, users.email, users.id as user_id FROM tickets LEFT JOIN users ON tickets.user_id = users.id ORDER BY tickets.updated_at DESC, tickets.id DESC'
    );
    res.json({ tickets });
  } catch (err) {
    res.status(500).json({ error: 'tickets_failed' });
  }
});

app.post('/api/tickets', authRequired, async (req, res) => {
  try {
    const { title } = req.body || {};
    const userId = req.user.id;
    if (req.user.role === 'BANNED') {
      return res.status(403).json({ error: 'banned' });
    }
    const createdAt = nowStamp();
    const result = await run(
      'INSERT INTO tickets (user_id, title, status, created_at, updated_at) VALUES (?, ?, ?, ?, ?)',
      [userId, title || '', 'open', createdAt, createdAt]
    );
    const id = result.lastID;
    const finalTitle = title && title.trim() ? title.trim() : `Ticket #${String(id).padStart(6, '0')}`;
    await run('UPDATE tickets SET title = ? WHERE id = ?', [finalTitle, id]);
    res.json({ id, title: finalTitle, status: 'open', created_at: createdAt, updated_at: createdAt });
    broadcastToTicket(id, { type: 'ticket_created', ticketId: id });
  } catch (err) {
    res.status(500).json({ error: 'ticket_create_failed' });
  }
});

app.get('/api/tickets/:id/messages', authRequired, async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const ticket = await get('SELECT user_id FROM tickets WHERE id = ?', [ticketId]);
    if (!ticket) return res.status(404).json({ error: 'ticket_not_found' });
    const staff = isStaff(req.user);
    if (!staff && ticket.user_id !== req.user.id) return res.status(403).json({ error: 'forbidden' });
    const messages = await all(
      'SELECT ticket_messages.*, users.username as sender_name FROM ticket_messages LEFT JOIN users ON ticket_messages.sender_id = users.id WHERE ticket_id = ? ORDER BY id ASC',
      [ticketId]
    );
    const mapped = messages.map((m) => {
      let parsed = null;
      if (m.attachments) {
        try {
          parsed = JSON.parse(m.attachments);
        } catch {
          parsed = null;
        }
      }
      return { ...m, attachments: parsed };
    });
    res.json({ messages: mapped });
  } catch (err) {
    res.status(500).json({ error: 'messages_failed' });
  }
});

app.post('/api/tickets/:id/message', authRequired, async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const { text, attachments } = req.body || {};
    const hasAttachments = Array.isArray(attachments) && attachments.length > 0;
    if ((!text || !text.trim()) && !hasAttachments) return res.status(400).json({ error: 'empty_message' });
    const ticket = await get('SELECT user_id FROM tickets WHERE id = ?', [ticketId]);
    if (!ticket) return res.status(404).json({ error: 'ticket_not_found' });
    const senderId = req.user.id;
    const staff = isStaff(req.user);
    if (!staff && ticket.user_id !== senderId) return res.status(403).json({ error: 'forbidden' });
    const safeAttachments = hasAttachments ? JSON.stringify(attachments) : null;
    await run(
      'INSERT INTO ticket_messages (ticket_id, sender_id, sender_role, message, attachments, created_at) VALUES (?, ?, ?, ?, ?, ?)',
      [ticketId, senderId, req.user.role || 'DEFAULT', text ? text.trim() : '', safeAttachments, nowStamp()]
    );
    await run('UPDATE tickets SET updated_at = ? WHERE id = ?', [nowStamp(), ticketId]);
    res.json({ ok: true });
    broadcastToTicket(ticketId, { type: 'message', ticketId });
  } catch (err) {
    res.status(500).json({ error: 'message_failed' });
  }
});

app.post('/api/tickets/:id/close', authRequired, async (req, res) => {
  try {
    const ticketId = Number(req.params.id);
    const ticket = await get('SELECT user_id FROM tickets WHERE id = ?', [ticketId]);
    if (!ticket) return res.status(404).json({ error: 'ticket_not_found' });
    const staff = isStaff(req.user);
    if (!staff && ticket.user_id !== req.user.id) return res.status(403).json({ error: 'forbidden' });
    await run('UPDATE tickets SET status = ?, updated_at = ? WHERE id = ?', ['closed', nowStamp(), ticketId]);
    res.json({ ok: true });
    broadcastToTicket(ticketId, { type: 'ticket_closed', ticketId });
  } catch (err) {
    res.status(500).json({ error: 'close_failed' });
  }
});

app.post('/api/admin/tickets/clear', authRequired, async (req, res) => {
  try {
    if (!requireAdmin(req.user)) return res.status(403).json({ error: 'forbidden' });
    await run('DELETE FROM ticket_messages');
    await run('DELETE FROM tickets');
    res.json({ ok: true });
    wss.clients.forEach((client) => {
      if (client.readyState === 1) {
        client.send(JSON.stringify({ type: 'tickets_cleared' }));
      }
    });
  } catch (err) {
    res.status(500).json({ error: 'tickets_clear_failed' });
  }
});



app.use((err, req, res, next) => {
  if (err && err.message === 'CORS_NOT_ALLOWED') {
    return res.status(403).json({ error: 'cors' });
  }
  return next(err);

});

ensureSchema().then(() => ensureSeed()).then(() => {
  server.listen(PORT, () => {
    console.log(`API server running on http://localhost:${PORT}`);
  });
});
