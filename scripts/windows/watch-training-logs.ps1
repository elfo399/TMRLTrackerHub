<#
.SYNOPSIS
Tails TMRL training logs in real time on Windows.

.DESCRIPTION
Shows live logs from logs/trainer.log and logs/worker.log by default.
Use -IncludeServer to include server.log, or -NewWindows to open one
PowerShell window per role.
#>

[CmdletBinding()]
param(
    [string[]]$Roles = @("trainer", "worker"),
    [switch]$IncludeServer,
    [switch]$NewWindows,
    [int]$Tail = 80
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-RepositoryRoot {
    return (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")).Path
}

function Quote-Argument {
    param([string]$Value)
    return '"' + ($Value -replace '"', '\"') + '"'
}

function Normalize-Roles {
    param(
        [string[]]$InputRoles,
        [switch]$WithServer
    )

    $validRoles = @("server", "trainer", "worker")
    $normalized = New-Object System.Collections.Generic.List[string]

    if ($WithServer) {
        $normalized.Add("server") | Out-Null
    }

    foreach ($roleGroup in $InputRoles) {
        foreach ($role in $roleGroup.Split(",")) {
            $value = $role.Trim().ToLowerInvariant()
            if ([string]::IsNullOrWhiteSpace($value)) {
                continue
            }

            if ($validRoles -notcontains $value) {
                throw "Ruolo log non valido '$value'. Valori ammessi: server, trainer, worker."
            }

            if (-not $normalized.Contains($value)) {
                $normalized.Add($value) | Out-Null
            }
        }
    }

    return $normalized.ToArray()
}

function Get-LogPath {
    param(
        [string]$RepositoryRoot,
        [string]$Role
    )

    return Join-Path (Join-Path $RepositoryRoot "logs") "$Role.log"
}

function Ensure-LogFile {
    param([string]$Path)

    $directory = Split-Path -Parent $Path
    New-Item -ItemType Directory -Force -Path $directory | Out-Null

    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        Set-Content -LiteralPath $Path -Value "[waiting] log file created $(Get-Date -Format o)" -Encoding UTF8
    }
}

function Watch-RoleLog {
    param(
        [string]$Role,
        [string]$Path,
        [int]$TailCount
    )

    Ensure-LogFile -Path $Path

    Write-Host ""
    Write-Host "Watching $Role log" -ForegroundColor Cyan
    Write-Host $Path
    Write-Host ""

    Get-Content -LiteralPath $Path -Tail $TailCount -Wait
}

$repoRoot = Get-RepositoryRoot
$rolesToWatch = Normalize-Roles -InputRoles $Roles -WithServer:$IncludeServer

if ($rolesToWatch.Count -eq 0) {
    $rolesToWatch = @("trainer", "worker")
}

if ($NewWindows) {
    $powerShellExe = (Get-Process -Id $PID).Path
    if ([string]::IsNullOrWhiteSpace($powerShellExe)) {
        $powerShellExe = Join-Path $PSHOME "powershell.exe"
    }

    foreach ($role in $rolesToWatch) {
        $arguments = @(
            "-NoExit",
            "-ExecutionPolicy", "Bypass",
            "-File", (Quote-Argument $PSCommandPath),
            "-Roles", $role,
            "-Tail", $Tail
        ) -join " "

        Start-Process -FilePath $powerShellExe -ArgumentList $arguments | Out-Null
    }

    return
}

if ($rolesToWatch.Count -eq 1) {
    $role = $rolesToWatch[0]
    Watch-RoleLog -Role $role -Path (Get-LogPath -RepositoryRoot $repoRoot -Role $role) -TailCount $Tail
    return
}

$jobs = @()
try {
    foreach ($role in $rolesToWatch) {
        $path = Get-LogPath -RepositoryRoot $repoRoot -Role $role
        Ensure-LogFile -Path $path

        $jobs += Start-Job -ScriptBlock {
            param($RoleName, $LogPath, $TailCount)
            Get-Content -LiteralPath $LogPath -Tail $TailCount -Wait | ForEach-Object {
                "[{0}] {1}" -f $RoleName.ToUpperInvariant(), $_
            }
        } -ArgumentList $role, $path, $Tail
    }

    Write-Host ""
    Write-Host "Watching logs: $($rolesToWatch -join ', ')" -ForegroundColor Cyan
    Write-Host "Premi Ctrl+C per uscire."
    Write-Host ""

    while ($true) {
        Receive-Job -Job $jobs -Wait
    }
}
finally {
    foreach ($job in $jobs) {
        Stop-Job -Job $job -ErrorAction SilentlyContinue
        Remove-Job -Job $job -Force -ErrorAction SilentlyContinue
    }
}
