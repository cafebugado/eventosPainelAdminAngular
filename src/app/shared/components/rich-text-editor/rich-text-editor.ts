import { Component, ElementRef, forwardRef, ViewChild } from '@angular/core';
import { ControlValueAccessor, NG_VALUE_ACCESSOR } from '@angular/forms';
import { MatButtonModule } from '@angular/material/button';
import { MatIconModule } from '@angular/material/icon';
import { MatTooltipModule } from '@angular/material/tooltip';

@Component({
  selector: 'app-rich-text-editor',
  imports: [MatButtonModule, MatIconModule, MatTooltipModule],
  templateUrl: './rich-text-editor.html',
  styleUrl: './rich-text-editor.scss',
  providers: [
    {
      provide: NG_VALUE_ACCESSOR,
      useExisting: forwardRef(() => RichTextEditor),
      multi: true,
    },
  ],
})
export class RichTextEditor implements ControlValueAccessor {
  @ViewChild('editor') editorRef!: ElementRef<HTMLDivElement>;

  disabled = false;
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  writeValue(value: string): void {
    if (this.editorRef) {
      this.editorRef.nativeElement.innerHTML = value ?? '';
    }
  }

  registerOnChange(fn: (value: string) => void): void {
    this.onChange = fn;
  }

  registerOnTouched(fn: () => void): void {
    this.onTouched = fn;
  }

  setDisabledState(isDisabled: boolean): void {
    this.disabled = isDisabled;
  }

  applyCommand(command: string): void {
    document.execCommand(command, false);
    this.emitChange();
  }

  onInput(): void {
    this.emitChange();
  }

  onBlur(): void {
    this.onTouched();
  }

  private emitChange(): void {
    this.onChange(this.editorRef.nativeElement.innerHTML);
  }
}
