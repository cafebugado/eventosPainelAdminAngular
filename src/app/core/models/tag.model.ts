export interface TagCreate {
  nome: string;
  cor?: string;
}

export interface TagUpdate {
  nome?: string;
  cor?: string;
}

export interface TagRead {
  id: string;
  nome: string;
  cor: string;
  created_at: string;
  updated_at: string;
}

export interface SetEventTagsRequest {
  tag_ids: string[];
}

export interface EventTagsMap {
  [eventoId: string]: string[];
}
