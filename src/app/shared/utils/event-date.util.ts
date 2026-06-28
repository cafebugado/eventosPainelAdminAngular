const DAY_NAMES = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

/** Faz o parse de data_evento (DD/MM/YYYY) para um objeto Date. */
export function parseEventDate(value: string | null | undefined): Date | null {
  if (!value) return null;
  const [day, month, year] = value.split('/').map(Number);
  if (!day || !month || !year) return null;
  return new Date(year, month - 1, day);
}

/** Converte data_evento (DD/MM/YYYY) para um objeto Date, para popular o Datepicker. */
export function formatDateToInput(value: string | null | undefined): Date | null {
  return parseEventDate(value);
}

/** Converte o Date selecionado no Datepicker para data_evento (DD/MM/YYYY). */
export function formatDateToDisplay(value: Date | null | undefined): string {
  if (!value) return '';
  const day = String(value.getDate()).padStart(2, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const year = value.getFullYear();
  return `${day}/${month}/${year}`;
}

/** Retorna o nome do dia da semana em português a partir de um Date. */
export function getDayName(value: Date | null | undefined): string {
  if (!value) return '';
  return DAY_NAMES[value.getDay()];
}
