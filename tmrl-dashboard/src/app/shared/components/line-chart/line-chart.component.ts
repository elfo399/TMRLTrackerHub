import { AfterViewInit, Component, ElementRef, Input, OnChanges, OnDestroy, ViewChild } from '@angular/core';
import {
  CategoryScale,
  Chart,
  ChartData,
  ChartOptions,
  Filler,
  Legend,
  LinearScale,
  LineElement,
  PointElement,
  Tooltip,
} from 'chart.js';

import { MetricPoint } from '../../../core/models';

Chart.register(CategoryScale, LinearScale, PointElement, LineElement, Filler, Tooltip, Legend);

@Component({
  selector: 'app-line-chart',
  standalone: true,
  template: `
    <section class="chart-panel">
      <div class="chart-panel__header">
        <h2>{{ title }}</h2>
        <span>{{ points.length }} pts</span>
      </div>
      <div class="chart-frame">
        <canvas #canvas></canvas>
      </div>
    </section>
  `,
})
export class LineChartComponent implements AfterViewInit, OnChanges, OnDestroy {
  @Input() title = '';
  @Input() points: MetricPoint[] = [];
  @Input() color = '#3dd6b2';
  @Input() suffix = '';

  @ViewChild('canvas') private canvasRef?: ElementRef<HTMLCanvasElement>;

  private chart?: Chart<'line'>;
  private readonly timeFormatter = new Intl.DateTimeFormat('it-IT', {
    hour: '2-digit',
    minute: '2-digit',
  });

  ngAfterViewInit(): void {
    this.render();
  }

  ngOnChanges(): void {
    this.render();
  }

  ngOnDestroy(): void {
    this.chart?.destroy();
  }

  private render(): void {
    if (!this.canvasRef) {
      return;
    }

    const data = this.chartData();

    if (this.chart) {
      this.chart.data = data;
      this.chart.options = this.chartOptions();
      this.chart.update();
      return;
    }

    this.chart = new Chart(this.canvasRef.nativeElement, {
      type: 'line',
      data,
      options: this.chartOptions(),
    });
  }

  private chartData(): ChartData<'line'> {
    return {
      labels: this.points.map((point) => this.timeFormatter.format(new Date(point.timestamp))),
      datasets: [
        {
          label: this.title,
          data: this.points.map((point) => point.value),
          borderColor: this.color,
          backgroundColor: this.withAlpha(this.color, 0.13),
          borderWidth: 2,
          fill: true,
          pointRadius: 0,
          pointHoverRadius: 4,
          tension: 0.35,
        },
      ],
    };
  }

  private chartOptions(): ChartOptions<'line'> {
    return {
      responsive: true,
      maintainAspectRatio: false,
      interaction: {
        mode: 'index',
        intersect: false,
      },
      plugins: {
        legend: {
          display: false,
        },
        tooltip: {
          callbacks: {
            label: (context) => `${context.dataset.label}: ${context.parsed.y}${this.suffix}`,
          },
        },
      },
      scales: {
        x: {
          grid: { color: 'rgba(255,255,255,0.05)' },
          ticks: { color: '#9da7b3', maxTicksLimit: 6 },
        },
        y: {
          grid: { color: 'rgba(255,255,255,0.08)' },
          ticks: { color: '#9da7b3' },
        },
      },
    };
  }

  private withAlpha(hexColor: string, alpha: number): string {
    const hex = hexColor.replace('#', '');

    if (hex.length !== 6) {
      return `rgba(61, 214, 178, ${alpha})`;
    }

    const red = parseInt(hex.slice(0, 2), 16);
    const green = parseInt(hex.slice(2, 4), 16);
    const blue = parseInt(hex.slice(4, 6), 16);

    return `rgba(${red}, ${green}, ${blue}, ${alpha})`;
  }
}
