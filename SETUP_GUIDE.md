# 🇲🇲 Myanmar OpenCode Terminal — Setup Guide (လွယ်ကူသော တပ်ဆင်နည်း)

Windows ပေါ်တွင် OpenCode AI ကို မြန်မာစာ (Myanmar Unicode) ဖြင့် အသုံးပြုနိုင်စေရန် ဖန်တီးထားသော Desktop Terminal App ဖြစ်ပါသည်။

---

## ⚡ နည်းလမ်း (၁) — One-Click Installer (အလွယ်ဆုံး)

1. Project folder ကို Download/Extract လုပ်ပါ။
2. Folder ထဲရှိ **`Install-Terminal.bat`** ကို **Right-click → Run as administrator** (သို့မဟုတ်) Double-Click နှိပ်ပါ။
3. Installer က အောက်ပါ အရာများကို အလိုအလျောက် လုပ်ဆောင်ပေးပါမည်-
   - Node.js (LTS)
   - Git for Windows
   - OpenCode AI CLI (`opencode-ai`)
   - C++ Build Tools (node-pty အတွက်)
   - Project dependencies (`npm install`)
   - OpenCode အခမဲ့ Model Config (`%USERPROFILE%\.config\opencode\opencode.jsonc`)
   - Desktop Shortcut (`Myanmar OpenCode Terminal`)
4. Installer ၏ အဆုံးတွင် **OpenCode Login** ကို ယခု ဝင်မည်/မဝင်မည် မေးပါမည်။ `y` နှိပ်ပါက **OpenCode Console** (အခမဲ့ Model များအတွက်) ကို Browser ဖြင့် ချိတ်ဆက်နိုင်ပါသည်။
5. ပြီးဆုံးပါက Desktop ပေါ်ရှိ **`Myanmar OpenCode Terminal`** icon ကို Double-Click ဖွင့်ပါ။

> 🔑 နောက်မှ OpenCode Login ပြန်ဝင်လိုပါက **`Login-OpenCode.bat`** ကို Double-Click လုပ်ပါ။

> 💡 Installer သည် အင်တာနက် လိုအပ်ပါသည်။ ပထမဆုံး run တွင် အချိန် (၅–၁၅ မိနစ်) ကြာနိုင်ပါသည်။

---

## 🛠️ နည်းလမ်း (၂) — လက်ဖြင့် တပ်ဆင်ခြင်း (Manual)

### ကြိုတင် လိုအပ်ချက်များ
- **Node.js 18+ (LTS)**: https://nodejs.org  (သို့မဟုတ် `winget install OpenJS.NodeJS.LTS`)
- **Git for Windows**: https://git-scm.com  (သို့မဟုတ် `winget install Git.Git`)
- **Visual Studio C++ Build Tools** (node-pty အတွက်): https://visualstudio.microsoft.com/visual-cpp-build-tools/

### OpenCode CLI တပ်ဆင်ခြင်း
```powershell
npm install -g opencode-ai
opencode --version
```

### OpenCode အခမဲ့ Model Config သတ်မှတ်ခြင်း (Optional)
`%USERPROFILE%\.config\opencode\opencode.jsonc` ဖိုင်ကို ဖန်တီးပြီး အောက်ပါအတိုင်း ထည့်ပါ (One-Click Installer က ဤဖိုင်ကို အလိုအလျောက် ဖန်တီးပေးပါသည်)-
```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "model": "opencode/deepseek-v4.1-flash-free",
  "update": "disable"
}
```

### App တပ်ဆင်ခြင်း
```powershell
cd Terminal_for_Opencode
npm install
powershell -ExecutionPolicy Bypass -File .\scripts\create_desktop_shortcut.ps1
```

---

## 🚀 App ဖွင့်လှစ်ခြင်း

- **Desktop Shortcut** ကို Double-Click (အလွယ်ဆုံး)
- သို့မဟုတ် **`Start-Terminal.bat`** ကို Double-Click
- သို့မဟုတ် Command Line: `npm start` → Browser: `http://localhost:3820`

---

## 📖 အသုံးပြုနည်း (အကျဉ်း)

1. **Project Folder ရွေးချယ်ခြင်း**: Header ရှိ `📂 Browse` (သို့မဟုတ်) `✏️ ရိုက်ထည့်ရန်` ကို နှိပ်ပါ။ ယခင် Project များကို Modal ထဲရှိ စာရင်းမှ ပြန်ဖွင့်နိုင်ပါသည်။
2. **Prompt ရိုက်ခြင်း**: အောက်ခြေ Composer တွင် မြန်မာလို ရိုက်ပြီး `Enter` / `Ctrl+Enter` နှိပ်ပါ။
3. **OpenCode စတင်ခြင်း**: `🚀 OpenCode စတင်မည်` (သို့မဟုတ်) `💬 စာဖတ်မုဒ်` ခလုတ်ကို နှိပ်ပါ။
4. **Web UI**: `🌐 OpenCode Web UI` tab သို့ သွားပြီး `▶️ Web Server စတင်မည်` ကို နှိပ်ပါ (ပထမဆုံးအကြိမ် Pairing Link ကူးယူပါ)။
5. **အသုံးဝင်သော ခလုတ်များ**: `⛔ Ctrl+C`, `⎋ Esc`, `✨ Ctrl+L`, `🧹 ရှင်းမည်`, `🔄 ပြန်စမည်`။
6. **Zawgyi → Unicode**: Zawgyi စာသား ကူးထည့်လိုက်ပါက `⚠️ Zawgyi ဖြစ်နေသည်` badge ပေါ်လာပြီး နှိပ်ရုံဖြင့် Unicode သို့ ပြောင်းပေးပါသည်။
7. **မှတ်တမ်း**: `📜 မှတ်တမ်း` ခလုတ်ဖြင့် ယခင် prompt များကို ပြန်ကြည့်နိုင်ပါသည်။
8. **In-App Help**: Header ညာဘက်ရှိ `❓ အသုံးပြုနည်း` ခလုတ်ကို နှိပ်၍ အဆင့်လိုက် လမ်းညွှန် ကြည့်နိုင်ပါသည်။

---

## 🆓 အခမဲ့ Model (Free Tier)

OpenCode Web UI အောက်ခြေ Model နေရာတွင် `free` ဟု ရှာဖွေပြီး အခမဲ့ Model များကို ရွေးချယ်နိုင်ပါသည် (ဥပမာ `DeepSeek V4.1 Flash Free`)။ ငွေကြေး ပေးဆောင်ရန် မလိုပါ။

> 🔄 **Auto Update:** App ရှိ **AI Prompt စနစ် (Tab 3)** ၏ Model စာရင်းကို OpenCode မှ **တိုက်ရိုက် (live)** ရယူပါသည်။ ထို့ကြောင့် Free Model အသစ် ထွက်လာသည်နှင့် စာရင်းထဲ အလိုအလျောက် ပါလာပါသည် (Hardcode မဟုတ်ပါ)။
> - Free Model များကို **`🆓 Free Model များ`** အုပ်စုတွင် ထိပ်မှ ပြပါသည်
> - `🔄 ပြန်ယူမည်` ခလုတ်ဖြင့် ချက်ချင်း ပြန်လည် ရယူနိုင်ပါသည်
> - Runner tab ကို ဖွင့်တိုင်း + ဖွင့်ထားစဉ် ၃၀ မိနစ်တစ်ကြိမ် အလိုအလျောက် refresh လုပ်ပါသည်
> - စာရင်းဘေးတွင် “🆓 Free Model X ခု · စစ်ဆေးချိန် …” ကို ပြသပါသည်

---

## ⚙️ အပြင်အဆင် (Settings)

`⚙️ ဖောင့်/အပြင်အဆင်` ကို နှိပ်၍ Font Size, Line Height, Color Theme နှင့် API Keys (Gemini/DeepSeek/OpenAI) များ ထည့်သွင်းနိုင်ပါသည်။ Key များကို `%USERPROFILE%\.config\myanmar-opencode-terminal` တွင် သိမ်းဆည်းပြီး နောက်ဆုံးစာလုံး (၄) လုံးသာ ပြသပါသည်။

---

## 🔐 OpenCode 2 ဝင်ရောက်ခြင်း (Login)

OpenCode 2 (v2.0.31+) တွင် အခမဲ့ Model များကို အသုံးပြုရန် သို့မဟုတ် မိမိပိုင် Provider (OpenAI, Anthropic, Google, စသည်) ကို ချိတ်ဆက်ရန် `opencode auth login` ကို အသုံးပြုပါ။

> ⚡ အလွယ်ဆုံး- **`Login-OpenCode.bat`** ကို Double-Click လုပ်ပါ (One-Click Installer ၏ အဆုံးတွင်လည်း Login ဝင်ရန် မေးပါသည်)။

### အခြေခံ Login (OpenCode Console — အခမဲ့ Model များအတွက်)
```powershell
opencode auth login
```
1. စာရင်းထဲမှ **`OpenCode Console`** ကို ရွေးချယ်ပါ။
2. Method အဖြစ် **`Personal`** (သို့မဟုတ်) **`API key`** ကို ရွေးပါ။
3. Browser ပွင့်လာပါက OpenCode account ဖြင့် Sign in လုပ်ပါ (သို့မဟုတ်) API key ကို paste ချပါ။
4. ပြီးဆုံးပါက Terminal တွင် `opencode auth list` ဖြင့် စစ်ဆေးနိုင်ပါသည်။

### အခြား Provider များ (OpenAI, Anthropic, Google, စသည်) ချိတ်ဆက်ခြင်း
```powershell
opencode auth login openai
opencode auth login anthropic
opencode auth login google
```
သို့မဟုတ် `opencode auth login` ကို run ပြီး စာရင်းထဲမှ လိုချင်သော Provider ကို ရွေးချယ်ပါ။ Browser OAuth သို့မဟုတ် API key paste ဖြင့် ဝင်ရောက်နိုင်ပါသည်။

### Account ပြောင်းလဲ/ထွက်ခြင်း
```powershell
opencode auth switch   # account ပြောင်းရန်
opencode auth logout    # ထွက်ရန်
opencode auth list      # သိမ်းဆည်းထားသော credential များ ကြည့်ရန်
```

> 💡 **မှတ်ချက်-** အခမဲ့ Model များ (`*-free`) ကို အသုံးပြုရန် OpenCode Console account (Personal) တစ်ခုသာ လိုအပ်ပါသည်။ ငွေကြေး ပေးဆောင်ရန် မလိုပါ။

---

## 🆓 လက်ရှိ OpenCode Free Model များနှင့် လုပ်ဆောင်နိုင်စွမ်း

> ⚠️ Free Model စာရင်းသည် အချိန်အလိုက် ပြောင်းလဲနိုင်ပါသည်။ နောက်ဆုံးစာရင်းကို Terminal တွင် `opencode models` ဖြင့် စစ်ဆေးနိုင်ပါသည်။

| Model ID | အမျိုးအစား | အဓိက လုပ်ဆောင်နိုင်စွမ်း | သင့်တော်သော အသုံးပြုမှု |
|---|---|---|---|
| `opencode/deepseek-v4.1-flash-free` | Flash (MoE) | မြန်ဆန်၊ 200K context (free tier), reasoning + coding ကောင်း၊ text+image | ကုဒ်ရေးခြင်း၊ debug, ကြီးမားသော codebase ဖတ်ရှုခြင်း |
| `opencode/glm-5.3-flash-free` | Flash | ပေါ့ပါး မြန်ဆန်၊ နေ့စဉ် coding task များအတွက် သင့်တော် | အမြန်မေးမြန်းခြင်း၊ refactor, comment ထည့်ခြင်း |
| `opencode/nemotron-3-ultra-free` | Reasoning | NVIDIA Nemotron, အားကောင်းသော reasoning/coding | ရှုပ်ထွေးသော ပြဿနာများ၊ architecture ဆွေးနွေးခြင်း |
| `opencode/nemotron-3.5-lightning-free` | Lightning | အလွန်မြန်ဆန်၊ ပေါ့ပါး (limited time) | အမြန်အဖြေ၊ autocomplete ဆန်သော အသုံး |
| `opencode/nemotron-3.5-super-vl-free` | Vision-Language | 1M context, text+image+document+GUI screenshot နားလည်၊ reasoning | UI/Design စစ်ဆေးခြင်း၊ ပုံ/စာရွက်စာတမ်း ခွဲခြမ်းစိတ်ဖြာခြင်း |
| `opencode/mimo-v2.6-flash-free` | Flash | Xiaomi MiMo, မြန်ဆန် ပေါ့ပါး | အမြန် code ပြင်ဆင်ခြင်း၊ သေးငယ်သော task |
| `opencode/minimax-m3.1-flash-free` | Flash | MiniMax, မြန်ဆန် ပေါ့ပါး | နေ့စဉ် coding၊ မေးခွန်း အမြန်ဖြေ |
| `opencode/longcat-2.5-preview-free` | Preview | Meituan LongCat, preview (limited time) | စမ်းသပ်အသုံးပြုခြင်း |
| `opencode/big-pickle` | Stealth | အထွေထွေ coding ကောင်း (limited time) | နေ့စဉ် coding အထောက်အပံ့ |
| `opencode/beam-free` | Beam | ပေါ့ပါး အခြေခံ model | ရိုးရှင်းသော မေးမြန်းခြင်း |
| `opencode/space-bunny-free` | Stealth | Zero-retention (data မသိမ်း) (limited time) | ကိုယ်ရေးအချက်အလက် ထည့်သွင်းရသော အလုပ် |

### ရွေးချယ်အသုံးပြုရန် အကြံပြုချက်
- **ကုဒ်ရေး/Debug အဓိက** → `deepseek-v4.1-flash-free` သို့မဟုတ် `nemotron-3-ultra-free`
- **ပုံ/UI/စာရွက်စာတမ်း စစ်ဆေးရန်** → `nemotron-3.5-super-vl-free`
- **အမြန် ပေါ့ပါး task** → `glm-5.3-flash-free` သို့မဟုတ် `nemotron-3.5-lightning-free`
- **ကိုယ်ရေးအချက်အလက် ထိန်းသိမ်းလို** → `space-bunny-free`

> 💡 App ထဲရှိ **AI Prompt စနစ် (Tab 3)** သို့မဟုတ် Terminal တွင် `opencode run -m <model>` ဖြင့် မိမိနှစ်သက်ရာ Model ကို ရွေးချယ် အသုံးပြုနိုင်ပါသည်။

---

## 🧯 ပြဿနာ ဖြေရှင်းနည်း

| ပြဿနာ | ဖြေရှင်းနည်း |
|---|---|
| စာလုံးများ ထပ်နေခြင်း / မကြည်လင်ခြင်း | `✨ Screen ပြင်မည် (Ctrl+L)` ကို နှိပ်ပါ |
| Popup / Dialog မပိတ်ဘဲ ရပ်နေခြင်း | `⎋ Popup ပိတ်မည် (Esc)` ကို နှိပ်ပါ |
| `Insufficient account funds` | Free Model သို့ ပြောင်းပေးပါ (`DeepSeek V4.1 Flash Free`) |
| Web UI ပွင့်မလာခြင်း | `🔄 Refresh` ခလုတ်ကို နှိပ်ပါ (port 45278) |
| `node-pty` build မအောင်မြင်ခြင်း | Visual Studio C++ Build Tools တပ်ဆင်ပြီး `npm install` ပြန် run ပါ |
| `📂 Browse` နှိပ်လျှင် `... is not valid JSON` / Server ဗားရှင်းဟောင်း ဆိုသော error | Server ဟောင်း (Node process) က port 3820 ကို ဆွဲထားဆဲ ဖြစ်သည်။ App ကို ပိတ်ပြီး **`Start-Terminal.bat`** (သို့မဟုတ် Desktop icon) ကို ပြန်ဖွင့်ပါ — launcher က server ဟောင်းကို အလိုအလျောက် ရပ်ပြီး အသစ် ပြန်စပေးပါသည် |

---

## 📂 ဖိုင်ဖွဲ့စည်းပုံ (အကျဉ်း)

- `server.js` — Backend (Express + WebSocket + ConPTY)
- `public/` — Frontend (xterm.js + app.js + converter.js)
- `scripts/` — Launcher, installer, folder picker
- `test/` — Unit tests (`npm test`)
- `Install-Terminal.bat` — One-click installer (Node, Git, OpenCode, Build Tools, deps, config, shortcut)
- `Login-OpenCode.bat` — OpenCode Login အလွယ် ဝင်ရန်
- `Start-Terminal.bat` — App ဖွင့်ရန်

---

> 📖 အသေးစိတ် အချက်အလက်များကို README.md တွင် ဖတ်ရှုနိုင်ပါသည်။
