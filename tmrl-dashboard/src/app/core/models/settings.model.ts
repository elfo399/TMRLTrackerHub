export interface DashboardSettings {
  apiUrl: string;
  apiToken: string;
  refreshIntervalSeconds: number;
}

export interface AppRuntimeConfig {
  apiUrl?: string;
  apiToken?: string;
  refreshInterval?: number;
  appVersion?: string;
}
