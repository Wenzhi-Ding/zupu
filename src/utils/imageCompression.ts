const MAX_DIMENSION = 1200;
const QUALITY = 0.85;
const SIZE_THRESHOLD = 2 * 1024 * 1024; // 2MB

export function shouldCompress(blob: Blob): boolean {
  return blob.size > SIZE_THRESHOLD;
}

export async function compressImage(blob: Blob): Promise<Blob> {
  if (!shouldCompress(blob)) return blob;

  const bitmap = await createImageBitmap(blob);
  const { width, height } = bitmap;

  let newWidth = width;
  let newHeight = height;

  if (width > MAX_DIMENSION || height > MAX_DIMENSION) {
    if (width >= height) {
      newWidth = MAX_DIMENSION;
      newHeight = Math.round((height / width) * MAX_DIMENSION);
    } else {
      newHeight = MAX_DIMENSION;
      newWidth = Math.round((width / height) * MAX_DIMENSION);
    }
  }

  const canvas = document.createElement('canvas');
  canvas.width = newWidth;
  canvas.height = newHeight;
  const ctx = canvas.getContext('2d')!;
  ctx.drawImage(bitmap, 0, 0, newWidth, newHeight);
  bitmap.close();

  const dataUrl = canvas.toDataURL('image/jpeg', QUALITY);
  const arr = dataUrl.split(',');
  const mime = arr[0].match(/:(.*?);/)?.[1] ?? 'image/jpeg';
  const bstr = atob(arr[1]);
  const u8 = new Uint8Array(bstr.length);
  for (let i = 0; i < bstr.length; i++) u8[i] = bstr.charCodeAt(i);
  return new Blob([u8], { type: mime });
}

export function getImageFormat(blob: Blob): string {
  const type = blob.type;
  if (type === 'image/jpeg') return 'jpeg';
  if (type === 'image/png') return 'png';
  if (type === 'image/webp') return 'webp';
  if (type === 'image/gif') return 'gif';
  return 'jpeg';
}
