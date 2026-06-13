export interface GaleriaFotoRead {
  id: string;
  album_id: string;
  url: string;
  legenda?: string | null;
  uploaded_by?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GaleriaAlbumCreate {
  evento_id?: string | null;
  comunidade_id?: string | null;
}

export interface GaleriaAlbumUpdate {
  evento_id?: string | null;
  comunidade_id?: string | null;
}

export interface GaleriaAlbumRead {
  id: string;
  evento_id?: string | null;
  comunidade_id?: string | null;
  created_by?: string | null;
  created_at: string;
  updated_at: string;
  fotos: GaleriaFotoRead[];
}
