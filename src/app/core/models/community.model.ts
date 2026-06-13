export interface CommunityCreate {
  nome: string;
}

export interface CommunityUpdate {
  nome?: string;
}

export interface CommunityRead {
  id: string;
  nome: string;
  created_at: string;
  updated_at: string;
}
