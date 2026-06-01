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
  - `python -u -m tmrl --server`
  - `python -u -m tmrl --trainer`
  - `python -u -m tmrl --worker`
- apre due finestre log live per `trainer.log` e `worker.log`
- crea una sessione sul backend TMRL Hub, se `TMRL_HUB_API_URL` e token sono configurati
- pubblica heartbeat metriche ogni 5 secondi per non lasciare vuota la pagina Metrics
- salva i PID in `runtime\processes.json`

Se vuoi forzare l'avvio anche con check non superati:

```powershell
.\scripts\windows\start-training.ps1 -Force
```

Se vuoi includere anche il log server nei viewer live:

```powershell
.\scripts\windows\start-training.ps1 -IncludeServerLog
```

Se non vuoi aprire finestre log automatiche:

```powershell
.\scripts\windows\start-training.ps1 -NoLogViewer
```

## Log live

I log sono scritti in tempo reale in:

```text
logs\server.log
logs\trainer.log
logs\worker.log
```

Per aprire viewer separati per trainer e worker:

```powershell
.\scripts\windows\watch-training-logs.ps1 -NewWindows
```

Per vedere anche il server:

```powershell
.\scripts\windows\watch-training-logs.ps1 -IncludeServer -NewWindows
```

Per seguire tutto nel terminale corrente:

```powershell
.\scripts\windows\watch-training-logs.ps1 -Roles trainer,worker
```

## Limitare uso CPU

Per ridurre l'impatto del training sul PC puoi avviare TMRL con priorita' bassa, pochi thread CPU e affinity su alcuni core:

```powershell
.\scripts\windows\start-training.ps1 -CpuThreads 4 -CpuCores "0,1,2,3" -ProcessPriority BelowNormal
```

Parametri:

- `-CpuThreads`: imposta i thread usati da librerie numeriche Python/PyTorch tramite variabili come `OMP_NUM_THREADS`, `MKL_NUM_THREADS`, `OPENBLAS_NUM_THREADS`.
- `-CpuCores`: limita i processi Python ai core indicati, ad esempio `"0,1,2,3"`.
- `-ProcessPriority`: accetta `Idle`, `BelowNormal`, `Normal`, `AboveNormal`, `High`. Il default e' `BelowNormal`.

Configurazione consigliata per giocare mentre allena:

```powershell
.\scripts\windows\start-training.ps1 -CpuThreads 2 -CpuCores "0,1" -ProcessPriority Idle
```

Configurazione piu' bilanciata:

```powershell
.\scripts\windows\start-training.ps1 -CpuThreads 4 -CpuCores "0,1,2,3" -ProcessPriority BelowNormal
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
$env:TMRL_DOWNLOAD_CHECKPOINT_DIR = "$env:USERPROFILE\TmrlData\checkpoints"
$env:TMRL_ALLOWED_CHECKPOINT_EXTENSIONS = ".pt,.pth,.ckpt,.tcpt,.tmod,.zip,.bin,.pkl"
$env:TMRL_HEARTBEAT_INTERVAL_SECONDS = "5"
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

Di default il checkpoint latest viene scaricato in `%USERPROFILE%\TmrlData\checkpoints`, cioe' nella directory che TMRL usa normalmente. Puoi forzare un'altra destinazione con `TMRL_DOWNLOAD_CHECKPOINT_DIR`.

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
- `POST /api/sessions`
- `PATCH /api/sessions/{id}`
- `POST /api/metrics`
- `POST /api/checkpoints/upload`

Nota: l'heartbeat metriche non e' ancora un parser completo di TMRL. Serve a indicare sessione viva e a popolare la dashboard con campioni temporali base. Reward, actor loss e critic loss restano a `0` finche' non viene aggiunto un parser dedicato dei log/telemetria TMRL.

## File generati

- `logs\server.log`
- `logs\trainer.log`
- `logs\worker.log`
- `logs\heartbeat.log`
- `runtime\processes.json`
- `runtime\*.pid`
- `runtime\stop-report-*.json`

`logs\` e `runtime\` sono file locali di esecuzione e non vanno committati.
