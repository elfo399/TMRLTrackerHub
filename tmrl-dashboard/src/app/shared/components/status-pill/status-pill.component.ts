import { CommonModule } from '@angular/common';
import { Component, Input } from '@angular/core';

import { ApiConnectionStatus, ServiceStatus, TrainingSessionStatus } from '../../../core/models';

type PillStatus = ServiceStatus | TrainingSessionStatus | ApiConnectionStatus | 'active' | 'inactive';

@Component({
  selector: 'app-status-pill',
  standalone: true,
  imports: [CommonModule],
  template: `
    <span class="status-pill" [ngClass]="statusClass">
      <span class="status-dot"></span>
      {{ label || status }}
    </span>
  `,
})
export class StatusPillComponent {
  @Input() status: PillStatus = 'offline';
  @Input() label = '';

  get statusClass(): string {
    return `status-${this.status}`;
  }
}
