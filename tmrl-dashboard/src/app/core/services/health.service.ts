import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { buildMockHealth } from '../mock/mock-data';
import { HealthResponseDto } from '../models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class HealthService {
  private readonly api = inject(ApiService);
  private readonly healthState = signal<HealthResponseDto | null>(null);
  private readonly loadingState = signal(false);
  private readonly errorState = signal('');

  readonly health = this.healthState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  load(): Observable<HealthResponseDto> {
    this.loadingState.set(true);
    this.errorState.set('');

    return this.api.get<HealthResponseDto>('/health', buildMockHealth).pipe(
      tap((health) => {
        this.healthState.set(health);
        this.loadingState.set(false);
      }),
      catchError((error: unknown) => {
        this.errorState.set('Impossibile caricare health check');
        this.loadingState.set(false);
        return throwError(() => error);
      }),
    );
  }
}
