import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { environment } from '../../../environments/environment';
import { AppRuntimeConfig, DashboardSettings } from '../models';

const storageKey = 'tmrl-dashboard-settings';

declare global {
  interface Window {
    __TMRL_RUNTIME_CONFIG__?: AppRuntimeConfig;
  }
}

export function getDefaultSettings(): DashboardSettings {
  const runtimeConfig = typeof window === 'undefined' ? undefined : window.__TMRL_RUNTIME_CONFIG__;

  return {
    apiUrl: runtimeConfig?.apiUrl?.trim() || environment.apiUrl,
    apiToken: runtimeConfig?.apiToken?.trim() || environment.apiToken,
    refreshIntervalSeconds: runtimeConfig?.refreshInterval ?? environment.refreshInterval,
    useMockData: runtimeConfig?.useMockData ?? environment.useMockApi,
  };
}

export const defaultSettings: DashboardSettings = getDefaultSettings();

@Injectable({ providedIn: 'root' })
export class SettingsService {
  private readonly settingsSubject = new BehaviorSubject<DashboardSettings>(this.readSettings());
  readonly settings$ = this.settingsSubject.asObservable();

  getSnapshot(): DashboardSettings {
    return this.settingsSubject.value;
  }

  save(settings: DashboardSettings): void {
    const normalized: DashboardSettings = {
      apiUrl: settings.apiUrl.trim() || defaultSettings.apiUrl,
      apiToken: settings.apiToken.trim(),
      refreshIntervalSeconds: Math.max(1, Math.min(120, Number(settings.refreshIntervalSeconds))),
      useMockData: settings.useMockData,
    };

    this.writeSettings(normalized);
    this.settingsSubject.next(normalized);
  }

  reset(): void {
    const defaults = getDefaultSettings();
    this.writeSettings(defaults);
    this.settingsSubject.next(defaults);
  }

  private readSettings(): DashboardSettings {
    if (typeof localStorage === 'undefined') {
      return getDefaultSettings();
    }

    const defaults = getDefaultSettings();
    const raw = localStorage.getItem(storageKey);

    if (!raw) {
      return defaults;
    }

    try {
      const stored = JSON.parse(raw) as Partial<DashboardSettings>;
      const merged = { ...defaults, ...stored };

      if (!stored.apiToken?.trim() && defaults.apiToken) {
        merged.apiToken = defaults.apiToken;
      }

      return merged;
    } catch {
      return defaults;
    }
  }

  private writeSettings(settings: DashboardSettings): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(storageKey, JSON.stringify(settings));
  }
}
