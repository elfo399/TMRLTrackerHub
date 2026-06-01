<#
.SYNOPSIS
Starts a complete local TMRL training session on Windows.

.DESCRIPTION
Runs the environment check, prepares repository-local logs/runtime folders,
optionally downloads the latest checkpoint from TMRL Hub, and opens three
separate PowerShell terminals for:
  - python -m tmrl --server
  - python -m tmrl --trainer
  - python -m tmrl --worker

The real Python PIDs and terminal PIDs are stored in runtime/processes.json.
#>

[CmdletBinding()]
param(
    [switch]$Force,
    [switch]$DownloadLatestCheckpoint,
    [string]$SocketHost = "127.0.0.1",
    [int]$SocketPort = 9000
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Get-RepositoryRoot {
    return (Resolve-Path -LiteralPath (Join-Path $PSScriptRoot "..\..")).Path
}

function Read-DotEnv {
    param([string]$Path)

    $values = @{}
    if (-not (Test-Path -LiteralPath $Path -PathType Leaf)) {
        return $values
    }

    foreach ($line in Get-Content -LiteralPath $Path) {
        $trimmed = $line.Trim()
        if ([string]::IsNullOrWhiteSpace($trimmed) -or $trimmed.StartsWith("#") -or $trimmed -notmatch "=") {
            continue
        }

        $parts = $trimmed.Split("=", 2)
        $key = $parts[0].Trim()
        $value = $parts[1].Trim().Trim('"').Trim("'")
        if (-not [string]::IsNullOrWhiteSpace($key)) {
            $values[$key] = $value
        }
    }

    return $values
}

function Get-ConfigValue {
    param(
        [hashtable]$DotEnv,
        [string]$Name,
        [string]$Fallback = ""
    )

    $environmentValue = [Environment]::GetEnvironmentVariable($Name)
    if (-not [string]::IsNullOrWhiteSpace($environmentValue)) {
        return $environmentValue
    }

    if ($DotEnv.ContainsKey($Name) -and -not [string]::IsNullOrWhiteSpace($DotEnv[$Name])) {
        return $DotEnv[$Name]
    }

    return $Fallback
}

function Test-TrueConfig {
    param(
        [hashtable]$DotEnv,
        [string]$Name
    )

    $value = Get-ConfigValue -DotEnv $DotEnv -Name $Name -Fallback "false"
    return $value -match "^(1|true|yes|on)$"
}

function Resolve-RepositoryPath {
    param(
        [string]$RepositoryRoot,
        [string]$Path
    )

    if ([System.IO.Path]::IsPathRooted($Path)) {
        return $Path
    }

    return (Join-Path $RepositoryRoot $Path)
}

function Quote-Argument {
    param([string]$Value)
    return '"' + ($Value -replace '"', '\"') + '"'
}

function Get-ObjectProperty {
    param(
        [object]$Object,
        [string[]]$Names
    )

    if ($null -eq $Object) {
        return $null
    }

    foreach ($name in $Names) {
        $property = $Object.PSObject.Properties[$name]
        if ($null -ne $property) {
            return $property.Value
        }
    }

    return $null
}

function Invoke-LatestCheckpointDownload {
    param(
        [string]$ApiUrl,
        [string]$Token,
        [string]$CheckpointDirectory
    )

    if ([string]::IsNullOrWhiteSpace($ApiUrl)) {
        Write-Warning "Download checkpoint saltato: TMRL_HUB_API_URL non configurato."
        return
    }

    New-Item -ItemType Directory -Force -Path $CheckpointDirectory | Out-Null

    $headers = @{}
    if (-not [string]::IsNullOrWhiteSpace($Token)) {
        $headers["Authorization"] = "Bearer $Token"
    }

    $exportUrl = $ApiUrl.TrimEnd("/") + "/api/export/latest"
    Write-Host "Download ultimo checkpoint: $exportUrl"

    try {
        $metadata = Invoke-RestMethod -Method Get -Uri $exportUrl -Headers $headers -ErrorAction Stop
        $checkpoint = Get-ObjectProperty -Object $metadata -Names @("checkpoint", "latest_checkpoint", "latestCheckpoint")
        $downloadPath = Get-ObjectProperty -Object $metadata -Names @("download_url", "downloadUrl", "download")

        if ([string]::IsNullOrWhiteSpace($downloadPath) -and $null -ne $checkpoint) {
            $downloadPath = Get-ObjectProperty -Object $checkpoint -Names @("download_url", "downloadUrl", "download")
        }

        if ([string]::IsNullOrWhiteSpace($downloadPath)) {
            Write-Warning "Download checkpoint saltato: risposta /api/export/latest senza download_url."
            return
        }

        $fileName = Get-ObjectProperty -Object $metadata -Names @("file_name", "filename", "name")
        if ([string]::IsNullOrWhiteSpace($fileName) -and $null -ne $checkpoint) {
            $fileName = Get-ObjectProperty -Object $checkpoint -Names @("file_name", "filename", "name")
        }
        if ([string]::IsNullOrWhiteSpace($fileName)) {
            $fileName = "latest-checkpoint.bin"
        }

        $safeFileName = [System.IO.Path]::GetFileName($fileName)
        $targetPath = Join-Path $CheckpointDirectory $safeFileName

        if ([System.Uri]::IsWellFormedUriString($downloadPath, [System.UriKind]::Absolute)) {
            $downloadUrl = $downloadPath
        }
        else {
            $baseUri = [System.Uri]::new($ApiUrl.TrimEnd("/") + "/")
            $downloadUrl = [System.Uri]::new($baseUri, $downloadPath.TrimStart("/")).AbsoluteUri
        }

        Invoke-WebRequest -Method Get -Uri $downloadUrl -Headers $headers -OutFile $targetPath -ErrorAction Stop
        Write-Host "Checkpoint scaricato in $targetPath" -ForegroundColor Green
    }
    catch {
        Write-Warning "Download checkpoint non riuscito: $($_.Exception.Message)"
    }
}

function Test-RecordedProcessesAlive {
    param([string]$ProcessesFile)

    if (-not (Test-Path -LiteralPath $ProcessesFile -PathType Leaf)) {
        return $false
    }

    try {
        $state = Get-Content -LiteralPath $ProcessesFile -Raw | ConvertFrom-Json
        foreach ($role in @("server", "trainer", "worker")) {
            $record = $state.processes.PSObject.Properties[$role]
            if ($null -eq $record) {
                continue
            }

            $pythonPidProperty = $record.Value.PSObject.Properties["pythonPid"]
            if ($null -ne $pythonPidProperty -and $null -ne (Get-Process -Id ([int]$pythonPidProperty.Value) -ErrorAction SilentlyContinue)) {
                return $true
            }
        }
    }
    catch {
        return $false
    }

    return $false
}

function New-RunnerScript {
    param([string]$RunnerPath)

    $runnerContent = @'
param(
    [Parameter(Mandatory = $true)]
    [ValidateSet("server", "trainer", "worker")]
    [string]$Role,

    [Parameter(Mandatory = $true)]
    [string]$RepoRoot,

    [Parameter(Mandatory = $true)]
    [string]$PythonExe,

    [Parameter(Mandatory = $true)]
    [string]$LogPath,

    [Parameter(Mandatory = $true)]
    [string]$PidPath
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-LogLine {
    param(
        [string]$Path,
        [string]$Message,
        [string]$Level = "INFO"
    )

    $line = "[{0}] [{1}] {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Level, $Message
    Add-Content -LiteralPath $Path -Value $line -Encoding UTF8
}

Set-Location -LiteralPath $RepoRoot
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $LogPath) | Out-Null
New-Item -ItemType Directory -Force -Path (Split-Path -Parent $PidPath) | Out-Null

Write-Host ""
Write-Host "TMRL $Role"
Write-Host "Command: python -m tmrl --$Role"
Write-Host "Log: $LogPath"
Write-Host ""

Write-LogLine -Path $LogPath -Message "starting role=$Role command=python -m tmrl --$Role"

$startInfo = [System.Diagnostics.ProcessStartInfo]::new()
$startInfo.FileName = $PythonExe
$startInfo.Arguments = "-m tmrl --$Role"
$startInfo.WorkingDirectory = $RepoRoot
$startInfo.UseShellExecute = $false
$startInfo.RedirectStandardOutput = $true
$startInfo.RedirectStandardError = $true
$startInfo.CreateNoWindow = $true

$process = [System.Diagnostics.Process]::new()
$process.StartInfo = $startInfo
$process.EnableRaisingEvents = $true

$outputHandler = [System.Diagnostics.DataReceivedEventHandler]{
    param($sender, $eventArgs)
    if (-not [string]::IsNullOrWhiteSpace($eventArgs.Data)) {
        Write-LogLine -Path $LogPath -Message $eventArgs.Data -Level "OUT"
        Write-Host $eventArgs.Data
    }
}

$errorHandler = [System.Diagnostics.DataReceivedEventHandler]{
    param($sender, $eventArgs)
    if (-not [string]::IsNullOrWhiteSpace($eventArgs.Data)) {
        Write-LogLine -Path $LogPath -Message $eventArgs.Data -Level "ERR"
        Write-Host $eventArgs.Data -ForegroundColor Red
    }
}

$process.add_OutputDataReceived($outputHandler)
$process.add_ErrorDataReceived($errorHandler)

try {
    if (-not $process.Start()) {
        throw "process start returned false"
    }

    Set-Content -LiteralPath $PidPath -Value $process.Id -Encoding ASCII
    Write-Host "Python PID: $($process.Id)"
    Write-LogLine -Path $LogPath -Message "python pid=$($process.Id)"

    $process.BeginOutputReadLine()
    $process.BeginErrorReadLine()
    $process.WaitForExit()

    Write-LogLine -Path $LogPath -Message "process exited code=$($process.ExitCode)"
    Write-Host ""
    Write-Host "TMRL $Role terminato con exit code $($process.ExitCode)."
}
catch {
    Write-LogLine -Path $LogPath -Message $_.Exception.Message -Level "ERR"
    Write-Host "Errore TMRL $Role`: $($_.Exception.Message)" -ForegroundColor Red
}
finally {
    if ($null -ne $process) {
        $process.Dispose()
    }
}

Write-Host ""
Read-Host "Premi Invio per chiudere questa finestra"
'@

    Set-Content -LiteralPath $RunnerPath -Value $runnerContent -Encoding UTF8
}

function Start-TmrlRole {
    param(
        [string]$Role,
        [string]$RepositoryRoot,
        [string]$PythonExe,
        [string]$LogPath,
        [string]$PidPath,
        [string]$RunnerPath,
        [string]$PowerShellExe
    )

    if (Test-Path -LiteralPath $PidPath) {
        Remove-Item -LiteralPath $PidPath -Force
    }

    $argumentList = @(
        "-NoExit",
        "-ExecutionPolicy", "Bypass",
        "-File", (Quote-Argument $RunnerPath),
        "-Role", $Role,
        "-RepoRoot", (Quote-Argument $RepositoryRoot),
        "-PythonExe", (Quote-Argument $PythonExe),
        "-LogPath", (Quote-Argument $LogPath),
        "-PidPath", (Quote-Argument $PidPath)
    ) -join " "

    $terminalProcess = Start-Process -FilePath $PowerShellExe -ArgumentList $argumentList -PassThru

    $deadline = (Get-Date).AddSeconds(15)
    while ((Get-Date) -lt $deadline) {
        if (Test-Path -LiteralPath $PidPath -PathType Leaf) {
            $pidText = (Get-Content -LiteralPath $PidPath -Raw).Trim()
            if ($pidText -match "^\d+$") {
                return [pscustomobject]@{
                    role       = $Role
                    pythonPid  = [int]$pidText
                    windowPid  = [int]$terminalProcess.Id
                    logPath    = $LogPath
                    startedAt  = (Get-Date).ToString("o")
                }
            }
        }

        Start-Sleep -Milliseconds 250
    }

    throw "timeout waiting for $Role PID file: $PidPath"
}

$repoRoot = Get-RepositoryRoot
$scriptsRoot = $PSScriptRoot
$logsRoot = Join-Path $repoRoot "logs"
$runtimeRoot = Join-Path $repoRoot "runtime"
$processesFile = Join-Path $runtimeRoot "processes.json"
$sessionId = Get-Date -Format "yyyyMMdd-HHmmss"

New-Item -ItemType Directory -Force -Path $logsRoot, $runtimeRoot | Out-Null

if ((Test-RecordedProcessesAlive -ProcessesFile $processesFile) -and -not $Force) {
    throw "runtime/processes.json contiene processi TMRL ancora attivi. Esegui scripts/windows/stop-training.ps1 oppure usa -Force."
}

Write-Host ""
Write-Host "Esecuzione check ambiente..."
$checkScript = Join-Path $scriptsRoot "check-environment.ps1"
& $checkScript -SocketHost $SocketHost -SocketPort $SocketPort
if ($LASTEXITCODE -ne 0 -and -not $Force) {
    throw "check-environment non superato. Avvia Trackmania/Openplanet o usa -Force se vuoi proseguire comunque."
}

$pythonCommand = Get-Command python -ErrorAction Stop
$pythonExe = $pythonCommand.Source
$powerShellExe = (Get-Process -Id $PID).Path
if ([string]::IsNullOrWhiteSpace($powerShellExe)) {
    $powerShellExe = Join-Path $PSHOME "powershell.exe"
}

$dotenv = Read-DotEnv -Path (Join-Path $repoRoot ".env")
$apiPort = Get-ConfigValue -DotEnv $dotenv -Name "API_PORT" -Fallback "8000"
$apiUrl = Get-ConfigValue -DotEnv $dotenv -Name "TMRL_HUB_API_URL" -Fallback ("http://127.0.0.1:{0}" -f $apiPort)
$apiToken = Get-ConfigValue -DotEnv $dotenv -Name "TMRL_HUB_API_TOKEN" -Fallback (Get-ConfigValue -DotEnv $dotenv -Name "API_TOKEN" -Fallback "")
$checkpointDirConfig = Get-ConfigValue -DotEnv $dotenv -Name "TMRL_CHECKPOINT_DIR" -Fallback "data\checkpoints"
$checkpointDir = Resolve-RepositoryPath -RepositoryRoot $repoRoot -Path $checkpointDirConfig

if ($DownloadLatestCheckpoint -or (Test-TrueConfig -DotEnv $dotenv -Name "TMRL_DOWNLOAD_LATEST_ON_START")) {
    Invoke-LatestCheckpointDownload -ApiUrl $apiUrl -Token $apiToken -CheckpointDirectory $checkpointDir
}

$logFiles = @{
    server  = Join-Path $logsRoot "server.log"
    trainer = Join-Path $logsRoot "trainer.log"
    worker  = Join-Path $logsRoot "worker.log"
}

foreach ($role in @("server", "trainer", "worker")) {
    $header = @(
        "============================================================",
        "TMRL $role session $sessionId",
        "Started: $(Get-Date -Format o)",
        "Repository: $repoRoot",
        "============================================================"
    )
    Set-Content -LiteralPath $logFiles[$role] -Value $header -Encoding UTF8
}

$runnerPath = Join-Path $runtimeRoot "run-tmrl-process.ps1"
New-RunnerScript -RunnerPath $runnerPath

Write-Host ""
Write-Host "Avvio processi TMRL..."
$processRecords = [ordered]@{}

foreach ($role in @("server", "trainer", "worker")) {
    $pidPath = Join-Path $runtimeRoot "$role.pid"
    $record = Start-TmrlRole `
        -Role $role `
        -RepositoryRoot $repoRoot `
        -PythonExe $pythonExe `
        -LogPath $logFiles[$role] `
        -PidPath $pidPath `
        -RunnerPath $runnerPath `
        -PowerShellExe $powerShellExe

    $processRecords[$role] = $record
}

$state = [ordered]@{
    sessionId     = $sessionId
    repository    = $repoRoot
    startedAt     = (Get-Date).ToString("o")
    apiUrl        = $apiUrl
    checkpointDir = $checkpointDir
    logs          = $logFiles
    processes     = $processRecords
}

$state | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $processesFile -Encoding UTF8

Write-Host ""
Write-Host "Training TMRL avviato." -ForegroundColor Green
Write-Host "SERVER PID : $($processRecords.server.pythonPid) (terminal $($processRecords.server.windowPid))"
Write-Host "TRAINER PID: $($processRecords.trainer.pythonPid) (terminal $($processRecords.trainer.windowPid))"
Write-Host "WORKER PID : $($processRecords.worker.pythonPid) (terminal $($processRecords.worker.windowPid))"
Write-Host ""
Write-Host "PID salvati in: $processesFile"
Write-Host "Log: $logsRoot"
