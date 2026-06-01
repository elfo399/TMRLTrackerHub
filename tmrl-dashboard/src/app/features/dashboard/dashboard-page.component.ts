import { CommonModule } from '@angular/common';
import { Component, OnInit, computed, inject } from '@angular/core';
import {
  LucideBot,
  LucideClock,
  LucideCpu,
  LucideHardDrive,
  LucideRefreshCw,
  LucideServer,
  LucideStar,
} from '@lucide/angular';

import { StatusService } from '../../core/services/status.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';
import { StatusPillComponent } from '../../shared/components/status-pill/status-pill.component';

@Component({
  selector: 'app-dashboard-page',
  standalone: true,
  imports: [
    CommonModule,
    EmptyStateComponent,
    ErrorStateComponent,
    LoadingStateComponent,
    StatusPillComponent,
    LucideBot,
    LucideClock,
    LucideCpu,
    LucideHardDrive,
    LucideRefreshCw,
    LucideServer,
    LucideStar,
  ],
  template: `
    <div class="page-stack">
      <div class="section-toolbar">
        <div>
          <p class="eyebrow">Overview</p>
          <h2>Training runtime</h2>
        </div>
        <button type="button" class="button button-secondary" (click)="load()">
          <svg lucideRefreshCw aria-hidden="true"></svg>
          Refresh
        </button>
      </div>

      @if (loading()) {
        <app-loading-state message="Caricamento status" />
      } @else if (error()) {
        <app-error-state [message]="error()" (retry)="load()" />
      } @else if (!status()) {
        <app-empty-state message="Status non disponibile" />
      } @else {
        @let runtime = status()!;

        <section class="status-grid">
          @for (service of runtime.services; track service.name) {
            <article class="panel service-panel">
              <div class="service-panel__icon">
                @if (service.name === 'Server') {
                  <svg lucideServer aria-hidden="true"></svg>
                } @else if (service.name === 'Trainer') {
                  <svg lucideCpu aria-hidden="true"></svg>
                } @else {
                  <svg lucideBot aria-hidden="true"></svg>
                }
              </div>
              <div>
                <div class="card-row">
                  <h3>{{ service.name }}</h3>
                  <app-status-pill [status]="service.status" [label]="service.status" />
                </div>
                <p>{{ service.detail }}</p>
                <span class="muted">{{ service.latencyMs }} ms | heartbeat {{ service.lastHeartbeat | date: 'HH:mm:ss' }}</span>
              </div>
            </article>
          }
        </section>

        <section class="metric-grid">
          <article class="metric-card">
            <span>Training</span>
            <strong>{{ runtime.trainingActive ? 'Attivo' : 'Non attivo' }}</strong>
            <app-status-pill
              [status]="runtime.trainingActive ? 'active' : 'inactive'"
              [label]="runtime.trainingActive ? 'running' : 'idle'"
            />
          </article>
          <article class="metric-card">
            <span>Best reward</span>
            <strong>{{ runtime.bestReward | number: '1.2-2' }}</strong>
            <svg lucideStar aria-hidden="true"></svg>
          </article>
          <article class="metric-card">
            <span>Current reward</span>
            <strong>{{ runtime.currentReward | number: '1.2-2' }}</strong>
            <span class="metric-delta">live</span>
          </article>
          <article class="metric-card">
            <span>Memory size</span>
            <strong>{{ runtime.memorySize | number }}</strong>
            <svg lucideHardDrive aria-hidden="true"></svg>
          </article>
          <article class="metric-card">
            <span>Uptime</span>
            <strong>{{ uptimeLabel() }}</strong>
            <svg lucideClock aria-hidden="true"></svg>
          </article>
          <article class="metric-card">
            <span>Episodes</span>
            <strong>{{ runtime.episodesCompleted | number }}</strong>
            <span class="metric-delta">done</span>
          </article>
        </section>

        <section class="panel checkpoint-summary">
          <div>
            <p class="eyebrow">Latest checkpoint</p>
            <h3>{{ runtime.latestCheckpoint }}</h3>
          </div>
          <span>updated {{ runtime.updatedAt | date: 'HH:mm:ss' }}</span>
        </section>
      }
    </div>
  `,
})
export class DashboardPageComponent implements OnInit {
  private readonly statusService = inject(StatusService);

  protected readonly status = this.statusService.status;
  protected readonly loading = this.statusService.loading;
  protected readonly error = this.statusService.error;
  protected readonly uptimeLabel = computed(() => this.formatDuration(this.status()?.uptimeSeconds ?? 0));

  ngOnInit(): void {
    this.load();
  }

  protected load(): void {
    this.statusService.load().subscribe({ error: () => undefined });
  }

  private formatDuration(seconds: number): string {
    const hours = Math.floor(seconds / 3600);
    const minutes = Math.floor((seconds % 3600) / 60);
    return `${hours}h ${minutes}m`;
  }
}
