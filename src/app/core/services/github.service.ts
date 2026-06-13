import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { withRetry } from '../http/api-client';
import { ContributorInfo, GithubCommit, GithubPR, RepoStats } from '../models/github.model';

@Injectable({ providedIn: 'root' })
export class GithubService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getRepoStats(repo: string): Observable<RepoStats> {
    return withRetry(this.http.get<RepoStats>(`${this.baseUrl}/github/repo-stats`, { params: { repo } }), {
      context: 'getRepoStats',
    });
  }

  getRecentCommits(repo: string): Observable<GithubCommit[]> {
    return withRetry(this.http.get<GithubCommit[]>(`${this.baseUrl}/github/commits`, { params: { repo } }), {
      context: 'getRecentCommits',
    });
  }

  getRecentPRs(repo: string): Observable<GithubPR[]> {
    return withRetry(this.http.get<GithubPR[]>(`${this.baseUrl}/github/prs`, { params: { repo } }), {
      context: 'getRecentPRs',
    });
  }

  getTopContributors(repo: string): Observable<ContributorInfo[]> {
    return withRetry(
      this.http.get<ContributorInfo[]>(`${this.baseUrl}/github/contributors`, { params: { repo } }),
      { context: 'getTopContributors' },
    );
  }
}
