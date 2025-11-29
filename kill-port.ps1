# Script to kill all Node processes and free port 3001
Write-Host "🔍 Checking for Node processes..." -ForegroundColor Yellow

# Kill all Node processes
$nodeProcesses = Get-Process -Name node -ErrorAction SilentlyContinue
if ($nodeProcesses) {
    Write-Host "Found $($nodeProcesses.Count) Node process(es)" -ForegroundColor Yellow
    foreach ($proc in $nodeProcesses) {
        try {
            Stop-Process -Id $proc.Id -Force -ErrorAction Stop
            Write-Host "✅ Killed process $($proc.Id)" -ForegroundColor Green
        } catch {
            Write-Host "❌ Failed to kill process $($proc.Id): $($_.Exception.Message)" -ForegroundColor Red
        }
    }
} else {
    Write-Host "No Node processes found" -ForegroundColor Green
}

Start-Sleep -Seconds 2

# Check port 3001
Write-Host "`n🔍 Checking port 3001..." -ForegroundColor Yellow
$connections = Get-NetTCPConnection -LocalPort 3001 -ErrorAction SilentlyContinue | Where-Object { $_.State -eq 'Listen' }
if ($connections) {
    Write-Host "Port 3001 is still in use:" -ForegroundColor Yellow
    foreach ($conn in $connections) {
        $proc = Get-Process -Id $conn.OwningProcess -ErrorAction SilentlyContinue
        if ($proc) {
            Write-Host "  Process: $($proc.ProcessName) (PID: $($proc.Id))" -ForegroundColor Yellow
            try {
                Stop-Process -Id $proc.Id -Force -ErrorAction Stop
                Write-Host "  ✅ Killed process $($proc.Id)" -ForegroundColor Green
            } catch {
                Write-Host "  ❌ Failed to kill: $($_.Exception.Message)" -ForegroundColor Red
                Write-Host "  💡 Try running as Administrator or use: taskkill /F /PID $($proc.Id)" -ForegroundColor Yellow
            }
        }
    }
} else {
    Write-Host "✅ Port 3001 is free!" -ForegroundColor Green
}

Start-Sleep -Seconds 1

# Final check
$finalCheck = Get-NetTCPConnection -LocalPort 3001 -State Listen -ErrorAction SilentlyContinue
if ($finalCheck) {
    Write-Host "`n⚠️  Port 3001 is still in use. You may need to:" -ForegroundColor Yellow
    Write-Host "   1. Run this script as Administrator" -ForegroundColor Yellow
    Write-Host "   2. Or manually kill processes using: netstat -ano | findstr :3001" -ForegroundColor Yellow
} else {
    Write-Host "`n✅ All done! Port 3001 is now free." -ForegroundColor Green
    Write-Host "You can now run: npm run dev:server" -ForegroundColor Cyan
}

