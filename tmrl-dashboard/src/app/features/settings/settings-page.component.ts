import { Component, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { LucideCheck, LucideRefreshCw, LucideSave } from '@lucide/angular';

import { HealthService } from '../../core/services/health.service';
import { SettingsService, defaultSettings } from '../../core/services/settings.service';

@Component({
  selector: 'app-settings-page',
  standalone: true,
  imports: [ReactiveFormsModule, LucideCheck, LucideRefreshCw, LucideSave],
  template: `
    <div class="page-stack">
      <div class="section-toolbar">
        <div>
          <p class="eyebrow">Settings</p>
          <h2>API configuration</h2>
        </div>
        @if (saved()) {
          <span class="saved-pill">
            <svg lucideCheck aria-hidden="true"></svg>
            Saved
          </span>
        }
      </div>

      <form class="settings-form panel" [formGroup]="form" (ngSubmit)="save()">
        <label class="field">
          <span>Backend API endpoint</span>
          <input type="url" formControlName="apiUrl" placeholder="/api" />
          @if (form.controls.apiUrl.invalid && form.controls.apiUrl.touched) {
            <small>Endpoint richiesto</small>
          }
        </label>

        <label class="field">
          <span>API token</span>
          <input type="password" formControlName="apiToken" autocomplete="off" />
        </label>

        <label class="field">
          <span>Refresh interval</span>
          <input type="number" min="1" max="120" formControlName="refreshIntervalSeconds" />
          @if (form.controls.refreshIntervalSeconds.invalid && form.controls.refreshIntervalSeconds.touched) {
            <small>Valore ammesso: 1-120 secondi</small>
          }
        </label>

        <label class="toggle-field">
          <input type="checkbox" formControlName="useMockData" />
          <span></span>
          <strong>Use mock data</strong>
        </label>

        <div class="form-actions">
          <button type="submit" class="button" [disabled]="form.invalid">
            <svg lucideSave aria-hidden="true"></svg>
            Save
          </button>
          <button type="button" class="button button-secondary" (click)="reset()">
            <svg lucideRefreshCw aria-hidden="true"></svg>
            Reset
          </button>
          <button type="button" class="button button-secondary" (click)="testConnection()">
            <svg lucideCheck aria-hidden="true"></svg>
            Test
          </button>
        </div>
      </form>

      @if (testMessage()) {
        <div class="notice">{{ testMessage() }}</div>
      }
    </div>
  `,
})
export class SettingsPageComponent {
  private readonly fb = inject(FormBuilder);
  private readonly settings = inject(SettingsService);
  private readonly health = inject(HealthService);

  protected readonly saved = signal(false);
  protected readonly testMessage = signal('');

  protected readonly form = this.fb.nonNullable.group({
    apiUrl: [this.settings.getSnapshot().apiUrl, [Validators.required]],
    apiToken: [this.settings.getSnapshot().apiToken],
    refreshIntervalSeconds: [
      this.settings.getSnapshot().refreshIntervalSeconds,
      [Validators.required, Validators.min(1), Validators.max(120)],
    ],
    useMockData: [this.settings.getSnapshot().useMockData],
  });

  protected save(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.settings.save(this.form.getRawValue());
    this.saved.set(true);
    this.testMessage.set('');
    window.setTimeout(() => this.saved.set(false), 1800);
  }

  protected reset(): void {
    this.settings.reset();
    this.form.setValue(defaultSettings);
    this.saved.set(false);
    this.testMessage.set('Settings ripristinati');
  }

  protected testConnection(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    this.settings.save(this.form.getRawValue());
    this.testMessage.set('Checking...');

    this.health.load().subscribe({
      next: () => this.testMessage.set(this.form.controls.useMockData.value ? 'Mock API attiva' : 'API raggiungibile'),
      error: () => this.testMessage.set('API non raggiungibile'),
    });
  }
}
