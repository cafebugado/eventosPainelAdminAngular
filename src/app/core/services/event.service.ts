import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { withRetry } from '../http/api-client';
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

  createEvent(data: EventoCreate): Observable<EventoRead> {
    return this.http.post<EventoRead>(`${this.baseUrl}/events`, data);
  }

  updateEvent(eventId: string, data: EventoUpdate): Observable<EventoRead> {
    return this.http.put<EventoRead>(`${this.baseUrl}/events/${eventId}`, data);
  }

  deleteEvent(eventId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/events/${eventId}`);
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
}
