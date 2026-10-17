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
let currentCwd = process.cwd();

// Background OpenCode Web process tracking
let opencodeWebProcess = null;
let opencodeWebUrl = null;

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
    opencodeInstalled: cachedOpenCode.installed,
    version: cachedOpenCode.version,
    path: cachedOpenCode.path,
    cwd: currentCwd,
    nodeVersion: process.version,
    platform: process.platform
  });
});

// Local config for Custom AI API Keys.
// Stored OUTSIDE the repo (user config dir) so keys are never accidentally committed.
const configDir = process.env.MYOPENT_CONFIG_DIR
  || path.join(process.env.USERPROFILE || process.env.HOME || __dirname, '.config', 'myanmar-opencode-terminal');
const keysConfigFile = path.join(configDir, 'api_keys.json');
const legacyKeysFile = path.join(__dirname, 'api_keys.json');
const KEY_NAMES = ['GEMINI_API_KEY', 'DEEPSEEK_API_KEY', 'OPENAI_API_KEY'];

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
      if (opencodeWebProcess) {
        try { exec(`taskkill /F /T /PID ${opencodeWebProcess.pid}`, () => {}); } catch(e) {}
        opencodeWebProcess = null;
        opencodeWebUrl = null;
      }
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
      if (opencodeWebProcess) {
        try { exec(`taskkill /F /T /PID ${opencodeWebProcess.pid}`, () => {}); } catch(e) {}
        opencodeWebProcess = null;
        opencodeWebUrl = null;
      }
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
    if (opencodeWebProcess) {
      try { exec(`taskkill /F /T /PID ${opencodeWebProcess.pid}`, () => {}); } catch(e) {}
      opencodeWebProcess = null;
      opencodeWebUrl = null;
    }

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
  if (opencodeWebProcess) {
    try {
      exec(`taskkill /F /T /PID ${opencodeWebProcess.pid}`, () => {});
    } catch (e) {}
    opencodeWebProcess = null;
    opencodeWebUrl = null;
  }
  res.json({ success: true });
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
app.get('/api/models', (req, res) => {
  const isWin = process.platform === 'win32';
  const child = isWin
    ? spawn('cmd.exe', ['/c', 'opencode', 'models'])
    : spawn('opencode', ['models']);

  let out = '';
  let answered = false;
  const finish = (models) => {
    if (answered) return;
    answered = true;
    res.json({ models });
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

  req.on('close', () => {
    try {
      runner.kill();
    } catch (e) {}
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

  ws.on('close', () => {
    if (ptyProcess) {
      try {
        ptyProcess.kill();
      } catch (e) {}
      ptyProcess = null;
    }
  });
});

// Cleanup on process termination
function cleanUp() {
  if (opencodeWebProcess) {
    try {
      exec(`taskkill /F /T /PID ${opencodeWebProcess.pid}`, () => {});
    } catch (e) {}
  }
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
