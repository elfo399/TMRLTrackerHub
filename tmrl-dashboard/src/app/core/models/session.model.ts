export type TrainingSessionStatus = 'running' | 'completed' | 'failed' | 'stopped';

export interface TrainingSessionDto {
  id: string;
  startTime: string;
  endTime: string | null;
  durationSeconds: number;
  bestReward: number;
  status: TrainingSessionStatus;
  totalEpisodes: number;
  averageReward: number;
  checkpointCount: number;
  algorithm: 'SAC' | 'PPO' | 'DQN' | 'CUSTOM';
  trackName: string;
  device: 'cpu' | 'cuda' | 'mps';
  notes: string;
}

export interface SessionsResponseDto {
  items: TrainingSessionDto[];
  total: number;
  activeSessionId: string | null;
  updatedAt: string;
}

export type TrainingSession = TrainingSessionDto;
