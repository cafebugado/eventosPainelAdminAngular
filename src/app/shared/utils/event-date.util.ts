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

/** Converte um Date para o formato ISO YYYY-MM-DD (sem barras), usado em query params de URL. */
export function formatDateToIso(value: Date | null | undefined): string {
  if (!value) return '';
  const day = String(value.getDate()).padStart(2, '0');
  const month = String(value.getMonth() + 1).padStart(2, '0');
  const year = value.getFullYear();
  return `${year}-${month}-${day}`;
}

/** Converte uma data ISO YYYY-MM-DD para DD/MM/YYYY. Retorna o valor original se não bater o padrão. */
export function isoDateToDisplay(value: string): string {
  const match = /^(\d{4})-(\d{2})-(\d{2})$/.exec(value);
  if (!match) return value;
  const [, year, month, day] = match;
  return `${day}/${month}/${year}`;
}

/** Retorna o nome do dia da semana em português a partir de um Date. */
export function getDayName(value: Date | null | undefined): string {
  if (!value) return '';
  return DAY_NAMES[value.getDay()];
}

/** Deduz o período do dia (Matinal/Vespertino/Noturno) a partir do horário (HH:mm). */
export function getPeriodoFromHorario(value: string | null | undefined): 'Matinal' | 'Vespertino' | 'Noturno' | null {
  if (!value) return null;
  const [hours] = value.split(':').map(Number);
  if (Number.isNaN(hours)) return null;
  if (hours >= 5 && hours < 12) return 'Matinal';
  if (hours >= 12 && hours < 18) return 'Vespertino';
  return 'Noturno';
}
