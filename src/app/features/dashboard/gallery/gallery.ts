import { Component, OnInit, inject, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCardModule } from '@angular/material/card';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { CommunityRead } from '../../../core/models/community.model';
import { EventoRead } from '../../../core/models/evento.model';
import { GaleriaAlbumRead, GaleriaFotoRead } from '../../../core/models/gallery.model';
import { CommunityService } from '../../../core/services/community.service';
import { EventService } from '../../../core/services/event.service';
import { GalleryService } from '../../../core/services/gallery.service';
import { ConfirmDialog } from '../../../shared/components/confirm-dialog/confirm-dialog';
import { NotificationService } from '../../../shared/services/notification.service';
import { validateImageFile } from '../../../shared/utils/image-validators.util';
import { AlbumFormDialog, AlbumFormDialogData } from './album-form-dialog/album-form-dialog';
import { PhotoCaptionEditor } from './photo-caption-editor/photo-caption-editor';

@Component({
  selector: 'app-gallery',
  imports: [
    FormsModule,
    MatButtonModule,
    MatCardModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    PhotoCaptionEditor,
  ],
  templateUrl: './gallery.html',
  styleUrl: './gallery.scss',
})
export class Gallery implements OnInit {
  private readonly galleryService = inject(GalleryService);
  private readonly eventService = inject(EventService);
  private readonly communityService = inject(CommunityService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  readonly albums = this.galleryService.albums;
  readonly loading = this.galleryService.loading;

  readonly events = signal<EventoRead[]>([]);
  readonly communities = signal<CommunityRead[]>([]);
  readonly photoUrlDrafts = signal<Record<string, string>>({});

  ngOnInit(): void {
    this.galleryService.getAlbuns().subscribe();
    this.eventService.getEvents().subscribe((events) => this.events.set(events));
    this.communityService.getCommunities().subscribe((communities) => this.communities.set(communities));
  }

  albumTitle(album: GaleriaAlbumRead): string {
    if (album.evento_id) {
      const evento = this.events().find((e) => e.id === album.evento_id);
      return evento ? `Evento: ${evento.nome}` : 'Evento';
    }
    if (album.comunidade_id) {
      const community = this.communities().find((c) => c.id === album.comunidade_id);
      return community ? `Comunidade: ${community.nome}` : 'Comunidade';
    }
    return 'Álbum';
  }

  openCreateDialog(): void {
    const data: AlbumFormDialogData = {};
    const ref = this.dialog.open(AlbumFormDialog, { data, width: '420px' });

    ref.afterClosed().subscribe((result) => {
      if (!result) return;

      this.galleryService.createAlbum(result).subscribe({
        next: () => {
          this.notification.showNotification('Álbum criado com sucesso', 'success');
          this.galleryService.getAlbuns().subscribe();
        },
      });
    });
  }

  deleteAlbum(album: GaleriaAlbumRead): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Excluir álbum',
        message: 'Tem certeza que deseja excluir este álbum e todas as suas fotos?',
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.galleryService.deleteAlbum(album.id).subscribe({
        next: () => {
          this.notification.showNotification('Álbum excluído com sucesso', 'success');
          this.galleryService.getAlbuns().subscribe();
        },
      });
    });
  }

  onFileSelected(album: GaleriaAlbumRead, event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const validation = validateImageFile(file);
    if (!validation.valid) {
      this.notification.showNotification(validation.error ?? 'Arquivo inválido', 'error');
      input.value = '';
      return;
    }

    this.galleryService.uploadFoto(album.id, file).subscribe({
      next: () => {
        this.notification.showNotification('Foto adicionada com sucesso', 'success');
        this.galleryService.getAlbuns().subscribe();
        input.value = '';
      },
    });
  }

  photoUrlDraft(albumId: string): string {
    return this.photoUrlDrafts()[albumId] ?? '';
  }

  setPhotoUrlDraft(albumId: string, value: string): void {
    this.photoUrlDrafts.update((drafts) => ({ ...drafts, [albumId]: value }));
  }

  addPhotoByUrl(album: GaleriaAlbumRead): void {
    const url = this.photoUrlDraft(album.id).trim();
    if (!url) return;

    this.galleryService.addFotoByUrl(album.id, url).subscribe({
      next: () => {
        this.notification.showNotification('Foto adicionada com sucesso', 'success');
        this.setPhotoUrlDraft(album.id, '');
        this.galleryService.getAlbuns().subscribe();
      },
    });
  }

  updateCaption(foto: GaleriaFotoRead, legenda: string): void {
    this.galleryService.updateFotoLegenda(foto.id, legenda).subscribe({
      next: () => {
        this.notification.showNotification('Legenda atualizada com sucesso', 'success');
        this.galleryService.getAlbuns().subscribe();
      },
    });
  }

  deletePhoto(foto: GaleriaFotoRead): void {
    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Excluir foto',
        message: 'Tem certeza que deseja excluir esta foto?',
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.galleryService.deleteFoto(foto.id).subscribe({
        next: () => {
          this.notification.showNotification('Foto excluída com sucesso', 'success');
          this.galleryService.getAlbuns().subscribe();
        },
      });
    });
  }
}
