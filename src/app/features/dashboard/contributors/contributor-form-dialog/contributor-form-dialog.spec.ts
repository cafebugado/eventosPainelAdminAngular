import { ComponentFixture, TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable, of, Subject, throwError } from 'rxjs';
import { ContributorRead, GitHubUserInfo } from '../../../../core/models/contributor.model';
import { ContributorService } from '../../../../core/services/contributor.service';
import { NotificationService } from '../../../../shared/services/notification.service';
import { ContributorFormDialog, ContributorFormDialogData } from './contributor-form-dialog';
import { GITHUB_UNAVAILABLE_MESSAGE, GITHUB_USER_NOT_FOUND_MESSAGE } from './github-lookup-error';

const OCTOCAT: GitHubUserInfo = {
  github_username: 'octocat',
  nome: 'The Octocat',
  avatar_url: 'https://avatars.githubusercontent.com/u/583231',
  github_url: 'https://github.com/octocat',
};

const EXISTING: ContributorRead = {
  id: 'c1',
  github_username: 'fulano',
  nome: 'Fulano',
  avatar_url: 'https://github.com/fulano.png',
  github_url: 'https://github.com/Fulano',
  linkedin_url: 'https://www.linkedin.com/in/fulano',
  portfolio_url: null,
  created_at: '2026-01-01T00:00:00Z',
  updated_at: '2026-01-01T00:00:00Z',
};

describe('ContributorFormDialog', () => {
  let service: {
    fetchGitHubUser: ReturnType<typeof vi.fn<(username: string) => Observable<GitHubUserInfo>>>;
    createContributor: ReturnType<typeof vi.fn>;
    updateContributor: ReturnType<typeof vi.fn>;
  };
  let dialogRef: { close: ReturnType<typeof vi.fn>; disableClose: boolean };
  let notification: { showNotification: ReturnType<typeof vi.fn> };
  let fixture: ComponentFixture<ContributorFormDialog>;

  function setup(data: ContributorFormDialogData = {}): ContributorFormDialog {
    service = {
      fetchGitHubUser: vi.fn(),
      createContributor: vi.fn(() => of(EXISTING)),
      updateContributor: vi.fn(() => of(EXISTING)),
    };
    dialogRef = { close: vi.fn(), disableClose: false };
    notification = { showNotification: vi.fn() };

    TestBed.configureTestingModule({
      imports: [ContributorFormDialog],
      providers: [
        { provide: ContributorService, useValue: service },
        { provide: MatDialogRef, useValue: dialogRef },
        { provide: NotificationService, useValue: notification },
        { provide: MAT_DIALOG_DATA, useValue: data },
      ],
    });
    fixture = TestBed.createComponent(ContributorFormDialog);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  /** Payload enviado no último salvamento (criação ou edição). */
  function submittedPayload(): unknown {
    const create = service.createContributor.mock.lastCall?.[0];
    const update = service.updateContributor.mock.lastCall?.[1];
    return create ?? update;
  }

  describe('buscar no GitHub', () => {
    it('preenche nome e avatar com a resposta da API', () => {
      const component = setup();
      service.fetchGitHubUser.mockReturnValue(of(OCTOCAT));
      component.form.controls.github_username.setValue(' octocat ');

      component.searchGitHub();

      expect(service.fetchGitHubUser).toHaveBeenCalledWith('octocat');
      expect(component.form.controls.nome.value).toBe('The Octocat');
      expect(component.form.controls.avatar_url.value).toBe(OCTOCAT.avatar_url);
      expect(component.searchingGithub()).toBe(false);
      expect(notification.showNotification).not.toHaveBeenCalled();
    });

    it('remove espaços nas pontas do nome e do avatar vindos do GitHub', () => {
      const component = setup();
      service.fetchGitHubUser.mockReturnValue(
        of({ ...OCTOCAT, nome: '  The Octocat ', avatar_url: ` ${OCTOCAT.avatar_url} ` }),
      );
      component.form.controls.github_username.setValue('octocat');

      component.searchGitHub();

      expect(component.form.controls.nome.value).toBe('The Octocat');
      expect(component.form.controls.avatar_url.value).toBe(OCTOCAT.avatar_url);
    });

    it('mantém o nome digitado quando o GitHub devolve só espaços', () => {
      const component = setup();
      service.fetchGitHubUser.mockReturnValue(of({ ...OCTOCAT, nome: '   ' }));
      component.form.controls.github_username.setValue('octocat');
      component.form.controls.nome.setValue('Octo Manual');

      component.searchGitHub();

      expect(component.form.controls.nome.value).toBe('Octo Manual');
    });

    it('mostra só "usuário não encontrado" quando o GitHub responde 404', () => {
      const component = setup();
      service.fetchGitHubUser.mockReturnValue(
        throwError(() => ({ status: 502, error: { detail: 'Falha ao consultar a API do GitHub: 404' } })),
      );
      component.form.controls.github_username.setValue('naoexiste');

      component.searchGitHub();

      expect(notification.showNotification).toHaveBeenCalledTimes(1);
      expect(notification.showNotification).toHaveBeenCalledWith(GITHUB_USER_NOT_FOUND_MESSAGE, 'error');
      expect(component.searchingGithub()).toBe(false);
    });

    it('mostra só a mensagem de indisponibilidade quando a integração falha', () => {
      const component = setup();
      service.fetchGitHubUser.mockReturnValue(
        throwError(() => ({ status: 502, error: { detail: 'Falha ao consultar a API do GitHub: 401' } })),
      );
      component.form.controls.github_username.setValue('octocat');

      component.searchGitHub();

      expect(notification.showNotification).toHaveBeenCalledTimes(1);
      expect(notification.showNotification).toHaveBeenCalledWith(GITHUB_UNAVAILABLE_MESSAGE, 'error');
    });

    it('usa o github_url devolvido pela busca no envio', () => {
      const component = setup();
      service.fetchGitHubUser.mockReturnValue(of({ ...OCTOCAT, github_url: 'https://github.com/OctoCat' }));
      component.form.controls.github_username.setValue('octocat');

      component.searchGitHub();
      component.onSubmit();

      expect(submittedPayload()).toMatchObject({ github_url: 'https://github.com/OctoCat' });
    });

    it('descarta o github_url da busca se o username mudar depois', () => {
      const component = setup();
      service.fetchGitHubUser.mockReturnValue(of({ ...OCTOCAT, github_url: 'https://github.com/OctoCat' }));
      component.form.controls.github_username.setValue('octocat');
      component.searchGitHub();

      component.form.controls.github_username.setValue('hubot');
      component.onSubmit();

      expect(submittedPayload()).toMatchObject({ github_username: 'hubot', github_url: 'https://github.com/hubot' });
    });

    it('com a busca falhando, ainda permite preencher e salvar manualmente', () => {
      const component = setup();
      service.fetchGitHubUser.mockReturnValue(throwError(() => ({ status: 502, error: null })));
      component.form.controls.github_username.setValue('octocat');
      component.searchGitHub();

      component.form.controls.nome.setValue('Octo Manual');
      component.onSubmit();

      expect(submittedPayload()).toMatchObject({
        github_username: 'octocat',
        nome: 'Octo Manual',
        github_url: 'https://github.com/octocat',
      });
    });

    it('na edição, mantém o github_url salvo enquanto o username não muda', () => {
      const component = setup({ contributor: EXISTING });

      component.onSubmit();

      expect(submittedPayload()).toMatchObject({ github_url: 'https://github.com/Fulano', portfolio_url: null });
    });

    it('não chama a API com username inválido', () => {
      const component = setup();
      component.form.controls.github_username.setValue('-invalido-');

      component.searchGitHub();

      expect(service.fetchGitHubUser).not.toHaveBeenCalled();
      expect(notification.showNotification).toHaveBeenCalledWith('Informe um username válido do GitHub', 'error');
    });
  });

  describe('salvar', () => {
    it('cria pelo próprio diálogo e fecha com true em caso de sucesso', () => {
      const component = setup();
      component.form.controls.github_username.setValue('octocat');

      component.onSubmit();

      expect(service.createContributor).toHaveBeenCalledWith({
        github_username: 'octocat',
        nome: 'octocat',
        avatar_url: 'https://github.com/octocat.png',
        github_url: 'https://github.com/octocat',
        linkedin_url: null,
        portfolio_url: null,
      });
      expect(dialogRef.close).toHaveBeenCalledWith(true);
      expect(component.saving()).toBe(false);
    });

    it('edita pelo id do contribuinte e fecha com true', () => {
      const component = setup({ contributor: EXISTING });
      component.form.controls.linkedin_url.setValue('');

      component.onSubmit();

      expect(service.createContributor).not.toHaveBeenCalled();
      expect(service.updateContributor).toHaveBeenCalledWith('c1', expect.objectContaining({ linkedin_url: null }));
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('mantém o diálogo aberto e bloqueado enquanto salva', () => {
      const component = setup();
      const pending = new Subject<ContributorRead>();
      service.createContributor.mockReturnValue(pending);
      component.form.controls.github_username.setValue('octocat');

      component.onSubmit();

      expect(component.saving()).toBe(true);
      expect(dialogRef.disableClose).toBe(true);
      expect(dialogRef.close).not.toHaveBeenCalled();

      pending.next(EXISTING);
      pending.complete();

      expect(component.saving()).toBe(false);
      expect(dialogRef.disableClose).toBe(false);
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('desabilita Salvar e Cancelar e mostra carregamento durante o envio', () => {
      const component = setup();
      service.createContributor.mockReturnValue(new Subject<ContributorRead>());
      component.form.controls.github_username.setValue('octocat');

      component.onSubmit();
      fixture.detectChanges();

      const buttons: HTMLButtonElement[] = Array.from(fixture.nativeElement.querySelectorAll('mat-dialog-actions button'));
      expect(buttons.map((b) => b.disabled)).toEqual([true, true]);
      expect(buttons[1].textContent).toContain('Salvando');
      expect(buttons[1].querySelector('mat-spinner')).not.toBeNull();
    });

    it('não envia duas vezes com clique duplo', () => {
      const component = setup();
      service.createContributor.mockReturnValue(new Subject<ContributorRead>());
      component.form.controls.github_username.setValue('octocat');

      component.onSubmit();
      component.onSubmit();

      expect(service.createContributor).toHaveBeenCalledTimes(1);
    });

    it.each([
      ['409', { status: 409, error: { detail: 'Contribuinte já cadastrado' } }],
      ['422', { status: 422, error: { detail: [] } }],
      ['falha de rede', { status: 0, error: null }],
    ])('em erro (%s), continua aberto com os dados preservados', (_caso, error) => {
      const component = setup();
      service.createContributor.mockReturnValue(throwError(() => error));
      component.form.setValue({
        github_username: 'octocat',
        nome: 'Octo',
        avatar_url: '',
        linkedin_url: 'https://www.linkedin.com/in/octo',
        portfolio_url: '',
      });

      component.onSubmit();

      expect(dialogRef.close).not.toHaveBeenCalled();
      expect(component.saving()).toBe(false);
      expect(dialogRef.disableClose).toBe(false);
      expect(component.form.getRawValue()).toEqual({
        github_username: 'octocat',
        nome: 'Octo',
        avatar_url: '',
        linkedin_url: 'https://www.linkedin.com/in/octo',
        portfolio_url: '',
      });
    });

    it('permite tentar de novo depois de um erro', () => {
      const component = setup();
      service.createContributor.mockReturnValueOnce(throwError(() => ({ status: 409 })));
      component.form.controls.github_username.setValue('octocat');

      component.onSubmit();
      component.onSubmit();

      expect(service.createContributor).toHaveBeenCalledTimes(2);
      expect(dialogRef.close).toHaveBeenCalledWith(true);
    });

    it('não envia com formulário inválido', () => {
      const component = setup();
      component.form.controls.linkedin_url.setValue('https://www.linkedin.com/company/x');
      component.form.controls.github_username.setValue('octocat');

      component.onSubmit();

      expect(service.createContributor).not.toHaveBeenCalled();
      expect(component.form.controls.linkedin_url.touched).toBe(true);
    });

    it('Cancelar não fecha durante o envio', () => {
      const component = setup();
      service.createContributor.mockReturnValue(new Subject<ContributorRead>());
      component.form.controls.github_username.setValue('octocat');

      component.onSubmit();
      component.onCancel();

      expect(dialogRef.close).not.toHaveBeenCalled();
    });
  });
});
