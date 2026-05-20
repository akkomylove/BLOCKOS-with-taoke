# BlockOS Launcher (PowerShell)
$host.UI.RawUI.WindowTitle = "BlockOS Launcher"
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host "  BlockOS - AI-native Knowledge OS" -ForegroundColor Cyan
Write-Host "==========================================" -ForegroundColor Cyan
Write-Host ""

# Check Node.js
try {
    $nodeVersion = node -v 2>$null
    if (-not $nodeVersion) { throw }
    Write-Host "[OK] Node.js $nodeVersion" -ForegroundColor Green
} catch {
    Write-Host "[ERROR] Node.js not found, please install first" -ForegroundColor Red
    Read-Host "Press Enter to exit"
    exit 1
}

Set-Location $PSScriptRoot

# Install dependencies
if (-not (Test-Path "node_modules")) {
    Write-Host "[INFO] Installing dependencies..." -ForegroundColor Yellow
    npm install
    if ($LASTEXITCODE -ne 0) {
        Write-Host "[ERROR] Install failed" -ForegroundColor Red
        Read-Host "Press Enter to exit"
        exit 1
    }
}

# Kill existing Node processes using the cache
Write-Host ""
Write-Host "[INFO] Stopping existing Node processes..." -ForegroundColor Yellow
Get-Process node -ErrorAction SilentlyContinue | Stop-Process -Force
Get-Process next -ErrorAction SilentlyContinue | Stop-Process -Force
Start-Sleep -Seconds 3

# Clean cache
Write-Host "[INFO] Cleaning Next.js cache..." -ForegroundColor Yellow
try {
    if (Test-Path ".next") {
        Remove-Item -Recurse -Force ".next" -ErrorAction Stop
        Write-Host "[OK] .next cache cleared" -ForegroundColor Green
    }
    if (Test-Path "dist") {
        Remove-Item -Recurse -Force "dist" -ErrorAction Stop
        Write-Host "[OK] dist cache cleared" -ForegroundColor Green
    }
    Write-Host "[OK] Cache cleared" -ForegroundColor Green
} catch {
    Write-Host "[WARN] Could not fully clean cache (file in use), continuing..." -ForegroundColor Yellow
}

# Database check
Write-Host ""
$DB_FILE = Join-Path $PSScriptRoot "data\blockos.db"
if (Test-Path $DB_FILE) {
    Write-Host "[WARN] Found existing database: $DB_FILE" -ForegroundColor Yellow
    $DEL_DB = Read-Host "Delete database to re-seed demo data? (Y/N)"
    if ($DEL_DB -eq "Y" -or $DEL_DB -eq "y") {
        Remove-Item -Force $DB_FILE
        Write-Host "[OK] Database deleted, demo data will be re-seeded" -ForegroundColor Green
    } else {
        Write-Host "[INFO] Keeping existing database" -ForegroundColor Cyan
    }
}

# Force port 8000
$PORT = 8000

# Check if port 8000 is in use and kill the process
$inUse = Get-NetTCPConnection -LocalPort $PORT -ErrorAction SilentlyContinue
if ($inUse) {
    Write-Host "[WARN] Port $PORT is in use, attempting to free it..." -ForegroundColor Yellow
    try {
        $process = Get-Process -Id $inUse.OwningProcess -ErrorAction SilentlyContinue
        if ($process -and $process.Id -ne 0) {
            Stop-Process -Id $process.Id -Force
            Write-Host "[OK] Freed port $PORT (killed process $($process.ProcessName))" -ForegroundColor Green
            Start-Sleep -Seconds 2
        }
    } catch {
        Write-Host "[WARN] Could not free port $PORT, but will try to start anyway..." -ForegroundColor Yellow
    }
}

Write-Host ""
Write-Host "[INFO] Starting dev server on port $PORT..." -ForegroundColor Cyan
Write-Host "[INFO] Browser will open http://localhost:$PORT" -ForegroundColor Cyan
Write-Host ""

# Open browser
Start-Process "http://localhost:$PORT"

# Start dev server
npx next dev --turbopack --port $PORT

Read-Host "Press Enter to exit"
