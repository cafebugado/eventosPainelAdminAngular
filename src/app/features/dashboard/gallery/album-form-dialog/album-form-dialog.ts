import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MAT_DIALOG_DATA, MatDialogModule, MatDialogRef } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatSelectModule } from '@angular/material/select';
import { CommunityRead } from '../../../../core/models/community.model';
import { EventoRead } from '../../../../core/models/evento.model';
import { GaleriaAlbumRead } from '../../../../core/models/gallery.model';
import { CommunityService } from '../../../../core/services/community.service';
import { EventService } from '../../../../core/services/event.service';

export interface AlbumFormDialogData {
  album?: GaleriaAlbumRead;
}

@Component({
  selector: 'app-album-form-dialog',
  imports: [ReactiveFormsModule, MatButtonModule, MatDialogModule, MatFormFieldModule, MatSelectModule],
  templateUrl: './album-form-dialog.html',
  styleUrl: './album-form-dialog.scss',
})
export class AlbumFormDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<AlbumFormDialog>);
  private readonly eventService = inject(EventService);
  private readonly communityService = inject(CommunityService);
  readonly data = inject<AlbumFormDialogData>(MAT_DIALOG_DATA);

  readonly events = signal<EventoRead[]>([]);
  readonly communities = signal<CommunityRead[]>([]);

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
    this.communityService.getCommunities().subscribe((communities) => this.communities.set(communities));
  }

  save(): void {
    const value = this.form.getRawValue();

    if (value.vinculo === 'evento') {
      if (!value.evento_id) {
        this.form.controls.evento_id.setErrors({ required: true });
        this.form.controls.evento_id.markAsTouched();
        return;
      }
      this.dialogRef.close({ evento_id: value.evento_id, comunidade_id: null });
    } else {
      if (!value.comunidade_id) {
        this.form.controls.comunidade_id.setErrors({ required: true });
        this.form.controls.comunidade_id.markAsTouched();
        return;
      }
      this.dialogRef.close({ evento_id: null, comunidade_id: value.comunidade_id });
    }
  }

  cancel(): void {
    this.dialogRef.close();
  }
}
