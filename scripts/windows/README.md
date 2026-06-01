# Windows TMRL Training Scripts

Questi script avviano e fermano un training TMRL locale su Windows 10/11 usando tre finestre PowerShell separate: server, trainer e worker.

## Prerequisiti

- Python installato e disponibile nel `PATH`
- TMRL installato nell'ambiente Python usato dal comando `python`
- Trackmania installato
- Openplanet installato
- Plugin `TMRL_GrabData` attivo
- Trackmania avviato quando vuoi verificare il socket `127.0.0.1:9000`

## Check ambiente

Da root repository:

```powershell
.\scripts\windows\check-environment.ps1
```

Lo script verifica:

- Python
- import del package `tmrl`
- presenza/rilevamento Trackmania
- socket `127.0.0.1:9000`
- directory `TmrlData`

Se usi percorsi custom puoi impostare:

```powershell
$env:TMRL_TRACKMANIA_PATH = "<percorso>\Trackmania.exe"
$env:TMRL_DATA_DIR = "<percorso>\TmrlData"
```

## Avvio training

```powershell
.\scripts\windows\start-training.ps1
```

Lo script:

- esegue `check-environment.ps1`
- crea `logs\` e `runtime\`
- crea `logs\server.log`, `logs\trainer.log`, `logs\worker.log`
- apre tre terminali separati
- avvia:
  - `python -m tmrl --server`
  - `python -m tmrl --trainer`
  - `python -m tmrl --worker`
- salva i PID in `runtime\processes.json`

Se vuoi forzare l'avvio anche con check non superati:

```powershell
.\scripts\windows\start-training.ps1 -Force
```

## Stop training

```powershell
.\scripts\windows\stop-training.ps1
```

Lo script legge `runtime\processes.json`, termina worker/trainer/server, verifica la terminazione e salva un report in `runtime\stop-report-*.json`.

Per lasciare aperte le finestre terminale:

```powershell
.\scripts\windows\stop-training.ps1 -KeepTerminalWindows
```

## Integrazione opzionale con TMRL Hub

Gli script supportano download/upload checkpoint verso il backend TMRL Hub.

Variabili supportate:

```powershell
$env:TMRL_HUB_API_URL = "http://127.0.0.1:8000"
$env:TMRL_HUB_API_TOKEN = "inserisci-token-api"
$env:TMRL_CHECKPOINT_DIR = "data\checkpoints"
$env:TMRL_ALLOWED_CHECKPOINT_EXTENSIONS = ".pt,.pth,.ckpt,.tcpt,.tmod,.zip,.bin,.pkl"
$env:TMRL_DOWNLOAD_LATEST_ON_START = "true"
$env:TMRL_UPLOAD_FINAL_CHECKPOINT = "true"
```

Se il backend passa dal proxy interno della dashboard, usa il dominio della dashboard come base URL. L'importante e' non aggiungere `/api` alla fine:

```powershell
$env:TMRL_HUB_API_URL = "https://trml.elfo3.dev"
```

In alternativa, `TMRL_HUB_API_TOKEN` usa come fallback `API_TOKEN` dal file `.env` della root.

Download ultimo checkpoint all'avvio:

```powershell
.\scripts\windows\start-training.ps1 -DownloadLatestCheckpoint
```

Upload dell'ultimo checkpoint allo stop:

```powershell
.\scripts\windows\stop-training.ps1 -UploadFinalCheckpoint
```

Se `TMRL_CHECKPOINT_DIR` non e' configurato, lo script cerca automaticamente in:

- `data\checkpoints`
- `%TMRL_DATA_DIR%\checkpoints`
- `%TMRL_DATA_DIR%\weights`
- `%USERPROFILE%\TmrlData\checkpoints`
- `%USERPROFILE%\TmrlData\weights`

Endpoint usati:

- `GET /api/export/latest`
- `POST /api/checkpoints/upload`

## File generati

- `logs\server.log`
- `logs\trainer.log`
- `logs\worker.log`
- `runtime\processes.json`
- `runtime\*.pid`
- `runtime\stop-report-*.json`

`logs\` e `runtime\` sono file locali di esecuzione e non vanno committati.
