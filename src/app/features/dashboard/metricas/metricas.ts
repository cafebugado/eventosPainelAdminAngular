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
import { EventoMetrics, EventoStatus } from '../../../core/models/evento.model';
import { EventService } from '../../../core/services/event.service';

Chart.register(...registerables);

const STATUS_LABELS: Record<EventoStatus, string> = {
  publicado: 'Publicado',
  rascunho: 'Rascunho',
  arquivado: 'Arquivado',
  em_analise: 'Em análise',
  recusado: 'Recusado',
};

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
    return {
      labels: data.map((item) => item.dia_semana),
      datasets: [
        {
          label: 'Eventos',
          data: data.map((item) => item.total),
          backgroundColor: this.palette(1),
          borderRadius: 4,
          maxBarThickness: 24,
        },
      ],
    };
  });

  private readonly diaSemanaPercentuais = computed<number[]>(() => {
    const data = this.metrics()?.por_dia_semana ?? [];
    return data.map((item) => item.percentual);
  });

  private readonly periodoLabels: Record<string, string> = {
    Noturno: 'Noite',
    Diurno: 'Dia todo',
    Matinal: 'Manhã',
    Vespertino: 'Tarde',
  };

  private percentuaisOf(totals: number[]): number[] {
    const total = totals.reduce((sum, value) => sum + value, 0);
    return totals.map((value) => (total > 0 ? Math.round((value / total) * 1000) / 10 : 0));
  }

  private legendOf(
    labels: string[],
    totals: number[],
  ): { label: string; color: string; percentual: number }[] {
    const percentuais = this.percentuaisOf(totals);
    return labels.map((label, index) => ({
      label,
      color: this.palette(index + 1),
      percentual: percentuais[index] ?? 0,
    }));
  }

  private percentTooltipOptions(percentuais: number[]): ChartConfiguration['options'] {
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const percentual = percentuais[context.dataIndex] ?? 0;
              return `${context.label}: ${context.formattedValue} eventos (${percentual}%)`;
            },
          },
        },
      },
    };
  }

  readonly periodoChart = computed<ChartData<'doughnut'>>(() => {
    const data = this.metrics()?.por_periodo ?? [];
    return {
      labels: data.map((item) => this.periodoLabels[item.periodo] ?? item.periodo),
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

  private readonly periodoPercentuais = computed<number[]>(() =>
    this.percentuaisOf((this.metrics()?.por_periodo ?? []).map((item) => item.total)),
  );

  readonly periodoLegend = computed(() => {
    const data = this.metrics()?.por_periodo ?? [];
    return this.legendOf(
      data.map((item) => this.periodoLabels[item.periodo] ?? item.periodo),
      data.map((item) => item.total),
    );
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

  private readonly modalidadePercentuais = computed<number[]>(() =>
    this.percentuaisOf((this.metrics()?.por_modalidade ?? []).map((item) => item.total)),
  );

  readonly modalidadeLegend = computed(() => {
    const data = this.metrics()?.por_modalidade ?? [];
    return this.legendOf(
      data.map((item) => item.modalidade),
      data.map((item) => item.total),
    );
  });

  readonly statusChart = computed<ChartData<'doughnut'>>(() => {
    const data = this.metrics()?.por_status ?? [];
    return {
      labels: data.map((item) => STATUS_LABELS[item.status] ?? item.status),
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

  private readonly statusPercentuais = computed<number[]>(() =>
    this.percentuaisOf((this.metrics()?.por_status ?? []).map((item) => item.total)),
  );

  readonly statusLegend = computed(() => {
    const data = this.metrics()?.por_status ?? [];
    return this.legendOf(
      data.map((item) => STATUS_LABELS[item.status] ?? item.status),
      data.map((item) => item.total),
    );
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

  private readonly tagsPercentuais = computed<number[]>(() =>
    this.percentuaisOf((this.metrics()?.top_tags ?? []).map((item) => item.total)),
  );

  private readonly cidadePercentuais = computed<number[]>(() =>
    this.percentuaisOf((this.metrics()?.por_cidade ?? []).map((item) => item.total)),
  );

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

  private readonly evolucaoMensalPercentuais = computed<number[]>(() =>
    this.percentuaisOf((this.metrics()?.evolucao_mensal ?? []).map((item) => item.total)),
  );

  private horizontalBarOptionsWithPercent(percentuais: number[]): ChartConfiguration['options'] {
    return {
      indexAxis: 'y',
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const percentual = percentuais[context.dataIndex] ?? 0;
              return `${context.formattedValue} eventos (${percentual}%)`;
            },
          },
        },
      },
      scales: {
        x: { grid: { color: this.gridColor }, ticks: { color: this.axisColor } },
        y: { grid: { display: false }, ticks: { color: this.axisColor } },
      },
    };
  }

  get tagsOptions(): ChartConfiguration['options'] {
    return this.horizontalBarOptionsWithPercent(this.tagsPercentuais());
  }

  get cidadeOptions(): ChartConfiguration['options'] {
    return this.horizontalBarOptionsWithPercent(this.cidadePercentuais());
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

  get diaSemanaOptions(): ChartConfiguration['options'] {
    const percentuais = this.diaSemanaPercentuais();
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const percentual = percentuais[context.dataIndex] ?? 0;
              return `${context.formattedValue} eventos (${percentual}%)`;
            },
          },
        },
      },
      scales: {
        x: { grid: { display: false }, ticks: { color: this.axisColor } },
        y: { grid: { color: this.gridColor }, ticks: { color: this.axisColor } },
      },
    };
  }

  get periodoOptions(): ChartConfiguration['options'] {
    return this.percentTooltipOptions(this.periodoPercentuais());
  }

  get modalidadeOptions(): ChartConfiguration['options'] {
    return this.percentTooltipOptions(this.modalidadePercentuais());
  }

  get statusOptions(): ChartConfiguration['options'] {
    return this.percentTooltipOptions(this.statusPercentuais());
  }

  get lineOptions(): ChartConfiguration['options'] {
    const percentuais = this.evolucaoMensalPercentuais();
    return {
      responsive: true,
      maintainAspectRatio: false,
      plugins: {
        legend: { display: false },
        tooltip: {
          callbacks: {
            label: (context) => {
              const percentual = percentuais[context.dataIndex] ?? 0;
              return `${context.formattedValue} eventos (${percentual}%)`;
            },
          },
        },
      },
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
