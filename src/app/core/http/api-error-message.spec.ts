import { DEFAULT_ERROR_MESSAGE, formatApiErrorDetail } from './api-error-message';

describe('formatApiErrorDetail', () => {
  it('lista os campos de um 422 do FastAPI', () => {
    const detail = [
      { type: 'value_error', loc: ['body', 'linkedin_url'], msg: 'Value error, linkedin_url invalido' },
      { type: 'missing', loc: ['body', 'github_url'], msg: 'Field required' },
    ];

    expect(formatApiErrorDetail(detail)).toBe('Dados inválidos: LinkedIn (URL inválida), GitHub URL (campo obrigatório)');
  });

  it('usa o nome cru do campo e a mensagem da API quando não há tradução', () => {
    const detail = [{ type: 'value_error', loc: ['body', 'data_inicio'], msg: 'Value error, data no passado' }];

    expect(formatApiErrorDetail(detail)).toBe('Dados inválidos: data_inicio (data no passado)');
  });

  it('limita a três campos e informa quantos ficaram de fora', () => {
    const detail = ['nome', 'avatar_url', 'github_url', 'github_username', 'email'].map((field) => ({
      type: 'missing',
      loc: ['body', field],
      msg: 'Field required',
    }));

    expect(formatApiErrorDetail(detail)).toBe(
      'Dados inválidos: Nome (campo obrigatório), Avatar URL (campo obrigatório), GitHub URL (campo obrigatório) e mais 2 campos',
    );
  });

  it('usa singular quando sobra um campo', () => {
    const detail = ['nome', 'avatar_url', 'github_url', 'email'].map((field) => ({ type: 'missing', loc: ['body', field] }));

    expect(formatApiErrorDetail(detail)).toMatch(/e mais 1 campo$/);
  });

  it('não repete itens idênticos', () => {
    const item = { type: 'missing', loc: ['body', 'nome'], msg: 'Field required' };

    expect(formatApiErrorDetail([item, item])).toBe('Dados inválidos: Nome (campo obrigatório)');
  });

  it('mostra só a mensagem quando o erro é do corpo inteiro', () => {
    const detail = [{ type: 'json_invalid', loc: ['body'], msg: 'JSON decode error' }];

    expect(formatApiErrorDetail(detail)).toBe('Dados inválidos: JSON decode error');
  });

  it('devolve o texto quando detail é string (403, 404, 409)', () => {
    expect(formatApiErrorDetail('Contribuinte já cadastrado')).toBe('Contribuinte já cadastrado');
  });

  it.each([undefined, null, '', 42, {}, [], [null, 'x', 3], [{}]])(
    'usa a mensagem padrão para formato ausente ou inesperado (%j)',
    (detail) => {
      expect(formatApiErrorDetail(detail)).toBe(DEFAULT_ERROR_MESSAGE);
    },
  );

  it('aceita uma mensagem padrão customizada', () => {
    expect(formatApiErrorDetail(undefined, 'Falha de rede')).toBe('Falha de rede');
  });
});
