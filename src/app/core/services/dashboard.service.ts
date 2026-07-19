import { HttpClient } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { withRetry } from '../http/api-client';
import { DashboardSummary } from '../models/dashboard.model';

@Injectable({ providedIn: 'root' })
export class DashboardService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getSummary(): Observable<DashboardSummary> {
    return withRetry(this.http.get<DashboardSummary>(`${this.baseUrl}/dashboard/summary`), {
      context: 'getDashboardSummary',
    });
  }
}
