# Backend Integration

Base path:

```text
/api
```

Authentication for mutating endpoints:

```http
Authorization: Bearer <API_TOKEN>
```

## GET /api/health

Response:

```json
{
  "status": "ok",
  "service": "tmrl-api",
  "version": "0.1.0",
  "environment": "production",
  "uptimeSeconds": 120,
  "dependencies": [
    {
      "name": "database",
      "status": "ok",
      "latencyMs": 0,
      "message": "Database reachable",
      "checkedAt": "2026-06-01T12:00:00Z"
    }
  ],
  "timestamp": "2026-06-01T12:00:00Z"
}
```

## GET /api/status

Response includes snake_case fields for simple clients and camelCase fields for the Angular dashboard:

```json
{
  "server_online": true,
  "trainer_online": true,
  "worker_online": true,
  "training_active": true,
  "latest_checkpoint": "model.pt",
  "best_reward": 937.42,
  "current_reward": 913.7,
  "memory_size": 1284500,
  "uptime_seconds": 27720,
  "trainingActive": true,
  "latestCheckpoint": "model.pt",
  "bestReward": 937.42,
  "currentReward": 913.7,
  "memorySize": 1284500,
  "uptimeSeconds": 27720,
  "updatedAt": "2026-06-01T12:00:00Z"
}
```

## GET /api/metrics

Response:

```json
{
  "items": [
    {
      "id": 1,
      "timestamp": "2026-06-01T12:00:00Z",
      "session_id": "session-001",
      "reward": 913.7,
      "episode_length": 1210,
      "actor_loss": 0.2941,
      "critic_loss": 0.7162,
      "memory_len": 1284500
    }
  ],
  "total": 1,
  "sessionId": "session-001",
  "samplingIntervalSeconds": 5,
  "reward": [],
  "episodeLength": [],
  "actorLoss": [],
  "criticLoss": [],
  "memoryLength": [],
  "series": [],
  "updatedAt": "2026-06-01T12:00:00Z"
}
```

## POST /api/metrics

Protected by Bearer token.

Request:

```json
{
  "timestamp": "2026-06-01T12:00:00Z",
  "session_id": "session-001",
  "reward": 913.7,
  "episode_length": 1210,
  "actor_loss": 0.2941,
  "critic_loss": 0.7162,
  "memory_len": 1284500
}
```

## GET /api/checkpoints

Response:

```json
{
  "items": [
    {
      "id": "ckpt-abc123",
      "fileName": "model.pt",
      "createdAt": "2026-06-01T12:00:00Z",
      "sizeBytes": 184763392,
      "reward": 913.7,
      "isLatest": true,
      "storagePath": "/data/checkpoints/ckpt-abc123-model.pt",
      "sha256": "hash",
      "metadata": {
        "algorithm": "SAC",
        "trackName": "unknown",
        "episode": 0,
        "step": 0,
        "gitCommit": null
      }
    }
  ],
  "total": 1,
  "latestCheckpointId": "ckpt-abc123",
  "updatedAt": "2026-06-01T12:00:00Z"
}
```

## POST /api/checkpoints/upload

Protected by Bearer token. Multipart form:

```text
file=<checkpoint file>
reward=<optional float>
```

Allowed extensions:

```text
.pt, .pth, .ckpt, .zip, .bin, .pkl
```

## GET /api/checkpoints/{id}/download

Returns checkpoint binary.

## POST /api/checkpoints/{id}/latest

Protected by Bearer token.

Response:

```json
{
  "id": "ckpt-abc123",
  "action": "marked-latest",
  "message": "Checkpoint marked as latest"
}
```

## DELETE /api/checkpoints/{id}

Protected by Bearer token.

## GET /api/sessions

Response:

```json
{
  "items": [
    {
      "id": "session-001",
      "startTime": "2026-06-01T10:00:00Z",
      "endTime": null,
      "durationSeconds": 7200,
      "bestReward": 937.42,
      "status": "running",
      "totalEpisodes": 18742,
      "averageReward": 792.18,
      "checkpointCount": 11,
      "algorithm": "SAC",
      "trackName": "unknown",
      "device": "cpu",
      "notes": "Current run"
    }
  ],
  "total": 1,
  "activeSessionId": "session-001",
  "updatedAt": "2026-06-01T12:00:00Z"
}
```

## POST /api/sessions

Protected by Bearer token.

```json
{
  "id": "session-001",
  "start_time": "2026-06-01T10:00:00Z",
  "notes": "SAC training"
}
```

## PATCH /api/sessions/{id}

Protected by Bearer token.

```json
{
  "status": "completed",
  "end_time": "2026-06-01T12:00:00Z",
  "best_reward": 937.42,
  "total_episodes": 18742,
  "average_reward": 792.18,
  "checkpoint_count": 11
}
```

## GET /api/export/latest

Response:

```json
{
  "checkpoint": {
    "id": "ckpt-abc123",
    "fileName": "model.pt"
  },
  "downloadUrl": "/api/checkpoints/ckpt-abc123/download",
  "generatedAt": "2026-06-01T12:00:00Z"
}
```
