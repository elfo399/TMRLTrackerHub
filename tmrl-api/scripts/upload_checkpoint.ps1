param(
  [Parameter(Mandatory = $true)]
  [string]$FilePath,

  [Parameter(Mandatory = $true)]
  [string]$Token,

  [string]$ApiUrl = "http://raspberrypi.local:8000/api",

  [double]$Reward
)

Add-Type -AssemblyName System.Net.Http

$resolvedPath = Resolve-Path -LiteralPath $FilePath
$fileName = [System.IO.Path]::GetFileName($resolvedPath)
$client = [System.Net.Http.HttpClient]::new()
$form = [System.Net.Http.MultipartFormDataContent]::new()
$stream = [System.IO.File]::OpenRead($resolvedPath)

try {
  $client.DefaultRequestHeaders.Authorization = [System.Net.Http.Headers.AuthenticationHeaderValue]::new("Bearer", $Token)

  $fileContent = [System.Net.Http.StreamContent]::new($stream)
  $fileContent.Headers.ContentType = [System.Net.Http.Headers.MediaTypeHeaderValue]::Parse("application/octet-stream")
  $form.Add($fileContent, "file", $fileName)

  if ($PSBoundParameters.ContainsKey("Reward")) {
    $form.Add([System.Net.Http.StringContent]::new([string]$Reward), "reward")
  }

  $uri = "$($ApiUrl.TrimEnd('/'))/checkpoints/upload"
  $response = $client.PostAsync($uri, $form).GetAwaiter().GetResult()
  $body = $response.Content.ReadAsStringAsync().GetAwaiter().GetResult()

  if (-not $response.IsSuccessStatusCode) {
    throw "Upload failed with status $([int]$response.StatusCode): $body"
  }

  $body
}
finally {
  $stream.Dispose()
  if ($null -ne $form) {
    $form.Dispose()
  }
  if ($null -ne $client) {
    $client.Dispose()
  }
}
