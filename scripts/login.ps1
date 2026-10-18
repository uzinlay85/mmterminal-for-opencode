# login.ps1 - OpenCode account setup (Myanmar OpenCode Terminal)
$ErrorActionPreference = "Continue"

Write-Host "===============================================" -ForegroundColor Green
Write-Host " OpenCode AI - Login / Account Setup" -ForegroundColor Green
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""
Write-Host " အခမဲ့ Model များ အသုံးပြုရန် အောက်ပါအတိုင်း ရွေးပါ:" -ForegroundColor Cyan
Write-Host "   ၁။ "OpenCode Console" ကို ရွေးပါ" -ForegroundColor White
Write-Host "   ၂။ "Personal" (API key) ကို ရွေးပါ" -ForegroundColor White
Write-Host "   ၃။ Browser ဖြင့် Sign in လုပ်ပြီး ချိတ်ဆက်ပါ" -ForegroundColor White
Write-Host ""
Write-Host " အခြား Provider (OpenAI, Anthropic ...) အတွက်လည်း ဤနေရာတွင် ရွေးနိုင်ပါသည်။" -ForegroundColor DarkGray
Write-Host "===============================================" -ForegroundColor Green
Write-Host ""

if (-not (Get-Command "opencode" -ErrorAction SilentlyContinue)) {
    Write-Host "[ERROR] OpenCode CLI မတွေ့ပါ။" -ForegroundColor Red
    Write-Host " ပထမဆုံး Install-Terminal.bat ကို run ပြီး OpenCode ကို တပ်ဆင်ပါ။" -ForegroundColor Yellow
    exit 1
}

opencode auth login

Write-Host ""
Write-Host " Login အခြေအနေ စစ်ဆေးရန်:  opencode auth list" -ForegroundColor Cyan
Write-Host " Account ပြောင်းရန်:        opencode auth switch" -ForegroundColor Cyan
Write-Host " Logout လုပ်ရန်:           opencode auth logout" -ForegroundColor Cyan
