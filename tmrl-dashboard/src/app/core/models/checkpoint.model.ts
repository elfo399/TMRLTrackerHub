export interface CheckpointMetadataDto {
  algorithm: 'SAC' | 'PPO' | 'DQN' | 'CUSTOM';
  trackName: string;
  episode: number;
  step: number;
  gitCommit?: string;
}

export interface CheckpointDto {
  id: string;
  fileName: string;
  createdAt: string;
  sizeBytes: number;
  reward: number;
  isLatest: boolean;
  storagePath: string;
  sha256: string;
  metadata: CheckpointMetadataDto;
}

export interface CheckpointsResponseDto {
  items: CheckpointDto[];
  total: number;
  latestCheckpointId: string | null;
  updatedAt: string;
}

export type Checkpoint = CheckpointDto;

export type CheckpointAction = 'downloaded' | 'marked-latest' | 'deleted';

export interface CheckpointActionResult {
  id: string;
  action: CheckpointAction;
  message: string;
}
