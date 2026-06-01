import { Injectable, inject, signal } from '@angular/core';
import { Observable, catchError, map, tap, throwError } from 'rxjs';

import { buildMockActionResult, buildMockCheckpoints } from '../mock/mock-data';
import { Checkpoint, CheckpointActionResult, CheckpointsResponseDto } from '../models';
import { ApiService } from './api.service';

@Injectable({ providedIn: 'root' })
export class CheckpointService {
  private readonly api = inject(ApiService);
  private readonly checkpointsState = signal<Checkpoint[]>([]);
  private readonly loadingState = signal(true);
  private readonly errorState = signal('');
  private readonly actionMessageState = signal('');

  readonly checkpoints = this.checkpointsState.asReadonly();
  readonly loading = this.loadingState.asReadonly();
  readonly error = this.errorState.asReadonly();
  readonly actionMessage = this.actionMessageState.asReadonly();

  load(): Observable<CheckpointsResponseDto> {
    this.loadingState.set(true);
    this.errorState.set('');
    this.actionMessageState.set('');

    return this.api.get<CheckpointsResponseDto>('/checkpoints', buildMockCheckpoints).pipe(
      tap((response) => {
        this.checkpointsState.set(response.items);
        this.loadingState.set(false);
      }),
      catchError((error: unknown) => {
        this.errorState.set('Impossibile caricare i checkpoint');
        this.loadingState.set(false);
        return throwError(() => error);
      }),
    );
  }

  downloadCheckpoint(id: string): Observable<CheckpointActionResult> {
    return this.api
      .download(
        `/checkpoints/${id}/download`,
        () => new Blob([`mock checkpoint payload for ${id}`], { type: 'application/octet-stream' }),
      )
      .pipe(
        map(() => buildMockActionResult(id, 'downloaded', 'Download mock completato')),
        tap((result) => this.actionMessageState.set(result.message)),
      );
  }

  markCheckpointAsLatest(id: string): Observable<CheckpointActionResult> {
    return this.api
      .post<Record<string, never>, CheckpointActionResult>(
        `/checkpoints/${id}/latest`,
        {},
        () => buildMockActionResult(id, 'marked-latest', 'Checkpoint marcato come latest'),
      )
      .pipe(
        tap((result) => {
          this.checkpointsState.update((items) => items.map((item) => ({ ...item, isLatest: item.id === id })));
          this.actionMessageState.set(result.message);
        }),
      );
  }

  deleteCheckpoint(id: string): Observable<CheckpointActionResult> {
    return this.api
      .delete<CheckpointActionResult>(
        `/checkpoints/${id}`,
        () => buildMockActionResult(id, 'deleted', 'Checkpoint eliminato dai mock'),
      )
      .pipe(
        tap((result) => {
          this.checkpointsState.update((items) => items.filter((item) => item.id !== id));
          this.actionMessageState.set(result.message);
        }),
      );
  }
}
