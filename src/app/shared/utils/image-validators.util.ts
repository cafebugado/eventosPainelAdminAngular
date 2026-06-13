export const MAX_IMAGE_SIZE_BYTES = 5 * 1024 * 1024;

export interface ImageValidationResult {
  valid: boolean;
  error?: string;
}

export function validateImageFile(file: File): ImageValidationResult {
  if (!file.type.startsWith('image/')) {
    return { valid: false, error: 'O arquivo precisa ser uma imagem.' };
  }
  if (file.size > MAX_IMAGE_SIZE_BYTES) {
    return { valid: false, error: 'A imagem deve ter no máximo 5 MB.' };
  }
  return { valid: true };
}
