import { isValidLinkedInUrl } from './url-validators.util';

describe('isValidLinkedInUrl', () => {
  it.each([
    'https://www.linkedin.com/in/fulano',
    'https://www.linkedin.com/in/fulano/',
    'https://linkedin.com/in/fulano',
    'https://linkedin.com/in/fulano-de_tal%C3%A9',
    '  https://www.linkedin.com/in/fulano  ',
  ])('aceita perfil no formato da API: %s', (value) => {
    expect(isValidLinkedInUrl(value)).toBe(true);
  });

  it.each([
    ['http (exige https)', 'http://linkedin.com/in/fulano'],
    ['página de empresa (exige /in/)', 'https://www.linkedin.com/company/empresa'],
    ['query string', 'https://linkedin.com/in/fulano?utm_source=x'],
    ['perfil vazio', 'https://www.linkedin.com/in/'],
    ['subcaminho após o perfil', 'https://www.linkedin.com/in/fulano/detalhes'],
    ['outro domínio', 'https://www.linkedin.com.br/in/fulano'],
    ['texto solto', 'linkedin.com/in/fulano'],
  ])('rejeita %s', (_caso, value) => {
    expect(isValidLinkedInUrl(value)).toBe(false);
  });

  it.each(['', '   ', null, undefined])('considera vazio como válido (%s)', (value) => {
    expect(isValidLinkedInUrl(value)).toBe(true);
  });
});
