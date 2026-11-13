const path = require('path');
const http = require('http');
const net = require('net');
const fs = require('fs');
const { spawn, exec } = require('child_process');
const express = require('express');
const WebSocket = require('ws');
const pty = require('node-pty');

const app = express();
const server = http.createServer(app);

// Only allow same-origin callers from the local machine. This guards /api/* and
// the terminal WebSocket against cross-site / DNS-rebinding requests issued by
// other pages the user may have open in their browser.
const ALLOWED_HOSTNAMES = new Set(['localhost', '127.0.0.1', '::1', '[::1]']);
function isLocalOrigin(origin) {
  if (!origin) return true; // non-browser client (curl, tests) sends no Origin
  try {
    return ALLOWED_HOSTNAMES.has(new URL(origin).hostname);
  } catch (e) {
    return false;
  }
}

const wss = new WebSocket.Server({
  server,
  path: '/terminal',
  verifyClient: (info) => isLocalOrigin(info.origin)
});

const PORT = process.env.PORT || 3820;

// Bumped whenever the HTTP API surface changes. The frontend compares this with
// its own expectation so a long-running (stale) server is detected instead of
// failing with a confusing "not valid JSON" error. scripts/ensure_server.ps1
// parses this same line to decide whether a running server needs a restart.
const API_VERSION = 14;

let currentCwd = process.cwd();

// Background OpenCode Web process tracking
let opencodeWebProcess = null;
let opencodeWebUrl = null;

function stopOpencodeWebProcess() {
  if (opencodeWebProcess) {
    try {
      exec(`taskkill /F /T /PID ${opencodeWebProcess.pid}`, () => {});
    } catch (e) {}
    opencodeWebProcess = null;
    opencodeWebUrl = null;
  }
}

// Wait (best-effort) for the OpenCode background service to come back up after a
// restart, so account switches take effect before we tell the UI they succeeded.
// Resolves either when the service answers an HTTP request or after the timeout.
function waitForServiceReady(timeoutMs) {
  timeoutMs = timeoutMs || 12000;
  return new Promise((resolve) => {
    const started = Date.now();
    const attempt = () => {
      const req = http.get('http://127.0.0.1:45278/', (res) => {
        res.resume();
        resolve();
      });
      req.on('error', () => {
        if (Date.now() - started < timeoutMs) {
          setTimeout(attempt, 500);
        } else {
          resolve();
        }
      });
      req.setTimeout(1500, () => {
        try { req.destroy(); } catch (e) {}
      });
    };
    attempt();
  });
}

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Reject API calls coming from a non-local Origin header.
app.use((req, res, next) => {
  if (req.path.startsWith('/api/') && !isLocalOrigin(req.headers.origin)) {
    return res.status(403).json({ error: 'Forbidden: cross-origin request blocked' });
  }
  next();
});

// Cached OpenCode Info
let cachedOpenCode = {
  installed: false,
  version: '1.4.3',
  path: 'opencode'
};

// Auto-cleanup stale OpenCode lock files.
// IMPORTANT: only remove lock files that are genuinely old (default 1 hour).
// A blanket wipe could disrupt an OpenCode session that is currently running.
const STALE_LOCK_MS = 60 * 60 * 1000;

function cleanupStaleLocks() {
  try {
    const home = process.env.USERPROFILE || process.env.HOME;
    const stateDir = path.join(home, '.local', 'state', 'opencode');

    // Remove a dead service.json only when its recorded pid is no longer alive.
    const serviceFile = path.join(stateDir, 'service.json');
    if (fs.existsSync(serviceFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(serviceFile, 'utf8'));
        if (data.pid) {
          try {
            process.kill(data.pid, 0);
          } catch (e) {
            // Only delete when the process is genuinely gone (ESRCH).
            // EPERM means it exists but we lack permission to signal it.
            if (e && (e.code === 'ESRCH' || e.errno === -3)) {
              try { fs.unlinkSync(serviceFile); } catch (e2) {}
            }
          }
        }
      } catch (e) {}
    }

    const locksDir = path.join(stateDir, 'locks');
    if (fs.existsSync(locksDir)) {
      const now = Date.now();
      fs.readdirSync(locksDir).forEach((f) => {
        const lockPath = path.join(locksDir, f);
        try {
          const stat = fs.statSync(lockPath);
          if (now - stat.mtimeMs > STALE_LOCK_MS) fs.unlinkSync(lockPath);
        } catch (e) {}
      });
    }
  } catch (err) {}
}
cleanupStaleLocks();

exec(process.platform === 'win32' ? 'where opencode' : 'which opencode', (err, stdout) => {
  if (!err && stdout) {
    cachedOpenCode.installed = true;
    cachedOpenCode.path = stdout.split(/\r?\n/)[0].trim();
  }
});

exec('opencode --version', (err, stdout) => {
  if (!err && stdout) {
    const vMatch = stdout.match(/v?(\d+\.\d+\.\d+[\w.-]*)/i);
    if (vMatch) cachedOpenCode.version = vMatch[1];
  }
});

// API: System & OpenCode Status
app.get('/api/status', (req, res) => {
  res.json({
    apiVersion: API_VERSION,
    opencodeInstalled: cachedOpenCode.installed,
    version: cachedOpenCode.version,
    path: cachedOpenCode.path,
    cwd: currentCwd,
    nodeVersion: process.version,
    platform: process.platform,
    geminiCliPath: path.join(__dirname, 'scripts', 'gemini_cli.js')
  });
});

// Local config for Custom AI API Keys.
// Stored OUTSIDE the repo (user config dir) so keys are never accidentally committed.
const configDir = process.env.MYOPENT_CONFIG_DIR
  || path.join(process.env.USERPROFILE || process.env.HOME || __dirname, '.config', 'myanmar-opencode-terminal');
const keysConfigFile = path.join(configDir, 'api_keys.json');
const legacyKeysFile = path.join(__dirname, 'api_keys.json');
const KEY_NAMES = [
  'GEMINI_API_KEY',
  'GROQ_API_KEY',
  'OPENROUTER_API_KEY',
  'DEEPSEEK_API_KEY',
  'OPENAI_API_KEY'
];

function readKeysFile(file) {
  try {
    if (fs.existsSync(file)) return JSON.parse(fs.readFileSync(file, 'utf8')) || {};
  } catch (e) {}
  return {};
}

function loadApiKeys() {
  // One-time migration of a legacy repo-local api_keys.json.
  if (!fs.existsSync(keysConfigFile) && fs.existsSync(legacyKeysFile)) {
    try {
      fs.mkdirSync(configDir, { recursive: true });
      fs.copyFileSync(legacyKeysFile, keysConfigFile);
      fs.unlinkSync(legacyKeysFile);
    } catch (e) {}
  }
  const keys = readKeysFile(keysConfigFile);
  for (const name of KEY_NAMES) {
    if (keys[name]) process.env[name] = keys[name];
  }
}
loadApiKeys();

// Never expose raw key values to the browser — only whether a key is stored.
function maskedKeys() {
  const keys = readKeysFile(keysConfigFile);
  const out = {};
  for (const name of KEY_NAMES) {
    const value = keys[name] || '';
    out[name] = { set: Boolean(value), hint: value ? value.slice(-4) : '' };
  }
  return out;
}

app.get('/api/keys', (req, res) => {
  res.json(maskedKeys());
});

app.post('/api/keys', (req, res) => {
  try {
    const incoming = req.body || {};
    const next = Object.assign({}, readKeysFile(keysConfigFile));
    for (const name of KEY_NAMES) {
      const value = typeof incoming[name] === 'string' ? incoming[name].trim() : '';
      if (value) next[name] = value;                 // non-empty input replaces
      if (incoming[`${name}_CLEAR`]) delete next[name]; // explicit removal flag
    }
    fs.mkdirSync(configDir, { recursive: true });
    fs.writeFileSync(keysConfigFile, JSON.stringify(next, null, 2), 'utf8');
    loadApiKeys();
    res.json({ success: true, keys: maskedKeys() });
  } catch (e) {
    res.status(500).json({ error: e.message });
  }
});

// API: Change Current Directory
app.post('/api/cwd', (req, res) => {
  const { cwd } = req.body;
  if (!cwd) {
    return res.status(400).json({ error: 'cwd required' });
  }

  try {
    const resolved = path.resolve(cwd);
    if (fs.existsSync(resolved) && fs.statSync(resolved).isDirectory()) {
      currentCwd = resolved;
      // If Web UI was running, stop it so it restarts in the new folder
      stopOpencodeWebProcess();
      return res.json({ success: true, cwd: currentCwd });
    } else {
      return res.status(400).json({ error: 'Folder does not exist' });
    }
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// Track whether a native folder dialog is currently open
let isBrowsingFolder = false;

// API: Browse Folder using Native Windows Folder Dialog
app.post('/api/browse-folder', (req, res) => {
  if (isBrowsingFolder) {
    return res.status(409).json({ busy: true, error: 'ဖိုဒါရွေးချယ်သည့် Window ဖွင့်ထားပြီးဖြစ်ပါသည်' });
  }

  isBrowsingFolder = true;
  const scriptPath = path.join(__dirname, 'scripts', 'select_folder.ps1');
  const initial = (req.body && req.body.initialPath) ? req.body.initialPath : currentCwd;

  const child = spawn('powershell.exe', [
    '-NoProfile',
    '-STA',
    '-ExecutionPolicy', 'Bypass',
    '-File', scriptPath,
    '-InitialPath', initial
  ]);

  let stdoutData = '';
  let stderrData = '';
  let responded = false;

  const sendBrowse = (status, payload) => {
    if (responded) return;
    responded = true;
    isBrowsingFolder = false;
    if (status === 200) res.json(payload);
    else res.status(status).json(payload);
  };

  child.stdout.on('data', (d) => {
    stdoutData += d.toString();
  });

  child.stderr.on('data', (d) => {
    stderrData += d.toString();
  });

  // Safety timeout: 2 minutes
  const timer = setTimeout(() => {
    try { child.kill(); } catch (e) {}
  }, 120000);

  child.on('close', (code) => {
    clearTimeout(timer);
    const selected = stdoutData.trim();
    if (selected && fs.existsSync(selected) && fs.statSync(selected).isDirectory()) {
      currentCwd = selected;
      // If Web UI was running, stop it so it restarts in the new folder
      stopOpencodeWebProcess();
      return sendBrowse(200, { success: true, cwd: currentCwd });
    }
    // No valid selection: user cancelled, or the dialog process failed.
    if (code !== 0 && stderrData.trim()) {
      return sendBrowse(200, { success: false, canceled: true, cwd: currentCwd, error: stderrData.trim() });
    }
    return sendBrowse(200, { success: false, canceled: true, cwd: currentCwd });
  });

  child.on('error', (err) => {
    clearTimeout(timer);
    return sendBrowse(500, { error: err.message });
  });
});


// API: List sub-directories for the in-app folder browser.
// Reading the local filesystem is safe here because the server only binds to
// 127.0.0.1 and every /api/* call is origin-checked.
app.get('/api/list-dirs', (req, res) => {
  const requested = typeof req.query.path === 'string' && req.query.path.trim()
    ? req.query.path.trim()
    : currentCwd;

  // No explicit path: return the list of drive roots (Windows) so the user can start anywhere.
  if (!requested || requested === 'THIS_PC') {
    const drives = [];
    for (let i = 65; i <= 90; i++) {
      const letter = String.fromCharCode(i) + ':\\';
      try {
        if (fs.existsSync(letter)) drives.push({ name: letter, path: letter });
      } catch (e) {}
    }
    return res.json({ path: null, parent: null, dirs: drives });
  }

  let resolved;
  try {
    resolved = path.resolve(requested);
  } catch (e) {
    return res.status(400).json({ error: 'Invalid path' });
  }

  let stat;
  try {
    stat = fs.statSync(resolved);
    if (!stat.isDirectory()) {
      return res.status(400).json({ error: 'Not a directory' });
    }
  } catch (e) {
    return res.status(404).json({ error: 'Folder does not exist' });
  }

  let entries = [];
  try {
    entries = fs.readdirSync(resolved, { withFileTypes: true });
  } catch (e) {
    return res.status(403).json({ error: 'Cannot read folder: ' + e.message });
  }

  const dirs = entries
    .filter((ent) => {
      try {
        if (ent.isDirectory()) return true;
        // Include junctions/symlinks that point at directories.
        if (ent.isSymbolicLink()) return fs.statSync(path.join(resolved, ent.name)).isDirectory();
      } catch (e) {}
      return false;
    })
    .map((ent) => ({ name: ent.name, path: path.join(resolved, ent.name) }))
    .sort((a, b) => a.name.localeCompare(b.name));

  const parent = path.dirname(resolved);
  return res.json({
    path: resolved,
    parent: parent === resolved ? null : parent,
    dirs
  });
});


function checkHttpReachable(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: host,
      port: port,
      path: '/',
      method: 'GET',
      timeout: 1000
    }, (res) => {
      resolve(res.statusCode >= 200 && res.statusCode < 400);
    });
    req.on('error', () => resolve(false));
    req.on('timeout', () => { req.destroy(); resolve(false); });
    req.end();
  });
}

// Probe a port and decide whether it is actually an OpenCode web UI.
// This avoids reporting an unrelated service that happens to use port 45278.
function probeOpenCodeWeb(port, host = '127.0.0.1') {
  return new Promise((resolve) => {
    const req = http.request({
      hostname: host,
      port: port,
      path: '/',
      method: 'GET',
      timeout: 1200
    }, (res) => {
      let body = '';
      res.setEncoding('utf8');
      res.on('data', (chunk) => { if (body.length < 200000) body += chunk; });
      res.on('end', () => {
        const reachable = res.statusCode >= 200 && res.statusCode < 400;
        const headerHit = /opencode/i.test(res.headers['server'] || '')
          || res.headers['x-opencode-version'] != null;
        const bodyHit = /opencode/i.test(body);
        resolve({ reachable, isOpenCode: reachable && (headerHit || bodyHit) });
      });
    });
    req.on('error', () => resolve({ reachable: false, isOpenCode: false }));
    req.on('timeout', () => { req.destroy(); resolve({ reachable: false, isOpenCode: false }); });
    req.end();
  });
}

function getAvailablePort(startPort = 4096) {
  return new Promise((resolve) => {
    const s = net.createServer();
    s.listen(startPort, '127.0.0.1', () => {
      const { port } = s.address();
      s.close(() => resolve(port));
    });
    s.on('error', () => {
      resolve(getAvailablePort(startPort + 1));
    });
  });
}

// API: OpenCode Web UI - Status
app.get('/api/opencode/web/status', async (req, res) => {
  if (opencodeWebUrl) {
    try {
      const parsed = new URL(opencodeWebUrl);
      if (await checkHttpReachable(parsed.port, parsed.hostname)) {
        return res.json({ running: true, url: opencodeWebUrl });
      }
    } catch(e) {}
  }

  // Auto-detect an already-running OpenCode 2.0 background service on port 45278.
  // probeOpenCodeWeb confirms the response looks like OpenCode so an unrelated
  // service using the same port is not falsely reported as running.
  if ((await probeOpenCodeWeb(45278)).isOpenCode) {
    opencodeWebUrl = 'http://127.0.0.1:45278/';
    return res.json({ running: true, url: opencodeWebUrl });
  }

  res.json({
    running: false,
    url: null
  });
});

// API: OpenCode Web UI - Start
app.post('/api/opencode/web/start', async (req, res) => {
  // 1. Check if OpenCode 2.0 service on 45278 is already active
  if ((await probeOpenCodeWeb(45278)).isOpenCode) {
    opencodeWebUrl = 'http://127.0.0.1:45278/';
    return res.json({ success: true, url: opencodeWebUrl });
  }

  // 2. Check if tracked opencodeWebUrl is active
  if (opencodeWebUrl) {
    try {
      const parsed = new URL(opencodeWebUrl);
      if (await checkHttpReachable(parsed.port, parsed.hostname)) {
        return res.json({ success: true, url: opencodeWebUrl });
      }
    } catch(e) {}
  }

  // 3. Try 'opencode service start'
  exec('opencode service start', async () => {
    for (let i = 0; i < 5; i++) {
      await new Promise(r => setTimeout(r, 400));
      if ((await probeOpenCodeWeb(45278)).isOpenCode) {
        opencodeWebUrl = 'http://127.0.0.1:45278/';
        return res.json({ success: true, url: opencodeWebUrl });
      }
    }

    // 4. Standalone fallback: Use 'opencode serve' (v2) or 'opencode web' (v1)
    stopOpencodeWebProcess();

    const webPort = await getAvailablePort(4096);
    const isV2 = !cachedOpenCode.version || cachedOpenCode.version.startsWith('2.');
    const subcmd = isV2 ? 'serve' : 'web';
    const cmd = `opencode ${subcmd} --port ${webPort} --hostname 127.0.0.1`;

    opencodeWebProcess = spawn('cmd.exe', ['/c', cmd], {
      cwd: currentCwd,
      env: Object.assign({}, process.env, {
        PYTHONIOENCODING: 'utf-8',
        LANG: 'en_US.UTF-8'
      })
    });

    const targetUrl = `http://127.0.0.1:${webPort}/`;
    let answered = false;
    let errorOutput = '';

    const timeoutTimer = setTimeout(() => {
      if (!answered) {
        answered = true;
        if (opencodeWebProcess) {
          opencodeWebUrl = targetUrl;
          res.json({ success: true, url: targetUrl });
        } else {
          res.status(500).json({ error: errorOutput.trim() || 'Timed out starting OpenCode Web UI' });
        }
      }
    }, 4500);

    const onData = (data) => {
      const text = data.toString();
      const match = text.match(/http:\/\/127\.0\.0\.1:\d+/);
      if (match && !answered) {
        answered = true;
        clearTimeout(timeoutTimer);
        opencodeWebUrl = match[0] + '/';
        res.json({ success: true, url: opencodeWebUrl });
      } else {
        errorOutput += text;
      }
    };

    opencodeWebProcess.stdout.on('data', onData);
    opencodeWebProcess.stderr.on('data', onData);

    opencodeWebProcess.on('exit', (code) => {
      if (!answered) {
        answered = true;
        clearTimeout(timeoutTimer);
        res.status(500).json({ error: errorOutput.trim() || `Process exited with code ${code}` });
      }
      opencodeWebProcess = null;
      opencodeWebUrl = null;
    });

    opencodeWebProcess.on('error', (err) => {
      if (!answered) {
        answered = true;
        clearTimeout(timeoutTimer);
        res.status(500).json({ error: err.message });
      }
      opencodeWebProcess = null;
      opencodeWebUrl = null;
    });
  });
});

// API: OpenCode Web UI - Stop
app.post('/api/opencode/web/stop', (req, res) => {
  stopOpencodeWebProcess();
  exec('opencode service stop', () => {
    res.json({ success: true });
  });
});

// API: Generate / fetch pairing link for OpenCode 2.0 Web UI
app.get('/api/opencode/web/pair', (req, res) => {
  exec('opencode pair', (err, stdout) => {
    if (err) return res.status(500).json({ error: err.message });
    const match = stdout.match(/http:\/\/127\.0\.0\.1:\d+\/auth\/connect\/[A-Za-z0-9_-]+/);
    if (match) {
      res.json({ success: true, link: match[0] });
    } else {
      res.status(500).json({ error: 'Pairing link could not be parsed' });
    }
  });
});

// API: List models known to the installed OpenCode CLI (used to populate the
// runner's model picker so it does not drift from the real CLI).
//
// The CLI reports whatever catalogue is live on OpenCode's side, so newly
// released free models appear here without upgrading anything. Results are cached
// briefly so the UI can poll often without spawning a CLI process every time.
const MODELS_CACHE_TTL_MS = 5 * 60 * 1000;
let modelsCache = { models: [], fetchedAt: 0 };

// Stealth/preview models that are free but carry no "-free" suffix in their id.
// Everything else is classified purely from the live id, so new "-free" models
// need no code change.
const EXTRA_FREE_MODEL_IDS = new Set(['opencode/big-pickle']);

function isFreeModelId(id) {
  return /-free$/i.test(id) || EXTRA_FREE_MODEL_IDS.has(id);
}

function fetchModelsFromCli() {
  return new Promise((resolve) => {
    const isWin = process.platform === 'win32';
    const child = isWin
      ? spawn('cmd.exe', ['/c', 'opencode', 'models'])
      : spawn('opencode', ['models']);

    let out = '';
    let done = false;
    const finish = (models) => {
      if (done) return;
      done = true;
      resolve(models);
    };

    child.stdout.on('data', (d) => { out += d.toString(); });
    child.stderr.on('data', (d) => { out += d.toString(); });
    child.on('error', () => finish([]));
    child.on('close', () => {
      const models = out
        .split(/\r?\n/)
        .map((line) => line.trim())
        .filter((line) => /^[\w.-]+\/[\w.-]+$/.test(line));
      finish([...new Set(models)]);
    });
    setTimeout(() => {
      try { child.kill(); } catch (e) {}
      finish([]);
    }, 8000);
  });
}

app.get('/api/models', async (req, res) => {
  const forceRefresh = req.query.refresh === '1';
  const isFresh = Date.now() - modelsCache.fetchedAt < MODELS_CACHE_TTL_MS;

  if (forceRefresh || !isFresh || !modelsCache.models.length) {
    const models = await fetchModelsFromCli();
    // Never let a failed probe wipe a previously known list.
    if (models.length) {
      modelsCache = { models, fetchedAt: Date.now() };
    }
  }

  res.json({
    models: modelsCache.models,
    freeModels: modelsCache.models.filter(isFreeModelId),
    fetchedAt: modelsCache.fetchedAt,
    cached: !forceRefresh && isFresh
  });
});

// API: Token / usage summary for the installed OpenCode CLI.
//
// Aggregates the local usage statistics that OpenCode already keeps (sessions,
// prompts, steps, tokens, cost, per-model breakdown) so the UI can show how many
// tokens have been consumed. Remaining quota and reset times are provider-side
// and are not exposed by the free-tier CLI, so they are reported as null here
// unless a provider key is configured (see optional Go quota below).
const USAGE_CACHE_TTL_MS = 5 * 60 * 1000;
let usageCache = { data: null, fetchedAt: 0 };

function execUsageStats(force) {
  return new Promise((resolve) => {
    const isFresh = Date.now() - usageCache.fetchedAt < USAGE_CACHE_TTL_MS;
    if (!force && isFresh && usageCache.data) return resolve(usageCache.data);

    exec('opencode stats --all --json', { maxBuffer: 16 * 1024 * 1024 }, (err, stdout) => {
      if (err || !stdout) return resolve(null);
      let parsed = null;
      try { parsed = JSON.parse(stdout); } catch (e) { parsed = null; }
      if (parsed) usageCache = { data: parsed, fetchedAt: Date.now() };
      resolve(parsed);
    });
  });
}

async function fetchUsagePayload(forceRefresh) {
  const force = !!forceRefresh;
  const isFresh = Date.now() - usageCache.fetchedAt < USAGE_CACHE_TTL_MS;
  let stats = usageCache.data;
  if (force || !isFresh || !stats) {
    const fresh = await execUsageStats(true);
    if (fresh) stats = fresh;
  }
  if (!stats) return null;

  const t = stats.tokens || {};
  const cache = t.cache || {};
  const input = Number(t.input) || 0;
  const output = Number(t.output) || 0;
  const reasoning = Number(t.reasoning) || 0;
  const cacheRead = Number(cache.read) || 0;
  const cacheWrite = Number(cache.write) || 0;
  const totalTokens = input + output + reasoning + cacheRead + cacheWrite;

  // Optional OpenCode Go quota: only available when a Zen/Go API key is configured.
  let quota = null;
  const apiKey = process.env.OPENCODE_API_KEY
    || process.env.OPENCODE_ZEN_API_KEY
    || process.env.OPENCODE_GO_API_KEY;
  if (apiKey) {
    try {
      const https = require('https');
      quota = await new Promise((resolve) => {
        const req = https.get('https://opencode.ai/zen/go/v1/usage', {
          headers: { Authorization: 'Bearer ' + apiKey, 'x-opencode-org-id': process.env.OPENCODE_ORG_ID || '' },
          timeout: 8000
        }, (resp) => {
          let body = '';
          resp.setEncoding('utf8');
          resp.on('data', (c) => { if (body.length < 100000) body += c; });
          resp.on('end', () => {
            try {
              const j = JSON.parse(body);
              const u = j && j.usage ? j.usage : j;
              resolve(u || null);
            } catch (e) { resolve(null); }
          });
        });
        req.on('error', () => resolve(null));
        req.on('timeout', () => { try { req.destroy(); } catch (e) {} resolve(null); });
      });
    } catch (e) { quota = null; }
  }

  return {
    success: true,
    used: totalTokens,
    usedTokens: totalTokens,
    remaining: null,
    remainingTokens: null,
    resetAt: null,
    reset: null,
    limit: null,
    tokens: {
      input,
      output,
      reasoning,
      cache: { read: cacheRead, write: cacheWrite },
      total: totalTokens
    },
    cost: Number(stats.cost) || 0,
    sessions: Number(stats.sessions) || 0,
    subagents: Number(stats.subagents) || 0,
    prompts: Number(stats.prompts) || 0,
    steps: Number(stats.steps) || 0,
    models: Array.isArray(stats.models) ? stats.models : [],
    activeDays: Number(stats.activeDays) || 0,
    streak: Number(stats.streak) || 0,
    fetchedAt: usageCache.fetchedAt,
    cached: !force && isFresh,
    quota
  };
}

app.get('/api/usage', async (req, res) => {
  try {
    const payload = await fetchUsagePayload(req.query.refresh === '1');
    if (!payload) return res.status(500).json({ success: false, error: 'Usage data unavailable' });
    res.json(payload);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// Aliases for compatibility with different client naming.
app.get('/api/token-usage', async (req, res) => {
  try {
    const payload = await fetchUsagePayload(req.query.refresh === '1');
    if (!payload) return res.status(500).json({ success: false, error: 'Usage data unavailable' });
    res.json(payload);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});
app.get('/api/tokens', async (req, res) => {
  try {
    const payload = await fetchUsagePayload(req.query.refresh === '1');
    if (!payload) return res.status(500).json({ success: false, error: 'Usage data unavailable' });
    res.json(payload);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});
app.get('/api/quota', async (req, res) => {
  try {
    const payload = await fetchUsagePayload(req.query.refresh === '1');
    if (!payload) return res.status(500).json({ success: false, error: 'Usage data unavailable' });
    res.json(payload);
  } catch (e) {
    res.status(500).json({ success: false, error: e.message });
  }
});

// API: Direct AI Prompt Runner (Streams response)
app.post('/api/opencode/run', (req, res) => {
  const { prompt, model } = req.body;
  if (!prompt) {
    return res.status(400).send('Prompt is required');
  }
  if (model && !/^[\w./-]+$/.test(model)) {
    return res.status(400).send('Invalid model');
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  const args = ['run', prompt];
  if (model) {
    args.push('-m', model);
  }
  args.push('--dir', currentCwd);

  // On Windows the OpenCode CLI is the `opencode.cmd` shim, which must be run
  // through cmd.exe (`shell`/`.cmd` files cannot be spawned directly by Node).
  const runner = process.platform === 'win32'
    ? spawn('cmd.exe', ['/c', 'opencode', ...args], {
        cwd: currentCwd,
        env: Object.assign({}, process.env, {
          PYTHONIOENCODING: 'utf-8',
          LANG: 'en_US.UTF-8'
        })
      })
    : spawn('opencode', args, {
        cwd: currentCwd,
        env: Object.assign({}, process.env, {
          PYTHONIOENCODING: 'utf-8',
          LANG: 'en_US.UTF-8'
        })
      });

  runner.stdout.on('data', (chunk) => {
    res.write(chunk);
  });

  runner.stderr.on('data', (chunk) => {
    res.write(chunk);
  });

  runner.on('close', () => {
    res.end();
  });

  runner.on('error', (err) => {
    res.write(`\n[Execution error: ${err.message}]`);
    res.end();
  });

  res.on('close', () => {
    if (!res.writableEnded) {
      try {
        runner.kill();
      } catch (e) {}
    }
  });
});

// Direct Route for Standalone Gemini Web UI tab
app.get('/gemini', (req, res) => {
  res.redirect('/?tab=gemini');
});

// API: List files in current project directory for quick attachment
app.get('/api/project-files', (req, res) => {
  try {
    const requestedPath = req.query.dir ? path.resolve(req.query.dir) : currentCwd;
    if (!fs.existsSync(requestedPath)) {
      return res.status(404).json({ error: 'Folder does not exist' });
    }
    const entries = fs.readdirSync(requestedPath, { withFileTypes: true });
    const files = [];
    for (const ent of entries) {
      if (ent.name.startsWith('.') || ent.name === 'node_modules') continue;
      if (ent.isFile()) {
        try {
          const stat = fs.statSync(path.join(requestedPath, ent.name));
          files.push({
            name: ent.name,
            path: path.join(requestedPath, ent.name),
            size: stat.size
          });
        } catch (e) {}
      }
    }
    res.json({ cwd: requestedPath, files });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Read a file safely from project workspace for AI context
app.post('/api/file-content', (req, res) => {
  const { filePath } = req.body || {};
  if (!filePath || typeof filePath !== 'string') {
    return res.status(400).json({ error: 'filePath is required' });
  }

  try {
    const resolved = path.isAbsolute(filePath) ? path.resolve(filePath) : path.resolve(currentCwd, filePath);
    if (!fs.existsSync(resolved)) {
      return res.status(404).json({ error: 'File does not exist' });
    }
    const stat = fs.statSync(resolved);
    if (!stat.isFile()) {
      return res.status(400).json({ error: 'Target is not a regular file' });
    }
    if (stat.size > 1024 * 1024) {
      return res.status(400).json({ error: 'File is too large (> 1MB)' });
    }
    const content = fs.readFileSync(resolved, 'utf8');
    res.json({
      success: true,
      path: resolved,
      filename: path.basename(resolved),
      size: stat.size,
      content
    });
  } catch (err) {
    res.status(500).json({ error: err.message });
  }
});

// API: Gemini Status and Available Models
const GEMINI_MODELS = [
  { id: 'gemini-2.5-flash', name: 'Gemini 2.5 Flash', desc: 'အလွန်မြန်ဆန်ပြီး စွမ်းဆောင်ရည်မြင့်မား (Recommended)' },
  { id: 'gemini-2.5-pro', name: 'Gemini 2.5 Pro', desc: 'နက်နဲသော အကြောင်းအရာများနှင့် ရှုပ်ထွေးသော coding အတွက် အကောင်းဆုံး' },
  { id: 'gemini-2.0-flash', name: 'Gemini 2.0 Flash', desc: 'ခေတ်မီ အမြန်ဆုံး မျိုးဆက်သစ် မော်ဒယ်' },
  { id: 'gemini-1.5-pro', name: 'Gemini 1.5 Pro', desc: 'Context ရှည်လျားစွာ နားလည်နိုင်သော မော်ဒယ်' },
  { id: 'gemini-1.5-flash', name: 'Gemini 1.5 Flash', desc: 'ပေါ့ပါးမြန်ဆန်သော မော်ဒယ်' }
];

app.get('/api/gemini/status', (req, res) => {
  const keys = readKeysFile(keysConfigFile);
  const key = process.env.GEMINI_API_KEY || keys.GEMINI_API_KEY || '';
  res.json({
    configured: Boolean(key),
    hint: key ? key.slice(-4) : '',
    models: GEMINI_MODELS
  });
});

// API: Direct Gemini AI Runner & Chat (Streams response)
app.post('/api/gemini/run', async (req, res) => {
  const { prompt, model = 'gemini-2.5-flash', history = [], files = [] } = req.body || {};
  if (!prompt || typeof prompt !== 'string') {
    return res.status(400).send('Prompt is required');
  }

  const keys = readKeysFile(keysConfigFile);
  const apiKey = process.env.GEMINI_API_KEY || keys.GEMINI_API_KEY || '';
  if (!apiKey) {
    return res.status(400).send('⚠️ Gemini API Key မရှိသေးပါ။ ညာဘက်ထိပ်ရှိ ⚙️ ဖောင့်/အပြင်အဆင် > API Keys ထဲတွင် Gemini API Key ထည့်သွင်းပေးပါ။');
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  const contents = [];
  if (Array.isArray(history)) {
    for (const h of history) {
      if (h && h.role && h.text) {
        contents.push({
          role: h.role === 'user' ? 'user' : 'model',
          parts: [{ text: String(h.text) }]
        });
      }
    }
  }

  let userText = prompt;
  if (Array.isArray(files) && files.length > 0) {
    const fileSnippets = files.map((f) => `=== [Project File: ${f.name || f.path}] ===\n${f.content}\n=== [End of File] ===`).join('\n\n');
    userText = `[Attached Project Context Files]:\n\n${fileSnippets}\n\n[User Instruction]:\n${prompt}`;
  }

  contents.push({
    role: 'user',
    parts: [{ text: userText }]
  });

  const abortController = new AbortController();
  res.on('close', () => {
    if (!res.writableEnded) {
      abortController.abort();
    }
  });

  const targetModel = /^[\w.-]+$/.test(model) ? model : 'gemini-2.5-flash';
  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(targetModel)}:streamGenerateContent?alt=sse&key=${encodeURIComponent(apiKey)}`;

  try {
    const upstreamRes = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents,
        generationConfig: {
          temperature: 0.7
        }
      }),
      signal: abortController.signal
    });

    if (!upstreamRes.ok) {
      let errText = '';
      try {
        const errJson = await upstreamRes.json();
        errText = errJson.error ? errJson.error.message : JSON.stringify(errJson);
      } catch (e) {
        errText = upstreamRes.statusText;
      }
      res.write(`\n[Gemini API Error: ${errText}]`);
      return res.end();
    }

    const reader = upstreamRes.body.getReader();
    const decoder = new TextDecoder('utf-8');
    let buffer = '';

    while (true) {
      const { done, value } = await reader.read();
      if (done) break;
      buffer += decoder.decode(value, { stream: true });

      const lines = buffer.split('\n');
      buffer = lines.pop();

      for (const line of lines) {
        const trimmed = line.trim();
        if (!trimmed.startsWith('data:')) continue;
        const jsonStr = trimmed.slice(5).trim();
        if (!jsonStr || jsonStr === '[DONE]') continue;

        try {
          const parsed = JSON.parse(jsonStr);
          const candidates = parsed.candidates || [];
          if (candidates.length && candidates[0].content && candidates[0].content.parts) {
            for (const part of candidates[0].content.parts) {
              if (part.text) {
                res.write(part.text);
              }
            }
          }
        } catch (e) {}
      }
    }

    res.end();
  } catch (err) {
    if (!abortController.signal.aborted) {
      res.write(`\n[Connection Error: ${err.message}]`);
    }
    res.end();
  }
});

// API: List OpenCode accounts and credentials (sanitized, secrets stripped)
app.get('/api/auth/accounts', (req, res) => {
  if (!cachedOpenCode.installed) {
    return res.json({ success: false, installed: false, accounts: [] });
  }

  exec('opencode auth export', { maxBuffer: 1024 * 1024 }, (err, stdout) => {
    if (err) {
      return res.json({ success: false, error: err.message, accounts: [] });
    }
    try {
      const raw = JSON.parse(stdout);
      if (!Array.isArray(raw)) {
        return res.json({ success: true, installed: true, accounts: [] });
      }
      const accounts = raw.map(item => {
        const isKey = item.value?.type === 'key';
        const email = item.value?.metadata?.email || null;
        const orgName = item.value?.metadata?.orgName || null;
        const accountId = item.value?.metadata?.accountID || null;
        let hint = null;
        if (isKey && item.value?.key) {
          hint = String(item.value.key).slice(-4);
        }
        return {
          id: item.id,
          integrationID: item.integrationID,
          label: item.label || item.integrationID,
          active: !!item.active,
          type: item.value?.type || 'unknown',
          email,
          orgName,
          accountId,
          hint
        };
      });
      const activeOpenCode = accounts.find(a => a.integrationID === 'opencode' && a.active);
      return res.json({
        success: true,
        installed: true,
        accounts,
        activeAccount: activeOpenCode || accounts.find(a => a.active) || null
      });
    } catch (parseErr) {
      return res.json({ success: false, error: parseErr.message, accounts: [] });
    }
  });
});

function stripAnsi(str) {
  return String(str || '').replace(/\x1b\[[0-9;]*[a-zA-Z]/g, '');
}

function runAuthSwitch(target, credentialId) {
  return new Promise((resolve, reject) => {
    // Try --standalone first to avoid background service plugin activation race conditions
    exec(`opencode auth switch --standalone "${target}" "${credentialId}"`, (err1, stdout1, _stderr1) => {
      if (!err1) return resolve({ stdout: stdout1 });
      setTimeout(() => {
        exec(`opencode auth switch --standalone "${target}" "${credentialId}"`, (err2, stdout2, stderr2) => {
          if (!err2) return resolve({ stdout: stdout2 });
          exec(`opencode auth switch "${target}" "${credentialId}"`, (err3, stdout3, stderr3) => {
            if (!err3) return resolve({ stdout: stdout3 });
            const msg = stripAnsi(stderr3 || stdout3 || stderr2 || stdout2 || err3.message).trim();
            reject(new Error(msg));
          });
        });
      }, 500);
    });
  });
}

function runAuthLogout(target, credentialId) {
  return new Promise((resolve, reject) => {
    exec(`opencode auth logout --standalone "${target}" "${credentialId}"`, (err1, stdout1, _stderr1) => {
      if (!err1) return resolve({ stdout: stdout1 });
      setTimeout(() => {
        exec(`opencode auth logout "${target}" "${credentialId}"`, (err2, stdout2, stderr2) => {
          if (!err2) return resolve({ stdout: stdout2 });
          const msg = stripAnsi(stderr2 || stdout2 || err2.message).trim();
          reject(new Error(msg));
        });
      }, 500);
    });
  });
}

// API: Switch active account for an integration
app.post('/api/auth/switch', async (req, res) => {
  const { target, credentialId } = req.body || {};
  if (!target || !credentialId) {
    return res.status(400).json({ error: 'target and credentialId required' });
  }
  if (!/^[\w.-]+$/.test(target) || !/^[\w.-]+$/.test(credentialId)) {
    return res.status(400).json({ error: 'Invalid identifier' });
  }

  try {
    await runAuthSwitch(target, credentialId);
    // Bust models catalogue cache so models matching the new account are refreshed
    modelsCache = { models: [], fetchedAt: 0 };
    // Terminate running web server process and restart OpenCode background service so new credentials take effect
    stopOpencodeWebProcess();
    exec('opencode service restart', () => {
      // Make sure the new account is actually live before responding, so the
      // frontend does not reload the Web UI against a half-restarted service.
      waitForServiceReady(15000).then(() => {
        return res.json({ success: true, message: 'Switched successfully' });
      });
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// API: Log out an account/credential
app.post('/api/auth/logout', async (req, res) => {
  const { target, credentialId } = req.body || {};
  if (!target || !credentialId) {
    return res.status(400).json({ error: 'target and credentialId required' });
  }
  if (!/^[\w.-]+$/.test(target) || !/^[\w.-]+$/.test(credentialId)) {
    return res.status(400).json({ error: 'Invalid identifier' });
  }

  try {
    await runAuthLogout(target, credentialId);
    modelsCache = { models: [], fetchedAt: 0 };
    stopOpencodeWebProcess();
    exec('opencode service restart', () => {
      waitForServiceReady(15000).then(() => {
        return res.json({ success: true, message: 'Logged out successfully' });
      });
    });
  } catch (err) {
    return res.status(500).json({ error: err.message });
  }
});

// API: Launch external login script in a visible terminal window
app.post('/api/auth/launch-login', (req, res) => {
  const batPath = path.join(__dirname, 'Login-OpenCode.bat');
  const cmd = fs.existsSync(batPath)
    ? `start "" "${batPath}"`
    : 'start "OpenCode Login" cmd /k opencode auth login';
  exec(cmd, (err) => {
    if (err) return res.status(500).json({ error: err.message });
    return res.json({ success: true });
  });
});

// Any unmatched /api/* route answers with JSON (never the HTML index page) so the
// browser can tell "endpoint missing" apart from "server unreachable".
app.use('/api', (req, res) => {
  res.status(404).json({
    error: 'Unknown API endpoint: ' + req.originalUrl,
    apiVersion: API_VERSION
  });
});

// WebSocket Terminal Management
wss.on('connection', (ws) => {
  let ptyProcess = null;

  function spawnTerminal(shellType = 'powershell', customCwd = null) {
    if (ptyProcess) {
      try {
        ptyProcess.kill();
      } catch (e) {}
      ptyProcess = null;
    }

    const targetCwd = customCwd || currentCwd;
    const isPwsh = shellType === 'powershell';
    const shell = isPwsh ? 'powershell.exe' : 'cmd.exe';
    
    // Configure UTF-8 encoding specifically for Windows console session
    const args = isPwsh
      ? [
          '-NoLogo',
          '-NoExit',
          '-Command',
          '[Console]::OutputEncoding = [System.Text.Encoding]::UTF8; [Console]::InputEncoding = [System.Text.Encoding]::UTF8; $OutputEncoding = [System.Text.Encoding]::UTF8; chcp 65001 > $null; Clear-Host;'
        ]
      : ['/k', 'chcp 65001 > nul'];

    try {
      ptyProcess = pty.spawn(shell, args, {
        name: 'xterm-256color',
        cols: 80,
        rows: 24,
        cwd: targetCwd,
        env: Object.assign({}, process.env, {
          LANG: 'en_US.UTF-8',
          PYTHONIOENCODING: 'utf-8',
          TERM: 'xterm-256color'
        })
      });

      ptyProcess.onData((data) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'output', data }));
        }
      });

      ptyProcess.onExit(({ exitCode }) => {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'exit', data: exitCode }));
        }
      });

      // Send initial CWD
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'cwd', data: targetCwd }));
      }
    } catch (err) {
      console.error('Failed to spawn pty:', err);
      if (ws.readyState === WebSocket.OPEN) {
        ws.send(JSON.stringify({ type: 'output', data: `\r\nError launching shell: ${err.message}\r\n` }));
      }
    }
  }

  ws.on('message', (message) => {
    try {
      const msg = JSON.parse(message);
      if (msg.type === 'init') {
        spawnTerminal(msg.shell || 'powershell');
        if (ptyProcess && msg.cols && msg.rows) {
          ptyProcess.resize(msg.cols, msg.rows);
        }
      } else if (msg.type === 'input') {
        if (ptyProcess) {
          ptyProcess.write(msg.data);
        }
      } else if (msg.type === 'resize') {
        if (ptyProcess && msg.cols && msg.rows) {
          ptyProcess.resize(msg.cols, msg.rows);
        }
      } else if (msg.type === 'restart') {
        spawnTerminal(msg.shell || 'powershell', msg.cwd);
      } else if (msg.type === 'ping') {
        if (ws.readyState === WebSocket.OPEN) {
          ws.send(JSON.stringify({ type: 'pong' }));
        }
      }
    } catch (e) {
      // Fallback: direct input string
      if (ptyProcess) {
        ptyProcess.write(message.toString());
      }
    }
  });

  ws.on('error', (err) => {
    // Prevent unhandled error event from crashing the server
    console.error('WebSocket client error:', err.message);
  });

  ws.on('close', () => {
    if (ptyProcess) {
      try {
        ptyProcess.kill();
      } catch (e) {}
      ptyProcess = null;
    }
  });
});

// Prevent unhandled errors or rejections from crashing the process
process.on('uncaughtException', (err) => {
  console.error('[Unhandled Exception]:', err.message);
});
process.on('unhandledRejection', (reason) => {
  console.error('[Unhandled Rejection]:', reason);
});

// Cleanup on process termination
function cleanUp() {
  stopOpencodeWebProcess();
}
process.on('SIGINT', () => { cleanUp(); process.exit(); });
process.on('SIGTERM', () => { cleanUp(); process.exit(); });
process.on('exit', () => { cleanUp(); });

// Start HTTP Server
server.listen(PORT, '127.0.0.1', () => {
  console.log(`=======================================================`);
  console.log(`🇲🇲 Myanmar OpenCode Terminal Server running on:`);
  console.log(`👉 http://localhost:${PORT}`);
  console.log(`=======================================================`);
});
