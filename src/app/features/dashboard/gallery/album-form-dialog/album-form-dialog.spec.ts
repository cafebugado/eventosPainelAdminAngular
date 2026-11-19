import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { of, Subject, throwError } from 'rxjs';
import { GaleriaAlbumRead } from '../../../../core/models/gallery.model';
import { CommunityService } from '../../../../core/services/community.service';
import { EventService } from '../../../../core/services/event.service';
import { GalleryService } from '../../../../core/services/gallery.service';
import { AlbumFormDialog, AlbumFormDialogData } from './album-form-dialog';

const ALBUM = { id: 'a1', evento_id: 'e1', comunidade_id: null } as GaleriaAlbumRead;

describe('AlbumFormDialog', () => {
  let gallery: { createAlbum: ReturnType<typeof vi.fn>; updateAlbum: ReturnType<typeof vi.fn> };
  let dialogRef: { close: ReturnType<typeof vi.fn>; disableClose: boolean };
  let fixture: ComponentFixture<AlbumFormDialog>;

  function setup(data: AlbumFormDialogData = {}): AlbumFormDialog {
    gallery = { createAlbum: vi.fn(() => of(ALBUM)), updateAlbum: vi.fn(() => of(ALBUM)) };
    dialogRef = { close: vi.fn(), disableClose: false };

    TestBed.configureTestingModule({
      imports: [AlbumFormDialog],
      providers: [
        { provide: GalleryService, useValue: gallery },
        { provide: EventService, useValue: { getEvents: () => of([]) } },
        { provide: CommunityService, useValue: { getCommunities: () => of([]) } },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(AlbumFormDialog);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  it('cria álbum de comunidade e fecha com true', () => {
    const component = setup();
    component.form.patchValue({ vinculo: 'comunidade', comunidade_id: 'c1' });

    component.save();

    expect(gallery.createAlbum).toHaveBeenCalledWith({ evento_id: null, comunidade_id: 'c1' });
    expect(dialogRef.close).toHaveBeenCalledWith(true);
  });

  it('cria álbum de evento', () => {
    const component = setup();
    component.form.patchValue({ vinculo: 'evento', evento_id: 'e1' });

    component.save();

    expect(gallery.createAlbum).toHaveBeenCalledWith({ evento_id: 'e1', comunidade_id: null });
  });

  it('edita pelo id quando recebe um álbum', () => {
    const component = setup({ album: ALBUM });

    component.save();

    expect(gallery.createAlbum).not.toHaveBeenCalled();
    expect(gallery.updateAlbum).toHaveBeenCalledWith('a1', { evento_id: 'e1', comunidade_id: null });
  });

  it('exige o vínculo selecionado', () => {
    const component = setup();
    component.form.patchValue({ vinculo: 'evento', evento_id: '' });

    component.save();

    expect(gallery.createAlbum).not.toHaveBeenCalled();
    expect(component.form.controls.evento_id.hasError('required')).toBe(true);
  });

  it('mantém aberto, bloqueado e com carregamento durante o envio', () => {
    const component = setup();
    gallery.createAlbum.mockReturnValue(new Subject<GaleriaAlbumRead>());
    component.form.patchValue({ vinculo: 'comunidade', comunidade_id: 'c1' });

    component.save();
    component.save();
    component.cancel();
    fixture.detectChanges();

    expect(gallery.createAlbum).toHaveBeenCalledTimes(1);
    expect(dialogRef.disableClose).toBe(true);
    expect(dialogRef.close).not.toHaveBeenCalled();
    const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('mat-dialog-actions button'));
    expect(buttons.map((b) => b.disabled)).toEqual([true, true]);
    expect(buttons[1].textContent).toContain('Salvando');
  });

  it('em erro, continua aberto com a seleção preservada', () => {
    const component = setup();
    gallery.createAlbum.mockReturnValue(throwError(() => ({ status: 422 })));
    component.form.patchValue({ vinculo: 'comunidade', comunidade_id: 'c1' });

    component.save();

    expect(dialogRef.close).not.toHaveBeenCalled();
    expect(component.saving()).toBe(false);
    expect(dialogRef.disableClose).toBe(false);
    expect(component.form.getRawValue()).toMatchObject({ vinculo: 'comunidade', comunidade_id: 'c1' });
  });
});
