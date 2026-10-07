$env:Path = [System.Environment]::GetEnvironmentVariable("Path", "Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path", "User")

Write-Host "=== Discord Clone - Запуск ===" -ForegroundColor Cyan
Write-Host "Проверка зависимостей и запуск всех сервисов" -ForegroundColor Gray
Write-Host "Остановка - Ctrl+C" -ForegroundColor Gray
Write-Host ""

$python = Get-Command python -ErrorAction SilentlyContinue
if (-not $python) {
    Write-Host "ОШИБКА: Python не найден. Установите Python 3.10+ с python.org" -ForegroundColor Red
    exit 1
}

python (Join-Path $PSScriptRoot "start.py")
