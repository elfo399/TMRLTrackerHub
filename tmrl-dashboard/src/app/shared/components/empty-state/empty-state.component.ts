import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-empty-state',
  standalone: true,
  template: `
    <div class="state-block state-muted">
      <span class="empty-dot"></span>
      <span>{{ message }}</span>
    </div>
  `,
})
export class EmptyStateComponent {
  @Input() message = 'Nessun dato disponibile';
}
