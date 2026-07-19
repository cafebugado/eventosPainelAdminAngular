import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuditAction, AuditLogRead, AuditUser } from '../../../core/models/audit.model';
import { DashboardEventCounts } from '../../../core/models/dashboard.model';
import { EventoRead } from '../../../core/models/evento.model';
import { ProfileService } from '../../../core/services/profile.service';
import { AuthService } from '../../../core/services/auth.service';
import { DashboardService } from '../../../core/services/dashboard.service';
import { RoleService } from '../../../core/services/role.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { formatDateToIso, getMonthRange, getWeekRange } from '../../../shared/utils/event-date.util';

const PUBLIC_EVENTS_BASE_URL = 'https://eventos.cafebugado.com.br/eventos/';

const AUDIT_ACTION_LABELS: Record<AuditAction, string> = {
  INSERT: 'criou',
  UPDATE: 'atualizou',
  DELETE: 'removeu',
};

const AUDIT_ENTITY_LABELS: Record<string, string> = {
  eventos: 'um evento',
  tags: 'uma tag',
  contribuintes: 'um contribuinte',
  comunidades: 'uma comunidade',
  galeria_albuns: 'um álbum',
  galeria_fotos: 'uma foto',
  user_roles: 'uma permissão de usuário',
  user_profiles: 'um perfil de usuário',
};

@Component({
  selector: 'app-painel',
  imports: [
    DatePipe,
    MatButtonModule,
    MatCardModule,
    MatIconModule,
    MatProgressSpinnerModule,
    MatTooltipModule,
  ],
  templateUrl: './painel.html',
  styleUrl: './painel.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Painel implements OnInit {
  private readonly router = inject(Router);
  private readonly authService = inject(AuthService);
  private readonly profileService = inject(ProfileService);
  private readonly dashboardService = inject(DashboardService);
  private readonly notification = inject(NotificationService);
  readonly roleService = inject(RoleService);

  readonly summaryLoading = signal(false);

  readonly eventCounts = signal<DashboardEventCounts | null>(null);
  readonly communitiesCount = signal<number | null>(null);
  readonly contributorsCount = signal<number | null>(null);
  readonly photosCount = signal<number | null>(null);
  readonly usersCount = signal<number | null>(null);
  readonly upcomingEvents = signal<EventoRead[]>([]);
  readonly pendingReviewEvents = signal<EventoRead[]>([]);
  readonly recentActivity = signal<AuditLogRead[]>([]);
  private readonly auditUsers = signal<AuditUser[]>([]);

  readonly greeting = computed(() => {
    const hour = new Date().getHours();
    const period = hour < 12 ? 'Bom dia' : hour < 18 ? 'Boa tarde' : 'Boa noite';
    return `${period}, ${this.displayName()}`;
  });

  readonly activityLabel = computed(() => {
    const map = new Map(this.auditUsers().map((u) => [u.user_id, u]));
    return (log: AuditLogRead) => {
      const user = log.user_id ? map.get(log.user_id) : null;
      const name = user ? [user.nome, user.sobrenome].filter(Boolean).join(' ') || user.email : null;
      const who = name || 'Alguém';
      const action = AUDIT_ACTION_LABELS[log.action];
      const entity = AUDIT_ENTITY_LABELS[log.entity] ?? log.entity;
      return `${who} ${action} ${entity}`;
    };
  });

  private readonly displayName = computed(() => {
    const profile = this.profileService.profile();
    const fullName = [profile?.nome, profile?.sobrenome].filter(Boolean).join(' ').trim();
    if (fullName) return fullName;

    const email = this.authService.currentUser()?.email;
    return email ? email.split('@')[0] : 'visitante';
  });

  ngOnInit(): void {
    this.loadSummary();
  }

  private loadSummary(): void {
    this.summaryLoading.set(true);
    this.dashboardService.getSummary().subscribe({
      next: (summary) => {
        this.eventCounts.set(summary.eventos);
        this.communitiesCount.set(summary.comunidades);
        this.contributorsCount.set(summary.contribuintes);
        this.photosCount.set(summary.fotos);
        this.usersCount.set(summary.usuarios);
        this.upcomingEvents.set(summary.proximos_eventos);
        this.pendingReviewEvents.set(summary.pendentes_revisao);
        this.recentActivity.set(summary.atividade_recente);
        this.auditUsers.set(summary.atividade_usuarios);
        this.summaryLoading.set(false);
      },
      error: () => this.summaryLoading.set(false),
    });
  }

  goToEventos(): void {
    this.router.navigate(['/admin/dashboard/eventos']);
  }

  goToTodayEvents(): void {
    const today = formatDateToIso(new Date());
    this.router.navigate(['/admin/dashboard/eventos'], { queryParams: { search: today } });
  }

  goToWeekEvents(): void {
    const { start, end } = getWeekRange(new Date());
    this.router.navigate(['/admin/dashboard/eventos'], {
      queryParams: { dateFrom: formatDateToIso(start), dateTo: formatDateToIso(end) },
    });
  }

  goToMonthEvents(): void {
    const { start, end } = getMonthRange(new Date());
    this.router.navigate(['/admin/dashboard/eventos'], {
      queryParams: { dateFrom: formatDateToIso(start), dateTo: formatDateToIso(end) },
    });
  }

  goToComunidades(): void {
    this.router.navigate(['/admin/dashboard/comunidades']);
  }

  goToContribuintes(): void {
    this.router.navigate(['/admin/dashboard/contribuintes']);
  }

  goToGaleria(): void {
    this.router.navigate(['/admin/dashboard/galeria']);
  }

  goToUsuarios(): void {
    this.router.navigate(['/admin/dashboard/usuarios']);
  }

  goToAuditoria(): void {
    this.router.navigate(['/admin/dashboard/auditoria']);
  }

  goToRevisar(event: EventoRead): void {
    this.router.navigate(['/admin/dashboard/eventos', event.slug ?? event.id, 'revisar']);
  }

  copyEventDetails(event: EventoRead): void {
    navigator.clipboard.writeText(this.formatEventDetails(event)).then(() => {
      this.notification.showNotification('Detalhes do evento copiados', 'success');
    });
  }

  copyUpcomingEvents(): void {
    const events = this.upcomingEvents();
    if (!events.length) return;

    const text = [
      'Eventos da semana',
      '',
      ...events.map((event) => this.formatEventDetails(event)),
    ].join('\n\n');

    navigator.clipboard.writeText(text).then(() => {
      this.notification.showNotification('Eventos da semana copiados', 'success');
    });
  }

  private formatEventDetails(event: EventoRead): string {
    const local = this.formatLocal(event);
    const link = `${PUBLIC_EVENTS_BASE_URL}${event.slug ?? event.id}`;

    const lines = [
      `✅ ${event.nome}`,
      '',
      `📍 Data: ${event.data_evento}`,
      `🕠 Horário: ${event.horario}`,
    ];
    if (local) {
      lines.push(`📌 Local: ${local}`);
    }
    lines.push(`🔗 Link: ${link}`);

    return lines.join('\n');
  }

  private formatLocal(event: EventoRead): string {
    if (event.modalidade === 'Online') return 'Online';
    return [event.endereco, event.cidade, event.estado].filter(Boolean).join(', ');
  }
}
