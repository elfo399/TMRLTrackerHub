import { Component, EventEmitter, Input, Output } from '@angular/core';
import { LucideRefreshCw } from '@lucide/angular';

@Component({
  selector: 'app-error-state',
  standalone: true,
  imports: [LucideRefreshCw],
  template: `
    <div class="state-block state-error">
      <span>{{ message }}</span>
      @if (showRetry) {
        <button type="button" class="icon-button" title="Retry" (click)="retry.emit()">
          <svg lucideRefreshCw aria-hidden="true"></svg>
        </button>
      }
    </div>
  `,
})
export class ErrorStateComponent {
  @Input() message = 'Errore durante il caricamento';
  @Input() showRetry = true;
  @Output() retry = new EventEmitter<void>();
}
