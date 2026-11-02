# ==============================================================================
# Meridian Savings Project Launch Script (Windows PowerShell)
# ==============================================================================
# Launches all 3 core services if not already running:
#   1. Meridian FastAPI Serving & Viva Grader Backend (Port 8000)
#   2. Meridian Streamlit Friction Gate UI (Port 8501)
#   3. Meridian Educational Web App + HTML Guides (Port 3005)
# ==============================================================================

$repoRoot = $PSScriptRoot
$webRoot = Join-Path $repoRoot 'educational_web_app'

Write-Host "========================================================" -ForegroundColor Cyan
Write-Host "  MERIDIAN SAVINGS: LAUNCHING WORKSPACE & USER SERVICES  " -ForegroundColor Cyan
Write-Host "========================================================" -ForegroundColor Cyan

# 1. Check & Launch FastAPI Serving (Port 8000)
$apiConn = Get-NetTCPConnection -LocalPort 8000 -State Listen -ErrorAction SilentlyContinue
if ($apiConn) {
    Write-Host "[OK] FastAPI Serving is already running on http://127.0.0.1:8000" -ForegroundColor Green
} else {
    Write-Host "[*] Starting FastAPI Serving on port 8000..." -ForegroundColor Yellow
    Start-Process -FilePath "uv" -ArgumentList "run python -m uvicorn src.serving.app:app --port 8000" -WorkingDirectory $repoRoot -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

# 2. Check & Launch Streamlit Friction Gate UI (Port 8501)
$stConn = Get-NetTCPConnection -LocalPort 8501 -State Listen -ErrorAction SilentlyContinue
if ($stConn) {
    Write-Host "[OK] Streamlit Friction Gate UI is already running on http://localhost:8501" -ForegroundColor Green
} else {
    Write-Host "[*] Starting Streamlit Friction Gate UI on port 8501..." -ForegroundColor Yellow
    Start-Process -FilePath "uv" -ArgumentList "run python -m streamlit run Code\Sprint3\friction_gate_app.py --server.port 8501 --server.headless true" -WorkingDirectory $repoRoot -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

# 3. Check & Launch Educational Web App (Port 3005)
$eduConn = Get-NetTCPConnection -LocalPort 3005 -State Listen -ErrorAction SilentlyContinue
if ($eduConn) {
    Write-Host "[OK] Educational Web App is already running on http://localhost:3005" -ForegroundColor Green
} else {
    Write-Host "[*] Starting Educational Web App on port 3005..." -ForegroundColor Yellow
    Start-Process -FilePath "npm.cmd" -ArgumentList "run dev:portal" -WorkingDirectory $webRoot -WindowStyle Hidden
    Start-Sleep -Seconds 2
}

Write-Host ""
Write-Host "--------------------------------------------------------" -ForegroundColor DarkGray
Write-Host "  LOCAL SERVICE URLS (check status in the portal):" -ForegroundColor White
Write-Host "  - Local Portal:        $(Join-Path $repoRoot 'meridian_portal.html')" -ForegroundColor Cyan
Write-Host "  - Educational App:     http://localhost:3005" -ForegroundColor Cyan
Write-Host "  - Friction Gate UI:    http://localhost:8501" -ForegroundColor Cyan
Write-Host "  - FastAPI Swagger:     http://127.0.0.1:8000/docs" -ForegroundColor Cyan
Write-Host "  - AI-901 Prep Guide:   http://localhost:3005/guides/interview_prep_ai901.html" -ForegroundColor Cyan
Write-Host "  - Foundry Guide:       http://localhost:3005/guides/interview_prep_ai901_foundry_design.html" -ForegroundColor Cyan
Write-Host "--------------------------------------------------------" -ForegroundColor DarkGray
