import { Location } from '@angular/common';
import { Component, OnInit, computed, inject, signal } from '@angular/core';
import { FormBuilder, ReactiveFormsModule, Validators } from '@angular/forms';
import { ActivatedRoute, Router } from '@angular/router';
import { finalize } from 'rxjs';
import { MatButtonModule } from '@angular/material/button';
import { MatFormFieldModule } from '@angular/material/form-field';
import { MatIconModule } from '@angular/material/icon';
import { MatInputModule } from '@angular/material/input';
import { MatProgressSpinnerModule } from '@angular/material/progress-spinner';
import { TagService } from '../../../../core/services/tag.service';
import { NotificationService } from '../../../../shared/services/notification.service';

const DEFAULT_COLOR = '#2563eb';

@Component({
  selector: 'app-tag-form',
  imports: [
    ReactiveFormsModule,
    MatButtonModule,
    MatFormFieldModule,
    MatIconModule,
    MatInputModule,
    MatProgressSpinnerModule,
  ],
  templateUrl: './tag-form.html',
  styleUrl: './tag-form.scss',
})
export class TagForm implements OnInit {
  private readonly fb = inject(FormBuilder);
  private readonly route = inject(ActivatedRoute);
  private readonly router = inject(Router);
  private readonly location = inject(Location);
  private readonly tagService = inject(TagService);
  private readonly notification = inject(NotificationService);

  private readonly tagId = this.route.snapshot.paramMap.get('id');

  readonly isEdit = !!this.tagId;
  readonly loading = signal(this.isEdit);
  readonly saving = signal(false);
  readonly pageTitle = computed(() => (this.isEdit ? 'Editar Tag' : 'Nova Tag'));

  readonly form = this.fb.nonNullable.group({
    nome: ['', Validators.required],
    cor: [DEFAULT_COLOR, Validators.required],
  });

  ngOnInit(): void {
    if (!this.tagId) return;

    this.tagService
      .getTags()
      .pipe(finalize(() => this.loading.set(false)))
      .subscribe({
        next: (tags) => {
          const tag = tags.find((item) => item.id === this.tagId);

          if (!tag) {
            this.notification.showNotification('Tag não encontrada', 'error');
            this.navigateToList();
            return;
          }

          this.form.patchValue({
            nome: tag.nome,
            cor: tag.cor,
          });
        },
      });
  }

  onSubmit(): void {
    if (this.saving()) return;

    if (this.form.invalid) {
      this.form.markAllAsTouched();
      return;
    }

    const result = this.form.getRawValue();
    const request = this.tagId
      ? this.tagService.updateTag(this.tagId, result)
      : this.tagService.createTag(result);

    this.saving.set(true);

    request.pipe(finalize(() => this.saving.set(false))).subscribe({
      next: () => {
        this.notification.showNotification(
          this.isEdit ? 'Tag atualizada com sucesso' : 'Tag criada com sucesso',
          'success',
        );
        this.navigateToList();
      },
    });
  }

  onCancel(): void {
    this.navigateToList();
  }

  goBack(): void {
    if (window.history.length > 1) {
      this.location.back();
      return;
    }

    this.navigateToList();
  }

  private navigateToList(): void {
    this.router.navigate(['/admin/dashboard/tags']);
  }
}
