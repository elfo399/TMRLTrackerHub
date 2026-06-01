export type MetricName = 'reward' | 'episodeLength' | 'actorLoss' | 'criticLoss' | 'memoryLength';

export interface MetricPointDto {
  timestamp: string;
  value: number;
  episode?: number;
  step?: number;
}

export interface MetricSeriesDto {
  name: MetricName;
  unit: 'reward' | 'steps' | 'loss' | 'transitions';
  points: MetricPointDto[];
}

export interface MetricsResponseDto {
  sessionId: string;
  samplingIntervalSeconds: number;
  reward: MetricPointDto[];
  episodeLength: MetricPointDto[];
  actorLoss: MetricPointDto[];
  criticLoss: MetricPointDto[];
  memoryLength: MetricPointDto[];
  series: MetricSeriesDto[];
  updatedAt: string;
}

export type MetricPoint = MetricPointDto;
export type TrainingMetrics = MetricsResponseDto;
