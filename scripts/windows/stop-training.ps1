<#
.SYNOPSIS
Stops the local TMRL training processes launched by start-training.ps1.

.DESCRIPTION
Reads runtime/processes.json, terminates server/trainer/worker process trees,
verifies shutdown, writes a stop report, and can optionally upload the latest
checkpoint to the TMRL Hub backend.
#>

[CmdletBinding()]
param(
    [switch]$UploadFinalCheckpoint,
    [switch]$KeepTerminalWindows
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

function Get-JsonPropertyValue {
    param(
        [object]$Object,
        [string]$Name
    )

    if ($null -eq $Object) {
        return $null
    }

    $property = $Object.PSObject.Properties[$Name]
    if ($null -eq $property) {
        return $null
    }

    return $property.Value
}

function Test-ProcessAlive {
    param([int]$ProcessId)
    return $null -ne (Get-Process -Id $ProcessId -ErrorAction SilentlyContinue)
}

function Stop-ProcessTree {
    param([int]$ProcessId)

    $children = Get-CimInstance Win32_Process -Filter "ParentProcessId = $ProcessId" -ErrorAction SilentlyContinue
    foreach ($child in $children) {
        Stop-ProcessTree -ProcessId ([int]$child.ProcessId)
    }

    $process = Get-Process -Id $ProcessId -ErrorAction SilentlyContinue
    if ($null -ne $process) {
        Stop-Process -Id $ProcessId -Force -ErrorAction SilentlyContinue
    }
}

function Get-LatestCheckpointFile {
    param([string]$CheckpointDirectory)

    if (-not (Test-Path -LiteralPath $CheckpointDirectory -PathType Container)) {
        return $null
    }

    return Get-ChildItem -LiteralPath $CheckpointDirectory -File -ErrorAction SilentlyContinue |
        Sort-Object LastWriteTimeUtc -Descending |
        Select-Object -First 1
}

function Invoke-CheckpointUpload {
    param(
        [string]$ApiUrl,
        [string]$Token,
        [string]$CheckpointPath
    )

    if ([string]::IsNullOrWhiteSpace($ApiUrl)) {
        Write-Warning "Upload checkpoint saltato: TMRL_HUB_API_URL non configurato."
        return
    }

    if (-not (Test-Path -LiteralPath $CheckpointPath -PathType Leaf)) {
        Write-Warning "Upload checkpoint saltato: file non trovato $CheckpointPath"
        return
    }

    Add-Type -AssemblyName System.Net.Http

    $client = [System.Net.Http.HttpClient]::new()
    $form = [System.Net.Http.MultipartFormDataContent]::new()
    $stream = $null

    try {
        if (-not [string]::IsNullOrWhiteSpace($Token)) {
            $client.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new("Bearer", $Token)
        }

        $stream = [System.IO.File]::OpenRead($CheckpointPath)
        $content = [System.Net.Http.StreamContent]::new($stream)
        $content.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("application/octet-stream")
        $form.Add($content, "file", [System.IO.Path]::GetFileName($CheckpointPath))

        $uploadUrl = $ApiUrl.TrimEnd("/") + "/api/checkpoints/upload"
        Write-Host "Upload checkpoint finale: $uploadUrl"

        $response = $client.PostAsync($uploadUrl, $form).GetAwaiter().GetResult()
        $body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()

        if (-not $response.IsSuccessStatusCode) {
            Write-Warning "Upload non riuscito: HTTP $([int]$response.StatusCode) $body"
            return
        }

        Write-Host "Checkpoint caricato: $CheckpointPath" -ForegroundColor Green
    }
    catch {
        Write-Warning "Upload checkpoint non riuscito: $($_.Exception.Message)"
    }
    finally {
        if ($null -ne $stream) {
            $stream.Dispose()
        }
        $form.Dispose()
        $client.Dispose()
    }
}

$repoRoot = Get-RepositoryRoot
$runtimeRoot = Join-Path $repoRoot "runtime"
$processesFile = Join-Path $runtimeRoot "processes.json"

if (-not (Test-Path -LiteralPath $processesFile -PathType Leaf)) {
    throw "runtime/processes.json non trovato. Nessuna sessione avviata con start-training.ps1."
}

$state = Get-Content -LiteralPath $processesFile -Raw | ConvertFrom-Json
$report = New-Object System.Collections.Generic.List[object]

Write-Host ""
Write-Host "Arresto processi TMRL..."

foreach ($role in @("worker", "trainer", "server")) {
    $record = Get-JsonPropertyValue -Object $state.processes -Name $role
    if ($null -eq $record) {
        $report.Add([pscustomobject]@{
            role    = $role
            status  = "missing"
            details = "nessun record in processes.json"
        }) | Out-Null
        continue
    }

    $pythonPid = Get-JsonPropertyValue -Object $record -Name "pythonPid"
    $windowPid = Get-JsonPropertyValue -Object $record -Name "windowPid"
    $details = New-Object System.Collections.Generic.List[string]

    if ($null -ne $pythonPid) {
        $pythonProcessId = [int]$pythonPid
        if (Test-ProcessAlive -ProcessId $pythonProcessId) {
            Stop-ProcessTree -ProcessId $pythonProcessId
            Start-Sleep -Milliseconds 500
            if (Test-ProcessAlive -ProcessId $pythonProcessId) {
                $details.Add("python PID $pythonProcessId ancora attivo") | Out-Null
            }
            else {
                $details.Add("python PID $pythonProcessId terminato") | Out-Null
            }
        }
        else {
            $details.Add("python PID $pythonProcessId gia' spento") | Out-Null
        }
    }

    if (-not $KeepTerminalWindows -and $null -ne $windowPid) {
        $windowProcessId = [int]$windowPid
        if (Test-ProcessAlive -ProcessId $windowProcessId) {
            Stop-ProcessTree -ProcessId $windowProcessId
            Start-Sleep -Milliseconds 300
            if (Test-ProcessAlive -ProcessId $windowProcessId) {
                $details.Add("terminal PID $windowProcessId ancora attivo") | Out-Null
            }
            else {
                $details.Add("terminal PID $windowProcessId terminato") | Out-Null
            }
        }
        else {
            $details.Add("terminal PID $windowProcessId gia' spento") | Out-Null
        }
    }

    $status = "stopped"
    if (($details -join "; ") -match "ancora attivo") {
        $status = "warning"
    }

    $report.Add([pscustomobject]@{
        role    = $role
        status  = $status
        details = ($details -join "; ")
    }) | Out-Null
}

$dotenv = Read-DotEnv -Path (Join-Path $repoRoot ".env")
if ($UploadFinalCheckpoint -or (Test-TrueConfig -DotEnv $dotenv -Name "TMRL_UPLOAD_FINAL_CHECKPOINT")) {
    $apiPort = Get-ConfigValue -DotEnv $dotenv -Name "API_PORT" -Fallback "8000"
    $apiUrl = Get-ConfigValue -DotEnv $dotenv -Name "TMRL_HUB_API_URL" -Fallback ("http://127.0.0.1:{0}" -f $apiPort)
    $apiToken = Get-ConfigValue -DotEnv $dotenv -Name "TMRL_HUB_API_TOKEN" -Fallback (Get-ConfigValue -DotEnv $dotenv -Name "API_TOKEN" -Fallback "")
    $checkpointDirConfig = Get-ConfigValue -DotEnv $dotenv -Name "TMRL_CHECKPOINT_DIR" -Fallback "data\checkpoints"
    $checkpointDir = Resolve-RepositoryPath -RepositoryRoot $repoRoot -Path $checkpointDirConfig
    $latestCheckpoint = Get-LatestCheckpointFile -CheckpointDirectory $checkpointDir

    if ($null -eq $latestCheckpoint) {
        Write-Warning "Upload checkpoint finale richiesto, ma nessun file trovato in $checkpointDir"
    }
    else {
        Invoke-CheckpointUpload -ApiUrl $apiUrl -Token $apiToken -CheckpointPath $latestCheckpoint.FullName
    }
}

$stopReport = [ordered]@{
    sessionId = Get-JsonPropertyValue -Object $state -Name "sessionId"
    stoppedAt = (Get-Date).ToString("o")
    report    = $report
}

$reportPath = Join-Path $runtimeRoot ("stop-report-{0}.json" -f (Get-Date -Format "yyyyMMdd-HHmmss"))
$stopReport | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $reportPath -Encoding UTF8

$state | Add-Member -NotePropertyName stoppedAt -NotePropertyValue (Get-Date).ToString("o") -Force
$state | Add-Member -NotePropertyName lastStopReport -NotePropertyValue $reportPath -Force
$state | ConvertTo-Json -Depth 8 | Set-Content -LiteralPath $processesFile -Encoding UTF8

Write-Host ""
$report | Format-Table -AutoSize
Write-Host ""
Write-Host "Report finale salvato in: $reportPath" -ForegroundColor Green
