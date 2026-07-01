import { HttpClient, HttpContext } from '@angular/common/http';
import { Injectable, inject } from '@angular/core';
import { Observable, map, of, tap } from 'rxjs';
import { SKIP_ERROR_NOTIFICATION } from '../../core/http/error-notification.context';

export interface BrazilCity {
  id: number;
  nome: string;
}

interface IbgeCityResponse {
  id: number;
  nome: string;
}

@Injectable({ providedIn: 'root' })
export class BrazilLocationService {
  private readonly http = inject(HttpClient);
  private readonly citiesByState = new Map<string, BrazilCity[]>();

  getCitiesByState(uf: string): Observable<BrazilCity[]> {
    const normalizedUf = uf.trim().toUpperCase();
    if (!normalizedUf) return of([]);

    const cachedCities = this.citiesByState.get(normalizedUf);
    if (cachedCities) return of(cachedCities);

    return this.http
      .get<IbgeCityResponse[]>(
        `https://servicodados.ibge.gov.br/api/v1/localidades/estados/${normalizedUf}/municipios`,
        {
          context: new HttpContext().set(SKIP_ERROR_NOTIFICATION, true),
          params: { orderBy: 'nome' },
        },
      )
      .pipe(
        map((cities) => cities.map(({ id, nome }) => ({ id, nome }))),
        tap((cities) => this.citiesByState.set(normalizedUf, cities)),
      );
  }
}
