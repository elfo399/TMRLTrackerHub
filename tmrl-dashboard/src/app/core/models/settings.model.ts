export interface DashboardSettings {
  apiUrl: string;
  apiToken: string;
  refreshIntervalSeconds: number;
  useMockData: boolean;
}

export interface AppRuntimeConfig {
  apiUrl?: string;
  apiToken?: string;
  refreshInterval?: number;
  appVersion?: string;
  useMockData?: boolean;
}
