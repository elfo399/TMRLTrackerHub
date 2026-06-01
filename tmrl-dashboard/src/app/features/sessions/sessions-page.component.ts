import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { LucideEye, LucideRefreshCw } from '@lucide/angular';

import { SessionService } from '../../core/services/session.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { StatusPillComponent } from '../../shared/components/status-pill/status-pill.component';

@Component({
  selector: 'app-sessions-page',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent, ErrorStateComponent, LoadingStateComponent, StatusPillComponent, LucideEye, LucideRefreshCw],
  template: `
    <div class="page-stack">
      <div class="section-toolbar">
        <div>
          <p class="eyebrow">Sessions</p>
          <h2>Training history</h2>
        </div>
        <button type="button" class="button button-secondary" (click)="load()">
          <svg lucideRefreshCw aria-hidden="true"></svg>
          Refresh
        </button>
      </div>

      @if (loading()) {
        <app-loading-state message="Caricamento sessioni" />
      } @else if (error()) {
        <app-error-state [message]="error()" (retry)="load()" />
      } @else if (sessions().length === 0) {
        <app-empty-state message="Nessuna sessione disponibile" />
      } @else {
        <div class="split-layout">
          <section class="table-panel">
            <div class="responsive-table">
              <table>
                <thead>
                  <tr>
                    <th>Start</th>
                    <th>End</th>
                    <th>Duration</th>
                    <th>Best reward</th>
                    <th>Status</th>
                    <th class="actions-cell">Detail</th>
                  </tr>
                </thead>
                <tbody>
                  @for (session of sessions(); track session.id) {
                    <tr [class.selected-row]="selectedSessionId() === session.id">
                      <td>{{ session.startTime | date: 'yyyy-MM-dd HH:mm' }}</td>
                      <td>{{ session.endTime ? (session.endTime | date: 'yyyy-MM-dd HH:mm') : 'running' }}</td>
                      <td>{{ formatDuration(session.durationSeconds) }}</td>
                      <td>{{ session.bestReward | number: '1.2-2' }}</td>
                      <td>
                        <app-status-pill [status]="session.status" [label]="session.status" />
                      </td>
                      <td class="actions-cell">
                        <button type="button" class="icon-text-button" title="View detail" (click)="selectSession(session.id)">
                          <svg lucideEye aria-hidden="true"></svg>
                          Detail
                        </button>
                      </td>
                    </tr>
                  }
                </tbody>
              </table>
            </div>
          </section>

          @if (selectedSession(); as session) {
            <aside class="panel detail-panel">
              <div class="card-row">
                <div>
                  <p class="eyebrow">Session detail</p>
                  <h3>{{ session.id }}</h3>
                </div>
                <app-status-pill [status]="session.status" [label]="session.status" />
              </div>

              <dl class="detail-list">
                <div>
                  <dt>Duration</dt>
                  <dd>{{ formatDuration(session.durationSeconds) }}</dd>
                </div>
                <div>
                  <dt>Total episodes</dt>
                  <dd>{{ session.totalEpisodes | number }}</dd>
                </div>
                <div>
                  <dt>Average reward</dt>
                  <dd>{{ session.averageReward | number: '1.2-2' }}</dd>
                </div>
                <div>
                  <dt>Checkpoints</dt>
                  <dd>{{ session.checkpointCount }}</dd>
                </div>
              </dl>

              <p class="detail-note">{{ session.notes }}</p>
            </aside>
          }
        </div>
      }
    </div>
  `,
})
export class SessionsPageComponent implements OnInit {
  private readonly sessionService = inject(SessionService);

  protected readonly sessions = this.sessionService.sessions;
  protected readonly selectedSessionId = signal('');
  protected readonly loading = this.sessionService.loading;
  protected readonly error = this.sessionService.error;
  protected readonly selectedSession = computed(
    () => this.sessions().find((session) => session.id === this.selectedSessionId()) ?? null,
  );

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.sessionService.load().subscribe({
      next: (response) => {
        this.selectedSessionId.set(this.selectedSessionId() || response.activeSessionId || response.items[0]?.id || '');
      },
      error: () => undefined,
    });
  }

  protected selectSession(id: string): void {
    this.selectedSessionId.set(id);
  }

  protected formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}
