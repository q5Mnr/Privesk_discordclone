param(
    [switch]$SkipModels,
    [switch]$NoStart
)

$ErrorActionPreference = "Stop"
$root = $PSScriptRoot
$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

function Fail([string]$msg) {
    Write-Host ""
    Write-Host "ОШИБКА: $msg" -ForegroundColor Red
    Write-Host "Нажмите Enter для выхода..." -ForegroundColor Gray
    $null = Read-Host
    exit 1
}

function Step([string]$msg) {
    Write-Host ""
    Write-Host "=== $msg ===" -ForegroundColor Cyan
}

Write-Host "==================================================" -ForegroundColor Cyan
Write-Host "  DISCORD CLONE — УСТАНОВКА С НУЛЯ" -ForegroundColor Cyan
Write-Host "==================================================" -ForegroundColor Cyan

# --- проверка инструментов ---
Step "Проверка Python и Node.js"
$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) { Fail "Python не найден. Установите Python 3.10+ с python.org и перезапустите." }
$node = Get-Command node -ErrorAction SilentlyContinue
$npm = Get-Command npm -ErrorAction SilentlyContinue
if (-not $node) { Fail "Node.js не найден. Установите Node.js 18+ с nodejs.org и перезапустите." }
if (-not $npm) { Fail "npm не найден. Переустановите Node.js." }
Write-Host ("  python : " + (& python --version 2>&1)) -ForegroundColor Green
Write-Host ("  node   : " + (& node --version 2>&1)) -ForegroundColor Green
Write-Host ("  npm    : " + (& npm --version 2>&1)) -ForegroundColor Green

# --- python зависимости ---
Step "Python зависимости (requirements.txt)"
& python -m pip install -r (Join-Path $root "requirements.txt")
if ($LASTEXITCODE -ne 0) { Fail "pip install завершился с ошибкой" }
Write-Host "  Готово" -ForegroundColor Green

# --- node зависимости ---
Step "Зависимости бэкенда (backend/node_modules)"
Push-Location (Join-Path $root "backend")
& npm install --no-fund --no-audit
$code = $LASTEXITCODE
Pop-Location
if ($code -ne 0) { Fail "npm install в backend завершился с ошибкой" }
Write-Host "  Готово" -ForegroundColor Green

Step "Зависимости фронтенда (frontend/node_modules)"
Push-Location (Join-Path $root "frontend")
& npm install --no-fund --no-audit
$code = $LASTEXITCODE
Pop-Location
if ($code -ne 0) { Fail "npm install в frontend завершился с ошибкой" }
Write-Host "  Готово" -ForegroundColor Green

# --- модели ---
if ($SkipModels) {
    Write-Host ""
    Write-Host "Пропуск загрузки моделей (-SkipModels)" -ForegroundColor Yellow
} else {
    Step "Модели (~6 ГБ, качаются один раз)"
    & python (Join-Path $root "setup_models.py")
    if ($LASTEXITCODE -ne 0) { Fail "Не удалось скачать модели" }
}

# --- итог ---
Write-Host ""
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  УСТАНОВКА ЗАВЕРШЕНА" -ForegroundColor Green
Write-Host "==================================================" -ForegroundColor Green
Write-Host "  Запуск:  python start.py" -ForegroundColor White
Write-Host "  Frontend http://localhost:5173" -ForegroundColor White
Write-Host "  Backend  http://localhost:3001" -ForegroundColor White
Write-Host "  AI       http://localhost:8000" -ForegroundColor White
Write-Host "==================================================" -ForegroundColor Green

if ($NoStart) {
    Write-Host "Нажмите Enter для выхода..." -ForegroundColor Gray
    $null = Read-Host
    exit 0
}

$answer = Read-Host "Запустить проект сейчас? [Y/n]"
if ($answer -eq "n" -or $answer -eq "N") {
    exit 0
}

& python (Join-Path $root "start.py")
