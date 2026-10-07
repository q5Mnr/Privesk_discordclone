Write-Host "=== Discord Clone - Запуск ===" -ForegroundColor Cyan
Write-Host ""

$env:Path = [System.Environment]::GetEnvironmentVariable("Path","Machine") + ";" + [System.Environment]::GetEnvironmentVariable("Path","User")

Write-Host "Запуск бэкенда (порт 3001)..." -ForegroundColor Yellow
$backend = Start-Process -FilePath "node" -ArgumentList "server.js" -WorkingDirectory "$PSScriptRoot\backend" -PassThru -NoNewWindow
Start-Sleep -Seconds 2

if ($backend.HasExited) {
    Write-Host "ОШИБКА: Бэкенд не запустился!" -ForegroundColor Red
    exit 1
}

Write-Host "Бэкенд запущен (PID: $($backend.Id))" -ForegroundColor Green
Write-Host ""
Write-Host "Запуск фронтенда (порт 5173)..." -ForegroundColor Yellow
$frontend = Start-Process -FilePath "npm" -ArgumentList "run dev" -WorkingDirectory "$PSScriptRoot\frontend" -PassThru -NoNewWindow
Start-Sleep -Seconds 3

Write-Host "Фронтенд запущен" -ForegroundColor Green
Write-Host ""
Write-Host "============================================" -ForegroundColor Cyan
Write-Host "  Discord Clone готов к работе!" -ForegroundColor Green
Write-Host "  Frontend: http://localhost:5173" -ForegroundColor White
Write-Host "  Backend:  http://localhost:3001" -ForegroundColor White
Write-Host "============================================" -ForegroundColor Cyan
Write-Host ""
Write-Host "Нажмите любую клавишу для остановки..." -ForegroundColor Gray
$null = $Host.UI.RawUI.ReadKey("NoEcho,IncludeKeyDown")

Write-Host "Остановка серверов..." -ForegroundColor Yellow
Stop-Process -Id $backend.Id -Force -ErrorAction SilentlyContinue
Stop-Process -Id $frontend.Id -Force -ErrorAction SilentlyContinue
Write-Host "Готово!" -ForegroundColor Green
