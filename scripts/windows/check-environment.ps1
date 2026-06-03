<#
.SYNOPSIS
Checks the local Windows environment required to run TMRL training.

.DESCRIPTION
Validates Python, the TMRL Python package, Trackmania discovery, the
Openplanet/TMRL socket on 127.0.0.1:9000, and a TmrlData directory.
The script uses repository-relative paths and environment variables when
available; it does not require hardcoded machine paths.
#>

[CmdletBinding()]
param(
    [string]$SocketHost = "127.0.0.1",
    [int]$SocketPort = 9000,
    [int]$SocketTimeoutMs = 1500,
    [switch]$WarnOnly
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-RepositoryRoot {
    return (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")).Path
}

function Add-CheckResult {
    param(
        [System.Collections.Generic.List[object]]$Results,
        [string]$Component,
        [string]$Status,
        [string]$Details
    )

    $Results.Add([pscustomobject]@{
        Component = $Component
        Status    = $Status
        Details   = $Details
    }) | Out-Null
}

function Test-TcpSocket {
    param(
        [string]$HostName,
        [int]$Port,
        [int]$TimeoutMs
    )

    $client = [System.Net.Sockets.TcpClient]::new()
    try {
        $task = $client.ConnectAsync($HostName, $Port)
        if (-not $task.Wait($TimeoutMs)) {
            return $false
        }

        return $client.Connected
    }
    catch {
        return $false
    }
    finally {
        $client.Dispose()
    }
}

function Resolve-PythonExecutable {
    if (-not [string]::IsNullOrWhiteSpace($env:TMRL_PYTHON)) {
        if (Test-Path -LiteralPath $env:TMRL_PYTHON -PathType Leaf) {
            return (Resolve-Path -LiteralPath $env:TMRL_PYTHON).Path
        }

        $configuredCommand = Get-Command $env:TMRL_PYTHON -ErrorAction SilentlyContinue
        if ($null -ne $configuredCommand) {
            return $configuredCommand.Source
        }

        return $null
    }

    $pythonCommand = Get-Command python -ErrorAction SilentlyContinue
    if ($null -eq $pythonCommand) {
        return $null
    }

    return $pythonCommand.Source
}

function Find-Trackmania {
    $foundItems = New-Object System.Collections.Generic.List[string]

    if (-not [string]::IsNullOrWhiteSpace($env:TMRL_TRACKMANIA_PATH) -and (Test-Path -LiteralPath $env:TMRL_TRACKMANIA_PATH)) {
        $foundItems.Add("TMRL_TRACKMANIA_PATH=$env:TMRL_TRACKMANIA_PATH") | Out-Null
    }

    $running = Get-Process -ErrorAction SilentlyContinue |
        Where-Object { $_.ProcessName -match "^Trackmania" }

    foreach ($process in $running) {
        $foundItems.Add("running process: $($process.ProcessName) PID $($process.Id)") | Out-Null
    }

    $registryPaths = @(
        "HKLM:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKLM:\SOFTWARE\WOW6432Node\Microsoft\Windows\CurrentVersion\Uninstall\*",
        "HKCU:\SOFTWARE\Microsoft\Windows\CurrentVersion\Uninstall\*"
    )

    foreach ($path in $registryPaths) {
        $items = Get-ItemProperty -Path $path -ErrorAction SilentlyContinue |
            Where-Object {
                $displayNameProperty = $_.PSObject.Properties["DisplayName"]
                $null -ne $displayNameProperty -and $displayNameProperty.Value -like "*Trackmania*"
            }

        foreach ($item in $items) {
            $locationProperty = $item.PSObject.Properties["InstallLocation"]
            $location = $null
            if ($null -ne $locationProperty) {
                $location = $locationProperty.Value
            }
            if ([string]::IsNullOrWhiteSpace($location)) {
                $location = "registry entry"
            }
            $foundItems.Add("$($item.PSObject.Properties["DisplayName"].Value) ($location)") | Out-Null
        }
    }

    return $foundItems
}

function Find-TmrlDataDirectory {
    param([string]$RepositoryRoot)

    $candidates = New-Object System.Collections.Generic.List[string]

    if (-not [string]::IsNullOrWhiteSpace($env:TMRL_DATA_DIR)) {
        $candidates.Add($env:TMRL_DATA_DIR) | Out-Null
    }

    if (-not [string]::IsNullOrWhiteSpace($env:USERPROFILE)) {
        $candidates.Add((Join-Path $env:USERPROFILE "TmrlData")) | Out-Null
        $candidates.Add((Join-Path $env:USERPROFILE "Documents\TmrlData")) | Out-Null
    }

    if (-not [string]::IsNullOrWhiteSpace($env:LOCALAPPDATA)) {
        $candidates.Add((Join-Path $env:LOCALAPPDATA "TmrlData")) | Out-Null
    }

    if (-not [string]::IsNullOrWhiteSpace($env:APPDATA)) {
        $candidates.Add((Join-Path $env:APPDATA "TmrlData")) | Out-Null
    }

    $candidates.Add((Join-Path $RepositoryRoot "TmrlData")) | Out-Null

    foreach ($candidate in ($candidates | Select-Object -Unique)) {
        if (Test-Path -LiteralPath $candidate -PathType Container) {
            return (Resolve-Path -LiteralPath $candidate).Path
        }
    }

    return $null
}

$repoRoot = Get-RepositoryRoot
$results = New-Object System.Collections.Generic.List[object]

Write-Host ""
Write-Host "TMRL Windows environment check"
Write-Host "Repository: $repoRoot"
Write-Host ""

$pythonExe = Resolve-PythonExecutable
if ($null -eq $pythonExe) {
    if (-not [string]::IsNullOrWhiteSpace($env:TMRL_PYTHON)) {
        Add-CheckResult $results "Python" "FAIL" "TMRL_PYTHON non valido: $env:TMRL_PYTHON"
    }
    else {
        Add-CheckResult $results "Python" "FAIL" "python non trovato nel PATH"
    }
}
else {
    $pythonVersion = (& $pythonExe --version 2>&1 | Out-String).Trim()
    Add-CheckResult $results "Python" "OK" "$pythonVersion ($pythonExe)"
}

if ($null -eq $pythonExe) {
    Add-CheckResult $results "TMRL" "FAIL" "impossibile verificare TMRL senza Python"
}
else {
    try {
        $tmrlVersion = (& $pythonExe -c "import tmrl; print(getattr(tmrl, '__version__', 'installed'))" 2>&1 | Out-String).Trim()
        if ([string]::IsNullOrWhiteSpace($tmrlVersion)) {
            $tmrlVersion = "installed"
        }
        Add-CheckResult $results "TMRL" "OK" "package tmrl importabile: $tmrlVersion"
    }
    catch {
        Add-CheckResult $results "TMRL" "FAIL" "package tmrl non importabile: $($_.Exception.Message)"
    }
}

$trackmaniaMatches = Find-Trackmania
if ($trackmaniaMatches.Count -gt 0) {
    Add-CheckResult $results "Trackmania" "OK" ($trackmaniaMatches -join "; ")
}
else {
    Add-CheckResult $results "Trackmania" "FAIL" "non rilevato via processo, registry o TMRL_TRACKMANIA_PATH"
}

if (Test-TcpSocket -HostName $SocketHost -Port $SocketPort -TimeoutMs $SocketTimeoutMs) {
    Add-CheckResult $results "Openplanet socket" "OK" "$SocketHost`:$SocketPort raggiungibile"
}
else {
    Add-CheckResult $results "Openplanet socket" "FAIL" "$SocketHost`:$SocketPort non raggiungibile; avvia Trackmania e verifica TMRL_GrabData"
}

$tmrlData = Find-TmrlDataDirectory -RepositoryRoot $repoRoot
if ($null -ne $tmrlData) {
    Add-CheckResult $results "TmrlData" "OK" $tmrlData
}
else {
    Add-CheckResult $results "TmrlData" "FAIL" "directory TmrlData non trovata; imposta TMRL_DATA_DIR se usi un percorso custom"
}

$results | Format-Table -AutoSize

$failed = @($results | Where-Object { $_.Status -eq "FAIL" })
Write-Host ""
if ($failed.Count -eq 0) {
    Write-Host "Report finale: ambiente pronto." -ForegroundColor Green
    exit 0
}

Write-Host "Report finale: $($failed.Count) controllo/i non riuscito/i." -ForegroundColor Red
if ($WarnOnly) {
    Write-Host "WarnOnly attivo: exit code 0." -ForegroundColor Yellow
    exit 0
}

exit 1
