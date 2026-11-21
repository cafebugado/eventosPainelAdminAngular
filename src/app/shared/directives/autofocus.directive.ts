import { Directive, ElementRef, afterNextRender, inject } from '@angular/core';

/**
 * Foca o elemento assim que ele é renderizado.
 *
 * O atributo nativo `autofocus` só é aplicado pelo navegador no carregamento
 * inicial do documento, então não funciona em navegações internas da SPA nem
 * em elementos que aparecem depois (ex.: formulário exibido após o loading).
 */
@Directive({
  selector: '[appAutofocus]',
})
export class AutofocusDirective {
  private readonly elementRef = inject<ElementRef<HTMLElement>>(ElementRef);

  constructor() {
    afterNextRender(() => this.elementRef.nativeElement.focus());
  }
}
