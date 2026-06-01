import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, tap, throwError } from 'rxjs';

import { buildMockSessions } from '../mock/mock-data';
import { SessionsResponseDto, TrainingSession } from '../models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class SessionService {
  private readonly api = inject(ApiService);
  private readonly sessionsState = signal<TrainingSession[]>([]);
  private readonly loadingState = signal(true);
  private readonly errorState = signal('');

  readonly sessions = this.sessionsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();

  load(): Observable<SessionsResponseDto> {
    this.loadingState.set(true);
    this.errorState.set('');

    return this.api.get<SessionsResponseDto>('/sessions', buildMockSessions).pipe(
      tap((response) => {
        this.sessionsState.set(response.items);
        this.loadingState.set(false);
      }),
      catchError((error: unknown) => {
        this.errorState.set('Impossibile caricare le sessioni');
        this.loadingState.set(false);
        return throwError(() => error);
      }),
    );
  }
}
