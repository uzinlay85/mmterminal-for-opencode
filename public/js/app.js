/**
 * Myanmar OpenCode Terminal - Frontend Application Engine
 */

document.addEventListener('DOMContentLoaded', () => {
  // Elements
  const terminalContainer = document.getElementById('terminal-container');
  const burmeseInput = document.getElementById('burmese-prompt-input');
  const sendBtn = document.getElementById('btn-send-prompt');
  const clearPromptBtn = document.getElementById('btn-clear-prompt');
  const copyPromptBtn = document.getElementById('btn-copy-prompt');
  const fixZawgyiBtn = document.getElementById('btn-fix-zawgyi');
  const charCounter = document.getElementById('char-counter');
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
  let activeTab = 'terminal';
  let webServerUrl = null;
  let promptHistory = JSON.parse(localStorage.getItem('mm_opencode_history') || '[]');

  // Monospace font MUST be first so xterm calculates standard character cell width!
  const defaultTermFont = "'Cascadia Code', 'Consolas', 'Pyidaungsu', 'Myanmar Text', 'Noto Sans Myanmar', monospace";
  let parsedSettings = {};
  try {
    parsedSettings = JSON.parse(localStorage.getItem('mm_opencode_settings') || '{}');
  } catch (e) {}

  // If old settings had Pyidaungsu first, upgrade to monospace-first
  if (!parsedSettings.fontFamily || parsedSettings.fontFamily.includes("'Pyidaungsu', 'Myanmar Text'")) {
    parsedSettings.fontFamily = defaultTermFont;
  }

  const userSettings = Object.assign({
    fontFamily: defaultTermFont,
    fontSize: 15,
    lineHeight: 1.25,
    theme: 'dark'
  }, parsedSettings);

  // Toast Helper
  function showToast(message, duration = 2500) {
    toastEl.textContent = message;
    toastEl.classList.add('show');
    setTimeout(() => {
      toastEl.classList.remove('show');
    }, duration);
  }

  // Initialize Terminal
  function initTerminal() {
    term = new Terminal({
      cursorBlink: true,
      fontFamily: userSettings.fontFamily,
      fontSize: parseInt(userSettings.fontSize, 10),
      lineHeight: parseFloat(userSettings.lineHeight) || 1.25,
      letterSpacing: 0,
      theme: {
        background: '#0d1117',
        foreground: '#f0f6fc',
        cursor: '#58a6ff',
        cursorAccent: '#0d1117',
        selectionBackground: 'rgba(56, 139, 253, 0.35)',
        black: '#484f58',
        red: '#ff7b72',
        green: '#3fb950',
        yellow: '#d29922',
        blue: '#58a6ff',
        magenta: '#bc8cff',
        cyan: '#39c5cf',
        white: '#b1bac4',
        brightBlack: '#6e7681',
        brightRed: '#ffa198',
        brightGreen: '#56d364',
        brightYellow: '#e3b341',
        brightBlue: '#79c0ff',
        brightMagenta: '#d2a8ff',
        brightCyan: '#56d4dd',
        brightWhite: '#f0f6fc'
      },
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

  // Connect WebSocket
  function connectWebSocket() {
    const protocol = window.location.protocol === 'https:' ? 'wss:' : 'ws:';
    const wsUrl = `${protocol}//${window.location.host}/terminal`;

    ws = new WebSocket(wsUrl);

    ws.onopen = () => {
      isWsConnected = true;
      document.querySelector('.status-dot').style.backgroundColor = '#238636';
      document.querySelector('.status-dot').style.boxShadow = '0 0 6px #238636';

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
      document.querySelector('.status-dot').style.backgroundColor = '#d29922';
      document.querySelector('.status-dot').style.boxShadow = '0 0 6px #d29922';
      setTimeout(connectWebSocket, 2000);
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

  // Update Character Count
  function updateCharCount() {
    const len = burmeseInput.value.length;
    charCounter.textContent = `${len} စာလုံး`;
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

  let isBrowsingInProgress = false;

  function browseWindowsFolder() {
    if (isBrowsingInProgress) {
      showToast('⏳ ဖိုဒါရွေးချယ်သည့် Window ပွင့်နေပါသည်...');
      return;
    }
    isBrowsingInProgress = true;
    showToast('📂 Windows Folder Browser ကို ဖွင့်နေပါသည်...');

    fetch('/api/browse-folder', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ initialPath: currentCwdSpan.textContent || '' })
    })
    .then(r => r.json())
    .then(data => {
      isBrowsingInProgress = false;
      if (data.success && data.cwd) {
        currentCwdSpan.textContent = data.cwd;
        folderInputPath.value = data.cwd;
        closeModal(modalFolder);
        showToast(`📁 Project Folder ကို "${data.cwd}" သို့ ပြောင်းလဲလိုက်ပါပြီ`);
        // Restart terminal in new directory
        if (ws && isWsConnected) {
          ws.send(JSON.stringify({ type: 'restart', shell: shellSelect.value, cwd: data.cwd }));
        }
      } else if (data.canceled) {
        // User closed or canceled
      } else if (data.busy) {
        showToast('⚠️ ဖိုဒါရွေးချယ်သည့် Window ပွင့်နေဆဲဖြစ်ပါသည်');
      } else if (data.error) {
        alert('Folder ရွေးချယ်မှု အဆင်မပြေပါ: ' + data.error);
      }
    })
    .catch(err => {
      isBrowsingInProgress = false;
      alert('Error: ' + err.message);
    });
  }

  if (browseFolderBtn) {
    browseFolderBtn.addEventListener('click', browseWindowsFolder);
  }

  if (modalBrowseBtn) {
    modalBrowseBtn.addEventListener('click', browseWindowsFolder);
  }

  changeFolderBtn.addEventListener('click', () => {
    folderInputPath.value = currentCwdSpan.textContent || '';
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

  openSettingsBtn.addEventListener('click', () => {
    settingFontFamily.value = userSettings.fontFamily;
    settingFontSize.value = userSettings.fontSize;
    fontSizeVal.textContent = userSettings.fontSize + 'px';
    settingLineHeight.value = userSettings.lineHeight;
    lineHeightVal.textContent = userSettings.lineHeight;
    settingTheme.value = userSettings.theme;

    // Fetch saved API keys
    fetch('/api/keys')
      .then(r => r.json())
      .then(keys => {
        if (settingGeminiKey) settingGeminiKey.value = keys.GEMINI_API_KEY || '';
        if (settingDeepseekKey) settingDeepseekKey.value = keys.DEEPSEEK_API_KEY || '';
      })
      .catch(() => {});

    openModal(modalSettings);
  });

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

    // Save API keys to backend
    if (settingGeminiKey || settingDeepseekKey) {
      const keys = {
        GEMINI_API_KEY: settingGeminiKey ? settingGeminiKey.value.trim() : '',
        DEEPSEEK_API_KEY: settingDeepseekKey ? settingDeepseekKey.value.trim() : ''
      };
      fetch('/api/keys', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(keys)
      }).catch(() => {});
    }

    // Apply to Terminal
    if (term) {
      term.options.fontFamily = userSettings.fontFamily;
      term.options.fontSize = userSettings.fontSize;
      term.options.lineHeight = userSettings.lineHeight;
      if (fitAddon) fitAddon.fit();
    }

    closeModal(modalSettings);
    showToast('⚙️ အပြင်အဆင်များကို သိမ်းဆည်းပြီးပါပြီ');
  });

  showHistoryBtn.addEventListener('click', () => {
    renderHistoryModal();
    openModal(modalHistory);
  });

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
          webuiIframe.src = res.url;
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
          contentEl.textContent += '\n\n[Error reading response: ' + err.message + ']';
          btnRunAiPrompt.disabled = false;
          btnRunAiPrompt.style.opacity = '1';
        });
      }

      readChunk();
    })
    .catch(err => {
      runnerOutputBox.innerHTML = `<div style="color: #ff7b72;">Error: ${err.message}</div>`;
      btnRunAiPrompt.disabled = false;
      btnRunAiPrompt.style.opacity = '1';
    });
  }

  // Load Status on startup
  fetch('/api/status')
    .then(r => r.json())
    .then(data => {
      if (data.opencodeInstalled) {
        document.getElementById('status-text').textContent = `OpenCode v${data.version || '1.4'} အသင့်ရှိပါသည်`;
      } else {
        document.getElementById('status-text').textContent = 'OpenCode မရှိသေးပါ';
        document.querySelector('.status-dot').style.backgroundColor = '#ff7b72';
      }
      if (data.cwd) {
        currentCwdSpan.textContent = data.cwd;
        folderInputPath.value = data.cwd;
      }
    })
    .catch(() => {});

  // Startup
  initTerminal();
  connectWebSocket();
  renderHistoryModal();
  renderRunnerHistory();
});
