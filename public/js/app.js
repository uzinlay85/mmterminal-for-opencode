/**
 * Myanmar OpenCode Terminal - Frontend Application Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  // Must match API_VERSION in server.js. If the running backend is older (e.g. the
  // server was left running from a previous version) the UI says so instead of
  // throwing cryptic parse errors.
  const EXPECTED_API_VERSION = 14;

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
  const runnerModelRefreshBtn = document.getElementById('btn-refresh-models');
  const runnerModelMeta = document.getElementById('runner-model-meta');
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

  function formatNetworkError(err) {
    if (!err) return 'အမှားဖြစ်ပေါ်ပါသည်';
    const msg = err.message || String(err);
    if (/failed to fetch|networkerror|load failed/i.test(msg)) {
      return 'Backend Server (localhost:3820) နှင့် ချိတ်ဆက်၍ မရပါ\n\nကျေးဇူးပြု၍ Start-Terminal.bat (သို့မဟုတ် npm start) ဖြင့် Server ကို စတင်ဖွင့်ပေးပါ။';
    }
    return msg;
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
      checkApiStatus();

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
      const statusText = document.getElementById('status-text');
      if (statusText) statusText.textContent = 'Server နှင့် ချိတ်ဆက်မှု ပြတ်တောက်သွားပါသည် (Start-Terminal.bat ကို ပြန်ဖွင့်ပါ)';
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

  function launchGeminiCliInTerm() {
    const termTabBtn = document.querySelector('.tab-btn[data-tab="terminal"]');
    if (termTabBtn) termTabBtn.click();
    if (ws && isWsConnected) {
      ws.send(JSON.stringify({ type: 'input', data: '\x03' }));
      setTimeout(() => {
        ws.send(JSON.stringify({ type: 'input', data: 'npm run gemini\r' }));
      }, 120);
      showToast('✨ Gemini CLI ကို စတင်နေပါသည်...');
      if (term) term.focus();
    }
  }

  const startGeminiCliBtn = document.getElementById('btn-start-gemini-cli');
  if (startGeminiCliBtn) {
    startGeminiCliBtn.addEventListener('click', launchGeminiCliInTerm);
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
  function browseWindowsFolder() {
    const initial = currentCwdSpan.textContent && currentCwdSpan.textContent !== 'Loading...'
      ? currentCwdSpan.textContent
      : (folderInputPath && folderInputPath.value ? folderInputPath.value : null);
    fetch('/api/browse-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initialPath: initial })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success && data.cwd) {
          currentCwdSpan.textContent = data.cwd;
          if (folderInputPath) folderInputPath.value = data.cwd;
          addRecentProject(data.cwd);
          closeModal(modalFolder);
          showToast(`📁 Project Folder ကို "${data.cwd}" သို့ ပြောင်းလဲပြီးပါပြီ`);
          if (ws && isWsConnected) {
            ws.send(JSON.stringify({ type: 'restart', shell: shellSelect.value, cwd: data.cwd }));
          }
        } else if (data.error) {
          alert(data.error);
        }
      })
      .catch(err => alert(formatNetworkError(err)));
  }


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
      alert(formatNetworkError(err));
    });
  });

  const settingGeminiKey = document.getElementById('setting-gemini-key');
  const settingGroqKey = document.getElementById('setting-groq-key');
  const settingOpenrouterKey = document.getElementById('setting-openrouter-key');
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
        applyKeyHint(settingGroqKey, keys.GROQ_API_KEY, 'gsk_...');
        applyKeyHint(settingOpenrouterKey, keys.OPENROUTER_API_KEY, 'sk-or-v1-...');
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
          GROQ_API_KEY_CLEAR: true,
          OPENROUTER_API_KEY_CLEAR: true,
          DEEPSEEK_API_KEY_CLEAR: true,
          OPENAI_API_KEY_CLEAR: true
        })
      })
        .then(r => r.json())
        .then(() => {
          applyKeyHint(settingGeminiKey, { set: false }, 'AIzaSy...');
          applyKeyHint(settingGroqKey, { set: false }, 'gsk_...');
          applyKeyHint(settingOpenrouterKey, { set: false }, 'sk-or-v1-...');
          applyKeyHint(settingDeepseekKey, { set: false }, 'sk-...');
          applyKeyHint(settingOpenaiKey, { set: false }, 'sk-...');
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
    if (settingGroqKey && settingGroqKey.value.trim()) {
      keyPayload.GROQ_API_KEY = settingGroqKey.value.trim();
    }
    if (settingOpenrouterKey && settingOpenrouterKey.value.trim()) {
      keyPayload.OPENROUTER_API_KEY = settingOpenrouterKey.value.trim();
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
            applyKeyHint(settingGroqKey, res.keys.GROQ_API_KEY, 'gsk_...');
            applyKeyHint(settingOpenrouterKey, res.keys.OPENROUTER_API_KEY, 'sk-or-v1-...');
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

  // ---- OpenCode Account Management & Switching ----
  const btnOpenAccount = document.getElementById('btn-open-account');
  const headerAccountLabel = document.getElementById('header-account-label');
  const btnSwitchAccountQuick = document.getElementById('btn-switch-account-quick');
  const btnSettingsOpenAccount = document.getElementById('btn-settings-open-account');
  const settingsAccountSummary = document.getElementById('settings-account-summary');
  const modalAccount = document.getElementById('modal-account');
  const accountListContainer = document.getElementById('account-list-container');
  const btnAccountLogin = document.getElementById('btn-account-login');
  const btnAccountLoginExt = document.getElementById('btn-account-login-ext');
  const btnRefreshAccounts = document.getElementById('btn-refresh-accounts');

  let cachedAccounts = [];
  let currentActiveAccount = null;

  function formatAccountDisplay(acc) {
    if (!acc) return 'OpenCode Account';
    if (acc.email) return acc.email;
    if (acc.label && acc.hint) return `${acc.label} (••••${acc.hint})`;
    if (acc.label) return acc.label;
    if (acc.hint) return `API Key (••••${acc.hint})`;
    return acc.integrationID || 'Account';
  }

  function renderAccountList(accounts) {
    if (!accountListContainer) return;
    accountListContainer.innerHTML = '';

    if (!accounts || accounts.length === 0) {
      accountListContainer.innerHTML = `
        <div style="text-align: center; color: var(--text-muted); padding: 18px 10px; background: var(--bg-primary); border-radius: 6px; border: 1px dashed var(--border-color);">
          <div style="font-size: 14px; margin-bottom: 6px; color: #fff;">Account မချိတ်ဆက်ရသေးပါ</div>
          <div style="font-size: 11px;">အထက်ပါ "➕ Account အသစ်ဖြင့် Login ဝင်မည်" ကို နှိပ်၍ OpenCode Console / Google အကောင့် သို့မဟုတ် API Key ချိတ်ဆက်ပါ။</div>
        </div>
      `;
      return;
    }

    accounts.forEach(acc => {
      const card = document.createElement('div');
      card.className = 'account-card notranslate';
      card.style.cssText = `
        display: flex;
        align-items: center;
        justify-content: space-between;
        gap: 10px;
        padding: 10px 14px;
        background: ${acc.active ? 'rgba(35, 134, 54, 0.12)' : 'var(--bg-primary)'};
        border: 1px solid ${acc.active ? '#238636' : 'var(--border-color)'};
        border-radius: 6px;
        transition: all 0.15s ease;
      `;

      const infoDiv = document.createElement('div');
      infoDiv.style.cssText = 'flex: 1; min-width: 0;';

      const titleRow = document.createElement('div');
      titleRow.style.cssText = 'display: flex; align-items: center; gap: 6px; margin-bottom: 2px; flex-wrap: wrap;';

      const providerBadge = document.createElement('span');
      providerBadge.className = 'brand-badge';
      providerBadge.style.cssText = 'font-size: 10px; text-transform: uppercase; padding: 1px 5px;';
      providerBadge.textContent = acc.integrationID === 'opencode' ? 'OpenCode' : acc.integrationID;

      const nameSpan = document.createElement('span');
      nameSpan.style.cssText = 'font-weight: 600; font-size: 13px; color: #fff; white-space: nowrap; overflow: hidden; text-overflow: ellipsis;';
      nameSpan.textContent = acc.label || acc.integrationID;

      titleRow.appendChild(providerBadge);
      titleRow.appendChild(nameSpan);

      if (acc.active) {
        const activeBadge = document.createElement('span');
        activeBadge.style.cssText = 'font-size: 11px; color: #3fb950; font-weight: 600; display: inline-flex; align-items: center; gap: 3px;';
        activeBadge.innerHTML = '✓ <span style="font-size: 10px;">လက်ရှိသုံးနေသည်</span>';
        titleRow.appendChild(activeBadge);
      }

      const descDiv = document.createElement('div');
      descDiv.style.cssText = 'font-size: 12px; color: var(--text-muted); font-family: var(--font-mono); word-break: break-all;';
      if (acc.email) {
        descDiv.textContent = `📧 ${acc.email}` + (acc.orgName ? ` · ${acc.orgName}` : '');
      } else if (acc.hint) {
        descDiv.textContent = `🔑 Key: ••••••••${acc.hint}`;
      } else {
        descDiv.textContent = `ID: ${acc.id.slice(0, 16)}...`;
      }

      infoDiv.appendChild(titleRow);
      infoDiv.appendChild(descDiv);

      const actionDiv = document.createElement('div');
      actionDiv.style.cssText = 'display: flex; gap: 6px; align-items: center; flex-shrink: 0;';

      if (!acc.active) {
        const switchBtn = document.createElement('button');
        switchBtn.className = 'action-btn btn-blue notranslate';
        switchBtn.style.cssText = 'padding: 4px 10px; font-size: 12px;';
        switchBtn.innerHTML = '<span>🔄 ပြောင်းမည်</span>';
        switchBtn.title = 'ဤ Account သို့ ချက်ချင်း ပြောင်းလဲအသုံးပြုမည် (Switch)';
        switchBtn.addEventListener('click', () => {
          switchAccount(acc.integrationID, acc.id, acc.label || acc.email || acc.integrationID);
        });
        actionDiv.appendChild(switchBtn);
      }

      const logoutBtn = document.createElement('button');
      logoutBtn.className = 'action-btn notranslate';
      logoutBtn.style.cssText = 'padding: 4px 8px; font-size: 12px; color: #f85149; border-color: rgba(248,81,73,0.3);';
      logoutBtn.innerHTML = '<span>🗑️</span>';
      logoutBtn.title = 'ဤ Account အား Logout လုပ်ပြီး ဖယ်ရှားမည်';
      logoutBtn.addEventListener('click', () => {
        const disp = acc.email || acc.label || acc.integrationID;
        if (confirm(`"${disp}" အား OpenCode မှ Logout ပြုလုပ်ရန် သေချာပါသလား?`)) {
          logoutAccount(acc.integrationID, acc.id, disp);
        }
      });
      actionDiv.appendChild(logoutBtn);

      card.appendChild(infoDiv);
      card.appendChild(actionDiv);
      accountListContainer.appendChild(card);
    });
  }

  function loadAccounts(showToastOnSuccess = false) {
    fetch('/api/auth/accounts')
      .then(r => r.json())
      .then(res => {
        if (!res || !res.success) {
          if (settingsAccountSummary) settingsAccountSummary.textContent = 'Account စစ်ဆေး၍ မရပါ';
          return;
        }
        cachedAccounts = res.accounts || [];
        currentActiveAccount = res.activeAccount || null;

        // Update header label
        if (headerAccountLabel) {
          if (currentActiveAccount) {
            const shortName = currentActiveAccount.email
              ? currentActiveAccount.email.split('@')[0]
              : (currentActiveAccount.label || 'Account');
            headerAccountLabel.textContent = `👤 ${shortName}`;
            if (btnOpenAccount) {
              btnOpenAccount.title = `လက်ရှိ Account: ${formatAccountDisplay(currentActiveAccount)} (နှိပ်၍ ပြောင်းပါ)`;
            }
          } else {
            headerAccountLabel.textContent = '👤 Account';
          }
        }

        // Update settings summary
        if (settingsAccountSummary) {
          if (currentActiveAccount) {
            settingsAccountSummary.textContent = `လက်ရှိ: ${formatAccountDisplay(currentActiveAccount)}`;
          } else {
            settingsAccountSummary.textContent = 'Account ချိတ်ဆက်ထားခြင်း မရှိပါ';
          }
        }

        renderAccountList(cachedAccounts);
        if (showToastOnSuccess) {
          showToast('🔄 Account စာရင်း ပြန်လည်ရယူပြီးပါပြီ');
        }
      })
      .catch(() => {
        if (settingsAccountSummary) settingsAccountSummary.textContent = 'Error checking accounts';
      });
  }

  function switchAccount(target, credentialId, label) {
    showToast(`⏳ "${label}" သို့ ပြောင်းလဲနေပါသည်...`);
    fetch('/api/auth/switch', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, credentialId })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          showToast(`✅ OpenCode Account ကို "${label}" သို့ ပြောင်းလိုက်ပါပြီ (Web UI တွင် '+' New Chat နှိပ်ပါ)`);
          loadAccounts();
          loadModelsFromCli(true);
          // Drop any in-memory Web UI state tied to the previous account and
          // reconnect to the freshly restarted service with a new pairing link,
          // so the new account is used instead of the previous one's session.
          if (webuiIframe) {
            webuiIframe.src = 'about:blank';
          }
          webServerUrl = null;
          // Refresh pairing link for the new account and reload the Web UI against
          // the restarted service so no previous-account state carries over.
          setTimeout(() => {
            fetchPairingLink();
            setTimeout(() => { checkWebUiStatus(); }, 1500);
          }, 500);
        } else {
          alert('Account ပြောင်းလဲမှု မအောင်မြင်ပါ: ' + (data.error || 'အမှားဖြစ်ပေါ်ပါသည်'));
        }
      })
      .catch(err => {
        alert(formatNetworkError(err));
      });
  }

  function logoutAccount(target, credentialId, label) {
    showToast(`⏳ "${label}" ကို Logout လုပ်နေပါသည်...`);
    fetch('/api/auth/logout', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ target, credentialId })
    })
      .then(r => r.json())
      .then(data => {
        if (data.success) {
          showToast(`🗑️ "${label}" အား Logout ပြုလုပ်ပြီးပါပြီ`);
          loadAccounts();
          loadModelsFromCli(true);
          if (webuiIframe) {
            webuiIframe.src = 'about:blank';
          }
          webServerUrl = null;
          setTimeout(() => {
            fetchPairingLink();
            setTimeout(() => { checkWebUiStatus(); }, 1500);
          }, 500);
        } else {
          alert('Logout မအောင်မြင်ပါ: ' + (data.error || 'အမှားဖြစ်ပေါ်ပါသည်'));
        }
      })
      .catch(err => {
        alert(formatNetworkError(err));
      });
  }

  function launchExternalLogin() {
    fetch('/api/auth/launch-login', { method: 'POST' })
      .then(r => r.json())
      .then(res => {
        if (res.success) {
          showToast('🌐 သီးသန့် Login Window (Login-OpenCode.bat) ပွင့်လာပါပြီ');
        } else {
          alert('Login Window ဖွင့်၍ မရပါ: ' + (res.error || ''));
        }
      })
      .catch(err => alert(formatNetworkError(err)));
  }

  function startInteractiveLogin() {
    closeModal(modalAccount);
    closeModal(modalSettings);
    // Switch to Terminal tab
    const termTabBtn = document.querySelector('.tab-btn[data-tab="terminal"]');
    if (termTabBtn) termTabBtn.click();

    if (ws && isWsConnected) {
      // Send Ctrl+C first to clear any running command or prompt, then opencode auth login
      ws.send(JSON.stringify({ type: 'input', data: '\x03' }));
      setTimeout(() => {
        ws.send(JSON.stringify({ type: 'input', data: 'opencode auth login\r' }));
      }, 150);
      showToast('🚀 Terminal တွင် Account အသစ် Login လုပ်ငန်းစဉ် စတင်နေပါသည်...');
      if (term) term.focus();
    } else {
      showToast('⚠️ Terminal မချိတ်ဆက်ရသေးပါ — သီးသန့် Window ဖြင့် ဖွင့်ပါမည်');
      launchExternalLogin();
    }
  }

  if (btnOpenAccount) {
    btnOpenAccount.addEventListener('click', () => {
      loadAccounts();
      openModal(modalAccount);
    });
  }

  if (btnSwitchAccountQuick) {
    btnSwitchAccountQuick.addEventListener('click', () => {
      loadAccounts();
      openModal(modalAccount);
    });
  }

  if (btnSettingsOpenAccount) {
    btnSettingsOpenAccount.addEventListener('click', () => {
      closeModal(modalSettings);
      loadAccounts();
      openModal(modalAccount);
    });
  }

  if (btnAccountLogin) {
    btnAccountLogin.addEventListener('click', startInteractiveLogin);
  }

  if (btnAccountLoginExt) {
    btnAccountLoginExt.addEventListener('click', launchExternalLogin);
  }

  if (btnRefreshAccounts) {
    btnRefreshAccounts.addEventListener('click', () => loadAccounts(true));
  }

  // ---- Token Usage ----
  const btnOpenUsage = document.getElementById('btn-open-usage');
  const btnUsageRefresh = document.getElementById('btn-usage-refresh');
  const modalUsage = document.getElementById('modal-usage');

  function formatNumber(n) {
    return (Number(n) || 0).toLocaleString();
  }

  function loadUsage(forceRefresh) {
    const summary = document.getElementById('usage-summary');
    if (summary) summary.textContent = 'ရယူနေပါသည်...';
    fetch('/api/usage' + (forceRefresh ? '?refresh=1' : ''))
      .then(r => r.json())
      .then(res => {
        if (!res || !res.success) {
          if (summary) summary.textContent = 'Usage data ရယူမှု မအောင်မြင်ပါ';
          return;
        }
        const totalEl = document.getElementById('usage-total');
        const costEl = document.getElementById('usage-cost');
        const inputEl = document.getElementById('usage-input');
        const outputEl = document.getElementById('usage-output');
        const reasoningEl = document.getElementById('usage-reasoning');
        const cacheEl = document.getElementById('usage-cache');
        const sessionsEl = document.getElementById('usage-sessions');
        const promptsEl = document.getElementById('usage-prompts');
        const stepsEl = document.getElementById('usage-steps');
        const modelsEl = document.getElementById('usage-models');
        if (totalEl) totalEl.textContent = formatNumber(res.usedTokens || res.used);
        if (costEl) costEl.textContent = '$' + (Number(res.cost) || 0).toFixed(4);
        const t = res.tokens || {};
        if (inputEl) inputEl.textContent = formatNumber(t.input);
        if (outputEl) outputEl.textContent = formatNumber(t.output);
        if (reasoningEl) reasoningEl.textContent = formatNumber(t.reasoning);
        if (cacheEl) cacheEl.textContent = formatNumber((t.cache && t.cache.read) || 0);
        if (sessionsEl) sessionsEl.textContent = formatNumber(res.sessions);
        if (promptsEl) promptsEl.textContent = formatNumber(res.prompts);
        if (stepsEl) stepsEl.textContent = formatNumber(res.steps);
        if (modelsEl) {
          modelsEl.innerHTML = '';
          const models = res.models || [];
          if (!models.length) {
            modelsEl.innerHTML = '<div style="color:var(--text-muted);">Model အချက်အလက် မရှိပါ</div>';
          } else {
            const title = document.createElement('div');
            title.style.cssText = 'font-weight:600;color:#fff;margin-bottom:4px;';
            title.textContent = 'Model အလိုက် အသုံးပြုမှု:';
            modelsEl.appendChild(title);
            models.slice(0, 8).forEach(m => {
              const row = document.createElement('div');
              row.style.cssText = 'display:flex;justify-content:space-between;gap:6px;padding:2px 0;border-bottom:1px solid var(--border-color);';
              const name = (m.model && m.model.id) || m.name || 'model';
              const toks = (m.tokens && m.tokens.total) ? m.tokens.total : ((m.tokens && ((m.tokens.input||0)+(m.tokens.output||0)+(m.tokens.reasoning||0)+(m.tokens.cache&&m.tokens.cache.read||0))) || 0);
              row.innerHTML = `<span style="overflow:hidden;text-overflow:ellipsis;white-space:nowrap;">${escapeHtml(String(name))}</span><span style="font-family:var(--font-mono);">${formatNumber(toks)}</span>`;
              modelsEl.appendChild(row);
            });
          }
        }
        if (summary) {
          const when = res.fetchedAt ? new Date(res.fetchedAt).toLocaleTimeString() : '';
          summary.textContent = 'စစ်ဆေးချိန်: ' + (when || '—') + (res.cached ? ' (cache)' : '');
        }
      })
      .catch(() => {
        if (summary) summary.textContent = 'Usage data ရယူမှု မအောင်မြင်ပါ';
      });
  }

  if (btnOpenUsage) {
    btnOpenUsage.addEventListener('click', () => {
      loadUsage(false);
      if (modalUsage) {
        modalUsage.classList.add('active');
      }
    });
  }
  if (btnUsageRefresh) {
    btnUsageRefresh.addEventListener('click', () => loadUsage(true));
  }

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
        // The model catalogue lives on OpenCode's side, so refresh it whenever the
        // tab is opened — a newly released free model then shows up without a reload.
        loadModelsFromCli(false);
        runnerPromptInput.focus();
      } else if (targetTab === 'gemini') {
        checkGeminiStatus();
        if (geminiPromptInput) geminiPromptInput.focus();
      }
    });
  });

  const inputPairLink = document.getElementById('input-pair-link');
  const btnCopyPairLink = document.getElementById('btn-copy-pair-link');

  function fetchPairingLink() {
    if (!inputPairLink) return Promise.resolve(null);
    return fetch('/api/opencode/web/pair')
      .then(r => r.json())
      .then(res => {
        if (res.success && res.link) {
          inputPairLink.value = res.link;
          return res.link;
        } else {
          inputPairLink.value = 'Pairing link ရယူမရပါ';
          return null;
        }
      })
      .catch(() => {
        if (inputPairLink) inputPairLink.value = 'Pairing link ရယူမရပါ';
        return null;
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
      .catch(err => alert(formatNetworkError(err)));
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

    // Capture usage before the run so we can report the delta afterwards.
    let usageBefore = null;
    fetch('/api/usage').then(r => r.json()).then(d => { usageBefore = d; }).catch(() => {});

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
            // Report token delta for this run.
            fetch('/api/usage?refresh=1').then(r => r.json()).then(after => {
              if (usageBefore && after && after.success) {
                const delta = (Number(after.usedTokens || after.used) || 0) - (Number(usageBefore.usedTokens || usageBefore.used) || 0);
                if (delta > 0) {
                  showToast('✅ ဖြေကြားပြီးပါပြီ · ဤတစ်ကြိမ် Token ' + delta.toLocaleString() + ' ခု သုံးပါသည်');
                } else {
                  showToast('✅ OpenCode မှ ဖြေကြားပြီးပါပြီ');
                }
              } else {
                showToast('✅ OpenCode မှ ဖြေကြားပြီးပါပြီ');
              }
            }).catch(() => showToast('✅ OpenCode မှ ဖြေကြားပြီးပါပြီ'));
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

  // Load Status on startup and reconnection
  function checkApiStatus() {
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
  }
  checkApiStatus();

  // Populate the runner model picker from the installed OpenCode CLI. Falls back
  // to the static <option> list when the CLI is unavailable or returns nothing.
  // Remembers the user's last picked model so a refresh does not reset it.
  const LAST_MODEL_KEY = 'mm_opencode_last_model';
  const MODELS_AUTO_REFRESH_MS = 30 * 60 * 1000;

  function setModelMeta(text) {
    if (runnerModelMeta) runnerModelMeta.textContent = text;
  }

  function loadModelsFromCli(forceRefresh) {
    runnerModelSelect.disabled = true;
    setModelMeta('⏳ Model စာရင်း ရယူနေပါသည်...');

    fetch('/api/models' + (forceRefresh ? '?refresh=1' : ''))
      .then(r => r.json())
      .then(res => {
        const models = (res && res.models) || [];
        if (!models.length) {
          runnerModelSelect.disabled = false;
          setModelMeta('⚠️ Model စာရင်း မရနိုင်ပါ — OpenCode တပ်ဆင်ထားခြင်း ရှိ/မရှိ စစ်ဆေးပါ');
          return;
        }

        // The server classifies free models from their live ids, so new "-free"
        // models need no code change here.
        const freeModels = (res && res.freeModels) || [];
        const freeSet = new Set(freeModels);

        const previous = runnerModelSelect.value;
        let saved = null;
        try { saved = localStorage.getItem(LAST_MODEL_KEY); } catch (e) { saved = null; }

        const freeGroup = document.createElement('optgroup');
        freeGroup.label = '🆓 Free Model များ';
        const otherGroup = document.createElement('optgroup');
        otherGroup.label = 'အခြား Model များ';

        models.forEach(name => {
          const opt = document.createElement('option');
          opt.value = name;
          opt.textContent = (freeSet.has(name) ? '🆓 ' : '') + name;
          (freeSet.has(name) ? freeGroup : otherGroup).appendChild(opt);
        });

        runnerModelSelect.innerHTML = '';
        if (freeGroup.childElementCount) runnerModelSelect.appendChild(freeGroup);
        if (otherGroup.childElementCount) runnerModelSelect.appendChild(otherGroup);

        // Keep the user's choice when it still exists, otherwise prefer the last
        // saved model, then a free one, then anything.
        let pick = null;
        if (models.includes(previous)) pick = previous;
        else if (saved && models.includes(saved)) pick = saved;
        else if (freeModels.length) pick = freeModels[0];
        else pick = models[0];
        if (pick) runnerModelSelect.value = pick;

        runnerModelSelect.disabled = false;

        let when = '';
        if (res && res.fetchedAt) {
          try { when = new Date(res.fetchedAt).toLocaleTimeString(); } catch (e) { when = ''; }
        }
        setModelMeta(`🆓 Free Model ${freeModels.length} ခု / စုစုပေါင်း ${models.length} ခု` +
          (when ? ` · စစ်ဆေးချိန် ${when}` : '') +
          (res && res.cached ? ' (cache)' : ''));
      })
      .catch(() => {
        runnerModelSelect.disabled = false;
        setModelMeta('⚠️ Model စာရင်း ရယူမှု မအောင်မြင်ပါ');
      });
  }

  if (runnerModelRefreshBtn) {
    runnerModelRefreshBtn.addEventListener('click', () => loadModelsFromCli(true));
  }

  if (runnerModelSelect) {
    runnerModelSelect.addEventListener('change', () => {
      try { localStorage.setItem(LAST_MODEL_KEY, runnerModelSelect.value); } catch (e) {}
    });
  }

  // Keep the catalogue warm while the app stays open, so a newly published free
  // model is already there when the user looks for it.
  setInterval(() => loadModelsFromCli(true), MODELS_AUTO_REFRESH_MS);

  // ============================================================
  // Tab 4: Gemini AI Interactive WebUI (OpenCode WebUI Style)
  // ============================================================
  const geminiModelSelect = document.getElementById('gemini-model-select');
  const geminiActiveModelBadge = document.getElementById('gemini-active-model-badge');
  const geminiCurrentSessionTitle = document.getElementById('gemini-current-session-title');
  const geminiKeyStatus = document.getElementById('gemini-key-status');
  const btnGeminiOpenSettings = document.getElementById('btn-gemini-open-settings');
  const btnGeminiLaunchCli = document.getElementById('btn-gemini-launch-cli');
  const btnGeminiNewChat = document.getElementById('btn-gemini-new-chat');
  const btnGeminiClearAllSessions = document.getElementById('btn-gemini-clear-all-sessions');
  const geminiSessionsList = document.getElementById('gemini-sessions-list');
  const btnGeminiAttachFile = document.getElementById('btn-gemini-attach-file');
  const btnGeminiOpenBrowser = document.getElementById('btn-gemini-open-browser');
  const geminiAttachedFilesBar = document.getElementById('gemini-attached-files-bar');
  const geminiAttachedChips = document.getElementById('gemini-attached-chips');
  const modalGeminiFile = document.getElementById('modal-gemini-file');
  const geminiFileList = document.getElementById('gemini-file-list');
  const geminiChatContainer = document.getElementById('gemini-chat-container');
  const geminiPromptTemplates = document.getElementById('gemini-prompt-templates');
  const geminiPromptInput = document.getElementById('gemini-prompt-input');
  const geminiCharCounter = document.getElementById('gemini-char-counter');
  const geminiZawgyiBadge = document.getElementById('gemini-zawgyi-badge');
  const btnGeminiClearPrompt = document.getElementById('btn-gemini-clear-prompt');
  const btnGeminiStop = document.getElementById('btn-gemini-stop');
  const btnGeminiSend = document.getElementById('btn-gemini-send');

  // Sessions and Context State
  let geminiSessions = [];
  try {
    geminiSessions = JSON.parse(localStorage.getItem('mm_gemini_sessions') || '[]');
    if (!Array.isArray(geminiSessions)) geminiSessions = [];
  } catch (e) {
    geminiSessions = [];
  }

  let currentGeminiSessionId = null;
  let geminiConversationHistory = [];
  let geminiAttachedFiles = [];
  let geminiCurrentAbortController = null;

  window.__showGeminiCopyToast = () => showToast('📋 Code ကို Copy ကူးပြီးပါပြီ');

  function saveGeminiSessions() {
    try {
      localStorage.setItem('mm_gemini_sessions', JSON.stringify(geminiSessions));
    } catch (e) {}
  }

  function renderGeminiSessions() {
    if (!geminiSessionsList) return;
    geminiSessionsList.innerHTML = '';

    if (!geminiSessions.length) {
      geminiSessionsList.innerHTML = `
        <div style="font-size: 11.5px; color: var(--text-muted); text-align: center; padding: 16px 8px;">
          စကားဝိုင်း မရှိသေးပါ<br>"စကားဝိုင်းအသစ်" စတင်ပါ
        </div>
      `;
      return;
    }

    geminiSessions.forEach(session => {
      const item = document.createElement('div');
      item.className = 'gemini-session-item notranslate' + (session.id === currentGeminiSessionId ? ' active' : '');
      
      const titleSpan = document.createElement('span');
      titleSpan.className = 'gemini-session-title';
      titleSpan.textContent = session.title || 'စကားဝိုင်း';
      titleSpan.title = session.title || 'စကားဝိုင်း';

      const delBtn = document.createElement('button');
      delBtn.className = 'gemini-session-delete notranslate';
      delBtn.textContent = '✕';
      delBtn.title = 'ဖျက်မည်';
      delBtn.onclick = (e) => {
        e.stopPropagation();
        deleteGeminiSession(session.id);
      };

      item.appendChild(titleSpan);
      item.appendChild(delBtn);

      item.onclick = () => {
        switchGeminiSession(session.id);
      };

      geminiSessionsList.appendChild(item);
    });
  }

  function createGeminiNewChat() {
    currentGeminiSessionId = null;
    geminiConversationHistory = [];
    geminiAttachedFiles = [];
    renderAttachedChips();
    if (geminiCurrentSessionTitle) geminiCurrentSessionTitle.textContent = '✨ စကားဝိုင်းအသစ်';
    renderGeminiSessions();
    if (geminiChatContainer) {
      geminiChatContainer.innerHTML = `
        <div class="gemini-msg gemini-msg-assistant notranslate">
          <div class="gemini-msg-header">
            <span class="gemini-avatar">✨</span>
            <span class="gemini-name">Gemini AI</span>
            <span class="gemini-model-badge">Google Generative AI</span>
          </div>
          <div class="gemini-msg-body">
            မင်္ဂလာပါခင်ဗျာ! Google Gemini Web UI မှ ကြိုဆိုပါတယ်။ OpenCode WebUI နည်းတူ မြန်မာဘာသာဖြင့် စကားဝိုင်းများ မေးမြန်းခြင်း၊ Project ဖိုင်များ ထည့်သွင်းဆွေးနွေးခြင်းနှင့် Coding ပြဿနာ ဖြေရှင်းခြင်းများကို ကူညီပေးနိုင်ပါသည်။
          </div>
        </div>
      `;
    }
    if (geminiPromptInput) geminiPromptInput.focus();
  }

  function switchGeminiSession(id) {
    const session = geminiSessions.find(s => s.id === id);
    if (!session) return;
    currentGeminiSessionId = session.id;
    geminiConversationHistory = session.messages ? [...session.messages] : [];
    if (geminiCurrentSessionTitle) geminiCurrentSessionTitle.textContent = session.title || 'စကားဝိုင်း';
    if (session.model && geminiModelSelect) {
      geminiModelSelect.value = session.model;
      if (geminiActiveModelBadge) geminiActiveModelBadge.textContent = session.model;
    }
    renderGeminiSessions();

    if (!geminiChatContainer) return;
    geminiChatContainer.innerHTML = '';
    if (!geminiConversationHistory.length) {
      createGeminiNewChat();
      return;
    }

    geminiConversationHistory.forEach(msg => {
      const msgEl = document.createElement('div');
      if (msg.role === 'user') {
        msgEl.className = 'gemini-msg gemini-msg-user notranslate';
        msgEl.innerHTML = `
          <div class="gemini-msg-header">
            <span class="gemini-avatar">👤</span>
            <span class="gemini-name">သင်</span>
          </div>
          <div class="gemini-msg-body">${escapeHtml(msg.text)}</div>
        `;
      } else {
        msgEl.className = 'gemini-msg gemini-msg-assistant notranslate';
        msgEl.innerHTML = `
          <div class="gemini-msg-header">
            <span class="gemini-avatar">✨</span>
            <span class="gemini-name">Gemini AI</span>
            <span class="gemini-model-badge">${session.model || 'Gemini'}</span>
          </div>
          <div class="gemini-msg-body">${formatGeminiText(msg.text)}</div>
        `;
      }
      geminiChatContainer.appendChild(msgEl);
    });

    geminiChatContainer.scrollTop = geminiChatContainer.scrollHeight;
  }

  function deleteGeminiSession(id) {
    geminiSessions = geminiSessions.filter(s => s.id !== id);
    saveGeminiSessions();
    if (currentGeminiSessionId === id) {
      if (geminiSessions.length) {
        switchGeminiSession(geminiSessions[0].id);
      } else {
        createGeminiNewChat();
      }
    } else {
      renderGeminiSessions();
    }
    showToast('🗑️ စကားဝိုင်းကို ဖျက်ပြီးပါပြီ');
  }

  function renderAttachedChips() {
    if (!geminiAttachedChips || !geminiAttachedFilesBar) return;
    geminiAttachedChips.innerHTML = '';
    if (!geminiAttachedFiles.length) {
      geminiAttachedFilesBar.style.display = 'none';
      return;
    }
    geminiAttachedFilesBar.style.display = 'flex';
    geminiAttachedFiles.forEach((file, index) => {
      const chip = document.createElement('span');
      chip.className = 'attached-file-chip notranslate';
      chip.innerHTML = `
        <span>📄 ${escapeHtml(file.name)}</span>
        <span class="remove-chip" title="ဖယ်ရှားမည်" data-index="${index}">&times;</span>
      `;
      chip.querySelector('.remove-chip').onclick = () => {
        geminiAttachedFiles.splice(index, 1);
        renderAttachedChips();
      };
      geminiAttachedChips.appendChild(chip);
    });
  }

  function openGeminiFilePicker() {
    if (!geminiFileList) return;
    geminiFileList.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-muted);">ဖိုင်စာရင်း ရယူနေပါသည်...</div>';
    openModal(modalGeminiFile);

    fetch('/api/project-files')
      .then(r => r.json())
      .then(data => {
        const files = (data && data.files) || [];
        if (!files.length) {
          geminiFileList.innerHTML = '<div style="text-align:center; padding: 20px; color: var(--text-muted);">ဖိုင်များ မတွေ့ရှိပါ</div>';
          return;
        }

        geminiFileList.innerHTML = '';
        files.forEach(f => {
          const btn = document.createElement('button');
          btn.className = 'action-btn notranslate';
          btn.style.cssText = 'justify-content: space-between; text-align: left; padding: 8px 12px; font-family: var(--font-mono); font-size: 12px; width: 100%;';
          const sizeKb = (f.size / 1024).toFixed(1);
          btn.innerHTML = `
            <span>📄 ${escapeHtml(f.name)}</span>
            <span style="color: var(--text-muted); font-size: 11px;">${sizeKb} KB</span>
          `;
          btn.onclick = () => {
            fetchFileAndAttach(f.path, f.name);
          };
          geminiFileList.appendChild(btn);
        });
      })
      .catch(err => {
        geminiFileList.innerHTML = `<div style="color: #ff7b72; padding: 10px;">Error: ${err.message}</div>`;
      });
  }

  function fetchFileAndAttach(filePath, fileName) {
    fetch('/api/file-content', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ filePath })
    })
    .then(r => r.json())
    .then(data => {
      if (data.success && data.content) {
        if (!geminiAttachedFiles.some(f => f.path === data.path)) {
          geminiAttachedFiles.push({
            name: fileName,
            path: data.path,
            content: data.content
          });
          renderAttachedChips();
          showToast(`📎 "${fileName}" ကို Context ထဲ ထည့်သွင်းပြီးပါပြီ`);
        }
        closeModal(modalGeminiFile);
      } else {
        alert(data.error || 'ဖိုင်ဖတ်မရပါ');
      }
    })
    .catch(err => alert(err.message));
  }

  function checkGeminiStatus() {
    fetch('/api/gemini/status')
      .then(r => r.json())
      .then(data => {
        if (!geminiKeyStatus) return;
        if (data && data.configured) {
          geminiKeyStatus.innerHTML = `<span style="color: #3fb950; font-weight: 600;">🔑 Key ချိတ်ဆက်ပြီး (••••${data.hint || ''})</span>`;
          geminiKeyStatus.style.borderColor = 'rgba(63, 185, 80, 0.4)';
        } else {
          geminiKeyStatus.innerHTML = `<span style="color: #e3b341; font-weight: 600;">⚠️ Key မရှိသေးပါ</span>`;
          geminiKeyStatus.style.borderColor = 'rgba(227, 179, 65, 0.4)';
        }
      })
      .catch(() => {});
  }

  function updateGeminiCharCount() {
    if (!geminiPromptInput) return;
    const val = geminiPromptInput.value;
    if (geminiCharCounter) {
      geminiCharCounter.textContent = `${val.length} စာလုံး`;
    }
    if (geminiZawgyiBadge && window.MyanmarConverter) {
      if (val.trim() && window.MyanmarConverter.isZawgyi(val)) {
        geminiZawgyiBadge.style.display = 'inline-block';
      } else {
        geminiZawgyiBadge.style.display = 'none';
      }
    }
  }

  document.querySelectorAll('.gemini-char-btn').forEach(btn => {
    btn.addEventListener('click', () => {
      const char = btn.getAttribute('data-char');
      insertAtCursor(geminiPromptInput, char);
      updateGeminiCharCount();
      geminiPromptInput.focus();
    });
  });

  if (geminiZawgyiBadge) {
    geminiZawgyiBadge.addEventListener('click', () => {
      if (window.MyanmarConverter && geminiPromptInput.value) {
        geminiPromptInput.value = window.MyanmarConverter.zawgyiToUnicode(geminiPromptInput.value);
        updateGeminiCharCount();
        showToast('✅ Zawgyi မှ Unicode သို့ ပြောင်းလဲပြီးပါပြီ');
        geminiPromptInput.focus();
      }
    });
  }

  if (geminiPromptTemplates) {
    geminiPromptTemplates.addEventListener('change', () => {
      const val = geminiPromptTemplates.value;
      if (val) {
        geminiPromptInput.value = val;
        updateGeminiCharCount();
        geminiPromptInput.focus();
      }
    });
  }

  if (geminiPromptInput) {
    geminiPromptInput.addEventListener('input', updateGeminiCharCount);
    geminiPromptInput.addEventListener('keydown', (e) => {
      if (e.key === 'Enter' && !e.shiftKey) {
        e.preventDefault();
        sendGeminiMessage();
      }
    });
  }

  if (btnGeminiClearPrompt) {
    btnGeminiClearPrompt.addEventListener('click', () => {
      geminiPromptInput.value = '';
      updateGeminiCharCount();
      geminiPromptInput.focus();
    });
  }

  if (btnGeminiOpenSettings) {
    btnGeminiOpenSettings.addEventListener('click', () => {
      openSettingsBtn.click();
      setTimeout(() => {
        const geminiInput = document.getElementById('setting-gemini-key');
        if (geminiInput) geminiInput.focus();
      }, 200);
    });
  }

  if (btnGeminiLaunchCli) {
    btnGeminiLaunchCli.addEventListener('click', launchGeminiCliInTerm);
  }

  if (btnGeminiNewChat) {
    btnGeminiNewChat.addEventListener('click', createGeminiNewChat);
  }

  if (btnGeminiClearAllSessions) {
    btnGeminiClearAllSessions.addEventListener('click', () => {
      if (confirm('စကားဝိုင်း မှတ်တမ်းအားလုံးကို ဖျက်ပစ်ရန် သေချာပါသလား?')) {
        geminiSessions = [];
        saveGeminiSessions();
        createGeminiNewChat();
        showToast('🗑️ စကားဝိုင်းအားလုံးကို ဖျက်ပြီးပါပြီ');
      }
    });
  }

  if (btnGeminiAttachFile) {
    btnGeminiAttachFile.addEventListener('click', openGeminiFilePicker);
  }

  if (btnGeminiOpenBrowser) {
    btnGeminiOpenBrowser.addEventListener('click', () => {
      window.open('/?tab=gemini', '_blank');
    });
  }

  if (geminiModelSelect) {
    geminiModelSelect.addEventListener('change', () => {
      if (geminiActiveModelBadge) {
        geminiActiveModelBadge.textContent = geminiModelSelect.value;
      }
      if (currentGeminiSessionId) {
        const sess = geminiSessions.find(s => s.id === currentGeminiSessionId);
        if (sess) {
          sess.model = geminiModelSelect.value;
          saveGeminiSessions();
        }
      }
    });
  }

  function formatGeminiText(raw) {
    if (!raw) return '';
    const codeBlocks = [];
    let text = raw.replace(/```([\w-]*)\r?\n([\s\S]*?)```/g, (_m, lang, code) => {
      const idx = codeBlocks.length;
      const escapedCode = escapeHtml(code.trim());
      const encodedCode = encodeURIComponent(code);
      codeBlocks.push(`
        <div style="position: relative; margin: 10px 0;">
          <div style="display: flex; justify-content: space-between; align-items: center; background: #161b22; padding: 4px 10px; border-top-left-radius: 6px; border-top-right-radius: 6px; border: 1px solid var(--border-color); border-bottom: none; font-size: 11px; color: var(--text-muted); font-family: var(--font-mono);">
            <span>${lang || 'code'}</span>
            <button class="tool-chip notranslate" style="padding: 1px 6px; font-size: 10px;" onclick="navigator.clipboard.writeText(decodeURIComponent('${encodedCode}')); window.__showGeminiCopyToast && window.__showGeminiCopyToast();">📋 Copy</button>
          </div>
          <pre style="margin: 0; border-top-left-radius: 0; border-top-right-radius: 0;"><code>${escapedCode}</code></pre>
        </div>
      `);
      return `@@CODE_BLOCK_${idx}@@`;
    });

    text = escapeHtml(text);
    text = text.replace(/\*\*(.*?)\*\*/g, '<strong>$1</strong>');
    text = text.replace(/`([^`]+)`/g, '<code style="background: rgba(148,163,184,0.15); padding: 2px 5px; border-radius: 4px; font-family: var(--font-mono); font-size: 12.5px;">$1</code>');
    text = text.replace(/@@CODE_BLOCK_(\d+)@@/g, (_m, idx) => codeBlocks[Number(idx)] || '');

    return text;
  }

  function sendGeminiMessage() {
    let prompt = geminiPromptInput.value.trim();
    if (!prompt) return;

    if (window.MyanmarConverter && window.MyanmarConverter.isZawgyi(prompt)) {
      prompt = window.MyanmarConverter.zawgyiToUnicode(prompt);
    }

    geminiPromptInput.value = '';
    updateGeminiCharCount();

    // Append User Message to UI
    const userMsgEl = document.createElement('div');
    userMsgEl.className = 'gemini-msg gemini-msg-user notranslate';
    userMsgEl.innerHTML = `
      <div class="gemini-msg-header">
        <span class="gemini-avatar">👤</span>
        <span class="gemini-name">သင်</span>
      </div>
      <div class="gemini-msg-body">${escapeHtml(prompt)}</div>
    `;
    geminiChatContainer.appendChild(userMsgEl);

    // Append Assistant Message placeholder to UI
    const model = geminiModelSelect ? geminiModelSelect.value : 'gemini-2.5-flash';
    const assistantMsgEl = document.createElement('div');
    assistantMsgEl.className = 'gemini-msg gemini-msg-assistant notranslate';
    assistantMsgEl.innerHTML = `
      <div class="gemini-msg-header">
        <span class="gemini-avatar">✨</span>
        <span class="gemini-name">Gemini AI</span>
        <span class="gemini-model-badge">${model}</span>
      </div>
      <div class="gemini-msg-body"><span style="color: var(--accent-blue);">စဉ်းစားတွေးခေါ်နေပါသည်...</span></div>
    `;
    geminiChatContainer.appendChild(assistantMsgEl);
    geminiChatContainer.scrollTop = geminiChatContainer.scrollHeight;

    const bodyEl = assistantMsgEl.querySelector('.gemini-msg-body');

    btnGeminiSend.disabled = true;
    btnGeminiSend.style.opacity = '0.6';
    if (btnGeminiStop) btnGeminiStop.style.display = 'inline-flex';

    let fullAnswer = '';
    const abortController = new AbortController();
    geminiCurrentAbortController = abortController;

    const filesToSend = [...geminiAttachedFiles];

    fetch('/api/gemini/run', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        prompt,
        model,
        history: geminiConversationHistory,
        files: filesToSend
      }),
      signal: abortController.signal
    })
    .then(response => {
      const reader = response.body.getReader();
      const decoder = new TextDecoder('utf-8');
      bodyEl.textContent = '';

      function readChunk() {
        reader.read().then(({ done, value }) => {
          if (done) {
            btnGeminiSend.disabled = false;
            btnGeminiSend.style.opacity = '1';
            if (btnGeminiStop) btnGeminiStop.style.display = 'none';
            geminiCurrentAbortController = null;

            if (fullAnswer) {
              bodyEl.innerHTML = formatGeminiText(fullAnswer);
              geminiConversationHistory.push({ role: 'user', text: prompt });
              geminiConversationHistory.push({ role: 'model', text: fullAnswer });

              // Sync to Session Storage
              if (!currentGeminiSessionId) {
                const newId = 'gemini_' + Date.now();
                currentGeminiSessionId = newId;
                const newSession = {
                  id: newId,
                  title: prompt.length > 36 ? prompt.slice(0, 36) + '...' : prompt,
                  createdAt: Date.now(),
                  model,
                  messages: [...geminiConversationHistory]
                };
                geminiSessions.unshift(newSession);
                if (geminiCurrentSessionTitle) geminiCurrentSessionTitle.textContent = newSession.title;
              } else {
                const sess = geminiSessions.find(s => s.id === currentGeminiSessionId);
                if (sess) {
                  sess.messages = [...geminiConversationHistory];
                  sess.model = model;
                }
              }
              saveGeminiSessions();
              renderGeminiSessions();

              // Clear attached files for next prompt
              geminiAttachedFiles = [];
              renderAttachedChips();
              showToast('✅ Gemini မှ ဖြေကြားပြီးပါပြီ');
            }
            return;
          }

          const chunk = decoder.decode(value, { stream: true });
          fullAnswer += chunk;
          bodyEl.textContent = fullAnswer;
          geminiChatContainer.scrollTop = geminiChatContainer.scrollHeight;
          readChunk();
        }).catch(err => {
          btnGeminiSend.disabled = false;
          btnGeminiSend.style.opacity = '1';
          if (btnGeminiStop) btnGeminiStop.style.display = 'none';
          geminiCurrentAbortController = null;
          if (abortController.signal.aborted) {
            bodyEl.innerHTML += '<br><em style="color: #e3b341;">[အသုံးပြုသူမှ ရပ်တန့်လိုက်ပါသည်]</em>';
          } else {
            bodyEl.innerHTML += `<br><span style="color: #ff7b72;">[Error: ${err.message}]</span>`;
          }
        });
      }

      readChunk();
    })
    .catch(err => {
      btnGeminiSend.disabled = false;
      btnGeminiSend.style.opacity = '1';
      if (btnGeminiStop) btnGeminiStop.style.display = 'none';
      geminiCurrentAbortController = null;
      if (abortController.signal.aborted) {
        bodyEl.innerHTML = '<em style="color: #e3b341;">[အသုံးပြုသူမှ ရပ်တန့်လိုက်ပါသည်]</em>';
      } else {
        bodyEl.innerHTML = `<span style="color: #ff7b72;">Error: ${err.message}</span>`;
      }
    });
  }

  if (btnGeminiStop) {
    btnGeminiStop.addEventListener('click', () => {
      if (geminiCurrentAbortController) {
        geminiCurrentAbortController.abort();
        geminiCurrentAbortController = null;
        showToast('⏹️ Gemini ဖြေကြားမှုကို ရပ်တန့်လိုက်ပါပြီ');
      }
    });
  }

  if (btnGeminiSend) {
    btnGeminiSend.addEventListener('click', sendGeminiMessage);
  }

  // Startup
  initTerminal();
  connectWebSocket();
  renderHistoryModal();
  renderRunnerHistory();
  renderRecentProjects();
  loadModelsFromCli();
  loadAccounts();
  loadUsage(false);
  checkGeminiStatus();
  renderGeminiSessions();
  if (geminiSessions.length) {
    switchGeminiSession(geminiSessions[0].id);
  } else {
    createGeminiNewChat();
  }

  const urlParams = new URLSearchParams(window.location.search);
  if (urlParams.get('tab') === 'gemini' || window.location.hash === '#gemini') {
    const geminiTabBtn = document.querySelector('.tab-btn[data-tab="gemini"]');
    if (geminiTabBtn) geminiTabBtn.click();
  }
});
