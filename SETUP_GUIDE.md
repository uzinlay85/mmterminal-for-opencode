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
   - Desktop Shortcut (`Myanmar OpenCode Terminal`)
4. ပြီးဆုံးပါက Desktop ပေါ်ရှိ **`Myanmar OpenCode Terminal`** icon ကို Double-Click ဖွင့်ပါ။

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

OpenCode Web UI အောက်ခြေ Model နေရာတွင် `free` ဟု ရှာဖွေပြီး အခမဲ့ Model (၉) မျိုးကို ရွေးချယ်နိုင်ပါသည် (ဥပမာ `DeepSeek V4.1 Flash Free`)။ ငွေကြေး ပေးဆောင်ရန် မလိုပါ။

---

## ⚙️ အပြင်အဆင် (Settings)

`⚙️ ဖောင့်/အပြင်အဆင်` ကို နှိပ်၍ Font Size, Line Height, Color Theme နှင့် API Keys (Gemini/DeepSeek/OpenAI) များ ထည့်သွင်းနိုင်ပါသည်။ Key များကို `%USERPROFILE%\.config\myanmar-opencode-terminal` တွင် သိမ်းဆည်းပြီး နောက်ဆုံးစာလုံး (၄) လုံးသာ ပြသပါသည်။

---

## 🧯 ပြဿနာ ဖြေရှင်းနည်း

| ပြဿနာ | ဖြေရှင်းနည်း |
|---|---|
| စာလုံးများ ထပ်နေခြင်း / မကြည်လင်ခြင်း | `✨ Screen ပြင်မည် (Ctrl+L)` ကို နှိပ်ပါ |
| Popup / Dialog မပိတ်ဘဲ ရပ်နေခြင်း | `⎋ Popup ပိတ်မည် (Esc)` ကို နှိပ်ပါ |
| `Insufficient account funds` | Free Model သို့ ပြောင်းပေးပါ (`DeepSeek V4.1 Flash Free`) |
| Web UI ပွင့်မလာခြင်း | `🔄 Refresh` ခလုတ်ကို နှိပ်ပါ (port 45278) |
| `node-pty` build မအောင်မြင်ခြင်း | Visual Studio C++ Build Tools တပ်ဆင်ပြီး `npm install` ပြန် run ပါ |

---

## 📂 ဖိုင်ဖွဲ့စည်းပုံ (အကျဉ်း)

- `server.js` — Backend (Express + WebSocket + ConPTY)
- `public/` — Frontend (xterm.js + app.js + converter.js)
- `scripts/` — Launcher, installer, folder picker
- `test/` — Unit tests (`npm test`)
- `Install-Terminal.bat` — One-click installer

---

> 📖 အသေးစိတ် အချက်အလက်များကို README.md တွင် ဖတ်ရှုနိုင်ပါသည်။
