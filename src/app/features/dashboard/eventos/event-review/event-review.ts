import { DatePipe, Location } from '@angular/common';
import {
  Component,
  OnInit,
  computed,
  inject,
  signal,
  ChangeDetectionStrategy,
} from '@angular/core';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin, of, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { EventoStatus, EventoWithTags } from '../../../../core/models/evento.model';
import { EventService } from '../../../../core/services/event.service';
import { TagService } from '../../../../core/services/tag.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import {
  RejectEventDialog,
  RejectEventDialogData,
  RejectEventDialogResult,
} from './reject-event-dialog/reject-event-dialog';

type ReviewAction = 'approve' | 'reject';

const STATUS_LABELS: Record<EventoStatus, string> = {
  publicado: 'Publicado',
  rascunho: 'Rascunho',
  arquivado: 'Arquivado',
  em_analise: 'Em análise',
  recusado: 'Recusado',
};

@Component({
  selector: 'app-event-review',
  imports: [DatePipe, MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './event-review.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './event-review.scss',
})
export class EventReview implements OnInit {
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly eventService = inject(EventService);
  private readonly tagService = inject(TagService);
  private readonly notification = inject(NotificationService);
  private readonly dialog = inject(MatDialog);

  readonly loading = signal(true);
  readonly reviewing = signal<ReviewAction | null>(null);
  readonly event = signal<EventoWithTags | undefined>(undefined);
  readonly tags = computed(() => this.event()?.tags ?? []);
  readonly statusLabel = computed(() => {
    const status = this.event()?.status;
    return status ? STATUS_LABELS[status] : '';
  });
  readonly canReview = computed(() => this.event()?.status === 'em_analise');

  ngOnInit(): void {
    const slugOrId = this.route.snapshot.paramMap.get('slug');
    if (!slugOrId) {
      this.router.navigate(['/admin/dashboard/eventos']);
      return;
    }

    this.loadEvent(slugOrId);
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/admin/dashboard/eventos']);
  }

  approveEvent(): void {
    const event = this.event();
    if (!event || this.reviewing() || !this.canReview()) return;

    this.reviewing.set('approve');
    this.eventService
      .approveEvent(event.id)
      .pipe(finalize(() => this.reviewing.set(null)))
      .subscribe({
        next: () => this.finishReview('Evento aprovado com sucesso'),
        error: () => this.notification.showNotification('Erro ao revisar evento', 'error'),
      });
  }

  /**
   * O diálogo envia a recusa e só fecha com `true` em caso de sucesso; em erro,
   * continua aberto com o motivo digitado.
   */
  rejectEvent(): void {
    const event = this.event();
    if (!event || this.reviewing() || !this.canReview()) return;

    this.dialog
      .open<RejectEventDialog, RejectEventDialogData, RejectEventDialogResult>(RejectEventDialog, {
        data: { eventId: event.id },
      })
      .afterClosed()
      .subscribe((rejected) => {
        if (rejected) this.finishReview('Evento recusado');
      });
  }

  private loadEvent(slugOrId: string): void {
    this.loading.set(true);
    this.eventService
      .getEventBySlugOrId(slugOrId)
      .pipe(
        switchMap((event) =>
          forkJoin({
            event: of(event),
            tags: this.tagService.getEventTags(event.id),
          }),
        ),
        finalize(() => this.loading.set(false)),
      )
      .subscribe({
        next: ({ event, tags }) => this.event.set({ ...event, tags }),
        error: () => {
          this.notification.showNotification('Erro ao carregar evento', 'error');
          this.router.navigate(['/admin/dashboard/eventos']);
        },
      });
  }

  private finishReview(message: string): void {
    this.notification.showNotification(message, 'success');
    this.router.navigate(['/admin/dashboard/eventos']);
  }
}
