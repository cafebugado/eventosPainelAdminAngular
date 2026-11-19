import { HttpClient, HttpContext, provideHttpClient, withInterceptors } from '@angular/common/http';
import { HttpTestingController, provideHttpClientTesting } from '@angular/common/http/testing';
import { TestBed } from '@angular/core/testing';
import { Router } from '@angular/router';
import { of } from 'rxjs';
import { NotificationService } from '../../shared/services/notification.service';
import { SKIP_ERROR_NOTIFICATION } from '../http/error-notification.context';
import { AuthService } from '../services/auth.service';
import { errorInterceptor } from './error.interceptor';

describe('errorInterceptor', () => {
  let http: HttpClient;
  let httpMock: HttpTestingController;
  const showNotification = vi.fn();

  beforeEach(() => {
    showNotification.mockReset();
    TestBed.configureTestingModule({
      providers: [
        provideHttpClient(withInterceptors([errorInterceptor])),
        provideHttpClientTesting(),
        { provide: NotificationService, useValue: { showNotification } },
        { provide: AuthService, useValue: { signOut: () => of(undefined) } },
        { provide: Router, useValue: { navigate: vi.fn() } },
      ],
    });
    http = TestBed.inject(HttpClient);
    httpMock = TestBed.inject(HttpTestingController);
  });

  afterEach(() => httpMock.verify());

  function failWith(body: object | null, status: number, statusText: string, context?: HttpContext): void {
    http.get('/api/x', { context }).subscribe({ error: () => undefined });
    httpMock.expectOne('/api/x').flush(body, { status, statusText });
  }

  it('mostra os campos inválidos em um 422 com detail em lista', () => {
    failWith(
      { detail: [{ type: 'missing', loc: ['body', 'github_url'], msg: 'Field required' }] },
      422,
      'Unprocessable Content',
    );

    expect(showNotification).toHaveBeenCalledWith('Dados inválidos: GitHub URL (campo obrigatório)', 'error');
  });

  it.each([403, 404, 409])('mantém a mensagem da API quando detail é texto (%i)', (status) => {
    failWith({ detail: 'Mensagem da API' }, status, 'Erro');

    expect(showNotification).toHaveBeenCalledWith('Mensagem da API', 'error');
  });

  it('usa a mensagem do HttpErrorResponse quando não há detail', () => {
    failWith(null, 400, 'Bad Request');

    expect(showNotification).toHaveBeenCalledWith(expect.stringContaining('400 Bad Request'), 'error');
  });

  it('não notifica quando a requisição usa SKIP_ERROR_NOTIFICATION', () => {
    failWith({ detail: 'x' }, 422, 'Unprocessable Content', new HttpContext().set(SKIP_ERROR_NOTIFICATION, true));

    expect(showNotification).not.toHaveBeenCalled();
  });
});
