export interface ApiMetaDto {
  requestId: string;
  generatedAt: string;
  source: 'mock' | 'live';
}

export interface ApiErrorDto {
  code: string;
  message: string;
  detail?: Record<string, unknown>;
}

export interface ApiListResponseDto<T> {
  items: T[];
  total: number;
  updatedAt: string;
  meta?: ApiMetaDto;
}
