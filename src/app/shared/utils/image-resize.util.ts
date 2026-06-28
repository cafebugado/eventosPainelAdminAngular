export interface ResizeImageOptions {
  maxWidth?: number;
  maxHeight?: number;
  quality?: number;
}

export async function resizeImageFile(
  file: File,
  { maxWidth = 1600, maxHeight = 1600, quality = 0.82 }: ResizeImageOptions = {},
): Promise<File> {
  if (!file.type.startsWith('image/') || file.type === 'image/svg+xml') {
    return file;
  }

  const bitmap = await createImageBitmap(file);
  const scale = Math.min(1, maxWidth / bitmap.width, maxHeight / bitmap.height);

  if (scale >= 1) {
    bitmap.close();
    return file;
  }

  const width = Math.round(bitmap.width * scale);
  const height = Math.round(bitmap.height * scale);

  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const ctx = canvas.getContext('2d');
  if (!ctx) {
    bitmap.close();
    return file;
  }

  ctx.drawImage(bitmap, 0, 0, width, height);
  bitmap.close();

  const outputType = file.type === 'image/png' ? 'image/png' : 'image/jpeg';
  const blob = await new Promise<Blob | null>((resolve) => canvas.toBlob(resolve, outputType, quality));
  if (!blob) return file;

  return new File([blob], file.name, { type: outputType, lastModified: Date.now() });
}
