import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { buildMockMetrics } from '../mock/mock-data';
import { TrainingMetrics } from '../models';
import { ApiService } from './api.service';
import { SettingsService } from './settings.service';

@Injectable({ providedIn: 'root' })
export class MetricsService {
  private readonly api = inject(ApiService);
  private readonly settings = inject(SettingsService);
  private readonly metricsState = signal<TrainingMetrics | null>(null);
  private readonly loadingState = signal(true);
  private readonly errorState = signal('');

  readonly metrics = this.metricsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  get refreshIntervalSeconds(): number {
    return this.settings.getSnapshot().refreshIntervalSeconds;
  }

  load(): Observable<TrainingMetrics> {
    this.loadingState.set(!this.metricsState());
    this.errorState.set('');

    return this.api.get<TrainingMetrics>('/metrics', buildMockMetrics).pipe(
      tap((metrics) => {
        this.metricsState.set(metrics);
        this.loadingState.set(false);
      }),
      catchError((error: unknown) => {
        this.errorState.set('Impossibile caricare le metriche');
        this.loadingState.set(false);
        return throwError(() => error);
      }),
    );
  }
}
