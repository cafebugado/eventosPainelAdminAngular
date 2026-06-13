import { Component, OnInit, inject } from '@angular/core';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatIconModule } from '@angular/material/icon';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommunityRead } from '../../../core/models/community.model';
import { CommunityService } from '../../../core/services/community.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { NotificationService } from '../../../shared/services/notification.service';
import { CommunityFormDialog, CommunityFormDialogData } from './community-form-dialog/community-form-dialog';

@Component({
  selector: 'app-communities',
  imports: [MatButtonModule, MatCardModule, MatIconModule, MatProgressSpinnerModule],
  templateUrl: './communities.html',
  styleUrl: './communities.scss',
})
export class Communities implements OnInit {
  private readonly communityService = inject(CommunityService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  readonly communities = this.communityService.communities;
  readonly loading = this.communityService.loading;

  ngOnInit(): void {
    this.communityService.getCommunities().subscribe();
  }

  openCreateDialog(): void {
    this.openFormDialog({});
  }

  openEditDialog(community: CommunityRead): void {
    this.openFormDialog({ community });
  }

  private openFormDialog(data: CommunityFormDialogData): void {
    const ref = this.dialog.open(CommunityFormDialog, { data });

    ref.afterClosed().subscribe((result) => {
      if (!result) return;

      const request = data.community
        ? this.communityService.updateCommunity(data.community.id, result)
        : this.communityService.createCommunity(result);

      request.subscribe({
        next: () => {
          this.notification.showNotification(
            data.community ? 'Comunidade atualizada com sucesso' : 'Comunidade criada com sucesso',
            'success',
          );
          this.communityService.getCommunities().subscribe();
        },
      });
    });
  }

  deleteCommunity(community: CommunityRead): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Excluir comunidade',
        message: `Tem certeza que deseja excluir a comunidade "${community.nome}"?`,
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.communityService.deleteCommunity(community.id).subscribe({
        next: () => {
          this.notification.showNotification('Comunidade excluída com sucesso', 'success');
          this.communityService.getCommunities().subscribe();
        },
      });
    });
  }
}
