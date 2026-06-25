import { BreakpointObserver } from '@angular/cdk/layout';
import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { toSignal } from '@angular/core/rxjs-interop';
import { FormsModule } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { map } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatChipsModule } from '@angular/material/chips';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { MatTooltipModule } from '@angular/material/tooltip';
import { EventoRead, EventoStatus, EventoWithTags } from '../../../core/models/evento.model';
import { AuthService } from '../../../core/services/auth.service';
import { EventService } from '../../../core/services/event.service';
import { RoleService } from '../../../core/services/role.service';
import { TagService } from '../../../core/services/tag.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { NotificationService } from '../../../shared/services/notification.service';
import { paginate } from '../../../shared/utils/pagination.util';

const STATUS_OPTIONS: { value: EventoStatus | 'todos'; label: string }[] = [
  { value: 'todos', label: 'Todos' },
  { value: 'publicado', label: 'Publicado' },
  { value: 'rascunho', label: 'Rascunho' },
  { value: 'arquivado', label: 'Arquivado' },
];

@Component({
  selector: 'app-eventos',
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatChipsModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    MatTooltipModule,
    Pagination,
  ],
  templateUrl: './eventos.html',
  styleUrl: './eventos.scss',
})
export class Eventos implements OnInit {
  private readonly eventService = inject(EventService);
  private readonly tagService = inject(TagService);
  private readonly authService = inject(AuthService);
  readonly roleService = inject(RoleService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly loading = this.eventService.loading;
  readonly statusOptions = STATUS_OPTIONS;
  readonly displayedColumns = ['imagem', 'nome', 'data_evento', 'created_at', 'acoes'];

  readonly searchQuery = signal('');
  readonly statusFilter = signal<EventoStatus | 'todos'>('todos');
  readonly currentPage = signal(1);

  readonly filteredEvents = computed(() => {
    const query = this.searchQuery().toLowerCase().trim();
    const status = this.statusFilter();

    return this.eventService.events().filter((event) => {
      const matchesStatus = status === 'todos' || event.status === status;
      const matchesQuery =
        !query ||
        event.nome.toLowerCase().includes(query) ||
        (event.descricao ?? '').toLowerCase().includes(query) ||
        event.data_evento.includes(query);
      return matchesStatus && matchesQuery;
    });
  });

  private readonly breakpointObserver = inject(BreakpointObserver);

  private readonly isMobile = toSignal(
    this.breakpointObserver.observe('(max-width: 768px)').pipe(map((result) => result.matches)),
    { initialValue: false },
  );

  readonly pageSize = computed(() => (this.isMobile() ? 10 : 20));

  readonly paginatedEvents = computed(() => paginate(this.filteredEvents(), this.currentPage(), this.pageSize()));

  ngOnInit(): void {
    this.eventService.getEvents().subscribe();
    this.tagService.getTags().subscribe();
  }

  onSearchChange(value: string): void {
    this.searchQuery.set(value);
    this.currentPage.set(1);
  }

  onStatusFilterChange(value: EventoStatus | 'todos'): void {
    this.statusFilter.set(value);
    this.currentPage.set(1);
  }

  onPageChange(page: number): void {
    this.currentPage.set(page);
  }

  canEdit(event: EventoRead): boolean {
    const permissions = this.roleService.permissions();
    if (!permissions.canEditEvents) return false;
    if (this.roleService.role() === 'moderador') {
      return event.created_by === this.authService.currentUser()?.id;
    }
    return true;
  }

  canDelete(event: EventoRead): boolean {
    const permissions = this.roleService.permissions();
    if (!permissions.canDeleteEvents) return false;
    if (this.roleService.role() === 'moderador') {
      return event.created_by === this.authService.currentUser()?.id;
    }
    return true;
  }

  goToCreate(): void {
    this.router.navigate(['eventos', 'novo'], { relativeTo: this.route.parent });
  }

  goToEdit(event: EventoRead): void {
    this.router.navigate(['eventos', event.slug ?? event.id, 'editar'], { relativeTo: this.route.parent });
  }

  publishEvent(event: EventoRead): void {
    this.eventService.publishEvent(event.id).subscribe({
      next: () => {
        this.notification.showNotification('Evento publicado com sucesso', 'success');
        this.eventService.getEvents().subscribe();
      },
    });
  }

  deleteEvent(event: EventoRead): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Excluir evento',
        message: `Tem certeza que deseja excluir o evento "${event.nome}"?`,
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.eventService.deleteEvent(event.id).subscribe({
        next: () => {
          this.notification.showNotification('Evento excluído com sucesso', 'success');
          this.eventService.getEvents().subscribe();
        },
      });
    });
  }

  copyLink(event: EventoRead): void {
    const slug = (event as EventoWithTags & { slug?: string }).slug ?? event.id;
    const url = `${window.location.origin}/eventos/${slug}`;
    navigator.clipboard.writeText(url).then(() => {
      this.notification.showNotification('Link copiado para a área de transferência', 'success');
    });
  }
}
