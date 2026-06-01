export type HealthStatus = 'ok' | 'degraded' | 'down';

export interface DependencyHealthDto {
  name: 'postgres' | 'storage' | 'tmrl' | 'trainer' | 'worker' | string;
  status: HealthStatus;
  latencyMs?: number;
  message: string;
  checkedAt: string;
}

export interface HealthResponseDto {
  status: HealthStatus;
  service: 'tmrl-api';
  version: string;
  environment: 'development' | 'production' | 'test';
  uptimeSeconds: number;
  dependencies: DependencyHealthDto[];
  timestamp: string;
}
