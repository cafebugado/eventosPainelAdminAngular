import { ContributorCreate } from '../../../../core/models/contributor.model';

/** Valores crus do formulário de contribuinte. */
export interface ContributorFormValue {
  github_username: string;
  nome: string;
  avatar_url: string;
  linkedin_url: string;
  portfolio_url: string;
}

export function defaultGitHubUrl(username: string): string {
  return `https://github.com/${username}`;
}

export function defaultAvatarUrl(username: string): string {
  return `https://github.com/${username}.png`;
}

/**
 * Monta o corpo de `POST /contributors` e `PUT /contributors/{id}` no formato da API.
 *
 * - aplica `trim` em todos os campos;
 * - `nome` vazio vira o username e `avatar_url` vazio vira o avatar do GitHub;
 * - `github_url` usa o endereço devolvido pela busca no GitHub, quando houver,
 *   ou `https://github.com/<username>`;
 * - `linkedin_url` e `portfolio_url` vazios são enviados como `null` (a API rejeita `""`).
 */
export function buildContributorPayload(value: ContributorFormValue, githubUrl?: string | null): ContributorCreate {
  const username = value.github_username.trim();

  return {
    github_username: username,
    nome: value.nome.trim() || username,
    avatar_url: value.avatar_url.trim() || defaultAvatarUrl(username),
    github_url: githubUrl?.trim() || defaultGitHubUrl(username),
    linkedin_url: value.linkedin_url.trim() || null,
    portfolio_url: value.portfolio_url.trim() || null,
  };
}
