import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, Subject, throwError } from 'rxjs';
import { EventoRead } from '../../../../../core/models/evento.model';
import { EventService } from '../../../../../core/services/event.service';
import { RejectEventDialog } from './reject-event-dialog';

const MOTIVO = 'Faltou informar o local do evento.';

describe('RejectEventDialog', () => {
  let service: { rejectEvent: ReturnType<typeof vi.fn> };
  let dialogRef: { close: ReturnType<typeof vi.fn>; disableClose: boolean };
  let fixture: ComponentFixture<RejectEventDialog>;

  function setup(): RejectEventDialog {
    service = { rejectEvent: vi.fn(() => of({} as EventoRead)) };
    dialogRef = { close: vi.fn(), disableClose: false };

    TestBed.configureTestingModule({
      imports: [RejectEventDialog],
      providers: [
        { provide: EventService, useValue: service },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: { eventId: 'ev1' } },
      ],
    });
    fixture = TestBed.createComponent(RejectEventDialog);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('envia a recusa pelo próprio diálogo e fecha com true', () => {
    const component = setup();
    component.motivo.setValue(`  ${MOTIVO}  `);

    component.confirm();

    expect(service.rejectEvent).toHaveBeenCalledWith('ev1', MOTIVO);
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('mantém aberto, bloqueado e com carregamento durante o envio', () => {
    const component = setup();
    service.rejectEvent.mockReturnValue(new Subject<EventoRead>());
    component.motivo.setValue(MOTIVO);

    component.confirm();
    component.confirm();
    component.cancel();
    fixture.detectChanges();

    expect(service.rejectEvent).toHaveBeenCalledTimes(1);
    expect(dialogRef.disableClose).toBe(true);
    expect(dialogRef.close).not.toHaveBeenCalled();
    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('mat-dialog-actions button'));
    expect(buttons.map((b) => b.disabled)).toEqual([true, true]);
    expect(buttons[1].textContent).toContain('Recusando');
  });

  it('em erro, continua aberto com o motivo digitado e permite tentar de novo', () => {
    const component = setup();
    service.rejectEvent.mockReturnValueOnce(throwError(() => ({ status: 500 })));
    component.motivo.setValue(MOTIVO);

    component.confirm();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.saving()).toBe(false);
    expect(dialogRef.disableClose).toBe(false);
    expect(component.motivo.value).toBe(MOTIVO);

    component.confirm();

    expect(service.rejectEvent).toHaveBeenCalledTimes(2);
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('não envia motivo curto demais', () => {
    const component = setup();
    component.motivo.setValue('curto');

    component.confirm();

    expect(service.rejectEvent).not.toHaveBeenCalled();
    expect(component.motivo.touched).toBe(true);
  });
});
