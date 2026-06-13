import { HttpClient, HttpParams } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable } from 'rxjs';
import { environment } from '../../../environments/environment';
import { withRetry } from '../http/api-client';
import { AuditLogFilters, AuditLogPage, AuditUser } from '../models/audit.model';

@Injectable({ providedIn: 'root' })
export class AuditService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  getAuditLogs(filters: AuditLogFilters = {}): Observable<AuditLogPage> {
    let params = new HttpParams();
    Object.entries(filters).forEach(([key, value]) => {
      if (value !== undefined && value !== null && value !== '') {
        params = params.set(key, String(value));
      }
    });

    return withRetry(this.http.get<AuditLogPage>(`${this.baseUrl}/audit-logs`, { params }), {
      context: 'getAuditLogs',
    });
  }

  getAuditUsers(): Observable<AuditUser[]> {
    return withRetry(this.http.get<AuditUser[]>(`${this.baseUrl}/audit-logs/users`), {
      context: 'getAuditUsers',
    });
  }
}
