# 🇲🇲 Myanmar OpenCode Terminal (မြန်မာစာ Terminal App)

Windows ပေါ်တွင် **OpenCode AI Assistant** ကို အသုံးပြုရာတွင် မြန်မာစာ (Myanmar Unicode) ချောမွေ့လွယ်ကူစွာ ရိုက်နှိပ်နိုင်ရန်နှင့် font rendering မှန်ကန်စေရန် အထူးပြုလုပ်ဖန်တီးထားသော Desktop Terminal Application ဖြစ်ပါသည်။

> 📖 **အစအဆုံး တပ်ဆင်နည်း လမ်းညွှန်အပြည့်အစုံကို [SETUP_GUIDE.md](SETUP_GUIDE.md) တွင် ဖတ်ရှုနိုင်ပါသည်။**

---

## 🎯 ရည်ရွယ်ချက်နှင့် အသုံးပြုသင့်သူများ (Purpose & Target Audience)

* **ရည်ရွယ်ချက်**: Windows Terminal / PowerShell များတွင် ကြုံတွေ့ရသော မြန်မာစာ Cursor ခုန်ခြင်း၊ စာလုံးပြတ်ခြင်း၊ Backspace မရခြင်းနှင့် Encoding ပြဿနာများကို အပြီးတိုင်ဖြေရှင်းပြီး OpenCode AI ကို မြန်မာလို အပြန်အလှန် စကားပြောကာ Coding စစ်ဆေးခြင်း၊ ရေးသားခြင်းများကို အဆင်ပြေပြေ လုပ်ဆောင်နိုင်စေရန်။
* **ဘယ်သူတွေအတွက်လဲ**:
  - OpenCode AI ကို မြန်မာလို အသုံးပြုလိုသော **မြန်မာ Software Developer များ**။
  - English အခက်အခဲမရှိဘဲ မိခင်ဘာသာစကားဖြင့် Coding စတင်လေ့လာလိုသော **ကျောင်းသား/စတင်လေ့လာသူများ**။
  - ပါဠိတော်၊ တိပိဋကနှင့် မြန်မာစာအထူးပြု Codebase များ စမ်းသပ်လုပ်ဆောင်နေသော **Cultural & Linguistic Coders များ**။

---

## 🌟 အဓိက ပါဝင်သော စွမ်းဆောင်ချက်များ (Key Features)

1. **🇲🇲 မြန်မာစာ အထူးပြု Prompt Composer (Burmese Composer)**:
   - သာမန် Terminal များတွင် မြန်မာစာရိုက်သည့်အခါ ဖြစ်ပေါ်လေ့ရှိသော Cursor ရှေ့နောက်ခုန်ခြင်း၊ စာလုံးပြတ်ကျန်ခဲ့ခြင်း၊ Backspace ဖျက်မရခြင်းများကို အပြီးတိုင် ဖြေရှင်းပေးထားပါသည်။
   - Windows Unicode Keyboard (သို့မဟုတ် KeyMagic / Pyidaungsu) ဖြင့် သဘာဝကျကျ စိတ်ကြိုက်စာရိုက်နိုင်ပါသည်။
   - `Enter` သို့မဟုတ် `Ctrl + Enter` နှိပ်လိုက်ရုံဖြင့် OpenCode ထံသို့ မြန်မာလို ရေးထားသော prompt ကို သန့်ရှင်းစွာ ပေးပို့ပေးပါသည်။

2. **🚀 OpenCode 1-Click Launch**:
   - ခလုတ်တစ်ချက်နှိပ်ရုံဖြင့် OpenCode TUI Session ကို Terminal ထဲတွင် စတင်ပေးပါသည်။
   - OpenCode Web Interface (`opencode web`) ကိုလည်း Tab အနေဖြင့် တိုက်ရိုက် အသုံးပြုနိုင်ပါသည်။

3. **🔤 အဆင့်မြင့် Font Shaping & Typography Engine**:
   - Windows စံနှုန်းဖြစ်သော `Pyidaungsu` နှင့် `Myanmar Text` ဖောင့်များဖြင့် ချိတ်ဆက်ထားပြီး အပေါ်တင်၊ အောက်ဆွဲ၊ ပါဠိဆင့် (conjuncts) များကို အပြည့်အဝ မှန်ကန်စွာ ဖော်ပြပေးပါသည်။
   - Line-height (1.45) ကို ညှိထားသဖြင့် စာလုံးအောက်ခြေ ငြိစွန်းခြင်းမရှိပါ။

4. **⚡ Quick Burmese Characters (အမြန်စာလုံး ခလုတ်များ)**:
   - ကီးဘုတ်တွင် ရိုက်ရခက်ခဲသော စာလုံးများဖြစ်သည့် `ဉ`, `ည`, `ဠ`, `ၐ`, `၊`, `။`, `၌`, `၍`, `၎`, `၏` များကို ကလစ်တစ်ချက်ဖြင့် ချက်ချင်း ထည့်သွင်းနိုင်ပါသည်။

5. **💡 မြန်မာ AI Prompt နမူနာများ (Templates)**:
   - Code ရှင်းပြခိုင်းခြင်း၊ Error ရှာဖွေစစ်ဆေးခြင်း၊ Refactoring၊ Burmese Comments ထည့်သွင်းခြင်းနှင့် Unit Tests ရေးခိုင်းခြင်းဆိုင်ရာ prompt များကို အသင့်ရွေးချယ် အသုံးပြုနိုင်ပါသည်။

6. **🔄 Zawgyi ⇄ Unicode Converter**:
   - အခြားနေရာမှ ကူးယူလာသော Zawgyi စာသားများကို အလိုအလျောက် သိရှိပြီး စံသတ်မှတ်ချက် Unicode သို့ တစ်ချက်တည်းဖြင့် ပြောင်းလဲပေးပါသည်။
   - Composer တွင် Zawgyi စာသား ရိုက်/ကူးထည့်လိုက်သည်နှင့် **`⚠️ Zawgyi ဖြစ်နေသည်`** ဟု သတိပေးချက် ပေါ်လာပြီး ၎င်းကို နှိပ်လိုက်ရုံဖြင့် Unicode သို့ ချက်ချင်း ပြောင်းပေးပါသည်။

7. **📜 Prompt History (မှတ်တမ်း)**:
   - ယခင်က မေးမြန်းခဲ့ဖူးသော မြန်မာ prompt များကို အချိန်မရွေး ပြန်လည်ကြည့်ရှု အသုံးပြုနိုင်ပါသည်။

8. **📂 In-App Folder Browser (Visual Project Picker)**:
   - Project ဖိုဒါလမ်းကြောင်းကို လက်ဖြင့် စာရိုက်ထည့်စရာမလိုဘဲ Header ဘားရှိ `📂 Browse` ခလုတ်ကို နှိပ်ကာ App အတွင်း Folder Browser (Drive နှင့် ဖိုင်တွဲစာရင်း) ဖြင့် Visual အနေဖြင့် လွယ်ကူစွာ ရှာဖွေရွေးချယ်ပြောင်းလဲနိုင်ပါသည်။

---

## 🚀 စတင်အသုံးပြုပုံ (How to Launch)

### ⚙️ ပထမဆုံး တပ်ဆင်ခြင်း (One-Click Setup)

ဤ project folder ထဲရှိ **`Install-Terminal.bat`** ကို Right-click → **Run as administrator** (သို့မဟုတ်) Double-Click နှိပ်လိုက်ရုံဖြင့် အောက်ပါအရာများကို အလိုအလျောက် တပ်ဆင်ပေးပါသည်-

- **OpenCode AI CLI v2** (`@opencode/cli` — နောက်ဆုံးဗားရှင်း)
- Node.js (LTS) နှင့် Git for Windows
- C++ Build Tools (`node-pty` အတွက်)
- Project dependencies (`npm install`)
- OpenCode အခမဲ့ Model Config (`%USERPROFILE%\.config\opencode\opencode.jsonc`)
- Desktop Shortcut (`Myanmar OpenCode Terminal`)

Installer ၏ အဆုံးတွင် **OpenCode Login** ကို ယခု ဝင်မည်/မဝင်မည် မေးပါမည်။ နောက်မှ ပြန်ဝင်လိုပါက **`Login-OpenCode.bat`** ကို Double-Click လုပ်ပါ။

အောက်ပါ နည်းလမ်းများအနက် အဆင်ပြေရာတစ်ခုဖြင့် စတင်နိုင်ပါသည်:

### နည်းလမ်း ၁ (အလွယ်ကူဆုံး): Desktop Shortcut မှ ဖွင့်ခြင်း
Desktop ပေါ်တွင် ဖန်တီးပေးထားသော **`Myanmar OpenCode Terminal`** icon ကို Double Click နှိပ်၍ ဖွင့်ပါ။

### နည်းလမ်း ၂: Folder ထဲမှ ဖွင့်ခြင်း
ဤ project folder ထဲရှိ **`Start-Terminal.bat`** ဖိုင်ကို Double Click နှိပ်၍ ဖွင့်ပါ။

### နည်းလမ်း ၃: Command Line မှ ဖွင့်ခြင်း
```bash
npm start
```
သို့မဟုတ် Browser တွင်:
```
http://localhost:3820
```

---

## ⌨️ အသုံးဝင်သော Keyboard Shortcuts

| Shortcut | လုပ်ဆောင်ချက် |
|---|---|
| `Enter` (သို့မဟုတ် `Ctrl + Enter`) | Burmese Composer ထဲမှ prompt ကို OpenCode သို့ ပေးပို့မည် |
| `Shift + Enter` | စာကြောင်းအသစ်ဆင်းမည် (New line) |
| `Ctrl + C` | Terminal ထဲရှိ running process ကို ရပ်တန့်မည် |

---

## ❓ App အတွင်း အသုံးပြုနည်း (In-App Help)

App ဖွင့်ပြီးနောက် Header ညာဘက်ရှိ **`❓ အသုံးပြုနည်း`** ခလုတ်ကို နှိပ်၍ အဆင့်လိုက် အသုံးပြုနည်း လမ်းညွှန်ကို တိုက်ရိုက် ကြည့်ရှုနိုင်ပါသည်။ ယခင်သုံးခဲ့သော Project Folder များကိုလည်း Folder Modal ထဲရှိ စာရင်းမှ တစ်ချက်နှိပ်၍ ပြန်ဖွင့်နိုင်ပါသည်။

---

## 🛠️ နည်းပညာ အခြေခံ (Architecture)

- **Backend**: Node.js, Express, WebSocket (`ws`), Windows ConPTY (`node-pty`)
- **Frontend**: xterm.js (DOM HarfBuzz shaping engine), Custom Fluent UI
- **Browser Runtime**: Microsoft Edge Standalone App Mode (`--app`)
