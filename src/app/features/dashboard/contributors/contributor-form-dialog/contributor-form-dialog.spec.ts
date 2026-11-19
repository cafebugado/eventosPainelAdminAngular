import { TestBed } from '@angular/core/testing';
import { MAT_DIALOG_DATA, MatDialogRef } from '@angular/material/dialog';
import { Observable, of, throwError } from 'rxjs';
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

  function setup(data: ContributorFormDialogData = {}): ContributorFormDialog {
    service = {
      fetchGitHubUser: vi.fn(),
      createContributor: vi.fn(),
      updateContributor: vi.fn(),
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
    const fixture = TestBed.createComponent(ContributorFormDialog);
    fixture.detectChanges();
    return fixture.componentInstance;
  }

  /** Payload enviado no último salvamento. */
  function submittedPayload(): unknown {
    return dialogRef.close.mock.lastCall?.[0];
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
});
