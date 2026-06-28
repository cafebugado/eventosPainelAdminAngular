import { AfterViewInit, Component, ElementRef, forwardRef, ViewChild } from '@angular/core';
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
export class RichTextEditor implements ControlValueAccessor, AfterViewInit {
  @ViewChild('editor') editorRef!: ElementRef<HTMLTextAreaElement>;

  disabled = false;
  private pendingValue = '';
  private onChange: (value: string) => void = () => {};
  private onTouched: () => void = () => {};

  ngAfterViewInit(): void {
    this.editorRef.nativeElement.value = this.pendingValue;
  }

  writeValue(value: string): void {
    this.pendingValue = value ?? '';
    if (this.editorRef) {
      this.editorRef.nativeElement.value = this.pendingValue;
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

  onInput(): void {
    this.emitChange();
  }

  onBlur(): void {
    this.onTouched();
  }

  applyBold(): void {
    this.wrapSelection('**', '**');
  }

  applyItalic(): void {
    this.wrapSelection('*', '*');
  }

  applyUnorderedList(): void {
    this.applyLinePrefix(() => '- ');
  }

  applyOrderedList(): void {
    let counter = 1;
    this.applyLinePrefix(() => `${counter++}. `);
  }

  applyLink(): void {
    const textarea = this.editorRef.nativeElement;
    const { selectionStart, selectionEnd } = textarea;
    const selectedText = textarea.value.slice(selectionStart, selectionEnd);
    const url = window.prompt('Informe a URL do link:', 'https://');
    if (!url) {
      return;
    }

    const label = selectedText || 'texto do link';
    const markdown = `[${label}](${url})`;
    this.replaceSelection(markdown);

    const labelStart = selectionStart + 1;
    textarea.setSelectionRange(labelStart, labelStart + label.length);
  }

  private wrapSelection(prefix: string, suffix: string): void {
    const textarea = this.editorRef.nativeElement;
    const { selectionStart, selectionEnd, value } = textarea;
    const selectedText = value.slice(selectionStart, selectionEnd);

    this.replaceSelection(`${prefix}${selectedText}${suffix}`);

    textarea.setSelectionRange(selectionStart + prefix.length, selectionStart + prefix.length + selectedText.length);
  }

  private applyLinePrefix(nextPrefix: () => string): void {
    const textarea = this.editorRef.nativeElement;
    const { selectionStart, selectionEnd, value } = textarea;

    const lineStart = value.lastIndexOf('\n', selectionStart - 1) + 1;
    let lineEnd = value.indexOf('\n', selectionEnd);
    if (lineEnd === -1) {
      lineEnd = value.length;
    }

    const block = value.slice(lineStart, lineEnd);
    const lines = block.split('\n');
    const updatedLines = lines.map((line) => `${nextPrefix()}${line}`);
    const updatedBlock = updatedLines.join('\n');

    textarea.value = value.slice(0, lineStart) + updatedBlock + value.slice(lineEnd);
    const offset = updatedBlock.length - block.length;
    textarea.setSelectionRange(selectionStart, selectionEnd + offset);
    textarea.focus();
    this.emitChange();
  }

  private replaceSelection(text: string): void {
    const textarea = this.editorRef.nativeElement;
    const { selectionStart, selectionEnd, value } = textarea;

    textarea.value = value.slice(0, selectionStart) + text + value.slice(selectionEnd);
    textarea.focus();
    this.emitChange();
  }

  private emitChange(): void {
    this.onChange(this.editorRef.nativeElement.value);
  }
}
