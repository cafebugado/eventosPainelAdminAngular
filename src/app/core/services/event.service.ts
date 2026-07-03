import { HttpClient, HttpContext, HttpParams } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, finalize, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { withRetry } from '../http/api-client';
import { SKIP_ERROR_NOTIFICATION } from '../http/error-notification.context';
import {
  EventoCreate,
  EventoPage,
  EventoPageFilters,
  EventoPeriodo,
  EventoRead,
  EventoStats,
  EventoUpdate,
  EventoWithTags,
} from '../models/evento.model';

@Injectable({ providedIn: 'root' })
export class EventService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  readonly events = signal<EventoRead[]>([]);
  readonly pagedEvents = signal<EventoRead[]>([]);
  readonly eventsTotal = signal(0);
  readonly loading = signal(false);
  private readonly eventPageCache = new Map<string, EventoPage>();
  private loadedAllEvents = false;

  getEvents(): Observable<EventoRead[]> {
    this.loading.set(true);
    return withRetry(this.http.get<EventoRead[]>(`${this.baseUrl}/events`), {
      context: 'getEvents',
    }).pipe(
      tap({
        next: (events) => {
          this.events.set(events);
          this.loadedAllEvents = true;
        },
      }),
      finalize(() => this.loading.set(false)),
    );
  }

  getEventsPage(filters: EventoPageFilters): Observable<EventoPage> {
    const page = Math.max(1, filters.page);
    const pageSize = Math.max(1, filters.pageSize);
    const search = filters.search?.trim() ?? '';
    const cacheKey = this.buildEventPageCacheKey({ ...filters, page, pageSize, search });
    const cachedPage = this.eventPageCache.get(cacheKey);

    if (cachedPage) {
      this.pagedEvents.set(cachedPage.items);
      this.eventsTotal.set(cachedPage.total);
      return of(cachedPage);
    }

    let params = new HttpParams().set('page', String(page)).set('page_size', String(pageSize));

    if (filters.status) {
      params = params.set('status', filters.status);
    }

    if (search) {
      params = params.set('search', search);
    }

    this.loading.set(true);

    return withRetry(this.http.get<EventoPage>(`${this.baseUrl}/events`, { params }), {
      context: 'getEventsPage',
    }).pipe(
      tap((eventPage) => {
        this.eventPageCache.set(cacheKey, eventPage);
        this.pagedEvents.set(eventPage.items);
        this.eventsTotal.set(eventPage.total);
      }),
      finalize(() => this.loading.set(false)),
    );
  }

  getPublishedEvents(): Observable<EventoRead[]> {
    return withRetry(this.http.get<EventoRead[]>(`${this.baseUrl}/events/published`), {
      context: 'getPublishedEvents',
    });
  }

  getUpcomingEvents(): Observable<EventoRead[]> {
    return withRetry(this.http.get<EventoRead[]>(`${this.baseUrl}/events/upcoming`), {
      context: 'getUpcomingEvents',
    });
  }

  getEventStats(): Observable<EventoStats> {
    return withRetry(this.http.get<EventoStats>(`${this.baseUrl}/events/stats`), {
      context: 'getEventStats',
    });
  }

  getEventsByPeriod(periodo: EventoPeriodo): Observable<EventoRead[]> {
    return withRetry(this.http.get<EventoRead[]>(`${this.baseUrl}/events/by-period/${periodo}`), {
      context: 'getEventsByPeriod',
    });
  }

  getEventBySlugOrId(slugOrId: string): Observable<EventoWithTags> {
    return withRetry(this.http.get<EventoWithTags>(`${this.baseUrl}/events/slug/${slugOrId}`), {
      context: 'getEventBySlugOrId',
    });
  }

  getEvent(eventId: string): Observable<EventoRead> {
    return withRetry(this.http.get<EventoRead>(`${this.baseUrl}/events/${eventId}`), {
      context: 'getEvent',
    });
  }

  eventNameExists(nome: string, excludeId?: string): Observable<boolean> {
    const normalizedName = this.normalizeName(nome);
    const events$ = this.loadedAllEvents ? of(this.events()) : this.getEvents();

    return events$.pipe(
      map((events) =>
        events.some(
          (event) => event.id !== excludeId && this.normalizeName(event.nome) === normalizedName,
        ),
      ),
    );
  }

  createEvent(data: EventoCreate): Observable<EventoRead> {
    return this.http
      .post<EventoRead>(`${this.baseUrl}/events`, data, {
        context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
      })
      .pipe(tap((event) => this.upsertLocal(event)));
  }

  updateEvent(eventId: string, data: EventoUpdate): Observable<EventoRead> {
    return this.http
      .put<EventoRead>(`${this.baseUrl}/events/${eventId}`, data, {
        context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
      })
      .pipe(tap((event) => this.upsertLocal(event)));
  }

  deleteEvent(eventId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/events/${eventId}`);
  }

  upsertLocal(event: EventoRead): void {
    const upsert = (events: EventoRead[]) => {
      const index = events.findIndex((e) => e.id === event.id);
      if (index === -1) return [event, ...events];
      const copy = [...events];
      copy[index] = event;
      return copy;
    };

    this.events.update(upsert);
    this.pagedEvents.update((events) => {
      if (!events.some((e) => e.id === event.id)) return events;
      return upsert(events);
    });
    this.clearEventPageCache();
  }

  removeLocal(eventId: string): void {
    this.events.update((events) => events.filter((e) => e.id !== eventId));
    this.pagedEvents.update((events) => events.filter((e) => e.id !== eventId));
    this.eventsTotal.update((total) => Math.max(0, total - 1));
    this.clearEventPageCache();
  }

  publishEvent(eventId: string): Observable<EventoRead> {
    return this.http
      .post<EventoRead>(`${this.baseUrl}/events/${eventId}/publish`, {})
      .pipe(tap((event) => this.upsertLocal(event)));
  }

  getRecommendedEvents(eventId: string): Observable<EventoRead[]> {
    return withRetry(this.http.get<EventoRead[]>(`${this.baseUrl}/events/${eventId}/recommended`), {
      context: 'getRecommendedEvents',
    });
  }

  uploadEventImage(eventId: string, file: File): Observable<EventoRead> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http
      .post<EventoRead>(`${this.baseUrl}/events/${eventId}/image`, formData)
      .pipe(tap((event) => this.upsertLocal(event)));
  }

  deleteEventImage(eventId: string): Observable<EventoRead> {
    return this.http
      .delete<EventoRead>(`${this.baseUrl}/events/${eventId}/image`)
      .pipe(tap((event) => this.upsertLocal(event)));
  }

  private buildEventPageCacheKey(filters: EventoPageFilters): string {
    return JSON.stringify({
      page: filters.page,
      pageSize: filters.pageSize,
      status: filters.status ?? 'todos',
      search: filters.search?.trim().toLowerCase() ?? '',
    });
  }

  private clearEventPageCache(): void {
    this.eventPageCache.clear();
  }

  private normalizeName(value: string): string {
    return value.trim().toLowerCase();
  }
}
