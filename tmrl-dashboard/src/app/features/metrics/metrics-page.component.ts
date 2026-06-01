import { CommonModule } from '@angular/common';
import { Component, inject } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { LucideRefreshCw } from '@lucide/angular';
import { EMPTY, catchError, switchMap, timer } from 'rxjs';

import { MetricsService } from '../../core/services/metrics.service';
import { EmptyStateComponent } from '../../shared/components/empty-state/empty-state.component';
import { ErrorStateComponent } from '../../shared/components/error-state/error-state.component';
import { LineChartComponent } from '../../shared/components/line-chart/line-chart.component';
import { LoadingStateComponent } from '../../shared/components/loading-state/loading-state.component';

@Component({
  selector: 'app-metrics-page',
  standalone: true,
  imports: [CommonModule, EmptyStateComponent, ErrorStateComponent, LineChartComponent, LoadingStateComponent, LucideRefreshCw],
  template: `
    <div class="page-stack">
      <div class="section-toolbar">
        <div>
          <p class="eyebrow">Metrics</p>
          <h2>Training signals</h2>
        </div>
        <button type="button" class="button button-secondary" (click)="manualRefresh()">
          <svg lucideRefreshCw aria-hidden="true"></svg>
          Refresh
        </button>
      </div>

      <div class="refresh-strip">
        <span>Auto refresh {{ refreshSeconds }}s</span>
        @if (metrics()) {
          <span>updated {{ metrics()?.updatedAt | date: 'HH:mm:ss' }}</span>
        }
      </div>

      @if (loading()) {
        <app-loading-state message="Caricamento metriche" />
      } @else if (error()) {
        <app-error-state [message]="error()" (retry)="manualRefresh()" />
      } @else if (!metrics()) {
        <app-empty-state message="Metriche non disponibili" />
      } @else {
        @let data = metrics()!;
        <section class="charts-grid">
          <app-line-chart title="Reward" [points]="data.reward" color="#3dd6b2" />
          <app-line-chart title="Episode length" [points]="data.episodeLength" color="#f6c659" suffix=" steps" />
          <app-line-chart title="Actor loss" [points]="data.actorLoss" color="#7dd3fc" />
          <app-line-chart title="Critic loss" [points]="data.criticLoss" color="#f87171" />
          <app-line-chart title="Memory length" [points]="data.memoryLength" color="#a3e635" />
        </section>
      }
    </div>
  `,
})
export class MetricsPageComponent {
  private readonly metricsService = inject(MetricsService);

  protected readonly metrics = this.metricsService.metrics;
  protected readonly loading = this.metricsService.loading;
  protected readonly error = this.metricsService.error;
  protected readonly refreshSeconds = this.metricsService.refreshIntervalSeconds;

  constructor() {
    timer(0, this.refreshSeconds * 1000)
      .pipe(
        switchMap(() => this.loadMetrics()),
        takeUntilDestroyed(),
      )
      .subscribe();
  }

  protected manualRefresh(): void {
    this.metricsService.load().subscribe({ error: () => undefined });
  }

  private loadMetrics() {
    return this.metricsService.load().pipe(catchError(() => EMPTY));
  }
}
