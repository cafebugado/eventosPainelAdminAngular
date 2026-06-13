import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatTooltipModule } from '@angular/material/tooltip';
import { ContributorRead } from '../../../core/models/contributor.model';
import { ContributorService } from '../../../core/services/contributor.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { NotificationService } from '../../../shared/services/notification.service';
import { ContributorFormDialog, ContributorFormDialogData } from './contributor-form-dialog/contributor-form-dialog';

@Component({
  selector: 'app-contributors',
  imports: [MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule, MatTooltipModule],
  templateUrl: './contributors.html',
  styleUrl: './contributors.scss',
})
export class Contributors implements OnInit {
  private readonly contributorService = inject(ContributorService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  readonly contributors = this.contributorService.contributors;
  readonly loading = this.contributorService.loading;

  ngOnInit(): void {
    this.contributorService.getContributors().subscribe();
  }

  openCreateDialog(): void {
    this.openFormDialog({});
  }

  openEditDialog(contributor: ContributorRead): void {
    this.openFormDialog({ contributor });
  }

  private openFormDialog(data: ContributorFormDialogData): void {
    const ref = this.dialog.open(ContributorFormDialog, { data, width: '500px' });

    ref.afterClosed().subscribe((result) => {
      if (!result) return;

      const request = data.contributor
        ? this.contributorService.updateContributor(data.contributor.id, result)
        : this.contributorService.createContributor(result);

      request.subscribe({
        next: () => {
          this.notification.showNotification(
            data.contributor ? 'Contribuinte atualizado com sucesso' : 'Contribuinte criado com sucesso',
            'success',
          );
          this.contributorService.getContributors().subscribe();
        },
      });
    });
  }

  deleteContributor(contributor: ContributorRead): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Excluir contribuinte',
        message: `Tem certeza que deseja excluir "${contributor.nome ?? contributor.github_username}"?`,
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.contributorService.deleteContributor(contributor.id).subscribe({
        next: () => {
          this.notification.showNotification('Contribuinte excluído com sucesso', 'success');
          this.contributorService.getContributors().subscribe();
        },
      });
    });
  }
}
