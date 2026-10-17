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
const wss = new WebSocket.Server({ server, path: '/terminal' });

const PORT = process.env.PORT || 3820;
let currentCwd = process.cwd();

// Background OpenCode Web process tracking
let opencodeWebProcess = null;
let opencodeWebUrl = null;

app.use(express.json());
app.use(express.static(path.join(__dirname, 'public')));

// Cached OpenCode Info
let cachedOpenCode = {
  installed: true,
  version: '1.4.3',
  path: 'opencode'
};

// Auto-cleanup stale OpenCode lock files
function cleanupStaleLocks() {
  try {
    const home = process.env.USERPROFILE || process.env.HOME;
    const stateDir = path.join(home, '.local', 'state', 'opencode');
    const serviceFile = path.join(stateDir, 'service.json');
    if (fs.existsSync(serviceFile)) {
      try {
        const data = JSON.parse(fs.readFileSync(serviceFile, 'utf8'));
        if (data.pid) {
          try {
            process.kill(data.pid, 0);
          } catch (e) {
            fs.unlinkSync(serviceFile);
          }
        }
      } catch (e) {}
    }
    const locksDir = path.join(stateDir, 'locks');
    if (fs.existsSync(locksDir)) {
      fs.readdirSync(locksDir).forEach(f => {
        try { fs.unlinkSync(path.join(locksDir, f)); } catch (e) {}
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

// Local config for Custom AI API Keys
const keysConfigFile = path.join(__dirname, 'api_keys.json');

function loadApiKeys() {
  try {
    if (fs.existsSync(keysConfigFile)) {
      const keys = JSON.parse(fs.readFileSync(keysConfigFile, 'utf8'));
      if (keys.GEMINI_API_KEY) process.env.GEMINI_API_KEY = keys.GEMINI_API_KEY;
      if (keys.DEEPSEEK_API_KEY) process.env.DEEPSEEK_API_KEY = keys.DEEPSEEK_API_KEY;
      if (keys.OPENAI_API_KEY) process.env.OPENAI_API_KEY = keys.OPENAI_API_KEY;
    }
  } catch (e) {}
}
loadApiKeys();

app.get('/api/keys', (req, res) => {
  try {
    const keys = fs.existsSync(keysConfigFile) ? JSON.parse(fs.readFileSync(keysConfigFile, 'utf8')) : {};
    res.json(keys);
  } catch (e) {
    res.json({});
  }
});

app.post('/api/keys', (req, res) => {
  try {
    const keys = req.body || {};
    fs.writeFileSync(keysConfigFile, JSON.stringify(keys, null, 2), 'utf8');
    loadApiKeys();
    res.json({ success: true });
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

  // Check OpenCode 2.0 default background service port 45278
  if (await checkHttpReachable(45278)) {
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
  if (await checkHttpReachable(45278)) {
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
      if (await checkHttpReachable(45278)) {
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

// API: Direct AI Prompt Runner (Streams response)
app.post('/api/opencode/run', (req, res) => {
  const { prompt, model } = req.body;
  if (!prompt) {
    return res.status(400).send('Prompt is required');
  }

  res.setHeader('Content-Type', 'text/plain; charset=utf-8');
  res.setHeader('Transfer-Encoding', 'chunked');

  const args = ['run', prompt];
  if (model) {
    args.push('-m', model);
  }
  args.push('--dir', currentCwd);

  const runner = spawn('opencode.cmd', args, {
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

  runner.on('close', (code) => {
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
