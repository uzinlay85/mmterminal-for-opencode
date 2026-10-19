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

# 3. OpenCode AI CLI (v2)
#
# IMPORTANT: OpenCode 2 is published as the npm package "@opencode/cli".
# The older "opencode-ai" package only ever ships OpenCode 1, and v1/v2 cannot
# be installed side by side under the same `opencode` command.
Write-Step "OpenCode AI CLI (v2) ကို စစ်ဆေးနေပါသည်..."

$opencodeVersion = $null
$opencodeMajor = $null
if (Test-Command "opencode") {
    try { $opencodeVersion = (& opencode --version 2>$null | Select-Object -First 1) } catch { $opencodeVersion = $null }
    if ($opencodeVersion -match '(\d+)\.\d+') { $opencodeMajor = [int]$Matches[1] }
}

if ($opencodeMajor -eq 2) {
    Write-Host " OpenCode v2 ရှိပြီးသားဖြစ်ပါသည်: $opencodeVersion" -ForegroundColor Green
    Write-Host " (နောက်ဆုံးဗားရှင်း ရယူရန်: opencode upgrade)" -ForegroundColor DarkGray
} else {
    if ($opencodeVersion) {
        Write-Host " OpenCode v1 ($opencodeVersion) ကို တွေ့ပါသည်။ v2 နှင့် တွဲဖက်၍ မရပါ။" -ForegroundColor Yellow
    } else {
        Write-Host " OpenCode မတွေ့ပါ။" -ForegroundColor Yellow
    }
    if (Test-Command "scoop") {
        Write-Host " (Scoop သုံးသူဖြစ်ပါက: scoop install versions/opencode2)" -ForegroundColor DarkGray
    }

    $opencodeInstalled = $false

    # 3a. Official v2 npm package (Node.js/npm comes from step 1).
    if (Test-Command "npm") {
        if ($opencodeVersion) {
            Write-Host " v1 ကို ဖယ်ရှားနေပါသည် (npm uninstall -g opencode-ai)..." -ForegroundColor DarkGray
            npm uninstall -g opencode-ai 2>$null | Out-Null
        }
        Write-Host " npm ဖြင့် OpenCode v2 တပ်ဆင်နေပါသည် (npm install -g @opencode/cli)..." -ForegroundColor Cyan
        npm install -g @opencode/cli
        Refresh-Path
        if (Test-Command "opencode") { $opencodeInstalled = $true }
    }

    # 3b. Fallback: standalone Windows binary (no Node.js required).
    if (-not $opencodeInstalled) {
        Write-Host " Standalone binary ကို download လုပ်နေပါသည်..." -ForegroundColor Yellow
        $binaryDir = Join-Path $env:LOCALAPPDATA "Programs\opencode"
        $arch = if ($env:PROCESSOR_ARCHITECTURE -eq "ARM64") { "arm64" } else { "x64" }
        $zipUrl = "https://opencode.ai/update/api/latest/cli/opencode/opencode-windows-$arch.zip"
        $zipPath = Join-Path $env:TEMP "opencode-windows-$arch.zip"
        try {
            New-Item -ItemType Directory -Force -Path $binaryDir | Out-Null
            Invoke-WebRequest -Uri $zipUrl -OutFile $zipPath -UseBasicParsing
            Expand-Archive -Path $zipPath -DestinationPath $binaryDir -Force
            Remove-Item $zipPath -Force -ErrorAction SilentlyContinue

            $userPath = [Environment]::GetEnvironmentVariable("Path", "User")
            if ($userPath -notlike "*$binaryDir*") {
                [Environment]::SetEnvironmentVariable("Path", "$userPath;$binaryDir", "User")
            }
            if ($env:Path -notlike "*$binaryDir*") { $env:Path = "$env:Path;$binaryDir" }

            if (Test-Command "opencode") { $opencodeInstalled = $true }
        } catch {
            Write-Host " Standalone download မအောင်မြင်ပါ: $($_.Exception.Message)" -ForegroundColor Red
        }
    }

    if ($opencodeInstalled) {
        try { Write-Host " OpenCode တပ်ဆင်ပြီးပါပြီ: $(& opencode --version)" -ForegroundColor Green } catch {}
    } else {
        Write-Host " OpenCode ကို အလိုအလျောက် တပ်ဆင်နိုင်ခြင်း မရှိပါ။" -ForegroundColor Red
        Write-Host " https://opencode.ai/v2/docs/ မှ လမ်းညွှန်အတိုင်း လက်ဖြင့် တပ်ဆင်ပါ။" -ForegroundColor Yellow
    }
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
