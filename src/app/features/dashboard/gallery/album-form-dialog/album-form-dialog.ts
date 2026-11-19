import { Component, OnInit, inject, signal, ChangeDetectionStrategy } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { CommunityRead } from '../../../../core/models/community.model';
import { EventoRead } from '../../../../core/models/evento.model';
import { GaleriaAlbumCreate, GaleriaAlbumRead } from '../../../../core/models/gallery.model';
import { CommunityService } from '../../../../core/services/community.service';
import { EventService } from '../../../../core/services/event.service';
import { GalleryService } from '../../../../core/services/gallery.service';

export interface AlbumFormDialogData {
  album?: GaleriaAlbumRead;
}

/** Valor devolvido ao fechar: `true` quando o álbum foi salvo. */
export type AlbumFormDialogResult = boolean | undefined;

@Component({
  selector: 'app-album-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatDialogModule,
    MatFormFieldModule,
    MatSelectModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './album-form-dialog.html',
  changeDetection: ChangeDetectionStrategy.Eager,
  styleUrl: './album-form-dialog.scss',
})
export class AlbumFormDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject<MatDialogRef<AlbumFormDialog, AlbumFormDialogResult>>(MatDialogRef);
  private readonly galleryService = inject(GalleryService);
  private readonly eventService = inject(EventService);
  private readonly communityService = inject(CommunityService);
  readonly data = inject<AlbumFormDialogData>(MAT_DIALOG_DATA);

  readonly events = signal<EventoRead[]>([]);
  readonly communities = signal<CommunityRead[]>([]);
  readonly saving = signal(false);

  readonly form = this.fb.nonNullable.group({
    vinculo: [this.data.album?.evento_id ? 'evento' : 'comunidade', []],
    evento_id: [this.data.album?.evento_id ?? ''],
    comunidade_id: [this.data.album?.comunidade_id ?? ''],
  });

  get isEdit(): boolean {
    return !!this.data.album;
  }

  ngOnInit(): void {
    this.eventService.getEvents().subscribe((events) => this.events.set(events));
    this.communityService
      .getCommunities()
      .subscribe((communities) => this.communities.set(communities));
  }

  /**
   * Salva pelo próprio diálogo: ele só fecha em caso de sucesso. Em erro, a
   * seleção continua no formulário e o interceptor global mostra o motivo.
   */
  save(): void {
    if (this.saving()) return;
    const payload = this.buildPayload();
    if (!payload) return;

    const album = this.data.album;
    const request = album
      ? this.galleryService.updateAlbum(album.id, payload)
      : this.galleryService.createAlbum(payload);

    this.setSaving(true);
    request.subscribe({
      next: () => {
        this.setSaving(false);
        this.dialogRef.close(true);
      },
      error: () => this.setSaving(false),
    });
  }

  cancel(): void {
    if (this.saving()) return;
    this.dialogRef.close();
  }

  /** Monta o vínculo escolhido, ou marca o campo como obrigatório e devolve `null`. */
  private buildPayload(): GaleriaAlbumCreate | null {
    const value = this.form.getRawValue();
    const isEvento = value.vinculo === 'evento';
    const control = isEvento ? this.form.controls.evento_id : this.form.controls.comunidade_id;

    if (!control.value) {
      control.setErrors({ required: true });
      control.markAsTouched();
      return null;
    }

    return isEvento
      ? { evento_id: value.evento_id, comunidade_id: null }
      : { evento_id: null, comunidade_id: value.comunidade_id };
  }

  private setSaving(saving: boolean): void {
    this.saving.set(saving);
    // Impede fechar com Esc ou clique fora durante o envio.
    this.dialogRef.disableClose = saving;
  }
}
