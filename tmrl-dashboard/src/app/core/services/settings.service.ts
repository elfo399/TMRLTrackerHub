import { Injectable } from '@angular/core';
import { BehaviorSubject } from 'rxjs';

import { environment } from '../../../environments/environment';
import { DashboardSettings } from '../models';

const storageKey = 'tmrl-dashboard-settings';

export const defaultSettings: DashboardSettings = {
  apiUrl: environment.apiUrl,
  apiToken: '',
  refreshIntervalSeconds: environment.refreshInterval,
  useMockData: environment.useMockApi,
};

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
    this.writeSettings(defaultSettings);
    this.settingsSubject.next(defaultSettings);
  }

  private readSettings(): DashboardSettings {
    if (typeof localStorage === 'undefined') {
      return defaultSettings;
    }

    const raw = localStorage.getItem(storageKey);

    if (!raw) {
      return defaultSettings;
    }

    try {
      return { ...defaultSettings, ...(JSON.parse(raw) as Partial<DashboardSettings>) };
    } catch {
      return defaultSettings;
    }
  }

  private writeSettings(settings: DashboardSettings): void {
    if (typeof localStorage === 'undefined') {
      return;
    }

    localStorage.setItem(storageKey, JSON.stringify(settings));
  }
}
