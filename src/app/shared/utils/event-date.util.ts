const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/** Converte data_evento (DD/MM/YYYY) para o formato do input nativo date (YYYY-MM-DD). */
export function formatDateToInput(value: string | null | undefined): string {
  if (!value) return '';
  const [day, month, year] = value.split('/');
  if (!day || !month || !year) return '';
  return `${year}-${month.padStart(2, '0')}-${day.padStart(2, '0')}`;
}

/** Converte o valor do input nativo date (YYYY-MM-DD) para data_evento (DD/MM/YYYY). */
export function formatDateToDisplay(value: string | null | undefined): string {
  if (!value) return '';
  const [year, month, day] = value.split('-');
  if (!day || !month || !year) return '';
  return `${day.padStart(2, '0')}/${month.padStart(2, '0')}/${year}`;
}

/** Faz o parse de data_evento (DD/MM/YYYY) para um objeto Date. */
export function parseEventDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [day, month, year] = value.split('/').map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
}

/** Retorna o nome do dia da semana em português a partir de uma data YYYY-MM-DD. */
export function getDayName(inputDateValue: string | null | undefined): string {
  if (!inputDateValue) return '';
  const [year, month, day] = inputDateValue.split('-').map(Number);
  if (!day || !month || !year) return '';
  const date = new Date(year, month - 1, day);
  return DAY_NAMES[date.getDay()];
}
