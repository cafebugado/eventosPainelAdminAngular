export function validateURL(value: string): boolean {
  try {
    const url = new URL(value);
    return url.protocol === 'http:' || url.protocol === 'https:';
  } catch {
    return false;
  }
}

export function isValidLinkedInUrl(value: string): boolean {
  if (!value) return true;
  return /^https?:\/\/(www\.)?linkedin\.com\/.+/i.test(value);
}

export function isValidPortfolioUrl(value: string): boolean {
  if (!value) return true;
  return validateURL(value);
}

export function isValidGitHubUsername(value: string): boolean {
  return /^[a-zA-Z\d](?:[a-zA-Z\d]|-(?=[a-zA-Z\d])){0,38}$/.test(value);
}
