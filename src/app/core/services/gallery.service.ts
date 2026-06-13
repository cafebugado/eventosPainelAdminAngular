import { HttpClient } from '@angular/common/http';
import { Injectable, inject, signal } from '@angular/core';
import { Observable, tap } from 'rxjs';
import { environment } from '../../../environments/environment';
import { withRetry } from '../http/api-client';
import { GaleriaAlbumCreate, GaleriaAlbumRead, GaleriaAlbumUpdate, GaleriaFotoRead } from '../models/gallery.model';

@Injectable({ providedIn: 'root' })
export class GalleryService {
  private readonly http = inject(HttpClient);
  private readonly baseUrl = environment.apiUrl;

  readonly albums = signal<GaleriaAlbumRead[]>([]);
  readonly loading = signal(false);

  getAlbuns(): Observable<GaleriaAlbumRead[]> {
    this.loading.set(true);
    return withRetry(this.http.get<GaleriaAlbumRead[]>(`${this.baseUrl}/gallery/albums`), {
      context: 'getAlbuns',
    }).pipe(
      tap({
        next: (albums) => {
          this.albums.set(albums);
          this.loading.set(false);
        },
        error: () => this.loading.set(false),
      }),
    );
  }

  createAlbum(data: GaleriaAlbumCreate): Observable<GaleriaAlbumRead> {
    return this.http.post<GaleriaAlbumRead>(`${this.baseUrl}/gallery/albums`, data);
  }

  updateAlbum(albumId: string, data: GaleriaAlbumUpdate): Observable<GaleriaAlbumRead> {
    return this.http.put<GaleriaAlbumRead>(`${this.baseUrl}/gallery/albums/${albumId}`, data);
  }

  deleteAlbum(albumId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/gallery/albums/${albumId}`);
  }

  uploadFoto(albumId: string, file: File): Observable<GaleriaFotoRead> {
    const formData = new FormData();
    formData.append('file', file);
    return this.http.post<GaleriaFotoRead>(`${this.baseUrl}/gallery/albums/${albumId}/photos`, formData);
  }

  addFotoByUrl(albumId: string, url: string): Observable<GaleriaFotoRead> {
    return this.http.post<GaleriaFotoRead>(`${this.baseUrl}/gallery/albums/${albumId}/photos/url`, { url });
  }

  updateFotoLegenda(fotoId: string, legenda: string): Observable<GaleriaFotoRead> {
    return this.http.put<GaleriaFotoRead>(`${this.baseUrl}/gallery/photos/${fotoId}`, { legenda });
  }

  deleteFoto(fotoId: string): Observable<void> {
    return this.http.delete<void>(`${this.baseUrl}/gallery/photos/${fotoId}`);
  }
}
