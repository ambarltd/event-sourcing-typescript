$ErrorActionPreference = 'Stop'
$originalLocation = Get-Location

try {
    Set-Location -Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent)

    Write-Host "Stopping existing services..."
    docker compose down

    Write-Host "Cleaning up data directory..."
    if (Test-Path "data") {
        Get-ChildItem -Path "data" -Recurse | Remove-Item -Force -Recurse
    }

    Write-Host "Starting services..."
    docker compose up -d --build --force-recreate

    function Test-AllServicesHealthy {
        $services = docker compose ps --format "table {{.ID}}\t{{.Name}}\t{{.Status}}"
        return !($services -match "(unhealthy|starting)")
    }

    while (!(Test-AllServicesHealthy)) {
        Write-Host "Waiting for all services to be healthy..."
        docker compose ps --format "table {{.ID}}\t{{.Name}}\t{{.Status}}"
        Write-Host ""
        Start-Sleep -Seconds 5
    }

    docker compose ps --format "table {{.ID}}\t{{.Name}}\t{{.Status}}"

    Write-Host ""
    Write-Host "======================================================================="
    Write-Host "||                     All services are healthy!                       ||"
    Write-Host "======================================================================="
    Write-Host ""

    Write-Host "======================================================================="
    Write-Host "|| You can now run the dev_demo.ps1 script!                           ||"
    Write-Host "======================================================================="
    Write-Host "|| You can navigate to localhost:8080 to hit your backend.            ||"
    Write-Host "======================================================================="
    Write-Host "|| You can navigate to localhost:8081 to view your event store.       ||"
    Write-Host "======================================================================="
    Write-Host "|| You can navigate to localhost:8082 to view your projection store.  ||"
    Write-Host "======================================================================="
} finally {
    Set-Location -Path $originalLocation
}