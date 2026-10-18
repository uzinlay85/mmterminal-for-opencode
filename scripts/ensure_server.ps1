# ensure_server.ps1 - Make sure the terminal backend is running and current.
#
# The app is launched by double-clicking Start-Terminal.bat, which may be done
# while a server from a previous version is still holding port 3820. That stale
# process serves the new static files but not the new /api/* routes, so the UI
# fails with confusing "not valid JSON" errors. This script detects that and
# restarts the server automatically.

$ErrorActionPreference = "SilentlyContinue"

$projectDir = Split-Path -Parent $PSScriptRoot
$port = if ($env:PORT) { [int]$env:PORT } else { 3820 }
$baseUrl = "http://127.0.0.1:$port"

# Read the expected API version straight out of server.js so the two never drift.
$expectedVersion = $null
$serverFile = Join-Path $projectDir "server.js"
if (Test-Path $serverFile) {
    $match = [regex]::Match((Get-Content $serverFile -Raw), 'API_VERSION\s*=\s*(\d+)')
    if ($match.Success) { $expectedVersion = [int]$match.Groups[1].Value }
}

function Get-ApiVersion {
    try {
        $status = Invoke-RestMethod -Uri "$baseUrl/api/status" -Method Get -TimeoutSec 3
        if ($null -eq $status.apiVersion) { return $null }
        return [int]$status.apiVersion
    } catch {
        return $null
    }
}

function Test-VersionOk($version) {
    if ($null -eq $version) { return $false }
    if ($null -eq $expectedVersion) { return $true }
    return $version -eq $expectedVersion
}

$listeners = @(Get-NetTCPConnection -LocalPort $port -State Listen -ErrorAction SilentlyContinue)
$runningVersion = Get-ApiVersion

if (Test-VersionOk $runningVersion) {
    Write-Host "[INFO] Server is already running (API v$runningVersion)."
    exit 0
}

if ($listeners.Count -gt 0) {
    if ($null -ne $runningVersion) {
        Write-Host "[INFO] Stale server detected (API v$runningVersion, expected v$expectedVersion). Restarting..."
    } else {
        Write-Host "[INFO] Server on port $port responded without an API version (older build). Restarting..."
    }
} else {
    Write-Host "[INFO] No server detected on port $port."
}

# Only ever stop the node process that owns the port.
foreach ($listener in $listeners) {
    $proc = Get-Process -Id $listener.OwningProcess -ErrorAction SilentlyContinue
    if ($proc -and $proc.ProcessName -eq "node") {
        Write-Host "[INFO] Stopping old server (PID $($proc.Id))..."
        Stop-Process -Id $proc.Id -Force
    } else {
        Write-Host "[WARN] Port $port is held by '$($proc.ProcessName)' - leaving it alone."
        exit 1
    }
}
if ($listeners) { Start-Sleep -Milliseconds 800 }

Write-Host "[INFO] Starting Node.js server..."
Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory $projectDir -WindowStyle Minimized

for ($i = 0; $i -lt 25; $i++) {
    Start-Sleep -Milliseconds 400
    $version = Get-ApiVersion
    if (Test-VersionOk $version) {
        Write-Host "[SUCCESS] Server ready (API v$version)."
        exit 0
    }
}

Write-Host "[WARN] Server did not become ready in time - continuing anyway."
exit 1
