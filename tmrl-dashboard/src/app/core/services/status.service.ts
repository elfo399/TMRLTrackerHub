import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { buildMockStatus } from '../mock/mock-data';
import { TrainingStatus } from '../models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class StatusService {
  private readonly api = inject(ApiService);
  private readonly statusState = signal<TrainingStatus | null>(null);
  private readonly loadingState = signal(true);
  private readonly errorState = signal('');

  readonly status = this.statusState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  load(): Observable<TrainingStatus> {
    this.loadingState.set(true);
    this.errorState.set('');

    return this.api.get<TrainingStatus>('/status', buildMockStatus).pipe(
      tap((status) => {
        this.statusState.set(status);
        this.loadingState.set(false);
      }),
      catchError((error: unknown) => {
        this.errorState.set('Impossibile caricare lo status runtime');
        this.loadingState.set(false);
        return throwError(() => error);
      }),
    );
  }
}
