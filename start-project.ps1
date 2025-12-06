# EV Charger Share - Docker Compose Startup Script
# This script starts the entire project with Docker Compose

Write-Host "================================" -ForegroundColor Green
Write-Host "EV Charger Share - Docker Startup" -ForegroundColor Green
Write-Host "================================" -ForegroundColor Green
Write-Host ""

# Check if Docker is installed and running
Write-Host "Checking Docker availability..." -ForegroundColor Cyan
try {
    $dockerVersion = docker version --format '{{.Client.Version}}'
    Write-Host "✓ Docker found (version: $dockerVersion)" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker is not installed or not running. Please install Docker Desktop." -ForegroundColor Red
    exit 1
}

# Check if Docker Compose is available
Write-Host "Checking Docker Compose..." -ForegroundColor Cyan
try {
    $composeVersion = docker compose version --short
    Write-Host "✓ Docker Compose found (version: $composeVersion)" -ForegroundColor Green
} catch {
    Write-Host "✗ Docker Compose is not available." -ForegroundColor Red
    exit 1
}

Write-Host ""
Write-Host "Starting services..." -ForegroundColor Cyan
Write-Host ""

# Stop any existing containers (optional cleanup)
Write-Host "Cleaning up previous containers..." -ForegroundColor Yellow
docker compose down --remove-orphans 2>&1 | Out-Null

# Build and start containers
Write-Host "Building and starting containers..." -ForegroundColor Cyan
docker compose up --build -d

if ($LASTEXITCODE -eq 0) {
    Write-Host ""
    Write-Host "✓ All services started successfully!" -ForegroundColor Green
    Write-Host ""
    Write-Host "================================" -ForegroundColor Green
    Write-Host "Service URLs:" -ForegroundColor Green
    Write-Host "================================" -ForegroundColor Green
    Write-Host "Frontend:  http://localhost:3000" -ForegroundColor Cyan
    Write-Host "Backend:   http://localhost:5000" -ForegroundColor Cyan
    Write-Host "MongoDB:   mongodb://admin:password@localhost:27018/chargershare" -ForegroundColor Cyan
    Write-Host "Redis:     redis://localhost:6380" -ForegroundColor Cyan
    Write-Host ""
    Write-Host "To view logs: docker compose logs -f" -ForegroundColor Yellow
    Write-Host "To stop:      docker compose down" -ForegroundColor Yellow
    Write-Host ""
    
    # Wait a moment for services to start
    Write-Host "Waiting for services to initialize (5 seconds)..." -ForegroundColor Yellow
    Start-Sleep -Seconds 5
    
    # Show container status
    Write-Host ""
    Write-Host "Container Status:" -ForegroundColor Green
    docker compose ps
    
} else {
    Write-Host ""
    Write-Host "✗ Failed to start services. Check Docker logs above." -ForegroundColor Red
    exit 1
}
