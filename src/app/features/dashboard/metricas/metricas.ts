import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ChartConfiguration, ChartData, Chart, registerables } from 'chart.js';
import { BaseChartDirective } from 'ng2-charts';
import { EventoMetrics } from '../../../core/models/evento.model';
import { EventService } from '../../../core/services/event.service';

Chart.register(...registerables);

const DIA_SEMANA_ORDER = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function readColor(variable: string, fallback: string): string {
  if (typeof window === 'undefined') return fallback;
  const value = getComputedStyle(document.documentElement).getPropertyValue(variable).trim();
  return value || fallback;
}

@Component({
  selector: 'app-metricas',
  imports: [MatCardModule, MatIconModule, MatProgressSpinnerModule, BaseChartDirective],
  templateUrl: './metricas.html',
  styleUrl: './metricas.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Metricas implements OnInit {
  private readonly eventService = inject(EventService);

  readonly metrics = signal<EventoMetrics | null>(null);
  readonly metricsLoading = signal(false);

  private readonly palette = [
    readColor('--mat-sys-primary', '#2563eb'),
    readColor('--mat-sys-tertiary', '#16a34a'),
    readColor('--mat-sys-secondary', '#7c3aed'),
    readColor('--mat-sys-error', '#dc2626'),
    '#f59e0b',
    '#0891b2',
    '#db2777',
    '#65a30d',
  ];

  readonly diaSemanaChart = computed<ChartData<'bar'>>(() => {
    const data = this.metrics()?.por_dia_semana ?? [];
    const sorted = [...data].sort(
      (a, b) => DIA_SEMANA_ORDER.indexOf(a.dia_semana) - DIA_SEMANA_ORDER.indexOf(b.dia_semana),
    );
    return {
      labels: sorted.map((item) => item.dia_semana),
      datasets: [{ data: sorted.map((item) => item.total), backgroundColor: this.palette[0] }],
    };
  });

  readonly periodoChart = computed<ChartData<'doughnut'>>(() => {
    const data = this.metrics()?.por_periodo ?? [];
    return {
      labels: data.map((item) => item.periodo),
      datasets: [{ data: data.map((item) => item.total), backgroundColor: this.palette }],
    };
  });

  readonly modalidadeChart = computed<ChartData<'pie'>>(() => {
    const data = this.metrics()?.por_modalidade ?? [];
    return {
      labels: data.map((item) => item.modalidade),
      datasets: [{ data: data.map((item) => item.total), backgroundColor: this.palette }],
    };
  });

  readonly statusChart = computed<ChartData<'doughnut'>>(() => {
    const data = this.metrics()?.por_status ?? [];
    return {
      labels: data.map((item) => item.status),
      datasets: [{ data: data.map((item) => item.total), backgroundColor: this.palette }],
    };
  });

  readonly cidadeChart = computed<ChartData<'bar'>>(() => {
    const data = this.metrics()?.por_cidade ?? [];
    return {
      labels: data.map((item) => (item.estado ? `${item.cidade}/${item.estado}` : item.cidade)),
      datasets: [{ data: data.map((item) => item.total), backgroundColor: this.palette[1] }],
    };
  });

  readonly tagsChart = computed<ChartData<'bar'>>(() => {
    const data = this.metrics()?.top_tags ?? [];
    return {
      labels: data.map((item) => item.nome),
      datasets: [{ data: data.map((item) => item.total), backgroundColor: data.map((item) => item.cor) }],
    };
  });

  readonly evolucaoMensalChart = computed<ChartData<'line'>>(() => {
    const data = this.metrics()?.evolucao_mensal ?? [];
    return {
      labels: data.map((item) => item.ano_mes),
      datasets: [
        {
          data: data.map((item) => item.total),
          borderColor: this.palette[0],
          backgroundColor: this.palette[0],
          tension: 0.3,
          fill: false,
        },
      ],
    };
  });

  readonly horizontalBarOptions: ChartConfiguration['options'] = {
    indexAxis: 'y',
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  readonly barOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

  readonly pieOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { position: 'bottom' } },
  };

  readonly lineOptions: ChartConfiguration['options'] = {
    responsive: true,
    maintainAspectRatio: false,
    plugins: { legend: { display: false } },
  };

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
