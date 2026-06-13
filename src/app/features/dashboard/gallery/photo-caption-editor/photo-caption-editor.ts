import { Component, input, output, signal } from '@angular/core';
import { FormsModule } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';

@Component({
  selector: 'app-photo-caption-editor',
  imports: [FormsModule, MatButtonModule, MatIconModule],
  templateUrl: './photo-caption-editor.html',
  styleUrl: './photo-caption-editor.scss',
})
export class PhotoCaptionEditor {
  readonly legenda = input<string | null | undefined>(null);
  readonly save = output<string>();

  readonly editing = signal(false);
  readonly draft = signal('');

  startEdit(): void {
    this.draft.set(this.legenda() ?? '');
    this.editing.set(true);
  }

  confirm(): void {
    this.save.emit(this.draft());
    this.editing.set(false);
  }

  cancel(): void {
    this.editing.set(false);
  }
}
