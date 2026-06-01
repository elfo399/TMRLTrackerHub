<#
.SYNOPSIS
Publishes lightweight TMRL training heartbeat metrics to TMRL Hub.

.DESCRIPTION
This is not a full TMRL metric parser. It keeps the backend aware of the
running local session by posting one metric sample every few seconds. Reward
and losses stay at zero until a dedicated parser is added.
#>

[CmdletBinding()]
param(
    [Parameter(Mandatory = $true)]
    [string]$SessionId,

    [Parameter(Mandatory = $true)]
    [string]$ApiUrl,

    [Parameter(Mandatory = $true)]
    [string]$Token,

    [int]$IntervalSeconds = 5,

    [string]$TmrlDataDir = "",

    [string]$LogPath = ""
)

Set-StrictMode -Version Latest
$ErrorActionPreference = "Stop"

function Write-HeartbeatLog {
    param(
        [string]$Path,
        [string]$Message,
        [string]$Level = "INFO"
    )

    if ([string]::IsNullOrWhiteSpace($Path)) {
        return
    }

    $line = "[{0}] [{1}] {2}" -f (Get-Date -Format "yyyy-MM-dd HH:mm:ss"), $Level, $Message
    Add-Content -LiteralPath $Path -Value $line -Encoding UTF8
}

function Get-ReplayMemoryLength {
    param([string]$DataDir)

    if ([string]::IsNullOrWhiteSpace($DataDir)) {
        return 0
    }

    $candidateDirs = @(
        (Join-Path $DataDir "dataset"),
        (Join-Path $DataDir "memory")
    )

    foreach ($directory in $candidateDirs) {
        if (Test-Path -LiteralPath $directory -PathType Container) {
            return @(Get-ChildItem -LiteralPath $directory -Recurse -File -ErrorAction SilentlyContinue).Count
        }
    }

    return 0
}

if ($IntervalSeconds -lt 1) {
    $IntervalSeconds = 5
}

if (-not [string]::IsNullOrWhiteSpace($LogPath)) {
    New-Item -ItemType Directory -Force -Path (Split-Path -Parent $LogPath) | Out-Null
}

$endpoint = $ApiUrl.TrimEnd("/") + "/api/metrics"
$headers = @{ Authorization = "Bearer $Token" }

Write-HeartbeatLog -Path $LogPath -Message "heartbeat started session=$SessionId endpoint=$endpoint interval=${IntervalSeconds}s"

while ($true) {
    try {
        $payload = @{
            timestamp      = (Get-Date).ToUniversalTime().ToString("o")
            session_id     = $SessionId
            reward         = 0
            episode_length = 0
            actor_loss     = 0
            critic_loss    = 0
            memory_len     = Get-ReplayMemoryLength -DataDir $TmrlDataDir
        } | ConvertTo-Json

        Invoke-RestMethod `
            -Uri $endpoint `
            -Method Post `
            -Headers $headers `
            -ContentType "application/json" `
            -Body $payload `
            -TimeoutSec 10 | Out-Null

        Write-HeartbeatLog -Path $LogPath -Message "metric posted"
    }
    catch {
        Write-HeartbeatLog -Path $LogPath -Message $_.Exception.Message -Level "WARN"
    }

    Start-Sleep -Seconds $IntervalSeconds
}
