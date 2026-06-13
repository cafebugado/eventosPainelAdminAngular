import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { withRetry } from '../http/api-client';
import {
  ContributorCreate,
  ContributorRead,
  ContributorUpdate,
  GitHubUserInfo,
} from '../models/contributor.model';

@Injectable({ providedIn: 'root' })
export class ContributorService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  readonly contributors = signal<ContributorRead[]>([]);
  readonly loading = signal(false);

  getContributors(): Observable<ContributorRead[]> {
    this.loading.set(true);
    return withRetry(this.http.get<ContributorRead[]>(`${this.baseUrl}/contributors`), {
      context: 'getContributors',
    }).pipe(
      tap({
        next: (contributors) => {
          this.contributors.set(contributors);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      }),
    );
  }

  getContributor(contributorId: string): Observable<ContributorRead> {
    return withRetry(this.http.get<ContributorRead>(`${this.baseUrl}/contributors/${contributorId}`), {
      context: 'getContributor',
    });
  }

  createContributor(data: ContributorCreate): Observable<ContributorRead> {
    return this.http.post<ContributorRead>(`${this.baseUrl}/contributors`, data);
  }

  updateContributor(contributorId: string, data: ContributorUpdate): Observable<ContributorRead> {
    return this.http.put<ContributorRead>(`${this.baseUrl}/contributors/${contributorId}`, data);
  }

  deleteContributor(contributorId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/contributors/${contributorId}`);
  }

  fetchGitHubUser(username: string): Observable<GitHubUserInfo> {
    return this.http.get<GitHubUserInfo>(`${this.baseUrl}/contributors/github/${username}`);
  }
}
