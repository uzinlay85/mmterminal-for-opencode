# 🇲🇲 Myanmar OpenCode Terminal — အပြည့်အစုံ Setup & Installation Guide

Windows ပေါ်တွင် **OpenCode AI Assistant** ကို မြန်မာစာ (Myanmar Unicode) ဖြင့် သဘာဝကျကျ အမှားအယွင်းမရှိ ရိုက်နှိပ်အသုံးပြုနိုင်စေရန် ဖန်တီးထားသော Desktop Terminal Application ၏ အစအဆုံး တပ်ဆင်အသုံးပြုနည်း လမ်းညွှန်ဖြစ်ပါသည်။

---

## ၁။ ဒီ App ကို တည်ဆောက်ထားသည့် ရည်ရွယ်ချက် (Purpose of the App)

Windows စနစ်ရှိ မူလ Command Prompt (CMD)၊ PowerShell နှင့် Windows Terminal များတွင် မြန်မာစာ ရိုက်နှိပ်သည့်အခါ အောက်ပါ အခက်အခဲကြီး (၃) ရပ် အမြဲတစေ ကြုံတွေ့ရလေ့ရှိပါသည်-

1. **Cursor ပြေးလွှားခြင်းနှင့် စာလုံးမမှန်ခြင်း (Cursor Jumping & Clipping)**:
   - မြန်မာစာ အသတ်၊ အောက်မြစ်၊ တတစ်ချောင်းငင်၊ ပါဠိဆင့် (Conjuncts) များ ရိုက်ထည့်သည့်အခါ Cursor က နေရာမှားခုန်ခြင်း၊ စာလုံးအောက်ခြေ ငြိစွန်းပြတ်ကျန်ခဲ့ခြင်းနှင့် Backspace ဖြင့် ပြန်ဖျက်၍မရခြင်း။
2. **Terminal Cell Width Mismatch (Font Gaps)**:
   - Monospace စနစ်မရှိသော မြန်မာဖောင့်များကြောင့် အင်္ဂလိပ်စာလုံးများအကြား ကွာဟချက် ကျယ်သွားပြီး `p a r a g r a p h` ကဲ့သို့ စာလုံးများ နေရာလွဲကုန်ခြင်း။
3. **OpenCode ကဲ့သို့သော Terminal TUI Application များနှင့် မြန်မာစာ တိုက်ရိုက် မတွဲဖက်နိုင်ခြင်း**:
   - OpenCode CLI ထဲတွင် မြန်မာလို မေးမြန်းလိုသော်လည်း Terminal Encoding (ConPTY) ပြဿနာကြောင့် စာသားများ ပျက်ယွင်းသွားခြင်း။

**ဤ App ၏ အဓိက ရည်ရွယ်ချက်မှာ —**
အထက်ပါ အခက်အခဲများကို အမြစ်ပြတ် ဖြေရှင်းပြီး သီးသန့် **Burmese Prompt Composer Engine**၊ **ConPTY UTF-8 Bridge** နှင့် **Typography Shaping** တို့ကို ပေါင်းစပ်ကာ OpenCode AI ကို မြန်မာလို သွက်သွက်လက်လက် စကားပြောနိုင်စေရန်၊ Coding များ စစ်ဆေးခိုင်းနိုင်စေရန်နှင့် Desktop အက်ပ်တစ်ခုအဖြစ် ပေါ့ပါးစွာ အသုံးပြုနိုင်စေရန် တည်ဆောက်ထားခြင်း ဖြစ်ပါသည်။

---

## ၂။ ဤ App သည် မည်သူတို့အတွက် ရည်ရွယ်သနည်း (Target Audience)

* 👨‍💻 **မြန်မာ Software Developer များ / Programmers**:
  - OpenCode AI ကို အသုံးပြု၍ မိမိ၏ Codebase များကို စစ်ဆေးခြင်း၊ Refactor လုပ်ခြင်း၊ Bug ရှာဖွေခြင်းတို့ကို အင်္ဂလိပ်စာအပြင် မိခင်ဘာသာစကား မြန်မာလိုပါ အသေးစိတ် မေးမြန်းဆွေးနွေးလိုသူများ။
* 🎓 **Coding နှင့် AI နည်းပညာ စတင်လေ့လာသူများ (Beginners & Students)**:
  - အင်္ဂလိပ်စာ ဘာသာစကား အခက်အခဲကြောင့် Programming ကို စိတ်မပျက်စေဘဲ မြန်မာလို အမေးအဖြေပြုလုပ်ကာ Python, JavaScript, Web Development များကို လေ့လာလိုသူများ။
* 📚 **ပါဠိ၊ တိပိဋကနှင့် ဘာသာစကားဆိုင်ရာ ပရောဂျက် လုပ်ဆောင်သူများ**:
  - ပါဠိတော် စာပေများ၊ မြန်မာစာ database များ၊ NLP algorithm များကို ရေးသားစမ်းသပ်ရာတွင် အထူးစာလုံးများဖြစ်သည့် `ဉ`, `ည`, `ဠ`, `ၐ`, `၊`, `။`, `၌`, `၍`, `၎`, `၏` တို့ကို terminal ထဲတွင် အလွယ်တကူ ထည့်သွင်း အသုံးပြုလိုသူများ။
* ⚡ **OpenCode Terminal TUI နှင့် Official Web UI နှစ်မျိုးစလုံးကို အက်ပ်တစ်ခုတည်းတွင် ပေါ့ပါးစွာ သုံးလိုသူများ**။

---

## ၃။ အဆင့် (၁) - ကြိုတင် လိုအပ်ချက်များနှင့် OpenCode တပ်ဆင်ခြင်း (Prerequisites & OpenCode Setup)

ဤ Terminal App ကို မစတင်မီ သင့် Windows ကွန်ပျူတာတွင် အောက်ပါ tools များကို ဦးစွာ တင်ဆင်ထားရန် လိုအပ်ပါသည်-

### (က) Node.js (LTS Version) တပ်ဆင်ခြင်း
Node.js (ဗားရှင်း 18 သို့မဟုတ် 20+ LTS) လိုအပ်ပါသည်။
1. [Node.js Official Website](https://nodejs.org/) သို့ သွားရောက်၍ **LTS (Recommended)** ကို Download ရယူပြီး Install ပြုလုပ်ပါ။
2. သို့မဟုတ် PowerShell တွင် အောက်ပါအတိုင်း ရိုက်ထည့်၍ တင်နိုင်ပါသည်-
   ```powershell
   winget install OpenJS.NodeJS.LTS
   ```

### (ခ) Git for Windows တပ်ဆင်ခြင်း
1. [Git for Windows](https://git-scm.com/download/win) ကို Download ပြုလုပ်၍ Install လုပ်ပါ။
2. သို့မဟုတ် PowerShell တွင်-
   ```powershell
   winget install Git.Git
   ```

### (ဂ) OpenCode AI Assistant ကို Global Install ပြုလုပ်ခြင်း
PowerShell (သို့မဟုတ် Command Prompt) ကိုဖွင့်ပြီး အောက်ပါ Command ဖြင့် OpenCode ကို Install လုပ်ပါ-
```powershell
npm install -g opencode-ai
```

တပ်ဆင်မှု အောင်မြင်ကြောင်း စစ်ဆေးရန်-
```powershell
opencode --version
```
*(OpenCode ဗားရှင်း နံပါတ် ထွက်ပေါ်လာပါက အဆင်ပြေပါပြီ)*

### (ဃ) အခမဲ့ Model (Free Tier) အတွက် OpenCode Configure ပြုလုပ်ခြင်း
OpenCode တွင် Credit/Balance မလိုဘဲ အခမဲ့ အမြဲတမ်း သုံးနိုင်ရန် အောက်ပါ Config ဖိုင်ကို ဖန်တီးပေးပါ-

ဖိုင်လမ်းကြောင်း: `C:\Users\<သင့်Username>\.config\opencode\opencode.jsonc`

```jsonc
{
  "$schema": "https://opencode.ai/config.json",
  "model": "opencode/deepseek-v4.1-flash-free",
  "update": "disable"
}
```

> **💡 မှတ်ချက်-** OpenCode တွင် `opencode/deepseek-v4.1-flash-free`, `opencode/glm-5.3-flash-free`, `opencode/nemotron-3.5-lightning-free` အပါအဝင် အခမဲ့သုံးနိုင်သော Model (၉) မျိုး ပါရှိပြီး မည်သည့်ငွေကြေးမျှ ပေးဆောင်ရန် မလိုပါ။

---

## ၄။ အဆင့် (၂) - Myanmar OpenCode Terminal App ကို တပ်ဆင်ခြင်း (App Setup)

### နည်းလမ်း (၁) - Project Folder ထဲတွင် Dependency များ တင်ဆင်ခြင်း

1. **Terminal_for_Opencode** Folder ထဲသို့ ဝင်ရောက်ပါ။
2. ထို Folder အတွင်း PowerShell သို့မဟုတ် Command Prompt ဖွင့်ပြီး dependencies များ install လုပ်ပါ-
   ```bash
   npm install
   ```
   *(ဤ Command သည် Express, WebSocket, node-pty စသည့် လိုအပ်သော library များကို အလိုအလျောက် တင်ဆင်ပေးပါမည်)*

### နည်းလမ်း (၂) - Desktop Shortcut ဖန်တီးခြင်း (Desktop ပေါ်မှ တိုက်ရိုက်ဖွင့်နိုင်ရန်)

PowerShell တွင် အောက်ပါ Script ကို run လိုက်ပါ-
```powershell
powershell -ExecutionPolicy Bypass -File .\scripts\create_desktop_shortcut.ps1
```
သင့် Desktop ပေါ်တွင် **`Myanmar OpenCode Terminal`** ဟူသော Shortcut Icon အလိုအလျောက် ပေါ်လာပါမည်။

---

## ၅။ အဆင့် (၃) - App ကို စတင်ဖွင့်လှစ် အသုံးပြုပုံ (How to Launch)

အောက်ပါ နည်းလမ်း (၃) မျိုးအနက် မိမိနှစ်သက်ရာဖြင့် ဖွင့်လှစ်နိုင်ပါသည်-

1. **Desktop ပေါ်မှ ဖွင့်ခြင်း (အလွယ်ဆုံး)**:
   - Desktop ပေါ်ရှိ **`Myanmar OpenCode Terminal`** icon ကို Double-Click နှိပ်ပါ။
2. **Batch Script ဖြင့် ဖွင့်ခြင်း**:
   - Folder ထဲရှိ **`Start-Terminal.bat`** ဖိုင်ကို Double-Click နှိပ်ပါ။
3. **Command Line မှ ဖွင့်ခြင်း**:
   ```bash
   npm start
   ```
   ထို့နောက် Browser တွင် `http://localhost:3820` သို့ ဝင်ရောက်နိုင်ပါသည်။

---

## ၆။ အဓိက အသုံးပြုနည်း အင်္ဂါရပ်များ (Feature Guide)

### 🖥️ Tab 1: Terminal & Burmese Prompt Composer
* **အောက်ခြေ Burmese Composer**:
  - OpenCode ထံသို့ မေးလိုသော Prompt များကို ဤအကွက်ထဲတွင် မြန်မာလို လွတ်လပ်စွာ ရိုက်ထည့်ပါ။
  - `Enter` သို့မဟုတ် `Ctrl + Enter` နှိပ်လိုက်သည်နှင့် Prompt သည် Terminal ထဲရှိ OpenCode ထံသို့ သန့်ရှင်းစွာ ရောက်ရှိသွားပါမည်။
* **အမြန်စာလုံး ခလုတ်များ**:
  - `ဉ`, `ည`, `ဠ`, `ၐ`, `၊`, `။`, `၌`, `၍`, `၎`, `၏` တို့ကို ကလစ်တစ်ချက်ဖြင့် ထည့်နိုင်ပါသည်။
* **Screen ပြင်ဆင်ခြင်း ခလုတ်များ**:
  - `⛔ ရပ်မည် (Ctrl+C)` — Command / Generation ကို ရပ်တန့်မည်။
  - `⎋ Popup ပိတ်မည် (Esc)` — OpenCode ပေါ်ရှိ Dialog/Popup များကို ပိတ်မည်။
  - `✨ Screen ပြင်မည် (Ctrl+L)` — စာသားထပ်ခြင်း၊ ရုပ်ထွက် မကြည်လင်ခြင်းများကို ချက်ချင်း ပြန်လည်ဆွဲသား သန့်ရှင်းပေးမည်။
  - `🧹 Terminal ရှင်းမည်` — Screen အားလုံးကို အသစ်ရှင်းလင်းမည်။

### 🌐 Tab 2: OpenCode Web UI (Official Web Interface)
* OpenCode 2.0 ၏ တရားဝင် Web UI ကို App ထဲတွင် တိုက်ရိုက် ထည့်သွင်းအသုံးပြုနိုင်ပါသည်။
* **Pairing Link ဖြင့် ချိတ်ဆက်ခြင်း**:
  - ပထမဆုံးအကြိမ် ဖွင့်သည့်အခါ အပေါ်ရှိ **`📋 Pairing Link ကူးယူမည်`** ကို နှိပ်ပြီး မျက်နှာပြင်အလယ်ရှိ `Pairing Link` အကွက်ထဲတွင် Paste ချ၍ **Connect** နှိပ်ရုံဖြင့် အမြဲတမ်း ချိတ်ဆက်သွားပါမည်။
* **Free Model ရှာဖွေခြင်း**:
  - အောက်ခြေ Model နေရာတွင် `free` ဟု ရှာဖွေပြီး အခမဲ့ Model (၉) မျိုးကို ရွေးချယ်နိုင်ပါသည်။

### ⚡ Tab 3: AI Prompt စနစ် (Direct Runner)
* Terminal ဖွင့်စရာမလိုဘဲ မြန်မာလို အမြန်မေးမြန်းပြီး Streaming အဖြေ ရယူနိုင်သော အကွက်ဖြစ်ပါသည်။

### ⚙️ ဖောင့်နှင့် အပြင်အဆင် (Settings)
* အပေါ်ညာဘက်ရှိ **`⚙️ ဖောင့်/အပြင်အဆင်`** ကို နှိပ်၍:
  - Font Size (12px - 22px), Line Height, Color Theme (GitHub Dark / Cyberpunk Neon / Monokai Pro / Solarized Dark) များကို စိတ်ကြိုက် ညှိနိုင်ပါသည်။
  - မိမိပိုင် `Gemini API Key` သို့မဟုတ် `DeepSeek API Key` ထည့်သွင်းထားနိုင်ပါသည်။ Key များကို ဤ Project Folder ပြင်ပ (`%USERPROFILE%\.config\myanmar-opencode-terminal`) တွင် သိမ်းဆည်းထားပြီး မျက်နှာပြင်တွင် နောက်ဆုံးစာလုံး (၄) လုံးသာ ပြသပါသည်။ သိမ်းထားသော Key များကို ဖျက်လိုပါက **`🗑️ သိမ်းထားသော Key ဖျက်မည်`** ကို နှိပ်ပါ။

---

## ၇။ ပြဿနာ ဖြေရှင်းနည်းများ (Troubleshooting)

| ပြဿနာ | ဖြေရှင်းနည်း |
| :--- | :--- |
| **စာလုံးများ ထပ်နေခြင်း / အက္ခရာများ မကြည်လင်ခြင်း** | Toolbar ရှိ **`✨ Screen ပြင်မည် (Ctrl+L)`** ခလုတ်ကို နှိပ်ပါ (သို့မဟုတ် `Ctrl + L` နှိပ်ပါ)။ |
| **Popup / Dialog များ မပိတ်ဘဲ ရပ်နေခြင်း** | Toolbar ရှိ **`⎋ Popup ပိတ်မည် (Esc)`** ကို နှိပ်ပါ (သို့မဟုတ် `Esc` နှိပ်ပါ)။ |
| **`Insufficient account funds` ဟု ပြနေခြင်း** | Paid Model ရွေးထားမိသောကြောင့် ဖြစ်ပါသည်။ Web UI အောက်ခြေရှိ Model နေရာတွင် `DeepSeek V4.1 Flash Free` သို့မဟုတ် `Gemini 3.8 Flash` ကဲ့သို့သော Free model ကို ပြောင်းပေးပါ။ |
| **Web UI ပွင့်မလာဘဲ စောင့်ဆိုင်းနေခြင်း** | **`🔄 Refresh`** ခလုတ်ကို နှိပ်ပါ (OpenCode 2.0 Background Server သည် port `45278` တွင် အလုပ်လုပ်ပါသည်)။ |
