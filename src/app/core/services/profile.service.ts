import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { withRetry } from '../http/api-client';
import { UserProfileRead, UserProfileUpsert } from '../models/user.model';

@Injectable({ providedIn: 'root' })
export class ProfileService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  readonly profile = signal<UserProfileRead | null>(null);
  readonly loading = signal(false);

  getMyProfile(): Observable<UserProfileRead> {
    this.loading.set(true);
    return withRetry(this.http.get<UserProfileRead>(`${this.baseUrl}/users/me/profile`), {
      context: 'getMyProfile',
    }).pipe(
      tap({
        next: (profile) => {
          this.profile.set(profile);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      }),
    );
  }

  upsertMyProfile(data: UserProfileUpsert): Observable<UserProfileRead> {
    return this.http.put<UserProfileRead>(`${this.baseUrl}/users/me/profile`, data).pipe(
      tap((profile) => this.profile.set(profile)),
    );
  }
}
