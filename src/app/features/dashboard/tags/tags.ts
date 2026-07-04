import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { ActivatedRoute, Router } from '@angular/router';
import { TagRead } from '../../../core/models/tag.model';
import { TagService } from '../../../core/services/tag.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { NotificationService } from '../../../shared/services/notification.service';

@Component({
  selector: 'app-tags',
  imports: [MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './tags.html',
  styleUrl: './tags.scss',
})
export class Tags implements OnInit {
  private readonly tagService = inject(TagService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);
  private readonly router = inject(Router);
  private readonly route = inject(ActivatedRoute);

  readonly tags = this.tagService.tags;
  readonly loading = this.tagService.loading;

  ngOnInit(): void {
    this.tagService.getTags().subscribe();
  }

  goToCreate(): void {
    this.router.navigate(['tags', 'nova'], { relativeTo: this.route.parent });
  }

  goToEdit(tag: TagRead): void {
    this.router.navigate(['tags', tag.id, 'editar'], { relativeTo: this.route.parent });
  }

  deleteTag(tag: TagRead): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Excluir tag',
        message: `Tem certeza que deseja excluir a tag "${tag.nome}"?`,
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.tagService.deleteTag(tag.id).subscribe({
        next: () => {
          this.notification.showNotification('Tag excluída com sucesso', 'success');
          this.tagService.getTags().subscribe();
        },
      });
    });
  }
}
