export interface RepoStats {
  stars: number;
  forks: number;
  open_issues: number;
  open_prs: number;
  commits_count?: number;
}

export interface GithubCommit {
  sha: string;
  message: string;
  author: string;
  date: string;
  html_url: string;
}

export interface GithubPR {
  number: number;
  title: string;
  state: 'merged' | 'open' | 'closed';
  user: string;
  html_url: string;
  created_at: string;
}

export interface ContributorInfo {
  login: string;
  avatar_url: string;
  contributions: number;
  html_url: string;
}
