#!/usr/bin/env node
/**
 * Myanmar Gemini CLI - Interactive Terminal Interface
 * Supporting Myanmar Unicode (UTF-8), streaming responses, and Google Gemini models.
 */

const readline = require('readline');
const fs = require('fs');
const path = require('path');

// Ensure UTF-8 output encoding
if (process.platform === 'win32') {
  try {
    const { execSync } = require('child_process');
    execSync('chcp 65001 > nul', { stdio: 'ignore' });
  } catch (e) {}
}

// Config directory for API keys
const configDir = process.env.MYOPENT_CONFIG_DIR
  || path.join(process.env.USERPROFILE || process.env.HOME || __dirname, '.config', 'myanmar-opencode-terminal');
const keysConfigFile = path.join(configDir, 'api_keys.json');

function getGeminiApiKey() {
  if (process.env.GEMINI_API_KEY && process.env.GEMINI_API_KEY.trim()) {
    return process.env.GEMINI_API_KEY.trim();
  }
  try {
    if (fs.existsSync(keysConfigFile)) {
      const keys = JSON.parse(fs.readFileSync(keysConfigFile, 'utf8')) || {};
      if (keys.GEMINI_API_KEY && keys.GEMINI_API_KEY.trim()) {
        return keys.GEMINI_API_KEY.trim();
      }
    }
  } catch (e) {}
  return null;
}

const DEFAULT_MODELS = [
  'gemini-2.5-flash',
  'gemini-2.5-pro',
  'gemini-2.0-flash',
  'gemini-1.5-flash',
  'gemini-1.5-pro'
];

let currentModel = 'gemini-2.5-flash';
const conversationHistory = [];

async function streamGemini(prompt, apiKey) {
  conversationHistory.push({
    role: 'user',
    parts: [{ text: prompt }]
  });

  const url = `https://generativelanguage.googleapis.com/v1beta/models/${encodeURIComponent(currentModel)}:streamGenerateContent?alt=sse&key=${apiKey}`;

  let response;
  try {
    response = await fetch(url, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({
        contents: conversationHistory,
        generationConfig: {
          temperature: 0.7
        }
      })
    });
  } catch (err) {
    conversationHistory.pop();
    throw new Error('ချိတ်ဆက်မှု မအောင်မြင်ပါ (Network Error): ' + err.message);
  }

  if (!response.ok) {
    conversationHistory.pop();
    let errorDetail = '';
    try {
      const errJson = await response.json();
      errorDetail = errJson.error ? errJson.error.message : JSON.stringify(errJson);
    } catch (e) {
      errorDetail = response.statusText;
    }
    throw new Error(`Gemini API Error (${response.status}): ${errorDetail}`);
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder('utf-8');
  let fullAnswer = '';
  let buffer = '';

  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    buffer += decoder.decode(value, { stream: true });

    const lines = buffer.split('\n');
    buffer = lines.pop(); // keep last incomplete line

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
              process.stdout.write(part.text);
              fullAnswer += part.text;
            }
          }
        }
      } catch (e) {}
    }
  }

  if (fullAnswer) {
    conversationHistory.push({
      role: 'model',
      parts: [{ text: fullAnswer }]
    });
  }
  process.stdout.write('\n');
}

function printBanner() {
  console.log('\x1b[36m==============================================================\x1b[0m');
  console.log('\x1b[1m\x1b[35m ✨ Myanmar Gemini CLI (Google Gemini AI Terminal)\x1b[0m');
  console.log('\x1b[90m လက်ရှိ မော်ဒယ်: \x1b[33m' + currentModel + '\x1b[0m');
  console.log('\x1b[90m အမိန့်များ: /model [name], /clear (စကားဝိုင်းရှင်း), /help, /exit\x1b[0m');
  console.log('\x1b[36m==============================================================\x1b[0m\n');
}

async function main() {
  printBanner();

  let apiKey = getGeminiApiKey();
  if (!apiKey) {
    console.log('\x1b[31m⚠️ GEMINI_API_KEY ကို မတွေ့ရှိသေးပါ!\x1b[0m');
    console.log('\x1b[33mအောက်ပါ နည်းလမ်းများဖြင့် Key ထည့်သွင်းနိုင်ပါသည်:\x1b[0m');
    console.log(' 1. အပေါ် Header ရှိ \x1b[36m⚙️ ဖောင့်/အပြင်အဆင် > API Keys\x1b[0m တွင် Gemini Key ထည့်ပါ');
    console.log(' 2. သို့မဟုတ် ယခုနေရာတွင် သင်၏ Gemini API Key ကို ရိုက်ထည့်ပါ:');

    const rlTemp = readline.createInterface({ input: process.stdin, output: process.stdout });
    apiKey = await new Promise((resolve) => {
      rlTemp.question('\x1b[32mGemini API Key ထည့်ရန်: \x1b[0m', (ans) => {
        rlTemp.close();
        resolve(ans.trim());
      });
    });

    if (!apiKey) {
      console.log('\x1b[31mKey မရှိပါက Gemini CLI ကို ဆက်လက် အသုံးပြု၍ မရနိုင်ပါ။\x1b[0m');
      process.exit(1);
    }

    try {
      fs.mkdirSync(configDir, { recursive: true });
      let currentKeys = {};
      if (fs.existsSync(keysConfigFile)) {
        currentKeys = JSON.parse(fs.readFileSync(keysConfigFile, 'utf8')) || {};
      }
      currentKeys.GEMINI_API_KEY = apiKey;
      fs.writeFileSync(keysConfigFile, JSON.stringify(currentKeys, null, 2), 'utf8');
      console.log('\x1b[32m✅ Key ကို အောင်မြင်စွာ သိမ်းဆည်းပြီးပါပြီ!\x1b[0m\n');
    } catch (e) {}
  }

  const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '\x1b[34mGemini>\x1b[0m '
  });

  rl.prompt();

  rl.on('line', async (line) => {
    const input = line.trim();
    if (!input) {
      rl.prompt();
      return;
    }

    if (input === '/exit' || input === '/quit') {
      console.log('\x1b[90mGemini CLI မှ ထွက်ခွာနေပါသည်...\x1b[0m');
      process.exit(0);
    }

    if (input === '/clear') {
      conversationHistory.length = 0;
      console.log('\x1b[32m🧹 စကားဝိုင်း မှတ်တမ်းများကို ရှင်းလင်းပြီးပါပြီ။\x1b[0m\n');
      rl.prompt();
      return;
    }

    if (input === '/help') {
      console.log('\n\x1b[33mအသုံးပြုနိုင်သော Command များ:\x1b[0m');
      console.log('  /model [name]  - မော်ဒယ် ပြောင်းလဲရန် (ဥပမာ: /model gemini-2.5-pro)');
      console.log('  /models        - ရွေးချယ်နိုင်သော မော်ဒယ်များ ကြည့်ရှုရန်');
      console.log('  /clear         - လက်ရှိ စကားဝိုင်း မှတ်တမ်း ရှင်းလင်းရန်');
      console.log('  /exit          - Gemini CLI မှ ထွက်ခွာရန်\n');
      rl.prompt();
      return;
    }

    if (input === '/models') {
      console.log('\n\x1b[33mထောက်ပံ့ထားသော မော်ဒယ်များ:\x1b[0m');
      DEFAULT_MODELS.forEach((m) => {
        const active = m === currentModel ? ' \x1b[32m(လက်ရှိသုံးနေသည်)\x1b[0m' : '';
        console.log(`  • ${m}${active}`);
      });
      console.log('');
      rl.prompt();
      return;
    }

    if (input.startsWith('/model')) {
      const parts = input.split(/\s+/);
      if (parts[1]) {
        currentModel = parts[1];
        console.log(`\x1b[32m✅ မော်ဒယ်ကို "${currentModel}" သို့ ပြောင်းလိုက်ပါပြီ။\x1b[0m\n`);
      } else {
        console.log(`\x1b[90mလက်ရှိ မော်ဒယ်: ${currentModel}\x1b[0m\n`);
      }
      rl.prompt();
      return;
    }

    // Call Gemini API
    rl.pause();
    try {
      process.stdout.write('\x1b[35m✨ Gemini: \x1b[0m');
      await streamGemini(input, apiKey);
    } catch (err) {
      console.log(`\x1b[31m${err.message}\x1b[0m`);
    }
    console.log('');
    rl.resume();
    rl.prompt();
  });

  rl.on('close', () => {
    process.exit(0);
  });
}

main().catch((err) => {
  console.error('\x1b[31mFatal Error:\x1b[0m', err);
  process.exit(1);
});
