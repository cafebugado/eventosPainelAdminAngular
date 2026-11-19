export const GITHUB_USER_NOT_FOUND_MESSAGE = 'Usuário do GitHub não encontrado';
export const GITHUB_UNAVAILABLE_MESSAGE = 'Não foi possível consultar o GitHub. Preencha os dados manualmente.';

/**
 * Hoje a API responde 502 tanto para usuário inexistente quanto para falha da
 * integração, e o motivo vem no texto (ex.: "Falha ao consultar a API do GitHub: 404").
 * O 404 direto também é tratado, para quando cafebugado/eventosBackend#6 for resolvida.
 */
export function isGitHubUserNotFound(error: unknown): boolean {
  const { status, error: body } = (error ?? {}) as { status?: unknown; error?: { detail?: unknown } | null };
  if (status === 404) return true;
  const detail = body?.detail;
  return status === 502 && typeof detail === 'string' && /github\D*\b404\b/i.test(detail);
}

/** Mensagem única exibida quando a busca no GitHub falha. */
export function describeGitHubLookupError(error: unknown): string {
  return isGitHubUserNotFound(error) ? GITHUB_USER_NOT_FOUND_MESSAGE : GITHUB_UNAVAILABLE_MESSAGE;
}
