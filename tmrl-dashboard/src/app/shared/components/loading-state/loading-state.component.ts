import { Component, Input } from '@angular/core';

@Component({
  selector: 'app-loading-state',
  standalone: true,
  template: `
    <div class="state-block">
      <span class="spinner"></span>
      <span>{{ message }}</span>
    </div>
  `,
})
export class LoadingStateComponent {
  @Input() message = 'Caricamento';
}
