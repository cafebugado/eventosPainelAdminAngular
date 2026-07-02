import { Location } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, ValidationErrors, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize, forkJoin, of, switchMap } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatCheckboxModule } from '@angular/material/checkbox';
import { MatDatepickerModule } from '@angular/material/datepicker';
import { MatDialog } from '@angular/material/dialog';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { MatSelectModule } from '@angular/material/select';
import { MatTooltipModule } from '@angular/material/tooltip';
import { AuthService } from '../../../../core/services/auth.service';
import { EventoStatus, EventoWithTags } from '../../../../core/models/evento.model';
import { TagRead } from '../../../../core/models/tag.model';
import { EventService } from '../../../../core/services/event.service';
import { RoleService } from '../../../../core/services/role.service';
import { TagService } from '../../../../core/services/tag.service';
import { ConfirmDialog } from '../../../../shared/components/confirm-dialog/confirm-dialog';
import { LocationSelector } from '../../../../shared/components/location-selector/location-selector';
import { RichTextEditor } from '../../../../shared/components/rich-text-editor/rich-text-editor';
import { NotificationService } from '../../../../shared/services/notification.service';
import { formatDateToDisplay, formatDateToInput, getDayName, getPeriodoFromHorario } from '../../../../shared/utils/event-date.util';
import { validateImageFile } from '../../../../shared/utils/image-validators.util';
import { resizeImageFile } from '../../../../shared/utils/image-resize.util';
import { generateSlug } from '../../../../shared/utils/slug.util';
import { validateURL } from '../../../../shared/utils/url-validators.util';

@Component({
  selector: 'app-event-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatCheckboxModule,
    MatDatepickerModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
    MatSelectModule,
    MatTooltipModule,
    LocationSelector,
    RichTextEditor,
  ],
  templateUrl: './event-form.html',
  styleUrl: './event-form.scss',
})
export class EventForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly authService = inject(AuthService);
  private readonly eventService = inject(EventService);
  private readonly roleService = inject(RoleService);
  private readonly tagService = inject(TagService);
  private readonly dialog = inject(MatDialog);
  private readonly notification = inject(NotificationService);

  private readonly slugOrId = this.route.snapshot.paramMap.get('slug');
  readonly isEdit = !!this.slugOrId;
  private eventId: string | undefined;
  private initialEditState = '';

  readonly loading = signal(this.isEdit);
  readonly event = signal<EventoWithTags | undefined>(undefined);
  readonly availableTags = signal<TagRead[]>([]);
  readonly selectedTagIds = signal<string[]>([]);
  readonly imagePreview = signal<string | null>(null);
  readonly selectedImageFile = signal<File | undefined>(undefined);
  readonly imageRemoved = signal(false);
  readonly imageError = signal<string | null>(null);
  readonly saving = signal(false);
  readonly hasCreateInformation = signal(false);
  readonly hasEditChanges = signal(false);

  readonly periodos = ['Matinal', 'Diurno', 'Vespertino', 'Noturno'] as const;
  readonly modalidades = ['Online', 'Presencial'] as const;
  readonly statuses = [
    { value: 'rascunho', label: 'Rascunho' },
    { value: 'publicado', label: 'Publicado' },
    { value: 'arquivado', label: 'Arquivado' },
  ];

  readonly pageTitle = computed(() => (this.isEdit ? 'Editar Evento' : 'Novo Evento'));
  readonly formActionsDisabled = computed(
    () => this.saving() || (this.isEdit ? !this.hasEditChanges() : !this.hasCreateInformation()),
  );
  readonly canDeleteEvent = computed(() => {
    const event = this.event();
    if (!this.isEdit || !event) return false;

    const permissions = this.roleService.permissions();
    if (!permissions.canDeleteEvents) return false;

    if (this.roleService.role() === 'moderador') {
      return event.created_by === this.authService.currentUser()?.id;
    }

    return true;
  });
  readonly minDate = new Date(new Date().setHours(0, 0, 0, 0));

  readonly form = this.fb.nonNullable.group({
    nome: ['', Validators.required],
    descricao: [''],
    data_evento: this.fb.control<Date | null>(null, [Validators.required, this.pastDateValidator]),
    dia_semana: [''],
    horario: ['', Validators.required],
    periodo: [null as (typeof this.periodos)[number] | null],
    link: ['', [Validators.required, this.urlValidator]],
    imagemUrl: [''],
    modalidade: ['Online' as string],
    endereco: [''],
    cidade: [''],
    estado: [''],
    status: ['publicado' as EventoStatus, Validators.required],
  });

  ngOnInit(): void {
    this.tagService
      .getTags()
      .subscribe((tags) =>
        this.availableTags.set([...tags].sort((a, b) => a.nome.localeCompare(b.nome, 'pt-BR'))),
      );

    if (this.slugOrId) {
      this.loadEvent(this.slugOrId);
    }

    this.form.valueChanges.subscribe(() => this.updateFormActionsState());

    this.form.controls.data_evento.valueChanges.subscribe((value) => {
      this.form.controls.dia_semana.setValue(getDayName(value));
    });

    this.form.controls.horario.valueChanges.subscribe((value) => {
      const periodo = getPeriodoFromHorario(value);
      if (periodo) {
        this.form.controls.periodo.setValue(periodo);
      }
    });

    this.form.controls.imagemUrl.valueChanges.subscribe((value) => {
      const imageUrl = value.trim();

      if (imageUrl) {
        this.selectedImageFile.set(undefined);
        this.imageRemoved.set(false);
        this.imageError.set(null);
      }

      this.imagePreview.set(imageUrl && validateURL(imageUrl) ? imageUrl : null);
      this.updateFormActionsState();
    });
  }

  private loadEvent(slugOrId: string): void {
    this.eventService.getEventBySlugOrId(slugOrId).subscribe((event) => {
      this.eventId = event.id;
      this.tagService.getEventTags(event.id).subscribe((tags) => {
        const eventWithTags: EventoWithTags = { ...event, tags };
        this.event.set(eventWithTags);
        this.selectedTagIds.set(tags.map((t) => t.id));
        this.imagePreview.set(event.imagem ?? null);
        this.imageRemoved.set(false);
        this.patchForm(eventWithTags);
        this.initialEditState = this.getComparableFormState();
        this.updateFormActionsState();
        this.loading.set(false);
      });
    });
  }

  private patchForm(event: EventoWithTags): void {
    this.form.patchValue({
      nome: event.nome,
      descricao: event.descricao ?? '',
      data_evento: formatDateToInput(event.data_evento),
      dia_semana: event.dia_semana,
      horario: event.horario,
      periodo: event.periodo ?? null,
      link: event.link,
      imagemUrl: event.imagem ?? '',
      modalidade: event.modalidade ?? 'Online',
      endereco: event.endereco ?? '',
      cidade: event.cidade ?? '',
      estado: event.estado ?? '',
      status: event.status,
    });
  }

  private updateCreateInformationState(): void {
    const value = this.form.getRawValue();
    this.hasCreateInformation.set(
      !!(
        value.nome.trim() ||
        value.descricao.trim() ||
        value.data_evento ||
        value.horario.trim() ||
        value.periodo ||
        value.link.trim() ||
        value.imagemUrl.trim() ||
        value.modalidade !== 'Online' ||
        value.status !== 'publicado' ||
        value.endereco.trim() ||
        value.cidade.trim() ||
        value.estado.trim() ||
        this.selectedTagIds().length ||
        this.selectedImageFile()
      ),
    );
  }

  private updateEditChangesState(): void {
    this.hasEditChanges.set(!!this.initialEditState && this.getComparableFormState() !== this.initialEditState);
  }

  private updateFormActionsState(): void {
    if (this.isEdit) {
      this.updateEditChangesState();
      return;
    }

    this.updateCreateInformationState();
  }

  private getComparableFormState(): string {
    const value = this.form.getRawValue();

    return JSON.stringify({
      nome: value.nome.trim(),
      descricao: value.descricao.trim(),
      data_evento: this.getDateKey(value.data_evento),
      horario: value.horario.trim(),
      periodo: value.periodo ?? '',
      link: value.link.trim(),
      imagemUrl: value.imagemUrl.trim(),
      modalidade: value.modalidade,
      endereco: value.endereco.trim(),
      cidade: value.cidade.trim(),
      estado: value.estado.trim(),
      status: value.status,
      tagIds: [...this.selectedTagIds()].sort(),
      hasSelectedImageFile: !!this.selectedImageFile(),
    });
  }

  private getDateKey(value: Date | null): string {
    if (!value) return '';

    const year = value.getFullYear();
    const month = `${value.getMonth() + 1}`.padStart(2, '0');
    const day = `${value.getDate()}`.padStart(2, '0');
    return `${year}-${month}-${day}`;
  }

  private urlValidator(control: { value: string }) {
    if (!control.value) return null;
    return validateURL(control.value) ? null : { url: true };
  }

  private pastDateValidator(control: { value: Date | null }): ValidationErrors | null {
    if (!control.value) return null;
    const today = new Date(new Date().setHours(0, 0, 0, 0));
    return control.value < today ? { pastDate: true } : null;
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
    this.updateFormActionsState();
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
    this.imageRemoved.set(false);
    this.form.controls.imagemUrl.setValue('');

    resizeImageFile(file).then((resized) => {
      this.selectedImageFile.set(resized);
      this.updateFormActionsState();

      const reader = new FileReader();
      reader.onload = () => this.imagePreview.set(reader.result as string);
      reader.readAsDataURL(resized);
    });
  }

  onRemoveImage(fileInput?: HTMLInputElement): void {
    this.selectedImageFile.set(undefined);
    this.imageRemoved.set(true);
    this.imageError.set(null);
    this.imagePreview.set(null);
    this.form.controls.imagemUrl.setValue('');

    if (fileInput) {
      fileInput.value = '';
    }

    this.updateFormActionsState();
  }

  onCancel(): void {
    this.router.navigate(['/admin/dashboard/eventos']);
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.router.navigate(['/admin/dashboard/eventos']);
  }

  onDelete(): void {
    const event = this.event();
    const eventId = this.eventId;
    if (!event || !eventId || !this.canDeleteEvent()) return;

    const ref = this.dialog.open(ConfirmDialog, {
      data: {
        title: 'Excluir evento',
        message: `Tem certeza que deseja excluir o evento "${event.nome}"?`,
      },
    });

    ref.afterClosed().subscribe((confirmed) => {
      if (!confirmed) return;

      this.eventService.deleteEvent(eventId).subscribe({
        next: () => {
          this.eventService.removeLocal(eventId);
          this.notification.showNotification('Evento excluído com sucesso', 'success');
          this.router.navigate(['/admin/dashboard/eventos']);
        },
        error: () => {
          this.notification.showNotification('Erro ao excluir evento', 'error');
        },
      });
    });
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
    if (this.saving()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    if (this.selectedTagIds().length === 0) {
      this.notification.showNotification('Selecione ao menos 1 tag', 'error');
      return;
    }

    const formData = this.buildPayload();
    const tagIds = this.selectedTagIds();
    const imageFile = this.selectedImageFile();
    const shouldDeleteImage = this.imageRemoved() && !!this.eventId && !imageFile;
    const eventId = this.eventId;

    const save$ = eventId
      ? shouldDeleteImage
        ? this.eventService.deleteEventImage(eventId).pipe(
            switchMap(() => this.eventService.updateEvent(eventId, formData)),
          )
        : this.eventService.updateEvent(eventId, formData)
      : this.eventService.createEvent(formData);

    this.saving.set(true);

    save$
      .pipe(
        switchMap((saved) =>
          forkJoin({
            saved: of(saved),
            tags: this.tagService.setEventTags(saved.id, tagIds),
            image: imageFile ? this.eventService.uploadEventImage(saved.id, imageFile) : of(null),
          }),
        ),
        finalize(() => this.saving.set(false)),
      )
      .subscribe({
        next: ({ saved, image }) => {
          this.eventService.upsertLocal(image ?? saved);
          this.notification.showNotification(
            this.isEdit ? 'Evento atualizado com sucesso' : 'Evento criado com sucesso',
            'success',
          );
          this.router.navigate(['/admin/dashboard/eventos']);
        },
        error: () => {
          this.notification.showNotification('Erro ao salvar evento', 'error');
        },
      });
  }
}
