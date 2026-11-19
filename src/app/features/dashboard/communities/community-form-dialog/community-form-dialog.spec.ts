import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, Subject, throwError } from 'rxjs';
import { CommunityRead } from '../../../../core/models/community.model';
import { CommunityService } from '../../../../core/services/community.service';
import { CommunityFormDialog, CommunityFormDialogData } from './community-form-dialog';

const EXISTING = { id: 'c1', nome: 'Café Bugado' } as CommunityRead;

describe('CommunityFormDialog', () => {
  let service: { createCommunity: ReturnType<typeof vi.fn>; updateCommunity: ReturnType<typeof vi.fn> };
  let dialogRef: { close: ReturnType<typeof vi.fn>; disableClose: boolean };
  let fixture: ComponentFixture<CommunityFormDialog>;

  function setup(data: CommunityFormDialogData = {}): CommunityFormDialog {
    service = { createCommunity: vi.fn(() => of(EXISTING)), updateCommunity: vi.fn(() => of(EXISTING)) };
    dialogRef = { close: vi.fn(), disableClose: false };

    TestBed.configureTestingModule({
      imports: [CommunityFormDialog],
      providers: [
        { provide: CommunityService, useValue: service },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(CommunityFormDialog);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('cria pelo próprio diálogo e fecha com true em caso de sucesso', () => {
    const component = setup();
    component.form.controls.nome.setValue('Nova comunidade');

    component.save();

    expect(service.createCommunity).toHaveBeenCalledWith({ nome: 'Nova comunidade' });
    expect(dialogRef.close).toHaveBeenCalledWith(true);
    expect(component.saving()).toBe(false);
  });

  it('edita pelo id da comunidade', () => {
    const component = setup({ community: EXISTING });
    component.form.controls.nome.setValue('Café Bugado SP');

    component.save();

    expect(service.createCommunity).not.toHaveBeenCalled();
    expect(service.updateCommunity).toHaveBeenCalledWith('c1', { nome: 'Café Bugado SP' });
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('mantém aberto, bloqueado e com carregamento durante o envio', () => {
    const component = setup();
    const pending = new Subject<CommunityRead>();
    service.createCommunity.mockReturnValue(pending);
    component.form.controls.nome.setValue('Nova comunidade');

    component.save();
    fixture.detectChanges();

    expect(component.saving()).toBe(true);
    expect(dialogRef.disableClose).toBe(true);
    expect(dialogRef.close).not.toHaveBeenCalled();
    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('mat-dialog-actions button'));
    expect(buttons.map((b) => b.disabled)).toEqual([true, true]);
    expect(buttons[1].textContent).toContain('Salvando');

    pending.next(EXISTING);
    pending.complete();

    expect(dialogRef.disableClose).toBe(false);
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('não envia duas vezes com clique duplo', () => {
    const component = setup();
    service.createCommunity.mockReturnValue(new Subject<CommunityRead>());
    component.form.controls.nome.setValue('Nova comunidade');

    component.save();
    component.save();

    expect(service.createCommunity).toHaveBeenCalledTimes(1);
  });

  it('em erro, continua aberto com o nome digitado e permite tentar de novo', () => {
    const component = setup();
    service.createCommunity.mockReturnValueOnce(throwError(() => ({ status: 409 })));
    component.form.controls.nome.setValue('Duplicada');

    component.save();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.saving()).toBe(false);
    expect(dialogRef.disableClose).toBe(false);
    expect(component.form.controls.nome.value).toBe('Duplicada');

    component.save();

    expect(service.createCommunity).toHaveBeenCalledTimes(2);
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('não envia com formulário inválido', () => {
    const component = setup();
    component.form.controls.nome.setValue('x');

    component.save();

    expect(service.createCommunity).not.toHaveBeenCalled();
    expect(component.form.controls.nome.touched).toBe(true);
  });

  it('Cancelar não fecha durante o envio', () => {
    const component = setup();
    service.createCommunity.mockReturnValue(new Subject<CommunityRead>());
    component.form.controls.nome.setValue('Nova comunidade');

    component.save();
    component.cancel();

    expect(dialogRef.close).not.toHaveBeenCalled();
  });
});
