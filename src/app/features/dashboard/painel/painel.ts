import { DatePipe } from '@angular/common';
import { ChangeDetectionStrategy, Component, OnInit, computed, inject, signal } from '@angular/core';
import { Router } from '@angular/router';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuditAction, AuditLogRead, AuditUser } from '../../../core/models/audit.model';
import { EventoRead, EventoStats } from '../../../core/models/evento.model';
import { AuthService } from '../../../core/services/auth.service';
import { AuditService } from '../../../core/services/audit.service';
import { CommunityService } from '../../../core/services/community.service';
import { ContributorService } from '../../../core/services/contributor.service';
import { EventService } from '../../../core/services/event.service';
import { GalleryService } from '../../../core/services/gallery.service';
import { ProfileService } from '../../../core/services/profile.service';
import { RoleService } from '../../../core/services/role.service';
import { NotificationService } from '../../../shared/services/notification.service';
import { formatDateToIso, getMonthRange, getWeekRange, parseEventDate } from '../../../shared/utils/event-date.util';

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
  private readonly eventService = inject(EventService);
  private readonly communityService = inject(CommunityService);
  private readonly contributorService = inject(ContributorService);
  private readonly galleryService = inject(GalleryService);
  private readonly auditService = inject(AuditService);
  private readonly notification = inject(NotificationService);
  readonly roleService = inject(RoleService);

  readonly eventStats = signal<EventoStats | null>(null);
  readonly eventStatsLoading = signal(false);

  readonly allEvents = signal<EventoRead[]>([]);
  readonly allEventsLoading = signal(false);

  readonly myEventsCount = computed(() => {
    const userId = this.authService.currentUser()?.id;
    return this.allEvents().filter((event) => event.created_by === userId).length;
  });

  readonly todayEventsCount = computed(() => this.countEventsInRange(0, 0));
  readonly weekEventsCount = computed(() => {
    const { start, end } = getWeekRange(new Date());
    return this.allEvents().filter((event) => {
      const date = parseEventDate(event.data_evento);
      return date && date >= start && date <= end;
    }).length;
  });
  readonly monthEventsCount = computed(() => {
    const { start, end } = getMonthRange(new Date());
    return this.allEvents().filter((event) => {
      const date = parseEventDate(event.data_evento);
      return date && date >= start && date <= end;
    }).length;
  });
  readonly yearEventsCount = computed(() => {
    const now = new Date();
    return this.allEvents().filter((event) => {
      const date = parseEventDate(event.data_evento);
      return date && date.getFullYear() === now.getFullYear();
    }).length;
  });

  readonly communitiesCount = signal<number | null>(null);
  readonly communitiesLoading = signal(false);

  readonly contributorsCount = signal<number | null>(null);
  readonly contributorsLoading = signal(false);

  readonly photosCount = signal<number | null>(null);
  readonly photosLoading = signal(false);

  readonly usersCount = signal<number | null>(null);
  readonly usersLoading = signal(false);

  readonly upcomingEvents = signal<EventoRead[]>([]);
  readonly upcomingLoading = signal(false);

  readonly pendingReviewEvents = signal<EventoRead[]>([]);
  readonly pendingReviewLoading = signal(false);

  readonly recentActivity = signal<AuditLogRead[]>([]);
  readonly recentActivityLoading = signal(false);
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
    const permissions = this.roleService.permissions();

    this.loadEventStats();
    this.loadUpcomingEvents();
    this.loadAllEvents();

    if (permissions.canManageComunidades) {
      this.loadCommunitiesCount();
    }
    if (permissions.canManageContributors) {
      this.loadContributorsCount();
    }
    if (permissions.canManageGaleria) {
      this.loadPhotosCount();
    }
    if (permissions.canManageUsers) {
      this.loadUsersCount();
      this.loadRecentActivity();
    }
    if (permissions.canReviewEvents) {
      this.loadPendingReviewEvents();
    }
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

  private loadEventStats(): void {
    this.eventStatsLoading.set(true);
    this.eventService.getEventStats().subscribe({
      next: (stats) => {
        this.eventStats.set(stats);
        this.eventStatsLoading.set(false);
      },
      error: () => this.eventStatsLoading.set(false),
    });
  }

  private loadUpcomingEvents(): void {
    this.upcomingLoading.set(true);
    this.eventService.getUpcomingEvents().subscribe({
      next: (events) => {
        const sorted = [...events].sort(
          (a, b) => this.eventDateTime(a).getTime() - this.eventDateTime(b).getTime(),
        );
        this.upcomingEvents.set(sorted.slice(0, 5));
        this.upcomingLoading.set(false);
      },
      error: () => this.upcomingLoading.set(false),
    });
  }

  private eventDateTime(event: EventoRead): Date {
    const date = parseEventDate(event.data_evento) ?? new Date(8640000000000000);
    const [hours, minutes] = (event.horario ?? '').split(':').map(Number);
    if (!Number.isNaN(hours)) date.setHours(hours, Number.isNaN(minutes) ? 0 : minutes, 0, 0);
    return date;
  }

  private countEventsInRange(startDays: number, endDays: number): number {
    const now = new Date();
    now.setHours(0, 0, 0, 0);
    const start = new Date(now);
    start.setDate(start.getDate() + startDays);
    const end = new Date(now);
    end.setDate(end.getDate() + endDays);
    end.setHours(23, 59, 59, 999);

    return this.allEvents().filter((event) => {
      const date = parseEventDate(event.data_evento);
      return date && date >= start && date <= end;
    }).length;
  }

  private loadAllEvents(): void {
    this.allEventsLoading.set(true);
    this.eventService.getEvents().subscribe({
      next: (events) => {
        this.allEvents.set(events);
        this.allEventsLoading.set(false);
      },
      error: () => this.allEventsLoading.set(false),
    });
  }

  private loadPendingReviewEvents(): void {
    this.pendingReviewLoading.set(true);
    this.eventService.getEventsPage({ page: 1, pageSize: 5, status: 'em_analise' }).subscribe({
      next: (page) => {
        this.pendingReviewEvents.set(page.items);
        this.pendingReviewLoading.set(false);
      },
      error: () => this.pendingReviewLoading.set(false),
    });
  }

  private loadCommunitiesCount(): void {
    this.communitiesLoading.set(true);
    this.communityService.getCommunities().subscribe({
      next: (communities) => {
        this.communitiesCount.set(communities.length);
        this.communitiesLoading.set(false);
      },
      error: () => this.communitiesLoading.set(false),
    });
  }

  private loadContributorsCount(): void {
    this.contributorsLoading.set(true);
    this.contributorService.getContributors().subscribe({
      next: (contributors) => {
        this.contributorsCount.set(contributors.length);
        this.contributorsLoading.set(false);
      },
      error: () => this.contributorsLoading.set(false),
    });
  }

  private loadPhotosCount(): void {
    this.photosLoading.set(true);
    this.galleryService.getAlbuns().subscribe({
      next: (albums) => {
        this.photosCount.set(albums.reduce((total, album) => total + album.fotos.length, 0));
        this.photosLoading.set(false);
      },
      error: () => this.photosLoading.set(false),
    });
  }

  private loadUsersCount(): void {
    this.usersLoading.set(true);
    this.roleService.getUsers().subscribe({
      next: (users) => {
        this.usersCount.set(users.length);
        this.usersLoading.set(false);
      },
      error: () => this.usersLoading.set(false),
    });
  }

  private loadRecentActivity(): void {
    this.recentActivityLoading.set(true);
    this.auditService.getAuditUsers().subscribe((users) => this.auditUsers.set(users));
    this.auditService.getAuditLogs({ page: 1, page_size: 5 }).subscribe({
      next: (page) => {
        this.recentActivity.set(page.items);
        this.recentActivityLoading.set(false);
      },
      error: () => this.recentActivityLoading.set(false),
    });
  }
}
