import { BreakpointObserver } from '@angular/cdk/layout';
import { DatePipe } from '@angular/common';
import {
  ChangeDetectionStrategy,
  Component,
  DestroyRef,
  ElementRef,
  OnInit,
  ViewChild,
  computed,
  effect,
  inject,
  signal,
} from '@angular/core';
import { takeUntilDestroyed, toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { Subject, debounceTime, map } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import {
  EventoDateFilter,
  EventoRead,
  EventoStatus,
  EventoWithTags,
} from '../../../core/models/evento.model';
import { AuthService } from '../../../core/services/auth.service';
import { EventService } from '../../../core/services/event.service';
import { RoleService } from '../../../core/services/role.service';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { NotificationService } from '../../../shared/services/notification.service';
import { parseEventDate } from '../../../shared/utils/event-date.util';
import { environment } from '../../../../environments/environment';

type EventoListFilter = EventoStatus | 'ativos' | 'inativos' | 'todos' | 'meus_eventos';

const STATUS_OPTIONS: { value: EventoListFilter; label: string }[] = [
  { value: 'ativos', label: 'Ativos' },
  { value: 'todos', label: 'Todos' },
  { value: 'inativos', label: 'Inativos' },
  { value: 'publicado', label: 'Publicado' },
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'arquivado', label: 'Arquivado' },
];

const PARTICIPANT_STATUS_OPTIONS: { value: EventoListFilter; label: string }[] = [
  { value: 'meus_eventos', label: 'Meus eventos' },
  ...STATUS_OPTIONS,
];

const EVENT_FILTERS: Record<
  EventoListFilter,
  { status?: EventoStatus; dateFilter?: EventoDateFilter; mine?: boolean }
> = {
  meus_eventos: { mine: true },
  ativos: { dateFilter: 'upcoming' },
  todos: {},
  inativos: { dateFilter: 'past' },
  publicado: { status: 'publicado' },
  rascunho: { status: 'rascunho' },
  arquivado: { status: 'arquivado' },
};

@Component({
  selector: 'app-eventos',
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatSelectModule,
    MatTooltipModule,
    Pagination,
  ],
  templateUrl: './eventos.html',
  styleUrl: './eventos.scss',
  changeDetection: ChangeDetectionStrategy.OnPush,
})
export class Eventos implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly authService = inject(AuthService);
  readonly roleService = inject(RoleService);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);
  private readonly destroyRef = inject(DestroyRef);

  @ViewChild('pageTop') private pageTop?: ElementRef<HTMLElement>;

  readonly loading = this.eventService.loading;
  readonly totalEvents = this.eventService.eventsTotal;
  readonly statusOptions = computed(() =>
    this.isParticipant() ? PARTICIPANT_STATUS_OPTIONS : STATUS_OPTIONS,
  );
  readonly skeletonRows = Array.from({ length: 6 }, (_, i) => i);

  readonly rawSearchQuery = signal('');
  private readonly searchInput$ = new Subject<string>();
  readonly searchQuery = signal('');
  readonly statusFilter = signal<EventoListFilter>(this.getDefaultStatusFilter());
  readonly currentPage = signal(1);
  private readonly reloadKey = signal(0);

  private readonly breakpointObserver = inject(BreakpointObserver);

  private readonly isMobile = toSignal(
    this.breakpointObserver.observe('(max-width: 768px)').pipe(map((result) => result.matches)),
    { initialValue: false },
  );

  readonly pageSize = computed(() => (this.isMobile() ? 10 : 20));
  readonly isParticipant = computed(() => this.roleService.role() === 'participante');

  readonly paginatedRows = computed(() => {
    const permissions = this.roleService.permissions();
    const role = this.roleService.role();
    const userId = this.authService.currentUser()?.id;

    return this.eventService.pagedEvents().map((event) => {
      const isInactive = this.isInactiveEvent(event);

      return {
        event,
        canEdit: this.computeCanEdit(event, permissions, role, userId),
        isInactive,
        statusLabel: isInactive ? 'Inativo' : event.status,
      };
    });
  });

  private readonly eventsLoader = effect((onCleanup) => {
    const filters = EVENT_FILTERS[this.statusFilter()];
    const subscription = this.eventService
      .getEventsPage({
        page: this.currentPage(),
        pageSize: this.pageSize(),
        status: filters.status,
        dateFilter: filters.dateFilter,
        mine: filters.mine,
        search: this.searchQuery(),
      })
      .subscribe();

    this.reloadKey();
    onCleanup(() => subscription.unsubscribe());
  });

  ngOnInit(): void {
    this.searchInput$
      .pipe(debounceTime(250), takeUntilDestroyed(this.destroyRef))
      .subscribe((value) => {
        this.searchQuery.set(value);
        this.currentPage.set(1);
      });
  }

  onSearchChange(value: string): void {
    this.rawSearchQuery.set(value);
    this.searchInput$.next(value);
  }

  onStatusFilterChange(value: EventoListFilter): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
    this.scrollToTop();
  }

  private scrollToTop(): void {
    requestAnimationFrame(() => {
      this.pageTop?.nativeElement.scrollIntoView({ behavior: 'smooth', block: 'start' });
    });
  }

  private computeCanEdit(
    event: EventoRead,
    permissions: ReturnType<RoleService['permissions']>,
    role: ReturnType<RoleService['role']>,
    userId: string | undefined,
  ): boolean {
    if (!permissions.canEditEvents) return false;
    if (role === 'moderador') {
      return event.created_by === userId;
    }
    return true;
  }

  private getDefaultStatusFilter(): EventoListFilter {
    return this.roleService.role() === 'participante' ? 'meus_eventos' : 'ativos';
  }

  private isInactiveEvent(event: EventoRead): boolean {
    const eventDate = parseEventDate(event.data_evento);
    if (!eventDate) return false;

    const today = new Date();
    today.setHours(0, 0, 0, 0);
    eventDate.setHours(0, 0, 0, 0);

    return eventDate < today;
  }

  goToCreate(): void {
    this.router.navigate(['eventos', 'novo'], { relativeTo: this.route.parent });
  }

  goToEdit(event: EventoRead): void {
    this.router.navigate(['eventos', event.slug ?? event.id, 'editar'], {
      relativeTo: this.route.parent,
    });
  }

  publishEvent(event: EventoRead): void {
    this.eventService.publishEvent(event.id).subscribe({
      next: (updated) => {
        this.notification.showNotification('Evento publicado com sucesso', 'success');
        this.eventService.upsertLocal(updated);
        this.reloadKey.update((value) => value + 1);
      },
    });
  }

  copyLink(event: EventoRead): void {
    const slug = (event as EventoWithTags & { slug?: string }).slug ?? event.id;
    const url = new URL(`/eventos/${slug}`, environment.publicEventsUrl).toString();
    navigator.clipboard.writeText(url).then(() => {
      this.notification.showNotification('Link copiado para a área de transferência', 'success');
    });
  }
}
