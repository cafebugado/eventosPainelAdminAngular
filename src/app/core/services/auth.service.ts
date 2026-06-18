import { HttpClient } from '@angular/common/http';
import { Injectable, computed, inject, signal } from '@angular/core';
import { Observable, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import {
  AuthSession,
  AuthUser,
  LoginRequest,
  OAuthUrlResponse,
  RegisterRequest,
  RegisterResponse,
  UpdatePasswordRequest,
} from '../models/auth.model';

const SESSION_STORAGE_KEY = 'eventos_admin_session';
const OAUTH_PROVIDER_STORAGE_KEY = 'eventos_admin_oauth_provider';

/**
 * Auth contra o backend (`/auth/*`). Login devolve `AuthSession` (access_token
 * + dados do usuário, incluindo role). Esse token é enviado como Bearer em
 * todas as outras chamadas via `authInterceptor`.
 */
@Injectable({ providedIn: 'root' })
export class AuthService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  private readonly sessionSignal = signal<AuthSession | null>(this.loadSession());

  readonly session = this.sessionSignal.asReadonly();
  readonly isAuthenticated = computed(() => this.sessionSignal() !== null);
  readonly currentUser = computed<AuthUser | null>(() => this.sessionSignal()?.user ?? null);
  readonly accessToken = computed(() => this.sessionSignal()?.access_token ?? null);

  signIn(email: string, password: string): Observable<AuthSession> {
    const body: LoginRequest = { email, password };
    return this.http.post<AuthSession>(`${this.baseUrl}/auth/login`, body).pipe(
      tap((session) => this.setSession(session)),
    );
  }

  signOut(): Observable<void> {
    this.clearSession();
    return of(undefined);
  }

  getSession(): AuthSession | null {
    return this.sessionSignal();
  }

  getCurrentUser(): AuthUser | null {
    return this.currentUser();
  }

  register(data: RegisterRequest): Observable<RegisterResponse> {
    return this.http.post<RegisterResponse>(`${this.baseUrl}/auth/register`, data).pipe(
      tap((response) => {
        if (!response.confirmacao_pendente && response.access_token && response.user) {
          this.setSession({
            access_token: response.access_token,
            user: response.user,
          });
        }
      }),
    );
  }

  getOAuthUrl(provider: 'github' | 'google'): Observable<OAuthUrlResponse> {
    sessionStorage.setItem(OAUTH_PROVIDER_STORAGE_KEY, provider);
    return this.http.get<OAuthUrlResponse>(`${this.baseUrl}/auth/oauth/${provider}`);
  }

  oauthCallback(code: string, provider: 'github' | 'google'): Observable<AuthSession> {
    return this.http.post<AuthSession>(`${this.baseUrl}/auth/oauth/callback`, { code, provider }).pipe(
      tap((session) => this.setSession(session)),
    );
  }

  consumeOAuthProvider(): 'github' | 'google' {
    const provider = sessionStorage.getItem(OAUTH_PROVIDER_STORAGE_KEY) as 'github' | 'google' | null;
    sessionStorage.removeItem(OAUTH_PROVIDER_STORAGE_KEY);
    return provider ?? 'github';
  }

  requestPasswordReset(email: string): Observable<void> {
    return this.http.post<void>(`${this.baseUrl}/auth/reset-password`, { email });
  }

  updatePassword(senhaAtual: string, novaSenha: string): Observable<void> {
    const body: UpdatePasswordRequest = { senha_atual: senhaAtual, nova_senha: novaSenha };
    return this.http.post<void>(`${this.baseUrl}/auth/update-password`, body);
  }

  private setSession(session: AuthSession): void {
    this.sessionSignal.set(session);
    localStorage.setItem(SESSION_STORAGE_KEY, JSON.stringify(session));
  }

  private clearSession(): void {
    this.sessionSignal.set(null);
    localStorage.removeItem(SESSION_STORAGE_KEY);
  }

  private loadSession(): AuthSession | null {
    const raw = localStorage.getItem(SESSION_STORAGE_KEY);
    if (!raw) return null;
    try {
      return JSON.parse(raw) as AuthSession;
    } catch {
      return null;
    }
  }
}
