import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { withRetry } from '../http/api-client';
import { CommunityCreate, CommunityRead, CommunityUpdate } from '../models/community.model';

@Injectable({ providedIn: 'root' })
export class CommunityService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  readonly communities = signal<CommunityRead[]>([]);
  readonly loading = signal(false);

  getCommunities(): Observable<CommunityRead[]> {
    this.loading.set(true);
    return withRetry(this.http.get<CommunityRead[]>(`${this.baseUrl}/communities`), {
      context: 'getCommunities',
    }).pipe(
      tap({
        next: (communities) => {
          this.communities.set(communities);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      }),
    );
  }

  createCommunity(data: CommunityCreate): Observable<CommunityRead> {
    return this.http.post<CommunityRead>(`${this.baseUrl}/communities`, data);
  }

  updateCommunity(communityId: string, data: CommunityUpdate): Observable<CommunityRead> {
    return this.http.put<CommunityRead>(`${this.baseUrl}/communities/${communityId}`, data);
  }

  deleteCommunity(communityId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/communities/${communityId}`);
  }
}
