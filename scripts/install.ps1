# install.ps1 - One-click setup for Myanmar OpenCode Terminal on Windows
param()

$ErrorActionPreference = "Stop"

function Write-Step($msg) {
    Write-Host ""
    Write-Host "==> $msg" -ForegroundColor Cyan
}

function Test-Command($name) {
    return [bool](Get-Command $name -ErrorAction SilentlyContinue)
}

function Refresh-Path {
    $machine = [System.Environment]::GetEnvironmentVariable("Path","Machine")
    $user = [System.Environment]::GetEnvironmentVariable("Path","User")
    $env:Path = "$machine;$user"
}

Write-Host "===============================================" -ForegroundColor Green
Write-Host " Myanmar OpenCode Terminal - One-Click Installer" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green

# 1. Node.js
if (-not (Test-Command "node")) {
    Write-Step "Node.js မတွေ့ပါ။ အလိုအလျောက် တပ်ဆင်နေပါသည်..."
    if (Test-Command "winget") {
        winget install --id OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements
        Refresh-Path
    } else {
        Write-Host "winget မရှိပါ။ https://nodejs.org မှ Node.js LTS ကို လက်ဖြင့် တပ်ဆင်ပါ။" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Step "Node.js ရှိပြီးသားဖြစ်ပါသည်: $(node --version)"
}

Refresh-Path

# 2. Git (optional but recommended)
if (-not (Test-Command "git")) {
    Write-Step "Git မတွေ့ပါ။ တပ်ဆင်နေပါသည်..."
    if (Test-Command "winget") {
        winget install --id Git.Git -e --silent --accept-package-agreements --accept-source-agreements
        Refresh-Path
    } else {
        Write-Host "Git မရှိပါ။ https://git-scm.com မှ တပ်ဆင်ပါ။" -ForegroundColor Yellow
    }
}

# 3. OpenCode AI CLI (always ensure the latest v2)
Write-Step "OpenCode AI CLI ကို စစ်ဆေးနေပါသည်..."
$opencodeVersion = $null
if (Test-Command "opencode") {
    try { $opencodeVersion = (& opencode --version 2>$null | Select-Object -First 1) } catch { $opencodeVersion = $null }
}

if (-not $opencodeVersion) {
    Write-Step "OpenCode မတွေ့ပါ။ npm ဖြင့် တပ်ဆင်နေပါသည် (npm install -g opencode-ai@latest)..."
    npm install -g opencode-ai@latest
    Refresh-Path

    if (-not (Test-Command "opencode")) {
        Write-Host "OpenCode ကို PATH တွင် မတွေ့ပါ။ Terminal ကို ပိတ်ပြီး ပြန်ဖွင့်၍ 'opencode --version' ဖြင့် စစ်ဆေးပါ။" -ForegroundColor Yellow
    } else {
        Write-Host "OpenCode တပ်ဆင်ပြီးပါပြီ: $(opencode --version)" -ForegroundColor Green
    }
} elseif ($opencodeVersion -notmatch "^2\.") {
    Write-Step "OpenCode ရှိပြီးသားဖြစ်ပါသည်: $opencodeVersion (v2 မဟုတ်ပါ)"
    if (Test-Command "npm") {
        Write-Step "OpenCode ကို နောက်ဆုံးဗားရှင်း (v2) သို့ အဆင့်မြှင့်နေပါသည်..."
        npm install -g opencode-ai@latest
        Refresh-Path
        try { Write-Host " ဗားရှင်း အသစ်: $(& opencode --version)" -ForegroundColor Green } catch {}
    } else {
        Write-Host " npm မရှိပါ။ 'npm install -g opencode-ai@latest' ဖြင့် လက်ဖြင့် အဆင့်မြှင့်ပါ။" -ForegroundColor Yellow
    }
} else {
    Write-Step "OpenCode ရှိပြီးသားဖြစ်ပါသည်: $opencodeVersion"
}

# 4. Build tools (for node-pty native module)
if (-not (Test-Command "cl")) {
    Write-Step "C++ Build Tools မတွေ့ပါ။ node-pty အတွက် လိုအပ်ပါသည်။"
    Write-Host "   Visual Studio Build Tools ကို winget ဖြင့် တပ်ဆင်နေပါသည် (အချိန် အနည်းငယ် ကြာနိုင်ပါသည်)..." -ForegroundColor Yellow
    if (Test-Command "winget") {
        winget install --id Microsoft.VisualStudio.2022.BuildTools -e --silent --accept-package-agreements --accept-source-agreements --override "--quiet --wait --add Microsoft.VisualStudio.Workload.VCTools --includeRecommended"
    } else {
        Write-Host "   winget မရှိပါ။ https://visualstudio.microsoft.com/visual-cpp-build-tools/ မှ လက်ဖြင့် တပ်ဆင်ပါ။" -ForegroundColor Yellow
    }
}

# 5. Project dependencies
$projectDir = Split-Path -Parent $PSScriptRoot
Write-Step "Project dependencies များ တပ်ဆင်နေပါသည် (npm install)..."
Push-Location $projectDir
try {
    npm install
} finally {
    Pop-Location
}

# 6. OpenCode default free-model config
Write-Step "OpenCode အခမဲ့ Model အပြင်အဆင် ပြင်ဆင်နေပါသည်..."
$configDir = Join-Path $env:USERPROFILE ".config\opencode"
$configFile = Join-Path $configDir "opencode.jsonc"
if (-not (Test-Path $configDir)) {
    New-Item -ItemType Directory -Force -Path $configDir | Out-Null
}
if (-not (Test-Path $configFile)) {
    $configJson = "{`n  `"`$schema`": `"https://opencode.ai/config.json`",`n  `"model`": `"opencode/deepseek-v4.1-flash-free`",`n  `"update`": `"disable`"`n}"
    Set-Content -Path $configFile -Value $configJson -Encoding utf8
    Write-Host "   Config ဖိုင် ဖန်တီးပြီးပါပြီ: $configFile" -ForegroundColor Green
} else {
    Write-Host "   Config ဖိုင် ရှိပြီးသားဖြစ်ပါသည်: $configFile"
}

# 7. Desktop shortcut
Write-Step "Desktop Shortcut ဖန်တီးနေပါသည်..."
$shortcutScript = Join-Path $projectDir "scripts\create_desktop_shortcut.ps1"
if (Test-Path $shortcutScript) {
    powershell -ExecutionPolicy Bypass -File $shortcutScript
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host " တပ်ဆင်မှု ပြီးစီးပါပြီ! ✅" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green

# 8. Optional: log in to OpenCode right away
Write-Step "OpenCode Login"
Write-Host " အခမဲ့ Model များ အသုံးပြုရန် OpenCode အကောင့် ချိတ်ဆက်ထားရန် လိုအပ်ပါသည်။" -ForegroundColor White
Write-Host " (OpenCode Console -> Personal key)" -ForegroundColor DarkGray
$login = Read-Host " ယခု OpenCode Login ကို ဝင်လိုပါသလား? (y/n)"
if ($login -eq "y" -or $login -eq "Y") {
    if (Test-Command "opencode") {
        opencode auth login
    } else {
        Write-Host " OpenCode ကို PATH တွင် မတွေ့ပါ။ 'Login-OpenCode.bat' ကို နောက်မှ Double-Click လုပ်ပါ။" -ForegroundColor Yellow
    }
} else {
    Write-Host " နောက်မှ Login ဝင်လိုပါက 'Login-OpenCode.bat' ကို Double-Click လုပ်ပါ။" -ForegroundColor Cyan
}

Write-Host ""
Write-Host " နောက်တစ်ဆင့်:" -ForegroundColor Cyan
Write-Host "  App ဖွင့်ရန်: Desktop ရှိ 'Myanmar OpenCode Terminal' icon" -ForegroundColor White
Write-Host "  (သို့မဟုတ်) Start-Terminal.bat ကို Double-Click" -ForegroundColor White
Write-Host "===============================================" -ForegroundColor Green
