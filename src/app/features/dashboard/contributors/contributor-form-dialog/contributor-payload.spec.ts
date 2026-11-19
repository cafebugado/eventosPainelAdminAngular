import { buildContributorPayload, ContributorFormValue } from './contributor-payload';

function formValue(overrides: Partial<ContributorFormValue> = {}): ContributorFormValue {
  return { github_username: 'octocat', nome: '', avatar_url: '', linkedin_url: '', portfolio_url: '', ...overrides };
}

describe('buildContributorPayload', () => {
  it('com apenas o username, preenche nome, avatar e github_url e envia null nos opcionais', () => {
    expect(buildContributorPayload(formValue())).toEqual({
      github_username: 'octocat',
      nome: 'octocat',
      avatar_url: 'https://github.com/octocat.png',
      github_url: 'https://github.com/octocat',
      linkedin_url: null,
      portfolio_url: null,
    });
  });

  it('mantém os valores informados, sem espaços nas pontas', () => {
    const payload = buildContributorPayload(
      formValue({
        github_username: '  octocat ',
        nome: ' The Octocat ',
        avatar_url: ' https://avatars.githubusercontent.com/u/583231 ',
        linkedin_url: ' https://www.linkedin.com/in/octocat ',
        portfolio_url: ' https://octocat.dev ',
      }),
    );

    expect(payload).toEqual({
      github_username: 'octocat',
      nome: 'The Octocat',
      avatar_url: 'https://avatars.githubusercontent.com/u/583231',
      github_url: 'https://github.com/octocat',
      linkedin_url: 'https://www.linkedin.com/in/octocat',
      portfolio_url: 'https://octocat.dev',
    });
  });

  it('trata campos só com espaços como vazios', () => {
    const payload = buildContributorPayload(formValue({ nome: '   ', avatar_url: ' ', linkedin_url: '  ', portfolio_url: ' ' }));

    expect(payload.nome).toBe('octocat');
    expect(payload.avatar_url).toBe('https://github.com/octocat.png');
    expect(payload.linkedin_url).toBeNull();
    expect(payload.portfolio_url).toBeNull();
  });

  it('usa o github_url informado (busca no GitHub ou valor salvo)', () => {
    const payload = buildContributorPayload(formValue(), 'https://github.com/OctoCat');

    expect(payload.github_url).toBe('https://github.com/OctoCat');
  });

  it.each([null, undefined, '', '  '])('cai no endereço padrão quando o github_url informado é vazio (%j)', (url) => {
    expect(buildContributorPayload(formValue(), url).github_url).toBe('https://github.com/octocat');
  });

  it('sempre contém github_url', () => {
    expect(buildContributorPayload(formValue({ github_username: 'fulano' }))).toHaveProperty(
      'github_url',
      'https://github.com/fulano',
    );
  });
});
