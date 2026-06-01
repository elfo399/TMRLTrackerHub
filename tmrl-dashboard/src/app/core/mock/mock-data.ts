import {
  CheckpointDto,
  CheckpointActionResult,
  CheckpointsResponseDto,
  HealthResponseDto,
  MetricPoint,
  MetricsResponseDto,
  SessionsResponseDto,
  StatusResponseDto,
  TrainingSessionDto,
} from '../models';

const minute = 60_000;
const hour = 60 * minute;
const trainingStart = Date.now() - 7 * hour - 42 * minute;

function isoFromNow(offsetMs: number): string {
  return new Date(Date.now() + offsetMs).toISOString();
}

function metricSeries(
  points: number,
  stepMinutes: number,
  base: number,
  amplitude: number,
  slope: number,
  precision = 2,
): MetricPoint[] {
  return Array.from({ length: points }, (_, index) => {
    const wave = Math.sin(index / 4.2) * amplitude + Math.cos(index / 9) * amplitude * 0.38;
    const value = base + index * slope + wave;

    return {
      timestamp: isoFromNow(-(points - index - 1) * stepMinutes * minute),
      value: Number(value.toFixed(precision)),
      episode: 18_000 + index * 12,
      step: 2_600_000 + index * 4_096,
    };
  });
}

export function buildMockHealth(): HealthResponseDto {
  return {
    status: 'degraded',
    service: 'tmrl-api',
    version: '0.1.0',
    environment: 'development',
    uptimeSeconds: Math.floor((Date.now() - trainingStart) / 1000),
    dependencies: [
      {
        name: 'postgres',
        status: 'ok',
        latencyMs: 5,
        message: 'Mock database ready',
        checkedAt: new Date().toISOString(),
      },
      {
        name: 'storage',
        status: 'ok',
        latencyMs: 3,
        message: 'Checkpoint volume writable',
        checkedAt: new Date().toISOString(),
      },
      {
        name: 'worker',
        status: 'degraded',
        latencyMs: 91,
        message: 'One rollout worker heartbeat delayed',
        checkedAt: new Date().toISOString(),
      },
    ],
    timestamp: new Date().toISOString(),
  };
}

export function buildMockStatus(): StatusResponseDto {
  const uptimeSeconds = Math.floor((Date.now() - trainingStart) / 1000);
  const rewardSeries = metricSeries(48, 5, 612, 38, 6.4);
  const currentReward = rewardSeries.at(-1)?.value ?? 0;

  return {
    services: [
      {
        name: 'Server',
        status: 'online',
        latencyMs: 18,
        lastHeartbeat: isoFromNow(-8_000),
        detail: 'FastAPI bridge ready',
      },
      {
        name: 'Trainer',
        status: 'online',
        latencyMs: 34,
        lastHeartbeat: isoFromNow(-12_000),
        detail: 'SAC loop running on GPU',
      },
      {
        name: 'Worker',
        status: 'degraded',
        latencyMs: 91,
        lastHeartbeat: isoFromNow(-28_000),
        detail: '1 worker delayed, rollout queue healthy',
      },
    ],
    trainingActive: true,
    latestCheckpoint: 'tmrl_sac_2026-06-01_1640_reward_913.7.pt',
    bestReward: 937.42,
    currentReward,
    memorySize: 1_284_500,
    trainingStartedAt: new Date(trainingStart).toISOString(),
    uptimeSeconds,
    episodesCompleted: 18_742,
    replayMemory: {
      size: 1_284_500,
      capacity: 2_000_000,
      warmupComplete: true,
      lastPersistedAt: isoFromNow(-9 * minute),
    },
    storage: {
      checkpointsBytes: 913_979_392,
      replayMemoryBytes: 3_413_172_224,
      metricsBytes: 142_606_336,
      logsBytes: 86_507_520,
      freeBytes: 39_818_338_304,
    },
    runtime: {
      trackName: 'Stadium A01-Race',
      algorithm: 'SAC',
      device: 'cuda',
      workerCount: 4,
      tmrlVersion: '0.7.x',
    },
    updatedAt: new Date().toISOString(),
  };
}

export function buildMockMetrics(): MetricsResponseDto {
  const reward = metricSeries(60, 5, 585, 46, 5.9);
  const episodeLength = metricSeries(60, 5, 1_450, 175, -4.2, 0);
  const actorLoss = metricSeries(60, 5, 0.82, 0.12, -0.008, 4);
  const criticLoss = metricSeries(60, 5, 1.38, 0.18, -0.011, 4);
  const memoryLength = metricSeries(60, 5, 740_000, 12_000, 9_250, 0);

  return {
    sessionId: 'session-live-0601',
    samplingIntervalSeconds: 300,
    reward,
    episodeLength,
    actorLoss,
    criticLoss,
    memoryLength,
    series: [
      { name: 'reward', unit: 'reward', points: reward },
      { name: 'episodeLength', unit: 'steps', points: episodeLength },
      { name: 'actorLoss', unit: 'loss', points: actorLoss },
      { name: 'criticLoss', unit: 'loss', points: criticLoss },
      { name: 'memoryLength', unit: 'transitions', points: memoryLength },
    ],
    updatedAt: new Date().toISOString(),
  };
}

export function buildMockCheckpoints(): CheckpointsResponseDto {
  const items: CheckpointDto[] = [
    {
      id: 'ckpt-20260601-1640',
      fileName: 'tmrl_sac_2026-06-01_1640_reward_913.7.pt',
      createdAt: isoFromNow(-14 * minute),
      sizeBytes: 184_763_392,
      reward: 913.7,
      isLatest: true,
      storagePath: '/data/checkpoints/tmrl_sac_2026-06-01_1640_reward_913.7.pt',
      sha256: 'f7712e7f58f9b15d95d746e60b089a2f9bd2e5421e6a9a4ce2a1a64e3db0f640',
      metadata: {
        algorithm: 'SAC',
        trackName: 'Stadium A01-Race',
        episode: 18_621,
        step: 2_823_168,
        gitCommit: 'local-mock',
      },
    },
    {
      id: 'ckpt-20260601-1530',
      fileName: 'tmrl_sac_2026-06-01_1530_reward_937.4.pt',
      createdAt: isoFromNow(-84 * minute),
      sizeBytes: 184_421_376,
      reward: 937.42,
      isLatest: false,
      storagePath: '/data/checkpoints/tmrl_sac_2026-06-01_1530_reward_937.4.pt',
      sha256: '0b8c04ec55af7c01c8c65da6a7ec75ec75d7357d6f2cd2e88802be318f5e0e6a',
      metadata: {
        algorithm: 'SAC',
        trackName: 'Stadium A01-Race',
        episode: 17_930,
        step: 2_711_552,
        gitCommit: 'local-mock',
      },
    },
    {
      id: 'ckpt-20260601-1415',
      fileName: 'tmrl_sac_2026-06-01_1415_reward_881.9.pt',
      createdAt: isoFromNow(-159 * minute),
      sizeBytes: 183_982_080,
      reward: 881.9,
      isLatest: false,
      storagePath: '/data/checkpoints/tmrl_sac_2026-06-01_1415_reward_881.9.pt',
      sha256: 'd9f964ebbd82609f4f2742d37068ce7fd6277f08210b9354248a4af759ff32d0',
      metadata: {
        algorithm: 'SAC',
        trackName: 'Stadium A01-Race',
        episode: 16_884,
        step: 2_538_496,
      },
    },
    {
      id: 'ckpt-20260601-1235',
      fileName: 'tmrl_sac_2026-06-01_1235_reward_812.3.pt',
      createdAt: isoFromNow(-259 * minute),
      sizeBytes: 181_948_416,
      reward: 812.34,
      isLatest: false,
      storagePath: '/data/checkpoints/tmrl_sac_2026-06-01_1235_reward_812.3.pt',
      sha256: '3e45d46d7b30ad3f894d7a0798e77885cf5ebdbb29b31a0fa3df84ed7e2ae3c1',
      metadata: {
        algorithm: 'SAC',
        trackName: 'Stadium A01-Race',
        episode: 14_982,
        step: 2_232_320,
      },
    },
    {
      id: 'ckpt-20260601-1020',
      fileName: 'tmrl_sac_2026-06-01_1020_reward_744.8.pt',
      createdAt: isoFromNow(-394 * minute),
      sizeBytes: 178_864_128,
      reward: 744.81,
      isLatest: false,
      storagePath: '/data/checkpoints/tmrl_sac_2026-06-01_1020_reward_744.8.pt',
      sha256: '9bbf134a3ad0c6bb8b7757fe2f91fa0f5b764f62113f3b92d9242a807f6cf4e0',
      metadata: {
        algorithm: 'SAC',
        trackName: 'Stadium A01-Race',
        episode: 12_441,
        step: 1_880_064,
      },
    },
  ];

  return {
    items,
    total: items.length,
    latestCheckpointId: items.find((item) => item.isLatest)?.id ?? null,
    updatedAt: new Date().toISOString(),
  };
}

export function buildMockSessions(): SessionsResponseDto {
  const items: TrainingSessionDto[] = [
    {
      id: 'session-live-0601',
      startTime: new Date(trainingStart).toISOString(),
      endTime: null,
      durationSeconds: Math.floor((Date.now() - trainingStart) / 1000),
      bestReward: 937.42,
      status: 'running',
      totalEpisodes: 18_742,
      averageReward: 792.18,
      checkpointCount: 11,
      algorithm: 'SAC',
      trackName: 'Stadium A01-Race',
      device: 'cuda',
      notes: 'Current SAC run on Stadium loop with replay memory warm.',
    },
    {
      id: 'session-0531-night',
      startTime: '2026-05-31T20:10:00.000Z',
      endTime: '2026-06-01T02:45:00.000Z',
      durationSeconds: 23_700,
      bestReward: 846.55,
      status: 'completed',
      totalEpisodes: 15_204,
      averageReward: 701.82,
      checkpointCount: 8,
      algorithm: 'SAC',
      trackName: 'Stadium A01-Race',
      device: 'cuda',
      notes: 'Stable baseline before entropy coefficient adjustment.',
    },
    {
      id: 'session-0531-afternoon',
      startTime: '2026-05-31T13:25:00.000Z',
      endTime: '2026-05-31T17:02:00.000Z',
      durationSeconds: 13_020,
      bestReward: 628.41,
      status: 'stopped',
      totalEpisodes: 8_911,
      averageReward: 540.36,
      checkpointCount: 5,
      algorithm: 'SAC',
      trackName: 'Stadium A01-Race',
      device: 'cuda',
      notes: 'Stopped manually after reward plateau.',
    },
    {
      id: 'session-0530-gpu',
      startTime: '2026-05-30T21:40:00.000Z',
      endTime: '2026-05-30T23:18:00.000Z',
      durationSeconds: 5_880,
      bestReward: 391.24,
      status: 'failed',
      totalEpisodes: 2_104,
      averageReward: 326.79,
      checkpointCount: 1,
      algorithm: 'SAC',
      trackName: 'Stadium A01-Race',
      device: 'cuda',
      notes: 'CUDA memory pressure during replay batch expansion.',
    },
  ];

  return {
    items,
    total: items.length,
    activeSessionId: items.find((item) => item.status === 'running')?.id ?? null,
    updatedAt: new Date().toISOString(),
  };
}

export function buildMockActionResult(
  id: string,
  action: CheckpointActionResult['action'],
  message: string,
): CheckpointActionResult {
  return { id, action, message };
}
