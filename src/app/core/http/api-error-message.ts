export const DEFAULT_ERROR_MESSAGE = 'Erro inesperado';

/** Quantidade máxima de campos listados na notificação de erro de validação. */
export const MAX_VALIDATION_FIELDS = 3;

/** Item de `detail` devolvido pelo FastAPI em erros de validação (422). */
interface ValidationErrorItem {
  type?: unknown;
  loc?: unknown;
  msg?: unknown;
}

const FIELD_LABELS: Record<string, string> = {
  github_username: 'Username do GitHub',
  github_url: 'GitHub URL',
  linkedin_url: 'LinkedIn',
  portfolio_url: 'Portfolio',
  avatar_url: 'Avatar URL',
  nome: 'Nome',
  email: 'E-mail',
  password: 'Senha',
};

const TYPE_MESSAGES: Record<string, string> = {
  missing: 'campo obrigatório',
  string_too_short: 'muito curto',
  string_too_long: 'muito longo',
  url_parsing: 'URL inválida',
  url_scheme: 'URL inválida',
};

function isValidationItem(value: unknown): value is ValidationErrorItem {
  return typeof value === 'object' && value !== null;
}

/** Último segmento de `loc` (nome do campo), ou `null` se não houver campo. */
function fieldName(loc: unknown): string | null {
  if (!Array.isArray(loc) || loc.length === 0) return null;
  const last = loc[loc.length - 1];
  if (typeof last !== 'string' && typeof last !== 'number') return null;
  const field = String(last);
  // `loc: ["body"]` indica o corpo inteiro, não um campo.
  return field === 'body' ? null : field;
}

function reasonFor(item: ValidationErrorItem, field: string | null): string | null {
  const type = typeof item.type === 'string' ? item.type : '';
  if (TYPE_MESSAGES[type]) return TYPE_MESSAGES[type];
  if (field?.endsWith('_url') && type === 'value_error') return 'URL inválida';
  if (typeof item.msg !== 'string' || !item.msg.trim()) return null;
  return item.msg.replace(/^Value error,\s*/i, '').trim();
}

function describeItem(item: unknown): string | null {
  if (!isValidationItem(item)) return null;
  const field = fieldName(item.loc);
  const label = field ? (FIELD_LABELS[field] ?? field) : null;
  const reason = reasonFor(item, field);
  if (label && reason) return `${label} (${reason})`;
  return label ?? reason;
}

/**
 * Converte o `detail` de uma resposta de erro da API em uma mensagem para o usuário.
 *
 * - texto (403, 404, 409...): devolvido como está;
 * - lista (422 do FastAPI): "Dados inválidos: Campo (motivo), ..." com até
 *   {@link MAX_VALIDATION_FIELDS} campos;
 * - ausente ou em formato inesperado: `fallback`.
 */
export function formatApiErrorDetail(detail: unknown, fallback: string = DEFAULT_ERROR_MESSAGE): string {
  if (typeof detail === 'string') return detail.trim() || fallback;
  if (!Array.isArray(detail)) return fallback;

  const parts = [...new Set(detail.map(describeItem).filter((part): part is string => !!part))];
  if (parts.length === 0) return fallback;

  const shown = parts.slice(0, MAX_VALIDATION_FIELDS).join(', ');
  const remaining = parts.length - MAX_VALIDATION_FIELDS;
  const suffix = remaining > 0 ? ` e mais ${remaining} ${remaining === 1 ? 'campo' : 'campos'}` : '';
  return `Dados inválidos: ${shown}${suffix}`;
}
