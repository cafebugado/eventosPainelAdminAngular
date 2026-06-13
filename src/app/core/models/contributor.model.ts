export interface ContributorCreate {
  github_username: string;
  nome?: string | null;
  avatar_url?: string | null;
  linkedin_url?: string | null;
  portfolio_url?: string | null;
}

export interface ContributorUpdate {
  github_username?: string;
  nome?: string | null;
  avatar_url?: string | null;
  linkedin_url?: string | null;
  portfolio_url?: string | null;
}

export interface ContributorRead {
  id: string;
  github_username: string;
  nome?: string | null;
  avatar_url?: string | null;
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
