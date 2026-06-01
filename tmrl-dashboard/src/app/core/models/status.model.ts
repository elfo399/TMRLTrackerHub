export type ServiceStatus = 'online' | 'degraded' | 'offline';
export type RuntimeServiceName = 'Server' | 'Trainer' | 'Worker' | 'Database' | 'Storage';

export interface RuntimeServiceStatusDto {
  name: RuntimeServiceName;
  status: ServiceStatus;
  latencyMs: number;
  lastHeartbeat: string;
  detail: string;
}

export interface StorageUsageDto {
  checkpointsBytes: number;
  replayMemoryBytes: number;
  metricsBytes: number;
  logsBytes: number;
  freeBytes: number;
}

export interface ReplayMemoryStatusDto {
  size: number;
  capacity: number;
  warmupComplete: boolean;
  lastPersistedAt: string;
}

export interface TmrlRuntimeDto {
  trackName: string;
  algorithm: 'SAC' | 'PPO' | 'DQN' | 'CUSTOM';
  device: 'cpu' | 'cuda' | 'mps';
  workerCount: number;
  tmrlVersion: string;
}

export interface StatusResponseDto {
  services: RuntimeServiceStatusDto[];
  trainingActive: boolean;
  latestCheckpoint: string;
  bestReward: number;
  currentReward: number;
  memorySize: number;
  trainingStartedAt: string;
  uptimeSeconds: number;
  episodesCompleted: number;
  replayMemory: ReplayMemoryStatusDto;
  storage: StorageUsageDto;
  runtime: TmrlRuntimeDto;
  updatedAt: string;
}

export type RuntimeServiceStatus = RuntimeServiceStatusDto;
export type TrainingStatus = StatusResponseDto;

export type ApiConnectionStatus = 'connected' | 'mock' | 'offline' | 'checking';

export interface ApiConnectionState {
  status: ApiConnectionStatus;
  mode: 'mock' | 'http';
  checkedAt: string;
  message: string;
}
