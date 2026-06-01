import { CommonModule } from '@angular/common';
import { Component, OnInit, inject } from '@angular/core';
import { LucideDownload, LucideRefreshCw, LucideStar, LucideTrash2 } from '@lucide/angular';

import { CheckpointService } from '../../core/services/checkpoint.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';

@Component({
  selector: 'app-checkpoints-page',
  standalone: true,
  imports: [
    CommonModule,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    LucideDownload,
    LucideRefreshCw,
    LucideStar,
    LucideTrash2,
  ],
  template: `
    <div class="page-stack">
      <div class="section-toolbar">
        <div>
          <p class="eyebrow">Checkpoints</p>
          <h2>Saved policies</h2>
        </div>
        <button type="button" class="button button-secondary" (click)="load()">
          <svg lucideRefreshCw aria-hidden="true"></svg>
          Refresh
        </button>
      </div>

      @if (actionMessage()) {
        <div class="notice">{{ actionMessage() }}</div>
      }

      @if (loading()) {
        <app-loading-state message="Caricamento checkpoint" />
      } @else if (error()) {
        <app-error-state [message]="error()" (retry)="load()" />
      } @else if (checkpoints().length === 0) {
        <app-empty-state message="Nessun checkpoint disponibile" />
      } @else {
        <section class="table-panel">
          <div class="responsive-table">
            <table>
              <thead>
                <tr>
                  <th>File</th>
                  <th>Created</th>
                  <th>Size</th>
                  <th>Reward</th>
                  <th>Latest</th>
                  <th class="actions-cell">Actions</th>
                </tr>
              </thead>
              <tbody>
                @for (checkpoint of checkpoints(); track checkpoint.id) {
                  <tr>
                    <td>
                      <strong>{{ checkpoint.fileName }}</strong>
                    </td>
                    <td>{{ checkpoint.createdAt | date: 'yyyy-MM-dd HH:mm' }}</td>
                    <td>{{ formatBytes(checkpoint.sizeBytes) }}</td>
                    <td>{{ checkpoint.reward | number: '1.2-2' }}</td>
                    <td>
                      <span class="latest-marker" [class.active]="checkpoint.isLatest">
                        {{ checkpoint.isLatest ? 'latest' : '-' }}
                      </span>
                    </td>
                    <td class="actions-cell">
                      <button type="button" class="icon-text-button" title="Download" (click)="download(checkpoint.id)">
                        <svg lucideDownload aria-hidden="true"></svg>
                        Download
                      </button>
                      <button
                        type="button"
                        class="icon-text-button"
                        title="Mark as latest"
                        (click)="markAsLatest(checkpoint.id)"
                      >
                        <svg lucideStar aria-hidden="true"></svg>
                        Mark as latest
                      </button>
                      <button type="button" class="icon-text-button danger" title="Delete" (click)="delete(checkpoint.id)">
                        <svg lucideTrash2 aria-hidden="true"></svg>
                        Delete
                      </button>
                    </td>
                  </tr>
                }
              </tbody>
            </table>
          </div>
        </section>
      }
    </div>
  `,
})
export class CheckpointsPageComponent implements OnInit {
  private readonly checkpointService = inject(CheckpointService);

  protected readonly checkpoints = this.checkpointService.checkpoints;
  protected readonly loading = this.checkpointService.loading;
  protected readonly error = this.checkpointService.error;
  protected readonly actionMessage = this.checkpointService.actionMessage;

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.checkpointService.load().subscribe({ error: () => undefined });
  }

  protected download(id: string): void {
    this.checkpointService.downloadCheckpoint(id).subscribe();
  }

  protected markAsLatest(id: string): void {
    this.checkpointService.markCheckpointAsLatest(id).subscribe();
  }

  protected delete(id: string): void {
    this.checkpointService.deleteCheckpoint(id).subscribe();
  }

  protected formatBytes(bytes: number): string {
    const megabytes = bytes / 1024 / 1024;
    return `${megabytes.toFixed(1)} MB`;
  }
}
