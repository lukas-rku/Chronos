import 'dotenv/config';
import express from 'express';
import session from 'express-session';
import cookieParser from 'cookie-parser';
import path from 'path';
import crypto from 'crypto';
import { createServer as createViteServer } from 'vite';

declare module 'express-session' {
  interface SessionData {
    userId: number;
  }
}

const PORT = 3000;
const app = express();
app.set('trust proxy', 1);

app.use(express.json());
app.use(cookieParser());
app.use(
  session({
    secret: process.env.SESSION_SECRET || 'fallback-dev-secret',
    resave: false,
    saveUninitialized: false,
    cookie: {
      secure: process.env.NODE_ENV === 'production',
      sameSite: process.env.NODE_ENV === 'production' ? 'none' : 'lax',
      httpOnly: true,
      maxAge: 30 * 24 * 60 * 60 * 1000 // 30 days
    }
  })
);

// --- DATABASE SETUP (Simple JSON file for dev) ---
import fs from 'fs';

const dbPath = path.join(process.cwd(), 'database.json');
let dbInstance: { users: any[], time_entries: any[] } = { users: [], time_entries: [] };

try {
  if (fs.existsSync(dbPath)) {
    dbInstance = JSON.parse(fs.readFileSync(dbPath, 'utf8'));
  }
} catch (err) {
  console.warn('Could not read database.json, starting fresh.');
}

const saveDb = () => {
  try {
    fs.writeFileSync(dbPath, JSON.stringify(dbInstance, null, 2));
  } catch (err) {
    console.warn('Failed to save to database.json', err);
  }
};

const dbRun = (sql: string, params: any[] = []) => new Promise((resolve) => resolve({ lastID: Date.now() }));
const dbGet = async (query: string, params: any[] = []): Promise<any> => {
  if (query.includes('FROM users WHERE api_key = ?')) {
    return dbInstance.users.find(u => u.api_key === params[0]);
  }
  if (query.includes('FROM users WHERE authentik_sub = ?')) {
    return dbInstance.users.find(u => u.authentik_sub === params[0]);
  }
  if (query.includes('FROM users WHERE id = ?')) {
    return dbInstance.users.find(u => u.id === params[0]);
  }
  return null;
};
const dbAll = async (query: string, params: any[] = []): Promise<any[]> => {
  if (query.includes('FROM time_entries WHERE user_id = ?')) {
    return dbInstance.time_entries.filter(t => t.user_id === params[0]).sort((a, b) => new Date(b.timestamp).getTime() - new Date(a.timestamp).getTime());
  }
  return [];
};

const dbInsertUser = async (sub: string, email: string, name: string, apiKey: string) => {
  const newUser = { id: Date.now(), authentik_sub: sub, email, name, api_key: apiKey };
  dbInstance.users.push(newUser);
  saveDb();
  return newUser;
};

const dbInsertEntry = async (userId: number, type: string, customTimestamp?: string) => {
  const now = new Date();
  
  // If manual entry (YYYY-MM-DD HH:mm:00), we parse it as local time, then save ISO
  let timestampToSave = now.toISOString();
  if (customTimestamp) {
    timestampToSave = new Date(customTimestamp).toISOString();
  }

  const newEntry = { id: Date.now(), user_id: userId, type, timestamp: timestampToSave };
  dbInstance.time_entries.push(newEntry);
  saveDb();
  return newEntry;
};

// --- AUTH MIDDLEWARE ---
const requireAuth = (req: any, res: any, next: any) => {
  if (req.session && req.session.userId) {
    return next();
  }
  return res.status(401).json({ error: 'Unauthorized. Please log in.' });
};

const requireApiKey = async (req: any, res: any, next: any) => {
  const apiKey = req.headers['x-api-key'] || req.query.api_key;
  if (!apiKey) return res.status(401).json({ error: 'Missing API key' });
  try {
    const user = await dbGet('SELECT * FROM users WHERE api_key = ?', [apiKey]);
    if (!user) return res.status(401).json({ error: 'Invalid API key' });
    req.user = user;
    next();
  } catch (error) {
    res.status(500).json({ error: 'Database error' });
  }
};

// --- AUTHENTIK OAUTH ROUTES ---
const getOidcEndpoints = async (issuerUrl: string) => {
  const cleanIssuer = issuerUrl.replace(/\/$/, '');
  const discoveryUrl = `${cleanIssuer}/.well-known/openid-configuration`;
  
  try {
    const res = await fetch(discoveryUrl);
    if (res.ok) {
      const config = await res.json();
      if (config.authorization_endpoint && config.token_endpoint && config.userinfo_endpoint) {
        return {
          authorization: config.authorization_endpoint,
          token: config.token_endpoint,
          userinfo: config.userinfo_endpoint
        };
      }
    }
  } catch (e) {
    console.warn(`OIDC Discovery failed for ${discoveryUrl}, falling back to defaults:`, e);
  }

  // Common fallbacks
  return {
    authorization: `${cleanIssuer}/authorize`,
    token: `${cleanIssuer}/token`,
    userinfo: `${cleanIssuer}/userinfo`
  };
};

app.get('/api/auth/url', async (req, res) => {
  const issuerUrl = process.env.AUTHENTIK_ISSUER_URL;
  if (!issuerUrl || !process.env.AUTHENTIK_CLIENT_ID) {
    return res.status(500).json({ error: 'Authentik not configured' });
  }
  
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const redirectUri = `${appUrl}/auth/callback`;
  
  const endpoints = await getOidcEndpoints(issuerUrl);

  const params = new URLSearchParams({
    response_type: 'code',
    client_id: process.env.AUTHENTIK_CLIENT_ID,
    redirect_uri: redirectUri,
    scope: 'openid profile email'
  });

  res.json({ url: `${endpoints.authorization}?${params.toString()}` });
});

app.get(['/auth/callback', '/auth/callback/'], async (req, res) => {
  const { code } = req.query;
  const appUrl = (process.env.APP_URL || 'http://localhost:3000').replace(/\/$/, '');
  const redirectUri = `${appUrl}/auth/callback`;
  const issuerUrl = process.env.AUTHENTIK_ISSUER_URL?.replace(/\/$/, '') || '';

  if (!code) return res.status(400).send('No code provided');

  try {
    const endpoints = await getOidcEndpoints(issuerUrl);
    
    const tokenRes = await fetch(endpoints.token, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/x-www-form-urlencoded',
        'Authorization': 'Basic ' + Buffer.from(`${process.env.AUTHENTIK_CLIENT_ID}:${process.env.AUTHENTIK_CLIENT_SECRET}`).toString('base64')
      },
      body: new URLSearchParams({
        grant_type: 'authorization_code',
        code: code as string,
        redirect_uri: redirectUri
      })
    });
    
    if (!tokenRes.ok) throw new Error('Token fetch failed: ' + await tokenRes.text());
    const tokenData = await tokenRes.json();
    
    const userRes = await fetch(endpoints.userinfo, {
      headers: { 'Authorization': `Bearer ${tokenData.access_token}` }
    });
    
    if (!userRes.ok) throw new Error('UserInfo fetch failed: ' + await userRes.text());
    const userInfo = await userRes.json();
    
    const sub = userInfo.sub;
    const email = userInfo.email || '';
    const name = userInfo.name || userInfo.preferred_username || 'User';
    
      let user: any = await dbGet('SELECT * FROM users WHERE authentik_sub = ?', [sub]);
    if (!user) {
      const apiKey = crypto.randomBytes(32).toString('hex');
      user = await dbInsertUser(sub, email, name, apiKey);
    }
    
    req.session.userId = user.id;
    
    res.send(`
      <html>
        <body>
          <script>
            if (window.opener) {
              window.opener.postMessage({ type: 'OAUTH_AUTH_SUCCESS' }, '*');
              window.close();
            } else {
              window.location.href = '/';
            }
          </script>
          <p>Authentication successful. This window should close automatically.</p>
        </body>
      </html>
    `);
  } catch (err: any) {
    console.error('OAuth Error:', err);
    res.status(500).send(`Authentication failed: ${err.message}`);
  }
});

// --- API ROUTES ---
app.get('/api/me', requireAuth, async (req, res) => {
  try {
    const user = await dbGet('SELECT id, email, name, api_key FROM users WHERE id = ?', [req.session.userId]);
    res.json(user);
  } catch(e) {
    res.status(500).json({error: 'Server error'});
  }
});

app.post('/api/logout', (req, res) => {
  req.session.destroy(() => {
    res.json({ success: true });
  });
});

app.post('/api/action', requireAuth, async (req, res) => {
  const { type } = req.body;
  if (!['in', 'out', 'break_start', 'break_end'].includes(type)) {
    return res.status(400).json({ error: 'Invalid action type' });
  }
  try {
    await dbInsertEntry(req.session.userId!, type);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Failed to record action' });
  }
});

app.post('/api/manual_entry', requireAuth, async (req, res) => {
  const { type, timestamp } = req.body;
  if (!['in', 'out', 'break_start', 'break_end'].includes(type) || !timestamp) {
    return res.status(400).json({ error: 'Invalid input' });
  }
  try {
    await dbInsertEntry(req.session.userId!, type, timestamp);
    res.json({ success: true });
  } catch(e) {
    res.status(500).json({ error: 'Failed to record action' });
  }
});

app.get('/api/entries', requireAuth, async (req, res) => {
  try {
    const entries = await dbAll('SELECT * FROM time_entries WHERE user_id = ? ORDER BY timestamp DESC', [req.session.userId]);
    res.json(entries);
  } catch(e) {
    res.status(500).json({ error: 'Failed to fetch entries' });
  }
});

app.post('/api/v1/action', requireApiKey, async (req: any, res: any) => {
  const { type } = req.body;
  if (!['in', 'out', 'break_start', 'break_end'].includes(type)) {
    return res.status(400).json({ error: 'Invalid action type' });
  }
  try {
    await dbInsertEntry(req.user.id, type);
    res.json({ success: true, message: `Clocked ${type} successfully` });
  } catch(e) {
    res.status(500).json({ error: 'Failed to record action' });
  }
});

async function startServer() {
  if (process.env.NODE_ENV !== 'production') {
    const vite = await createViteServer({
      server: { middlewareMode: true },
      appType: 'spa',
    });
    app.use(vite.middlewares);
  } else {
    const distPath = path.join(process.cwd(), 'dist');
    app.use(express.static(distPath));
    app.get('*', (req, res) => {
      res.sendFile(path.join(distPath, 'index.html'));
    });
  }

  app.listen(PORT, '0.0.0.0', () => {
    console.log(`Server running on http://0.0.0.0:${PORT}`);
  });
}

startServer();
