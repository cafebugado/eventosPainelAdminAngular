import {
  describeGitHubLookupError,
  GITHUB_UNAVAILABLE_MESSAGE,
  GITHUB_USER_NOT_FOUND_MESSAGE,
  isGitHubUserNotFound,
} from './github-lookup-error';

describe('describeGitHubLookupError', () => {
  it.each([
    ['404 direto da API', { status: 404, error: { detail: 'Not Found' } }],
    ['502 com motivo 404 do GitHub', { status: 502, error: { detail: 'Falha ao consultar a API do GitHub: 404' } }],
  ])('identifica usuário inexistente: %s', (_caso, error) => {
    expect(isGitHubUserNotFound(error)).toBe(true);
    expect(describeGitHubLookupError(error)).toBe(GITHUB_USER_NOT_FOUND_MESSAGE);
  });

  it.each([
    ['token inválido (502 com 401)', { status: 502, error: { detail: 'Falha ao consultar a API do GitHub: 401' } }],
    ['502 sem detail', { status: 502, error: null }],
    ['falha de rede', { status: 0, error: new ProgressEvent('error') }],
    ['500', { status: 500, error: { detail: 'Internal Server Error' } }],
    ['valor inesperado', undefined],
  ])('trata como integração indisponível: %s', (_caso, error) => {
    expect(isGitHubUserNotFound(error)).toBe(false);
    expect(describeGitHubLookupError(error)).toBe(GITHUB_UNAVAILABLE_MESSAGE);
  });
});
