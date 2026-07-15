import {
  ChangeDetectionStrategy,
  Component,
  ElementRef,
  OnInit,
  computed,
  inject,
  signal,
} from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChartConfiguration, ChartData, Chart, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { EventoMetrics } from '../../../core/models/evento.model';
import { EventService } from '../../../core/services/event.service';

Chart.register(...registerables);

const DIA_SEMANA_ORDER = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

@Component({
  selector: 'app-metricas',
  imports: [MatCardModule, MatIconModule, MatProgressSpinnerModule, BaseChartDirective],
  templateUrl: './metricas.html',
  styleUrl: './metricas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Metricas implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly elementRef = inject(ElementRef<HTMLElement>);

  readonly metrics = signal<EventoMetrics | null>(null);
  readonly metricsLoading = signal(false);

  private readVar(name: string, fallback: string): string {
    const value = getComputedStyle(this.elementRef.nativeElement).getPropertyValue(name).trim();
    return value || fallback;
  }

  private palette(index: number): string {
    return this.readVar(`--chart-series-${index}`, '#2a78d6');
  }

  private get seriesPalette(): string[] {
    return [1, 2, 3, 4, 5, 6, 7, 8].map((index) => this.palette(index));
  }

  private get chartSurface(): string {
    return this.readVar('--chart-surface', '#fcfcfb');
  }

  private get gridColor(): string {
    return this.readVar('--chart-grid', '#e1e0d9');
  }

  private get axisColor(): string {
    return this.readVar('--chart-axis', '#898781');
  }

  readonly diaSemanaChart = computed<ChartData<'bar'>>(() => {
    const data = this.metrics()?.por_dia_semana ?? [];
    const sorted = [...data].sort(
      (a, b) => DIA_SEMANA_ORDER.indexOf(a.dia_semana) - DIA_SEMANA_ORDER.indexOf(b.dia_semana),
    );
    return {
      labels: sorted.map((item) => item.dia_semana),
      datasets: [
        {
          label: 'Eventos',
          data: sorted.map((item) => item.total),
          backgroundColor: this.palette(1),
          borderRadius: 4,
          maxBarThickness: 24,
        },
      ],
    };
  });

  readonly periodoChart = computed<ChartData<'doughnut'>>(() => {
    const data = this.metrics()?.por_periodo ?? [];
    return {
      labels: data.map((item) => item.periodo),
      datasets: [
        {
          data: data.map((item) => item.total),
          backgroundColor: this.seriesPalette,
          borderColor: this.chartSurface,
          borderWidth: 2,
        },
      ],
    };
  });

  readonly modalidadeChart = computed<ChartData<'pie'>>(() => {
    const data = this.metrics()?.por_modalidade ?? [];
    return {
      labels: data.map((item) => item.modalidade),
      datasets: [
        {
          data: data.map((item) => item.total),
          backgroundColor: this.seriesPalette,
          borderColor: this.chartSurface,
          borderWidth: 2,
        },
      ],
    };
  });

  readonly statusChart = computed<ChartData<'doughnut'>>(() => {
    const data = this.metrics()?.por_status ?? [];
    return {
      labels: data.map((item) => item.status),
      datasets: [
        {
          data: data.map((item) => item.total),
          backgroundColor: this.seriesPalette,
          borderColor: this.chartSurface,
          borderWidth: 2,
        },
      ],
    };
  });

  readonly cidadeChart = computed<ChartData<'bar'>>(() => {
    const data = this.metrics()?.por_cidade ?? [];
    return {
      labels: data.map((item) => (item.estado ? `${item.cidade}/${item.estado}` : item.cidade)),
      datasets: [
        {
          label: 'Eventos',
          data: data.map((item) => item.total),
          backgroundColor: this.palette(2),
          borderRadius: 4,
          maxBarThickness: 24,
        },
      ],
    };
  });

  readonly tagsChart = computed<ChartData<'bar'>>(() => {
    const data = this.metrics()?.top_tags ?? [];
    return {
      labels: data.map((item) => item.nome),
      datasets: [
        {
          label: 'Eventos',
          data: data.map((item) => item.total),
          backgroundColor: data.map((item) => item.cor),
          borderRadius: 4,
          maxBarThickness: 24,
        },
      ],
    };
  });

  readonly evolucaoMensalChart = computed<ChartData<'line'>>(() => {
    const data = this.metrics()?.evolucao_mensal ?? [];
    const color = this.palette(1);
    return {
      labels: data.map((item) => item.ano_mes),
      datasets: [
        {
          label: 'Eventos',
          data: data.map((item) => item.total),
          borderColor: color,
          backgroundColor: color,
          pointBackgroundColor: color,
          pointBorderColor: this.chartSurface,
          pointBorderWidth: 2,
          pointRadius: 4,
          borderWidth: 2,
          tension: 0.3,
          fill: false,
        },
      ],
    };
  });

  get horizontalBarOptions(): ChartConfiguration['options'] {
    return {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { color: this.gridColor }, ticks: { color: this.axisColor } },
        y: { grid: { display: false }, ticks: { color: this.axisColor } },
      },
    };
  }

  get barOptions(): ChartConfiguration['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: this.axisColor } },
        y: { grid: { color: this.gridColor }, ticks: { color: this.axisColor } },
      },
    };
  }

  get pieOptions(): ChartConfiguration['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { position: 'bottom', labels: { color: this.axisColor } } },
    };
  }

  get lineOptions(): ChartConfiguration['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: { legend: { display: false } },
      scales: {
        x: { grid: { display: false }, ticks: { color: this.axisColor } },
        y: { grid: { color: this.gridColor }, ticks: { color: this.axisColor } },
      },
    };
  }

  ngOnInit(): void {
    this.loadMetrics();
  }

  private loadMetrics(): void {
    this.metricsLoading.set(true);
    this.eventService.getEventMetrics().subscribe({
      next: (metrics) => {
        this.metrics.set(metrics);
        this.metricsLoading.set(false);
      },
      error: () => this.metricsLoading.set(false),
    });
  }
}
