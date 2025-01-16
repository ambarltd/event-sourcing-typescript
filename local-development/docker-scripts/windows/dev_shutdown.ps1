$ErrorActionPreference = 'Stop'
$originalLocation = Get-Location

try {
    Set-Location -Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent)
    docker compose down
} finally {
    Set-Location -Path $originalLocation
}