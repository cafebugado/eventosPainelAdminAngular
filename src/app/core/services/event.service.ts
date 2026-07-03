import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, map, of, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { withRetry } from '../http/api-client';
import { SKIP_ERROR_NOTIFICATION } from '../http/error-notification.context';
import {
  EventoCreate,
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
  readonly loading = signal(false);

  getEvents(): Observable<EventoRead[]> {
    this.loading.set(true);
    return withRetry(this.http.get<EventoRead[]>(`${this.baseUrl}/events`), { context: 'getEvents' }).pipe(
      tap({
        next: (events) => {
          this.events.set(events);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      }),
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
    const events$ = this.events().length ? of(this.events()) : this.getEvents();

    return events$.pipe(
      map((events) =>
        events.some(
          (event) => event.id !== excludeId && this.normalizeName(event.nome) === normalizedName,
        ),
      ),
    );
  }

  createEvent(data: EventoCreate): Observable<EventoRead> {
    return this.http.post<EventoRead>(`${this.baseUrl}/events`, data, {
      context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
    });
  }

  updateEvent(eventId: string, data: EventoUpdate): Observable<EventoRead> {
    return this.http.put<EventoRead>(`${this.baseUrl}/events/${eventId}`, data, {
      context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
    });
  }

  deleteEvent(eventId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/events/${eventId}`);
  }

  upsertLocal(event: EventoRead): void {
    this.events.update((events) => {
      const index = events.findIndex((e) => e.id === event.id);
      if (index === -1) return [event, ...events];
      const copy = [...events];
      copy[index] = event;
      return copy;
    });
  }

  removeLocal(eventId: string): void {
    this.events.update((events) => events.filter((e) => e.id !== eventId));
  }

  publishEvent(eventId: string): Observable<EventoRead> {
    return this.http.post<EventoRead>(`${this.baseUrl}/events/${eventId}/publish`, {});
  }

  getRecommendedEvents(eventId: string): Observable<EventoRead[]> {
    return withRetry(this.http.get<EventoRead[]>(`${this.baseUrl}/events/${eventId}/recommended`), {
      context: 'getRecommendedEvents',
    });
  }

  uploadEventImage(eventId: string, file: File): Observable<EventoRead> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<EventoRead>(`${this.baseUrl}/events/${eventId}/image`, formData);
  }

  deleteEventImage(eventId: string): Observable<EventoRead> {
    return this.http.delete<EventoRead>(`${this.baseUrl}/events/${eventId}/image`);
  }

  private normalizeName(value: string): string {
    return value.trim().toLowerCase();
  }
}
