$ErrorActionPreference = 'Stop'
$originalLocation = Get-Location

try {
    Set-Location -Path (Split-Path (Split-Path $PSScriptRoot -Parent) -Parent)

    podman compose down

    $dataDirs = @(
       'data/event-sourcing-event-bus',
       'data/event-sourcing-event-store/pg-data',
       'data/event-sourcing-projection-store/db-data',
       'data/event-sourcing-projection-store/db-config'
    )

    foreach ($dir in $dataDirs) {
       New-Item -ItemType Directory -Force -Path $dir
       $acl = Get-Acl $dir
       $acl.SetAccessRuleProtection($true, $false)
       $ownerRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
           [System.Security.Principal.WindowsIdentity]::GetCurrent().Name,
           "FullControl",
           "ContainerInherit,ObjectInherit",
           "None",
           "Allow"
       )
       $acl.AddAccessRule($ownerRule)
       $readExecuteRule = New-Object System.Security.AccessControl.FileSystemAccessRule(
           "Everyone",
           "ReadAndExecute",
           "ContainerInherit,ObjectInherit",
           "None",
           "Allow"
       )
       $acl.AddAccessRule($readExecuteRule)
       Set-Acl $dir $acl
    }

    podman compose up -d --build --force-recreate

    function Test-AllServicesHealthy {
        $services = podman compose ps --format "table {{.ID}}\t{{.Name}}\t{{.Status}}"
        return !($services -match "(unhealthy|starting)")
    }

    while (!(Test-AllServicesHealthy)) {
        Write-Host "Waiting for all services to be healthy..."
        podman compose ps --format "table {{.ID}}\t{{.Name}}\t{{.Status}}"
        Write-Host ""
        Start-Sleep -Seconds 5
    }

    podman compose ps --format "table {{.ID}}\t{{.Name}}\t{{.Status}}"

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