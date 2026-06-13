import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { withRetry } from '../http/api-client';
import { EventTagsMap, SetEventTagsRequest, TagCreate, TagRead, TagUpdate } from '../models/tag.model';

@Injectable({ providedIn: 'root' })
export class TagService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  readonly tags = signal<TagRead[]>([]);
  readonly loading = signal(false);

  getTags(): Observable<TagRead[]> {
    this.loading.set(true);
    return withRetry(this.http.get<TagRead[]>(`${this.baseUrl}/tags`), { context: 'getTags' }).pipe(
      tap({
        next: (tags) => {
          this.tags.set(tags);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      }),
    );
  }

  createTag(data: TagCreate): Observable<TagRead> {
    return this.http.post<TagRead>(`${this.baseUrl}/tags`, data);
  }

  updateTag(tagId: string, data: TagUpdate): Observable<TagRead> {
    return this.http.put<TagRead>(`${this.baseUrl}/tags/${tagId}`, data);
  }

  deleteTag(tagId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/tags/${tagId}`);
  }

  getEventTags(eventId: string): Observable<TagRead[]> {
    return withRetry(this.http.get<TagRead[]>(`${this.baseUrl}/events/${eventId}/tags`), {
      context: 'getEventTags',
    });
  }

  setEventTags(eventId: string, tagIds: string[]): Observable<TagRead[]> {
    const body: SetEventTagsRequest = { tag_ids: tagIds };
    return this.http.put<TagRead[]>(`${this.baseUrl}/events/${eventId}/tags`, body);
  }

  getAllEventTags(): Observable<EventTagsMap> {
    return withRetry(this.http.get<EventTagsMap>(`${this.baseUrl}/events/tags-map`), {
      context: 'getAllEventTags',
    });
  }
}
