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

Write-Host "===============================================" -ForegroundColor Green
Write-Host " Myanmar OpenCode Terminal - One-Click Installer" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green

# 1. Node.js
if (-not (Test-Command "node")) {
    Write-Step "Node.js မတွေ့ပါ။ အလိုအလျောက် တပ်ဆင်နေပါသည်..."
    if (Test-Command "winget") {
        winget install --id OpenJS.NodeJS.LTS -e --silent --accept-package-agreements --accept-source-agreements
    } else {
        Write-Host "winget မရှိပါ။ https://nodejs.org မှ Node.js LTS ကို လက်ဖြင့် တပ်ဆင်ပါ။" -ForegroundColor Red
        exit 1
    }
} else {
    Write-Step "Node.js ရှိပြီးသားဖြစ်ပါသည်: $(node --version)"
}

# Refresh PATH for this session
$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# 2. Git (optional but recommended)
if (-not (Test-Command "git")) {
    Write-Step "Git မတွေ့ပါ။ တပ်ဆင်နေပါသည်..."
    if (Test-Command "winget") {
        winget install --id Git.Git -e --silent --accept-package-agreements --accept-source-agreements
    } else {
        Write-Host "Git မရှိပါ။ https://git-scm.com မှ တပ်ဆင်ပါ။" -ForegroundColor Yellow
    }
}

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

# 3. OpenCode CLI
if (-not (Test-Command "opencode")) {
    Write-Step "OpenCode AI CLI မတွေ့ပါ။ npm ဖြင့် တပ်ဆင်နေပါသည်..."
    npm install -g opencode-ai
} else {
    Write-Step "OpenCode ရှိပြီးသားဖြစ်ပါသည်: $(opencode --version)"
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

# 6. Desktop shortcut
Write-Step "Desktop Shortcut ဖန်တီးနေပါသည်..."
$shortcutScript = Join-Path $projectDir "scripts\create_desktop_shortcut.ps1"
if (Test-Path $shortcutScript) {
    powershell -ExecutionPolicy Bypass -File $shortcutScript
}

Write-Host ""
Write-Host "===============================================" -ForegroundColor Green
Write-Host " တပ်ဆင်မှု ပြီးစီးပါပြီ! ✅" -ForegroundColor Green
Write-Host " Desktop ပေါ်ရှိ 'Myanmar OpenCode Terminal' ကို Double-Click ဖွင့်နိုင်ပါပြီ။" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
