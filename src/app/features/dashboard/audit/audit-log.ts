import { DatePipe } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTableModule } from '@angular/material/table';
import { AuditAction, AuditLogRead, AuditUser } from '../../../core/models/audit.model';
import { AuditService } from '../../../core/services/audit.service';
import { Pagination } from '../../../shared/components/pagination/pagination';
import { AuditDetailDialog } from './audit-detail-dialog/audit-detail-dialog';

const PAGE_SIZE = 20;

@Component({
  selector: 'app-audit-log',
  imports: [
    DatePipe,
    FormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTableModule,
    Pagination,
  ],
  templateUrl: './audit-log.html',
  styleUrl: './audit-log.scss',
})
export class AuditLog implements OnInit {
  private readonly auditService = inject(AuditService);
  private readonly dialog = inject(MatDialog);

  readonly actions: AuditAction[] = ['INSERT', 'UPDATE', 'DELETE'];
  readonly entities = [
    'eventos',
    'tags',
    'contribuintes',
    'comunidades',
    'galeria_albuns',
    'galeria_fotos',
    'user_roles',
    'user_profiles',
  ];

  readonly users = signal<AuditUser[]>([]);
  readonly logs = signal<AuditLogRead[]>([]);
  readonly total = signal(0);
  readonly loading = signal(false);
  readonly page = signal(1);

  readonly userIdFilter = signal('');
  readonly actionFilter = signal<AuditAction | ''>('');
  readonly entityFilter = signal('');
  readonly dateFromFilter = signal('');
  readonly dateToFilter = signal('');

  readonly columns = ['created_at', 'user', 'action', 'entity', 'acoes'];

  readonly userLabel = computed(() => {
    const map = new Map(this.users().map((u) => [u.user_id, u]));
    return (userId: string | null | undefined) => {
      if (!userId) return '-';
      const user = map.get(userId);
      if (!user) return userId;
      const name = [user.nome, user.sobrenome].filter(Boolean).join(' ');
      return name || user.email || userId;
    };
  });

  ngOnInit(): void {
    this.auditService.getAuditUsers().subscribe((users) => this.users.set(users));
    this.loadLogs();
  }

  applyFilters(): void {
    this.page.set(1);
    this.loadLogs();
  }

  onPageChange(page: number): void {
    this.page.set(page);
    this.loadLogs();
  }

  private loadLogs(): void {
    this.loading.set(true);
    this.auditService
      .getAuditLogs({
        user_id: this.userIdFilter() || undefined,
        action: (this.actionFilter() as AuditAction) || undefined,
        entity: this.entityFilter() || undefined,
        date_from: this.dateFromFilter() || undefined,
        date_to: this.dateToFilter() || undefined,
        page: this.page(),
        page_size: PAGE_SIZE,
      })
      .subscribe({
        next: (result) => {
          this.logs.set(result.items);
          this.total.set(result.total);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      });
  }

  openDetail(log: AuditLogRead): void {
    this.dialog.open(AuditDetailDialog, { data: { log }, width: '600px' });
  }
}
