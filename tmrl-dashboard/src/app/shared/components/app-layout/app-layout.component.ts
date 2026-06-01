import { Component, inject, signal } from '@angular/core';
import { takeUntilDestroyed } from '@angular/core/rxjs-interop';
import { NavigationEnd, Router, RouterLink, RouterLinkActive, RouterOutlet } from '@angular/router';
import {
  LucideActivity,
  LucideChartLine,
  LucideClock,
  LucideDatabase,
  LucideLayoutDashboard,
  LucideMenu,
  LucideSettings,
  LucideX,
} from '@lucide/angular';
import { filter } from 'rxjs';

import { ApiService } from '../../../core/services/api.service';
import { StatusPillComponent } from '../status-pill/status-pill.component';

@Component({
  selector: 'app-layout',
  standalone: true,
  imports: [
    RouterOutlet,
    RouterLink,
    RouterLinkActive,
    StatusPillComponent,
    LucideActivity,
    LucideChartLine,
    LucideClock,
    LucideDatabase,
    LucideLayoutDashboard,
    LucideMenu,
    LucideSettings,
    LucideX,
  ],
  template: `
    <div class="app-shell" [class.sidebar-open]="sidebarOpen()">
      <aside class="sidebar">
        <div class="brand">
          <div class="brand-mark">TM</div>
          <div>
            <strong>TMRL Dashboard</strong>
            <span>Trackmania RL</span>
          </div>
        </div>

        <nav class="nav-list" aria-label="Main navigation">
          <a routerLink="/dashboard" routerLinkActive="active" (click)="closeSidebar()">
            <svg lucideLayoutDashboard aria-hidden="true"></svg>
            <span>Dashboard</span>
          </a>
          <a routerLink="/metrics" routerLinkActive="active" (click)="closeSidebar()">
            <svg lucideChartLine aria-hidden="true"></svg>
            <span>Metrics</span>
          </a>
          <a routerLink="/checkpoints" routerLinkActive="active" (click)="closeSidebar()">
            <svg lucideDatabase aria-hidden="true"></svg>
            <span>Checkpoints</span>
          </a>
          <a routerLink="/sessions" routerLinkActive="active" (click)="closeSidebar()">
            <svg lucideClock aria-hidden="true"></svg>
            <span>Sessions</span>
          </a>
          <a routerLink="/settings" routerLinkActive="active" (click)="closeSidebar()">
            <svg lucideSettings aria-hidden="true"></svg>
            <span>Settings</span>
          </a>
        </nav>
      </aside>

      <div class="sidebar-backdrop" (click)="closeSidebar()"></div>

      <main class="main-panel">
        <header class="topbar">
          <button type="button" class="icon-button mobile-only" title="Menu" (click)="toggleSidebar()">
            @if (sidebarOpen()) {
              <svg lucideX aria-hidden="true"></svg>
            } @else {
              <svg lucideMenu aria-hidden="true"></svg>
            }
          </button>

          <div class="page-heading">
            <span>tmrl-dashboard</span>
            <h1>{{ routeTitle() }}</h1>
          </div>

          <div class="topbar-actions">
            @let connection = api.connectionState();
            <app-status-pill [status]="connection.status" [label]="connectionLabel()" />
            <svg lucideActivity class="topbar-activity" aria-hidden="true"></svg>
          </div>
        </header>

        <section class="content-area">
          <router-outlet />
        </section>
      </main>
    </div>
  `,
})
export class AppLayoutComponent {
  protected readonly api = inject(ApiService);
  protected readonly sidebarOpen = signal(false);
  protected readonly routeTitle = signal('Dashboard');

  private readonly router = inject(Router);
  private readonly titles = new Map([
    ['/dashboard', 'Dashboard'],
    ['/metrics', 'Metrics'],
    ['/checkpoints', 'Checkpoints'],
    ['/sessions', 'Sessions'],
    ['/settings', 'Settings'],
  ]);

  constructor() {
    this.router.events
      .pipe(
        filter((event): event is NavigationEnd => event instanceof NavigationEnd),
        takeUntilDestroyed(),
      )
      .subscribe(() => this.updateRouteTitle());

    this.updateRouteTitle();
  }

  protected toggleSidebar(): void {
    this.sidebarOpen.update((open) => !open);
  }

  protected closeSidebar(): void {
    this.sidebarOpen.set(false);
  }

  protected connectionLabel(): string {
    const connection = this.api.connectionState();

    if (connection.status === 'connected') {
      return 'API online';
    }

    if (connection.status === 'checking') {
      return 'Checking API';
    }

    return 'API offline';
  }

  private updateRouteTitle(): void {
    const activePath = [...this.titles.keys()].find((path) => this.router.url.startsWith(path));
    this.routeTitle.set(activePath ? this.titles.get(activePath) ?? 'Dashboard' : 'Dashboard');
  }
}
