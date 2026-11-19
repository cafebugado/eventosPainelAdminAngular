/** Contrato `ContribuinteCreate` da API. */
export interface ContributorCreate {
  github_username: string;
  nome: string;
  avatar_url: string;
  github_url: string;
  linkedin_url?: string | null;
  portfolio_url?: string | null;
}

/** Contrato `ContribuinteUpdate` da API (todos os campos opcionais). */
export interface ContributorUpdate {
  github_username?: string;
  nome?: string;
  avatar_url?: string;
  github_url?: string;
  linkedin_url?: string | null;
  portfolio_url?: string | null;
}

/** Contrato `ContribuinteRead` da API. */
export interface ContributorRead {
  id: string;
  github_username: string;
  nome: string;
  avatar_url: string;
  github_url: string;
  linkedin_url?: string | null;
  portfolio_url?: string | null;
  created_at: string;
  updated_at: string;
}

export interface GitHubUserInfo {
  login: string;
  name?: string | null;
  avatar_url: string;
  html_url: string;
}
