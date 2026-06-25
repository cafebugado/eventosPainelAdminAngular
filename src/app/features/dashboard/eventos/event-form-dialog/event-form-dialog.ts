import { Component, OnInit, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import {
  MAT_DIALOG_DATA,
  MatDialogActions,
  MatDialogContent,
  MatDialogRef,
  MatDialogTitle,
} from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatInputModule } from '@angular/material/input';
import { MatSelectModule } from '@angular/material/select';
import { EventoRead, EventoWithTags } from '../../../../core/models/evento.model';
import { TagRead } from '../../../../core/models/tag.model';
import { TagService } from '../../../../core/services/tag.service';
import { LocationSelector } from '../../../../shared/components/location-selector/location-selector';
import { RichTextEditor } from '../../../../shared/components/rich-text-editor/rich-text-editor';
import { NotificationService } from '../../../../shared/services/notification.service';
import { formatDateToDisplay, formatDateToInput, getDayName } from '../../../../shared/utils/event-date.util';
import { validateImageFile } from '../../../../shared/utils/image-validators.util';
import { generateSlug } from '../../../../shared/utils/slug.util';
import { validateURL } from '../../../../shared/utils/url-validators.util';

export interface EventFormDialogData {
  event?: EventoWithTags;
}

export interface EventFormResult {
  formData: ReturnType<EventFormDialog['buildPayload']>;
  imageFile?: File;
  tagIds: string[];
}

@Component({
  selector: 'app-event-form-dialog',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDialogTitle,
    MatDialogContent,
    MatDialogActions,
    MatFormFieldModule,
    MatInputModule,
    MatSelectModule,
    LocationSelector,
    RichTextEditor,
  ],
  templateUrl: './event-form-dialog.html',
  styleUrl: './event-form-dialog.scss',
})
export class EventFormDialog implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly dialogRef = inject(MatDialogRef<EventFormDialog>);
  private readonly tagService = inject(TagService);
  private readonly notification = inject(NotificationService);
  readonly data = inject<EventFormDialogData>(MAT_DIALOG_DATA);

  readonly isEdit = !!this.data?.event;
  readonly availableTags = signal<TagRead[]>([]);
  readonly selectedTagIds = signal<string[]>(this.data?.event?.tags?.map((t) => t.id) ?? []);
  readonly imagePreview = signal<string | null>(this.data?.event?.imagem ?? null);
  readonly selectedImageFile = signal<File | undefined>(undefined);
  readonly imageError = signal<string | null>(null);

  readonly periodos = ['Matinal', 'Diurno', 'Vespertino', 'Noturno'] as const;
  readonly modalidades = ['Online', 'Presencial'] as const;
  readonly statuses = [
    { value: 'rascunho', label: 'Rascunho' },
    { value: 'publicado', label: 'Publicado' },
    { value: 'arquivado', label: 'Arquivado' },
  ];

  readonly form = this.fb.nonNullable.group({
    nome: [this.data?.event?.nome ?? '', Validators.required],
    descricao: [this.data?.event?.descricao ?? ''],
    data_evento: [formatDateToInput(this.data?.event?.data_evento), Validators.required],
    dia_semana: [this.data?.event?.dia_semana ?? ''],
    horario: [this.data?.event?.horario ?? '', Validators.required],
    periodo: [this.data?.event?.periodo ?? null],
    link: [this.data?.event?.link ?? '', [Validators.required, this.urlValidator]],
    imagemUrl: [this.data?.event?.imagem ?? ''],
    modalidade: [this.data?.event?.modalidade ?? 'Online'],
    endereco: [this.data?.event?.endereco ?? ''],
    cidade: [this.data?.event?.cidade ?? ''],
    estado: [this.data?.event?.estado ?? ''],
    status: [this.data?.event?.status ?? 'publicado', Validators.required],
  });

  ngOnInit(): void {
    this.tagService
      .getTags()
      .subscribe((tags) =>
        this.availableTags.set([...tags].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))),
      );

    this.form.controls.data_evento.valueChanges.subscribe((value) => {
      this.form.controls.dia_semana.setValue(getDayName(value));
    });
  }

  private urlValidator(control: { value: string }) {
    if (!control.value) return null;
    return validateURL(control.value) ? null : { url: true };
  }

  get isPresencial(): boolean {
    return this.form.controls.modalidade.value === 'Presencial';
  }

  onTagsSelectionChange(tagIds: string[]): void {
    if (tagIds.length > 3) {
      this.notification.showNotification('Selecione no máximo 3 tags', 'error');
      return;
    }
    this.selectedTagIds.set(tagIds);
  }

  isTagOptionDisabled(tagId: string): boolean {
    return !this.selectedTagIds().includes(tagId) && this.selectedTagIds().length >= 3;
  }

  onImageFileSelected(event: Event): void {
    const input = event.target as HTMLInputElement;
    const file = input.files?.[0];
    if (!file) return;

    const result = validateImageFile(file);
    if (!result.valid) {
      this.imageError.set(result.error ?? null);
      this.notification.showNotification(result.error ?? 'Imagem inválida', 'error');
      return;
    }

    this.imageError.set(null);
    this.selectedImageFile.set(file);
    this.form.controls.imagemUrl.setValue('');

    const reader = new FileReader();
    reader.onload = () => this.imagePreview.set(reader.result as string);
    reader.readAsDataURL(file);
  }

  onCancel(): void {
    this.dialogRef.close();
  }

  private buildPayload() {
    const value = this.form.getRawValue();
    return {
      nome: value.nome,
      descricao: value.descricao || null,
      data_evento: formatDateToDisplay(value.data_evento),
      horario: value.horario,
      dia_semana: value.dia_semana,
      periodo: value.periodo,
      link: value.link,
      imagem: this.selectedImageFile() ? null : value.imagemUrl || null,
      modalidade: value.modalidade,
      endereco: this.isPresencial ? value.endereco || null : null,
      cidade: this.isPresencial ? value.cidade || null : null,
      estado: this.isPresencial ? value.estado || null : null,
      status: value.status,
      slug: generateSlug(value.nome),
    };
  }

  onSubmit(): void {
    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.selectedTagIds().length === 0) {
      this.notification.showNotification('Selecione ao menos 1 tag', 'error');
      return;
    }

    const result: EventFormResult = {
      formData: this.buildPayload(),
      imageFile: this.selectedImageFile(),
      tagIds: this.selectedTagIds(),
    };

    this.dialogRef.close(result);
  }
}
