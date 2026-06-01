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
    const checkpoint = this.checkpointsState().find((item) => item.id === id);
    const fileName = checkpoint?.fileName ?? `${id}.bin`;

    return this.api
      .download(
        `/checkpoints/${id}/download`,
        () => new Blob([`mock checkpoint payload for ${id}`], { type: 'application/octet-stream' }),
      )
      .pipe(
        tap((blob) => this.saveBlob(blob, fileName)),
        map(() => buildMockActionResult(id, 'downloaded', `Download avviato: ${fileName}`)),
        tap((result) => this.actionMessageState.set(result.message)),
        catchError((error: unknown) => {
          this.actionMessageState.set('Download non riuscito');
          return throwError(() => error);
        }),
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

  private saveBlob(blob: Blob, fileName: string): void {
    if (typeof document === 'undefined' || typeof URL === 'undefined') {
      return;
    }

    const objectUrl = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = objectUrl;
    anchor.download = fileName;
    anchor.rel = 'noopener';
    document.body.appendChild(anchor);
    anchor.click();
    anchor.remove();
    URL.revokeObjectURL(objectUrl);
  }
}
