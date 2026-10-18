/**
 * Myanmar OpenCode Terminal - Frontend Application Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  // Must match API_VERSION in server.js. If the running backend is older (e.g. the
  // server was left running from a previous version) the UI says so instead of
  // throwing cryptic parse errors.
  const EXPECTED_API_VERSION = 4;

  // Elements
  const terminalContainer = document.getElementById('terminal-container');
  const burmeseInput = document.getElementById('burmese-prompt-input');
  const sendBtn = document.getElementById('btn-send-prompt');
  const clearPromptBtn = document.getElementById('btn-clear-prompt');
  const copyPromptBtn = document.getElementById('btn-copy-prompt');
  const fixZawgyiBtn = document.getElementById('btn-fix-zawgyi');
  const charCounter = document.getElementById('char-counter');
  const zawgyiBadge = document.getElementById('zawgyi-badge');
  const promptTemplates = document.getElementById('prompt-templates');
  const enterToSendCheck = document.getElementById('enter-to-send');
  const startOpenCodeBtn = document.getElementById('btn-start-opencode');
  const clearTermBtn = document.getElementById('btn-clear-term');
  const restartTermBtn = document.getElementById('btn-restart-term');
  const shellSelect = document.getElementById('shell-select');
  const currentCwdSpan = document.getElementById('current-cwd');
  const changeFolderBtn = document.getElementById('btn-change-folder');
  const browseFolderBtn = document.getElementById('btn-browse-folder');
  const modalBrowseBtn = document.getElementById('btn-modal-browse');
  const toastEl = document.getElementById('toast');

  // Modals
  const modalFolder = document.getElementById('modal-folder');
  const modalSettings = document.getElementById('modal-settings');
  const modalHistory = document.getElementById('modal-history');
  const folderInputPath = document.getElementById('folder-input-path');
  const confirmFolderBtn = document.getElementById('btn-confirm-folder');
  const openSettingsBtn = document.getElementById('btn-open-settings');
  const openHelpBtn = document.getElementById('btn-open-help');
  const saveSettingsBtn = document.getElementById('btn-save-settings');
  const showHistoryBtn = document.getElementById('btn-show-history');
  const clearAllHistoryBtn = document.getElementById('btn-clear-all-history');

  // Settings elements
  const settingFontFamily = document.getElementById('setting-font-family');
  const settingFontSize = document.getElementById('setting-font-size');
  const fontSizeVal = document.getElementById('font-size-val');
  const settingLineHeight = document.getElementById('setting-line-height');
  const lineHeightVal = document.getElementById('line-height-val');
  const settingTheme = document.getElementById('setting-theme');

  // Tabs
  const tabBtns = document.querySelectorAll('.tab-btn');
  const tabPanes = document.querySelectorAll('.tab-pane');

  // OpenCode Web elements
  const btnToggleWebServer = document.getElementById('btn-toggle-web-server');
  const btnStartWebuiNow = document.getElementById('btn-start-webui-now');
  const btnOpenExternalBrowser = document.getElementById('btn-open-external-browser');
  const btnReloadWebui = document.getElementById('btn-reload-webui');
  const webuiIframe = document.getElementById('webui-iframe');
  const webuiPlaceholder = document.getElementById('webui-placeholder');
  const webuiServerBadge = document.getElementById('webui-server-badge');

  // AI Runner elements
  const runnerModelSelect = document.getElementById('runner-model-select');
  const runnerPromptInput = document.getElementById('runner-prompt-input');
  const btnRunAiPrompt = document.getElementById('btn-run-ai-prompt');
  const runnerOutputBox = document.getElementById('runner-output-box');
  const runnerHistoryContainer = document.getElementById('runner-history-container');

  // State
  let term = null;
  let fitAddon = null;
  let ws = null;
  let isWsConnected = false;
  let reconnectDelay = 2000;
  let activeTab = 'terminal';
  let webServerUrl = null;
  let promptHistory = [];
try {
  promptHistory = JSON.parse(localStorage.getItem('mm_opencode_history') || '[]');
  if (!Array.isArray(promptHistory)) promptHistory = [];
} catch (e) {
  promptHistory = [];
}

  let recentProjects = [];
try {
  recentProjects = JSON.parse(localStorage.getItem('mm_opencode_recent_projects') || '[]');
  if (!Array.isArray(recentProjects)) recentProjects = [];
} catch (e) {
  recentProjects = [];
}

  // Monospace font MUST be first so xterm calculates standard character cell width!
  const defaultTermFont = "'Cascadia Code', 'Consolas', 'Pyidaungsu', 'Myanmar Text', 'Noto Sans Myanmar', monospace";

  // xterm palettes for the "Color Theme" setting. Keep them in sync with the
  // <option> values in index.html’s #setting-theme select.
  const TERMINAL_THEMES = {
    dark: {
      background: '#0d1117', foreground: '#f0f6fc', cursor: '#58a6ff', cursorAccent: '#0d1117',
      selectionBackground: 'rgba(56, 139, 253, 0.35)',
      black: '#484f58', red: '#ff7b72', green: '#3fb950', yellow: '#d29922',
      blue: '#58a6ff', magenta: '#bc8cff', cyan: '#39c5cf', white: '#b1bac4',
      brightBlack: '#6e7681', brightRed: '#ffa198', brightGreen: '#56d364', brightYellow: '#e3b341',
      brightBlue: '#79c0ff', brightMagenta: '#d2a8ff', brightCyan: '#56d4dd', brightWhite: '#f0f6fc'
    },
    cyberpunk: {
      background: '#0b0016', foreground: '#e6f1ff', cursor: '#ff2bd6', cursorAccent: '#0b0016',
      selectionBackground: 'rgba(255, 43, 214, 0.35)',
      black: '#1a0b2e', red: '#ff2e88', green: '#39ff14', yellow: '#ffe600',
      blue: '#00e5ff', magenta: '#ff2bd6', cyan: '#00fff7', white: '#e6f1ff',
      brightBlack: '#4b2e83', brightRed: '#ff6ba6', brightGreen: '#7dff5c', brightYellow: '#fff45c',
      brightBlue: '#5cf0ff', brightMagenta: '#ff6be6', brightCyan: '#7cfffb', brightWhite: '#ffffff'
    },
    monokai: {
      background: '#272822', foreground: '#f8f8f2', cursor: '#f8f8f0', cursorAccent: '#272822',
      selectionBackground: 'rgba(73, 72, 62, 0.8)',
      black: '#272822', red: '#f92672', green: '#a6e22e', yellow: '#f4bf75',
      blue: '#66d9ef', magenta: '#ae81ff', cyan: '#a1efe4', white: '#f8f8f2',
      brightBlack: '#75715e', brightRed: '#f92672', brightGreen: '#a6e22e', brightYellow: '#f4bf75',
      brightBlue: '#66d9ef', brightMagenta: '#ae81ff', brightCyan: '#a1efe4', brightWhite: '#f9f8f5'
    },
    solarized: {
      background: '#002b36', foreground: '#839496', cursor: '#93a1a1', cursorAccent: '#002b36',
      selectionBackground: 'rgba(88, 110, 117, 0.5)',
      black: '#073642', red: '#dc322f', green: '#859900', yellow: '#b58900',
      blue: '#268bd2', magenta: '#d33682', cyan: '#2aa198', white: '#eee8d5',
      brightBlack: '#586e75', brightRed: '#cb4b16', brightGreen: '#586e75', brightYellow: '#657b83',
      brightBlue: '#839496', brightMagenta: '#6c71c4', brightCyan: '#93a1a1', brightWhite: '#fdf6e3'
    }
  };
  function themeFor(name) {
    return TERMINAL_THEMES[name] || TERMINAL_THEMES.dark;
  }
  let parsedSettings = {};
  try {
    parsedSettings = JSON.parse(localStorage.getItem('mm_opencode_settings') || '{}');
  } catch (e) {}

  // If old settings had Pyidaungsu first, upgrade to monospace-first
  if (typeof parsedSettings.fontFamily !== 'string' || parsedSettings.fontFamily.includes("'Pyidaungsu', 'Myanmar Text'")) {
    parsedSettings.fontFamily = defaultTermFont;
  }

  const userSettings = Object.assign({
    fontFamily: defaultTermFont,
    fontSize: 15,
    lineHeight: 1.45,
    theme: 'dark'
  }, parsedSettings);

  // Toast Helper
  let toastTimer = null;
  function showToast(message, duration = 2500) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    if (toastTimer) clearTimeout(toastTimer);
    toastTimer = setTimeout(() => {
      toastEl.classList.remove('show');
    }, duration);
  }

  // Initialize Terminal
  function initTerminal() {
    term = new Terminal({
      cursorBlink: true,
      fontFamily: userSettings.fontFamily,
      fontSize: parseInt(userSettings.fontSize, 10),
      lineHeight: parseFloat(userSettings.lineHeight) || 1.45,
      letterSpacing: 0,
      theme: themeFor(userSettings.theme),
      convertEol: true,
      allowProposedApi: true
    });

    fitAddon = new FitAddon.FitAddon();
    term.loadAddon(fitAddon);

    if (window.Unicode11Addon && window.Unicode11Addon.Unicode11Addon) {
      const unicode11Addon = new window.Unicode11Addon.Unicode11Addon();
      term.loadAddon(unicode11Addon);
      term.unicode.activeVersion = '11';
    }

    term.open(terminalContainer);
    fitAddon.fit();

    term.onData(data => {
      if (ws && isWsConnected) {
        ws.send(JSON.stringify({ type: 'input', data }));
      }
    });

    term.onResize(size => {
      if (ws && isWsConnected) {
        ws.send(JSON.stringify({ type: 'resize', cols: size.cols, rows: size.rows }));
      }
    });

    let resizeTimeout = null;
    window.addEventListener('resize', () => {
      if (activeTab === 'terminal' && fitAddon) {
        clearTimeout(resizeTimeout);
        resizeTimeout = setTimeout(() => {
          fitAddon.fit();
        }, 100);
      }
    });
  }

  // Update the header connection indicator.
  function setConnectionStatus(color) {
    const dot = document.querySelector('#opencode-status .status-dot');
    if (dot) {
      dot.style.backgroundColor = color;
      dot.style.boxShadow = `0 0 6px ${color}`;
    }
  }

  // Connect WebSocket
  function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/terminal`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      isWsConnected = true;
      reconnectDelay = 2000;
      setConnectionStatus('#238636');

      const cols = term.cols || 80;
      const rows = term.rows || 24;
      const shell = shellSelect.value || 'powershell';

      ws.send(JSON.stringify({
        type: 'init',
        cols,
        rows,
        shell
      }));
    };

    ws.onmessage = (event) => {
      try {
        const msg = JSON.parse(event.data);
        if (msg.type === 'output') {
          term.write(msg.data);
        } else if (msg.type === 'cwd') {
          currentCwdSpan.textContent = msg.data;
          folderInputPath.value = msg.data;
        } else if (msg.type === 'exit') {
          term.write('\r\n\x1b[33m[Terminal process exited]\x1b[0m\r\n');
        }
      } catch (err) {
        term.write(event.data);
      }
    };

    ws.onclose = () => {
      isWsConnected = false;
      setConnectionStatus('#d29922');
      // Exponential backoff so a dead server is not hammered on reconnect.
      setTimeout(connectWebSocket, reconnectDelay);
      reconnectDelay = Math.min(reconnectDelay * 1.5, 15000);
    };

    ws.onerror = () => {
      isWsConnected = false;
    };
  }

  // Send Burmese Prompt into Terminal
  function sendBurmesePrompt() {
    let text = burmeseInput.value.trim();
    if (!text) return;

    // Check & convert Zawgyi if needed
    if (window.MyanmarConverter && window.MyanmarConverter.isZawgyi(text)) {
      text = window.MyanmarConverter.zawgyiToUnicode(text);
      showToast('🔄 Zawgyi စာသားကို Unicode အဖြစ် အလိုအလျောက် ပြောင်းပြီး ပို့ပေးပါသည်');
    }

    if (ws && isWsConnected) {
      // Send text cleanly as a single input sequence with Enter
      ws.send(JSON.stringify({ type: 'input', data: text + '\r' }));
      
      // Save to history
      saveToHistory(text);

      // Clear input
      burmeseInput.value = '';
      updateCharCount();

      showToast('🚀 Prompt ကို Terminal ထံသို့ ပို့ပြီးပါပြီ');
      term.focus();
    } else {
      showToast('⚠️ Terminal မချိတ်ဆက်ရသေးပါ');
    }
  }

  // Update Character Count (and the live Zawgyi detection badge)
  function updateCharCount() {
    const value = burmeseInput.value;
    charCounter.textContent = `${value.length} စာလုံး`;
    if (zawgyiBadge) {
      const isZg = value.length > 0
        && window.MyanmarConverter
        && window.MyanmarConverter.isZawgyi(value);
      zawgyiBadge.style.display = isZg ? 'inline-block' : 'none';
    }
  }

  // Save to History
  function saveToHistory(text) {
    if (!text) return;
    promptHistory = promptHistory.filter(item => item !== text);
    promptHistory.unshift(text);
    if (promptHistory.length > 50) promptHistory.pop();
    localStorage.setItem('mm_opencode_history', JSON.stringify(promptHistory));
    renderHistoryModal();
    renderRunnerHistory();
  }

  function saveRecentProjects() {
    localStorage.setItem('mm_opencode_recent_projects', JSON.stringify(recentProjects));
  }

  function addRecentProject(p) {
    if (!p) return;
    recentProjects = recentProjects.filter(item => item !== p);
    recentProjects.unshift(p);
    if (recentProjects.length > 12) recentProjects.pop();
    saveRecentProjects();
    renderRecentProjects();
  }

  function renderRecentProjects() {
    const list = document.getElementById('recent-projects-list');
    if (!list) return;
    list.innerHTML = '';
    if (recentProjects.length === 0) {
      list.innerHTML = '<div style="color: var(--text-muted); padding: 6px; font-size: 12px;">မှတ်တမ်း မရှိသေးပါ</div>';
      return;
    }
    recentProjects.forEach(item => {
      const row = document.createElement('div');
      row.className = 'history-item';
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'space-between';
      row.innerHTML = `<span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;font-family:var(--font-mono);font-size:12px;">${escapeHtml(item)}</span>
        <button class="tool-chip" style="margin-left:8px;font-size:11px;">ဖွင့်မည်</button>`;
      row.onclick = () => {
        folderInputPath.value = item;
        confirmFolderBtn.click();
      };
      list.appendChild(row);
    });
  }

  // Render History in Modal
  function renderHistoryModal() {
    const list = document.getElementById('prompt-history-list');
    list.innerHTML = '';
    if (promptHistory.length === 0) {
      list.innerHTML = '<div style="color: var(--text-muted); padding: 12px; text-align: center;">မှတ်တမ်း မရှိသေးပါ</div>';
      return;
    }

    promptHistory.forEach((item) => {
      const row = document.createElement('div');
      row.className = 'history-item';
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.justifyContent = 'space-between';
      row.innerHTML = `
        <span style="flex: 1; overflow: hidden; text-overflow: ellipsis; white-space: nowrap; font-family: var(--font-burmese);">${escapeHtml(item)}</span>
        <button class="tool-chip" style="margin-left: 8px;">ရွေးမည်</button>
      `;
      row.onclick = () => {
        burmeseInput.value = item;
        updateCharCount();
        closeModal(modalHistory);
        burmeseInput.focus();
        showToast('Prompt ကို ထည့်သွင်းပြီးပါပြီ');
      };
      list.appendChild(row);
    });
  }

  // Render Runner History in Tab 3
  function renderRunnerHistory() {
    runnerHistoryContainer.innerHTML = '';
    promptHistory.slice(0, 15).forEach(item => {
      const el = document.createElement('div');
      el.className = 'history-item';
      el.textContent = item;
      el.onclick = () => {
        runnerPromptInput.value = item;
      };
      runnerHistoryContainer.appendChild(el);
    });
  }

  function escapeHtml(str) {
    return str.replace(/[&<>"']/g, m => ({
      '&': '&amp;',
      '<': '&lt;',
      '>': '&gt;',
      '"': '&quot;',
      "'": '&#39;'
    }[m]));
  }

  // Quick Character Insertion Buttons
  document.querySelectorAll('.char-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const char = btn.getAttribute('data-char');
      insertAtCursor(burmeseInput, char);
      updateCharCount();
      burmeseInput.focus();
    });
  });

  // Click the live Zawgyi badge to convert in place
  if (zawgyiBadge) {
    zawgyiBadge.addEventListener('click', () => {
      if (window.MyanmarConverter && burmeseInput.value) {
        burmeseInput.value = window.MyanmarConverter.zawgyiToUnicode(burmeseInput.value);
        updateCharCount();
        showToast('✅ Zawgyi မှ Unicode သို့ ပြောင်းလဲပြီးပါပြီ');
        burmeseInput.focus();
      }
    });
  }

  function insertAtCursor(textarea, text) {
    const start = textarea.selectionStart;
    const end = textarea.selectionEnd;
    const before = textarea.value.substring(0, start);
    const after = textarea.value.substring(end);
    textarea.value = before + text + after;
    textarea.selectionStart = textarea.selectionEnd = start + text.length;
  }

  // Prompt Templates Dropdown
  promptTemplates.addEventListener('change', () => {
    const val = promptTemplates.value;
    if (val) {
      burmeseInput.value = val;
      updateCharCount();
      burmeseInput.focus();
    }
  });

  // Textarea Events
  burmeseInput.addEventListener('input', updateCharCount);
  burmeseInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      if (e.ctrlKey) {
        e.preventDefault();
        sendBurmesePrompt();
      } else if (enterToSendCheck.checked && !e.shiftKey) {
        e.preventDefault();
        sendBurmesePrompt();
      }
    }
  });

  // Action Buttons
  sendBtn.addEventListener('click', sendBurmesePrompt);

  clearPromptBtn.addEventListener('click', () => {
    burmeseInput.value = '';
    updateCharCount();
    burmeseInput.focus();
  });

  copyPromptBtn.addEventListener('click', () => {
    if (!burmeseInput.value) return;
    navigator.clipboard.writeText(burmeseInput.value).then(() => {
      showToast('📋 စာသားကို Copy ကူးပြီးပါပြီ');
    });
  });

  fixZawgyiBtn.addEventListener('click', () => {
    const current = burmeseInput.value;
    if (!current) return;
    if (window.MyanmarConverter) {
      const fixed = window.MyanmarConverter.zawgyiToUnicode(current);
      burmeseInput.value = fixed;
      updateCharCount();
      showToast('✅ Zawgyi မှ Unicode သို့ ပြောင်းလဲပြီးပါပြီ');
    }
  });

  startOpenCodeBtn.addEventListener('click', () => {
    if (ws && isWsConnected) {
      // Cancel any half-typed input on the prompt first
      ws.send(JSON.stringify({ type: 'input', data: '\x03' }));
      setTimeout(() => {
        ws.send(JSON.stringify({ type: 'input', data: 'opencode\r' }));
      }, 100);
      showToast('🚀 OpenCode ကို စတင်နေပါသည်...');
      term.focus();
    }
  });

  const startOpenCodeMiniBtn = document.getElementById('btn-start-opencode-mini');
  if (startOpenCodeMiniBtn) {
    startOpenCodeMiniBtn.addEventListener('click', () => {
      if (ws && isWsConnected) {
        ws.send(JSON.stringify({ type: 'input', data: '\x03' }));
        setTimeout(() => {
          ws.send(JSON.stringify({ type: 'input', data: 'opencode mini\r' }));
        }, 100);
        showToast('💬 OpenCode Mini (စာဖတ်မုဒ်) ကို စတင်နေပါသည်...');
        term.focus();
      }
    });
  }

  const ctrlCBtn = document.getElementById('btn-ctrl-c');
  if (ctrlCBtn) {
    ctrlCBtn.addEventListener('click', () => {
      if (ws && isWsConnected) {
        ws.send(JSON.stringify({ type: 'input', data: '\x03' }));
        showToast('⛔ ရပ်တန့်ရန် အချက်ပြလိုက်ပါပြီ (Ctrl+C)');
        term.focus();
      }
    });
  }

  const escKeyBtn = document.getElementById('btn-esc-key');
  if (escKeyBtn) {
    escKeyBtn.addEventListener('click', () => {
      if (ws && isWsConnected) {
        ws.send(JSON.stringify({ type: 'input', data: '\x1b' }));
        showToast('⎋ Popup ကို ပိတ်လိုက်ပါပြီ (Esc)');
        term.focus();
      }
    });
  }

  const ctrlLBtn = document.getElementById('btn-ctrl-l');
  if (ctrlLBtn) {
    ctrlLBtn.addEventListener('click', () => {
      if (ws && isWsConnected) {
        // \x0c sends Ctrl+L which triggers TUI (OpenCode) to repaint its screen buffer cleanly
        ws.send(JSON.stringify({ type: 'input', data: '\x0c' }));
      }
      if (term) {
        term.clear();
        if (fitAddon) fitAddon.fit();
      }
      showToast('✨ Terminal Screen ကို ပြန်လည်ဆွဲသားပြီးပါပြီ (Ctrl+L)');
      term.focus();
    });
  }

  clearTermBtn.addEventListener('click', () => {
    if (ws && isWsConnected) {
      ws.send(JSON.stringify({ type: 'input', data: '\x0c' }));
    }
    if (term) {
      term.clear();
      if (fitAddon) fitAddon.fit();
    }
    showToast('🧹 Screen ကို ရှင်းလင်းလိုက်ပါပြီ');
    term.focus();
  });

  restartTermBtn.addEventListener('click', () => {
    if (ws && isWsConnected) {
      ws.send(JSON.stringify({
        type: 'restart',
        shell: shellSelect.value
      }));
      if (term) term.clear();
      showToast('🔄 Terminal session ကို ပြန်လည်စတင်လိုက်ပါပြီ');
    }
  });

  shellSelect.addEventListener('change', () => {
    if (ws && isWsConnected) {
      ws.send(JSON.stringify({
        type: 'restart',
        shell: shellSelect.value
      }));
      if (term) term.clear();
      showToast(`Shell ကို ${shellSelect.value.toUpperCase()} သို့ ပြောင်းလဲလိုက်ပါပြီ`);
    }
  });

  // Modals handling
  function openModal(modal) {
    modal.classList.add('active');
  }

  function closeModal(modal) {
    modal.classList.remove('active');
  }

  document.querySelectorAll('[data-close]').forEach(btn => {
    btn.addEventListener('click', () => {
      const targetId = btn.getAttribute('data-close');
      const modal = document.getElementById(targetId);
      if (modal) closeModal(modal);
    });
  });

  // Close modals when clicking the backdrop or pressing Escape
  document.querySelectorAll('.modal-overlay').forEach(overlay => {
    overlay.addEventListener('click', (e) => {
      if (e.target === overlay) overlay.classList.remove('active');
    });
  });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape') {
      document.querySelectorAll('.modal-overlay.active').forEach(m => m.classList.remove('active'));
    }
  });

  // ---- In-app Folder Browser ----
  const modalFolderBrowser = document.getElementById('modal-folder-browser');
  const fbPathEl = document.getElementById('fb-path');
  const fbListEl = document.getElementById('fb-list');
  const fbCurrentEl = document.getElementById('fb-current');
  const fbUpBtn = document.getElementById('btn-fb-up');
  const fbThisPcBtn = document.getElementById('btn-fb-thispc');
  const fbSelectBtn = document.getElementById('btn-fb-select');
  let fbCurrentPath = null;
  let fbParentPath = null;

  function browseWindowsFolder() {
    closeModal(modalFolder);
    openModal(modalFolderBrowser);
    loadFolderBrowser(currentCwdSpan.textContent && currentCwdSpan.textContent !== 'Loading...'
      ? currentCwdSpan.textContent
      : null);
  }

  function loadFolderBrowser(targetPath) {
    fbListEl.innerHTML = '<div style="color:var(--text-muted);padding:10px;text-align:center;">ဖိုင်တွဲများ ရှာဖွေနေပါသည်...</div>';
    // 'THIS_PC' asks the server for the drive roots; a real path lists its sub-folders.
    const query = '?path=' + encodeURIComponent(targetPath || 'THIS_PC');
    fetch('/api/list-dirs' + query)
      .then(r => {
        const contentType = r.headers.get('content-type') || '';
        // An old server answers /api/* with the HTML page (or a plain 404), which
        // used to surface as "Unexpected token '<' ... is not valid JSON".
        if (r.status === 404 || !contentType.includes('application/json')) {
          throw new Error('SERVER_OUTDATED');
        }
        return r.json();
      })
      .then(data => {
        if (data.error) {
          fbListEl.innerHTML = `<div style="color:#ff7b72;padding:10px;">${escapeHtml(data.error)}</div>`;
          return;
        }
        fbCurrentPath = data.path || null;
        fbParentPath = data.parent || null;
        fbPathEl.value = data.path || 'This PC';
        fbCurrentEl.textContent = data.path ? ('ရွေးထားသည်: ' + data.path) : 'Drive တစ်ခု ရွေးပါ';
        fbSelectBtn.disabled = !data.path;
        fbSelectBtn.style.opacity = data.path ? '1' : '0.5';
        renderFolderList(data.dirs || []);
      })
      .catch(err => {
        if (err.message === 'SERVER_OUTDATED') {
          fbListEl.innerHTML = '<div style="color:#f5b942;padding:10px;line-height:1.8;">'
            + '⚠️ Server သည် ဗားရှင်းဟောင်း ဖြစ်နေပါသည်။<br>'
            + 'App ကို ပိတ်ပြီး <b>Start-Terminal.bat</b> (သို့မဟုတ် Desktop icon) ကို ပြန်ဖွင့်ပါ။<br>'
            + '<button id="btn-fb-restart-hint" class="action-btn" style="margin-top:8px;">🔄 ပြန်လည် ရယူမည်</button></div>';
          const retryBtn = document.getElementById('btn-fb-restart-hint');
          if (retryBtn) retryBtn.onclick = () => loadFolderBrowser(targetPath);
          return;
        }
        fbListEl.innerHTML = `<div style="color:#ff7b72;padding:10px;">Error: ${escapeHtml(err.message)}</div>`;
      });
  }

  function renderFolderList(dirs) {
    fbListEl.innerHTML = '';
    if (!dirs.length) {
      fbListEl.innerHTML = '<div style="color:var(--text-muted);padding:10px;text-align:center;">ဖိုင်တွဲ မရှိပါ</div>';
      return;
    }
    dirs.forEach(dir => {
      const row = document.createElement('div');
      row.className = 'history-item';
      row.style.cursor = 'pointer';
      row.style.display = 'flex';
      row.style.alignItems = 'center';
      row.style.gap = '8px';
      row.innerHTML = `<span>📁</span><span style="flex:1;overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(dir.name)}</span>`;
      row.onclick = () => loadFolderBrowser(dir.path);
      fbListEl.appendChild(row);
    });
  }

  function applyFolderChange(newPath) {
    fetch('/api/cwd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: newPath })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          currentCwdSpan.textContent = data.cwd;
          folderInputPath.value = data.cwd;
          addRecentProject(data.cwd);
          closeModal(modalFolderBrowser);
          closeModal(modalFolder);
          showToast(`📁 Project Folder ကို "${data.cwd}" သို့ ပြောင်းလဲပြီးပါပြီ`);
          if (ws && isWsConnected) {
            ws.send(JSON.stringify({ type: 'restart', shell: shellSelect.value, cwd: data.cwd }));
          }
        } else {
          alert('Folder ပြောင်းလဲမှု မအောင်မြင်ပါ: ' + (data.error || 'လမ်းကြောင်း မှားယွင်းနေပါသည်'));
        }
      })
      .catch(err => alert('Error: ' + err.message));
  }

  if (fbUpBtn) fbUpBtn.addEventListener('click', () => {
    if (fbParentPath) loadFolderBrowser(fbParentPath);
    else loadFolderBrowser(null);
  });
  if (fbThisPcBtn) fbThisPcBtn.addEventListener('click', () => loadFolderBrowser(null));
  if (fbSelectBtn) fbSelectBtn.addEventListener('click', () => {
    if (fbCurrentPath) applyFolderChange(fbCurrentPath);
  });

  if (browseFolderBtn) {
    browseFolderBtn.addEventListener('click', browseWindowsFolder);
  }

  if (modalBrowseBtn) {
    modalBrowseBtn.addEventListener('click', browseWindowsFolder);
  }

  changeFolderBtn.addEventListener('click', () => {
    folderInputPath.value = currentCwdSpan.textContent || '';
    renderRecentProjects();
    openModal(modalFolder);
    folderInputPath.focus();
  });

  confirmFolderBtn.addEventListener('click', () => {
    const newPath = folderInputPath.value.trim();
    if (!newPath) return;

    fetch('/api/cwd', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ cwd: newPath })
    })
    .then(r => r.json())
    .then(data => {
      if (data.success) {
        currentCwdSpan.textContent = data.cwd;
        folderInputPath.value = data.cwd;
        addRecentProject(data.cwd);
        closeModal(modalFolder);
        showToast(`📁 Project Folder ကို "${data.cwd}" သို့ ပြောင်းလဲပြီးပါပြီ`);
        // Restart terminal in new directory
        if (ws && isWsConnected) {
          ws.send(JSON.stringify({ type: 'restart', shell: shellSelect.value, cwd: data.cwd }));
        }
      } else {
        alert('Directory ပြောင်းလဲမှု မအောင်မြင်ပါ: ' + (data.error || 'လမ်းကြောင်း မှားယွင်းနေပါသည်'));
      }
    })
    .catch(err => {
      alert('Error: ' + err.message);
    });
  });

  const settingGeminiKey = document.getElementById('setting-gemini-key');
  const settingDeepseekKey = document.getElementById('setting-deepseek-key');
  const settingOpenaiKey = document.getElementById('setting-openai-key');
  const clearKeysBtn = document.getElementById('btn-clear-api-keys');

  // The server never returns raw keys; show a masked hint in the placeholder.
  function applyKeyHint(input, info, placeholder) {
    if (!input) return;
    input.value = '';
    input.placeholder = info && info.set ? `သိမ်းဆည်းပြီး ••••${info.hint}` : placeholder;
  }

  openSettingsBtn.addEventListener('click', () => {
    settingFontFamily.value = userSettings.fontFamily;
    settingFontSize.value = userSettings.fontSize;
    fontSizeVal.textContent = userSettings.fontSize + 'px';
    settingLineHeight.value = userSettings.lineHeight;
    lineHeightVal.textContent = userSettings.lineHeight;
    settingTheme.value = userSettings.theme;

    // Fetch masked API key status
    fetch('/api/keys')
      .then(r => r.json())
      .then(keys => {
        applyKeyHint(settingGeminiKey, keys.GEMINI_API_KEY, 'AIzaSy...');
        applyKeyHint(settingDeepseekKey, keys.DEEPSEEK_API_KEY, 'sk-...');
         applyKeyHint(settingOpenaiKey, keys.OPENAI_API_KEY, 'sk-...');
      })
      .catch(() => {});

    openModal(modalSettings);
  });

  if (clearKeysBtn) {
    clearKeysBtn.addEventListener('click', () => {
      if (!confirm('သိမ်းဆည်းထားသော API Key အားလုံးကို ဖျက်ပစ်ရန် သေချာပါသလား?')) return;
      fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          GEMINI_API_KEY_CLEAR: true,
          DEEPSEEK_API_KEY_CLEAR: true,
          OPENAI_API_KEY_CLEAR: true
        })
      })
        .then(r => r.json())
        .then(() => {
          applyKeyHint(settingGeminiKey, { set: false }, 'AIzaSy...');
          applyKeyHint(settingDeepseekKey, { set: false }, 'sk-...');
          showToast('🗑️ API Key များကို ဖျက်ပြီးပါပြီ');
        })
        .catch(() => {});
    });
  }

  settingFontSize.addEventListener('input', () => {
    fontSizeVal.textContent = settingFontSize.value + 'px';
  });

  settingLineHeight.addEventListener('input', () => {
    lineHeightVal.textContent = settingLineHeight.value;
  });

  saveSettingsBtn.addEventListener('click', () => {
    userSettings.fontFamily = settingFontFamily.value;
    userSettings.fontSize = parseInt(settingFontSize.value, 10);
    userSettings.lineHeight = parseFloat(settingLineHeight.value);
    userSettings.theme = settingTheme.value;

    localStorage.setItem('mm_opencode_settings', JSON.stringify(userSettings));

    // Save API keys to backend (only send non-empty fields so stored keys are kept)
    const keyPayload = {};
    if (settingGeminiKey && settingGeminiKey.value.trim()) {
      keyPayload.GEMINI_API_KEY = settingGeminiKey.value.trim();
    }
    if (settingDeepseekKey && settingDeepseekKey.value.trim()) {
      keyPayload.DEEPSEEK_API_KEY = settingDeepseekKey.value.trim();
    }
    if (settingOpenaiKey && settingOpenaiKey.value.trim()) {
      keyPayload.OPENAI_API_KEY = settingOpenaiKey.value.trim();
    }
    if (Object.keys(keyPayload).length) {
      fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keyPayload)
      })
        .then(r => r.json())
        .then(res => {
          if (res && res.keys) {
            applyKeyHint(settingGeminiKey, res.keys.GEMINI_API_KEY, 'AIzaSy...');
            applyKeyHint(settingDeepseekKey, res.keys.DEEPSEEK_API_KEY, 'sk-...');
             applyKeyHint(settingOpenaiKey, res.keys.OPENAI_API_KEY, 'sk-...');
          }
        })
        .catch(() => {});
    }

    // Apply to Terminal
    if (term) {
      term.options.fontFamily = userSettings.fontFamily;
      term.options.fontSize = userSettings.fontSize;
      term.options.lineHeight = userSettings.lineHeight;
      term.options.theme = themeFor(userSettings.theme);
      if (fitAddon) fitAddon.fit();
    }

    closeModal(modalSettings);
    showToast('⚙️ အပြင်အဆင်များကို သိမ်းဆည်းပြီးပါပြီ');
  });

  showHistoryBtn.addEventListener('click', () => {
    renderHistoryModal();
    openModal(modalHistory);
  });

  if (openHelpBtn) {
    openHelpBtn.addEventListener('click', () => {
      openModal(document.getElementById('modal-help'));
    });
  }

  clearAllHistoryBtn.addEventListener('click', () => {
    if (confirm('မှတ်တမ်းအားလုံးကို ဖျက်ပစ်ရန် သေချာပါသလား?')) {
      promptHistory = [];
      localStorage.removeItem('mm_opencode_history');
      renderHistoryModal();
      renderRunnerHistory();
      showToast('🗑️ မှတ်တမ်းများကို ဖျက်ပြီးပါပြီ');
    }
  });

  // Tab Switching
  tabBtns.forEach(btn => {
    btn.addEventListener('click', () => {
      const targetTab = btn.getAttribute('data-tab');
      activeTab = targetTab;

      tabBtns.forEach(b => b.classList.remove('active'));
      tabPanes.forEach(p => p.classList.remove('active'));

      btn.classList.add('active');
      const pane = document.getElementById(`pane-${targetTab}`);
      if (pane) pane.classList.add('active');

      if (targetTab === 'terminal') {
        setTimeout(() => {
          if (fitAddon) fitAddon.fit();
          term.focus();
        }, 50);
      } else if (targetTab === 'webui') {
        checkWebUiStatus();
      } else if (targetTab === 'runner') {
        renderRunnerHistory();
        runnerPromptInput.focus();
      }
    });
  });

  const inputPairLink = document.getElementById('input-pair-link');
  const btnCopyPairLink = document.getElementById('btn-copy-pair-link');

  function fetchPairingLink() {
    if (!inputPairLink) return;
    fetch('/api/opencode/web/pair')
      .then(r => r.json())
      .then(res => {
        if (res.success && res.link) {
          inputPairLink.value = res.link;
        } else {
          inputPairLink.value = 'Pairing link ရယူမရပါ';
        }
      })
      .catch(() => {
        inputPairLink.value = 'Pairing link ရယူမရပါ';
      });
  }

  if (btnCopyPairLink) {
    btnCopyPairLink.addEventListener('click', () => {
      const link = inputPairLink ? inputPairLink.value : '';
      if (link && link.startsWith('http')) {
        navigator.clipboard.writeText(link).then(() => {
          showToast('📋 Pairing Link ကို Copy ကူးပြီးပါပြီ! အောက်ပါ Pairing Link အကွက်တွင် Paste ချပြီး Connect နှိပ်ပါ');
        }).catch(() => {
          inputPairLink.select();
          document.execCommand('copy');
          showToast('📋 Pairing Link ကို Copy ကူးပြီးပါပြီ!');
        });
      } else {
        fetchPairingLink();
      }
    });
  }

  // OpenCode Web Tab Logic
  function checkWebUiStatus() {
    fetchPairingLink();
    fetch('/api/opencode/web/status')
      .then(r => r.json())
      .then(res => {
        if (res.running && res.url) {
          webServerUrl = res.url;
          if (webuiIframe.src !== res.url) webuiIframe.src = res.url;
          webuiIframe.style.display = 'block';
          webuiPlaceholder.style.display = 'none';
          webuiServerBadge.textContent = '● Web Server အလုပ်လုပ်နေပါသည်: ' + res.url;
          webuiServerBadge.style.color = '#3fb950';
          btnToggleWebServer.textContent = '⏹️ Server ပိတ်မည်';
          btnToggleWebServer.className = 'action-btn';
        } else {
          webuiIframe.style.display = 'none';
          webuiPlaceholder.style.display = 'flex';
          webuiServerBadge.textContent = 'စတင်ရန် စောင့်ဆိုင်းနေပါသည်';
          webuiServerBadge.style.color = '#d29922';
          btnToggleWebServer.textContent = '▶️ Web Server စတင်မည်';
          btnToggleWebServer.className = 'action-btn btn-blue';
        }
      })
      .catch(() => {});
  }

  function startWebServer() {
    showToast('🌐 OpenCode Web Server ကို စတင်နေပါသည်...');
    fetch('/api/opencode/web/start', { method: 'POST' })
      .then(r => r.json())
      .then(res => {
        if (res.success && res.url) {
          webServerUrl = res.url;
          webuiIframe.src = res.url;
          webuiIframe.style.display = 'block';
          webuiPlaceholder.style.display = 'none';
          webuiServerBadge.textContent = '● Server အလုပ်လုပ်နေပါသည်: ' + res.url;
          webuiServerBadge.style.color = '#3fb950';
          btnToggleWebServer.textContent = '⏹️ Server ပိတ်မည်';
          btnToggleWebServer.className = 'action-btn';
          showToast('✅ OpenCode Web UI စတင်ပြီးပါပြီ');
        } else {
          alert('Web Server စတင်ခြင်း မအောင်မြင်ပါ: ' + (res.error || 'Server error'));
        }
      })
      .catch(err => alert('Error: ' + err.message));
  }

  function stopWebServer() {
    fetch('/api/opencode/web/stop', { method: 'POST' })
      .then(r => r.json())
      .then(() => {
        webServerUrl = null;
        webuiIframe.src = 'about:blank';
        webuiIframe.style.display = 'none';
        webuiPlaceholder.style.display = 'flex';
        webuiServerBadge.textContent = 'Server ပိတ်ထားပါသည်';
        webuiServerBadge.style.color = '#8b949e';
        btnToggleWebServer.textContent = '▶️ Web Server စတင်မည်';
        btnToggleWebServer.className = 'action-btn btn-blue';
        showToast('⏹️ OpenCode Web Server ကို ပိတ်လိုက်ပါပြီ');
      });
  }

  btnStartWebuiNow.addEventListener('click', startWebServer);

  btnToggleWebServer.addEventListener('click', () => {
    if (webServerUrl) {
      stopWebServer();
    } else {
      startWebServer();
    }
  });

  btnReloadWebui.addEventListener('click', () => {
    fetchPairingLink();
    if (webuiIframe && webServerUrl) {
      webuiIframe.src = webServerUrl;
    }
  });

  btnOpenExternalBrowser.addEventListener('click', () => {
    if (webServerUrl) {
      window.open(webServerUrl, '_blank');
    } else {
      showToast('⚠️ Web Server ကို အရင် စတင်ပေးပါ');
    }
  });

  // Tab 3: Direct AI Prompt Runner Logic
  btnRunAiPrompt.addEventListener('click', runAiPrompt);
  runnerPromptInput.addEventListener('keydown', (e) => {
    if (e.key === 'Enter') {
      e.preventDefault();
      runAiPrompt();
    }
  });

  function runAiPrompt() {
    let prompt = runnerPromptInput.value.trim();
    if (!prompt) return;

    if (window.MyanmarConverter && window.MyanmarConverter.isZawgyi(prompt)) {
      prompt = window.MyanmarConverter.zawgyiToUnicode(prompt);
      runnerPromptInput.value = prompt;
    }

    saveToHistory(prompt);
    runnerPromptInput.value = '';

    const model = runnerModelSelect.value;
    runnerOutputBox.innerHTML = `
      <div style="color: var(--accent-blue); display: flex; align-items: center; gap: 8px;">
        <span class="status-dot"></span>
        <span>OpenCode မှ မေးခွန်းကို စဉ်းစားတွေးခေါ် ဖြေကြားနေပါသည် (${model})...</span>
      </div>
      <div id="ai-stream-content" style="margin-top: 14px; white-space: pre-wrap; font-family: var(--font-burmese); color: #fff;"></div>
    `;

    btnRunAiPrompt.disabled = true;
    btnRunAiPrompt.style.opacity = '0.6';
    const safetyTimer = setTimeout(() => {
      btnRunAiPrompt.disabled = false;
      btnRunAiPrompt.style.opacity = '1';
      showToast('⚠️ အချိန်ကြာမြင့်နေသဖြင့် ရပ်တန့်လိုက်ပါသည်');
    }, 120000);

    fetch('/api/opencode/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ prompt, model })
    })
    .then(response => {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      const contentEl = document.getElementById('ai-stream-content');

      function readChunk() {
        reader.read().then(({ done, value }) => {
          if (done) {
            clearTimeout(safetyTimer);
            btnRunAiPrompt.disabled = false;
            btnRunAiPrompt.style.opacity = '1';
            showToast('✅ OpenCode မှ ဖြေကြားပြီးပါပြီ');
            return;
          }
          const chunk = decoder.decode(value, { stream: true });
          contentEl.textContent += chunk;
          runnerOutputBox.scrollTop = runnerOutputBox.scrollHeight;
          readChunk();
        }).catch(err => {
          clearTimeout(safetyTimer);
          contentEl.textContent += '\n\n[Error reading response: ' + err.message + ']';
          btnRunAiPrompt.disabled = false;
          btnRunAiPrompt.style.opacity = '1';
        });
      }

      readChunk();
    })
    .catch(err => {
      clearTimeout(safetyTimer);
      runnerOutputBox.innerHTML = `<div style="color: #ff7b72;">Error: ${err.message}</div>`;
      btnRunAiPrompt.disabled = false;
      btnRunAiPrompt.style.opacity = '1';
    });
  }

  // Load Status on startup
  fetch('/api/status')
    .then(r => r.json())
    .then(data => {
      if (data.apiVersion !== EXPECTED_API_VERSION) {
        // A server left running from an older version does not know the new API
        // routes; tell the user instead of letting calls fail with parse errors.
        showToast('⚠️ Server ဗားရှင်းဟောင်း ဖြစ်နေပါသည်။ App ကို ပိတ်ပြီး ပြန်ဖွင့်ပါ');
      }
      if (data.opencodeInstalled) {
        document.getElementById('status-text').textContent = `OpenCode v${data.version || '1.4'} အသင့်ရှိပါသည်`;
      } else {
        document.getElementById('status-text').textContent = 'OpenCode မရှိသေးပါ';
        // The header dot tracks the WebSocket connection (see setConnectionStatus),
        // so a missing CLI is reported through the text only.
      }
      if (data.cwd) {
        currentCwdSpan.textContent = data.cwd;
        folderInputPath.value = data.cwd;
        addRecentProject(data.cwd);
      }
    })
    .catch(() => {});

  // Populate the runner model picker from the installed OpenCode CLI. Falls back
  // to the static <option> list when the CLI is unavailable or returns nothing.
  function loadModelsFromCli() {
    runnerModelSelect.disabled = true;
    fetch('/api/models')
      .then(r => r.json())
      .then(res => {
        const models = (res && res.models) || [];
        if (!models.length) { runnerModelSelect.disabled = false; return; }
        const current = runnerModelSelect.value;
        runnerModelSelect.innerHTML = '';
        models.forEach(name => {
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = name;
          runnerModelSelect.appendChild(opt);
        });
        if (models.includes(current)) runnerModelSelect.value = current;
        runnerModelSelect.disabled = false;
      })
      .catch(() => { runnerModelSelect.disabled = false; });
  }

  // Startup
  initTerminal();
  connectWebSocket();
  renderHistoryModal();
  renderRunnerHistory();
  renderRecentProjects();
  loadModelsFromCli();
});
