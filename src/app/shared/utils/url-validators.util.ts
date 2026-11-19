export function validateURL(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

/**
 * Mesma regra da API (`app/schemas/contribuinte.py`):
 * `^https://(www\.)?linkedin\.com/in/[A-Za-z0-9\-_%]+/?$`
 */
const LINKEDIN_PROFILE_URL = /^https:\/\/(www\.)?linkedin\.com\/in\/[A-Za-z0-9\-_%]+\/?$/;

export function isValidLinkedInUrl(value: string | null | undefined): boolean {
  const trimmed = value?.trim();
  if (!trimmed) return true;
  return LINKEDIN_PROFILE_URL.test(trimmed);
}

export function isValidPortfolioUrl(value: string): boolean {
  if (!value) return true;
  return validateURL(value);
}

export function isValidGitHubUsername(value: string): boolean {
  return /^[a-zA-Z\d](?:[a-zA-Z\d]|-(?=[a-zA-Z\d])){0,38}$/.test(value);
}
