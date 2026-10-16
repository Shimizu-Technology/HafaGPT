/**
 * Shrink large phone photos before upload. A 12MP photo is several megabytes;
 * readable text needs far fewer pixels, and a smaller upload finishes faster on
 * mobile data and reaches the tutor sooner. Any failure keeps the original file.
 */
export const MAX_IMAGE_EDGE = 2560;
const JPEG_QUALITY = 0.88;
const SMALL_ENOUGH_BYTES = 1.5 * 1024 * 1024;
// GIFs may be animated; re-encoding would keep only one frame.
const RESIZABLE_TYPES = new Set(['image/jpeg', 'image/png', 'image/webp']);

export function fitWithin(width: number, height: number, maxEdge = MAX_IMAGE_EDGE) {
  const scale = Math.min(1, maxEdge / Math.max(width, height));
  return { width: Math.max(1, Math.round(width * scale)), height: Math.max(1, Math.round(height * scale)) };
}

interface DecodedImage {
  width: number;
  height: number;
  draw: (context: CanvasRenderingContext2D, width: number, height: number) => void;
  release: () => void;
}

async function decodeImage(file: File): Promise<DecodedImage> {
  const url = URL.createObjectURL(file);
  const image = new Image();
  try {
    image.src = url;
    await image.decode();
  } catch (error) {
    URL.revokeObjectURL(url);
    throw error;
  }
  // Browsers apply EXIF orientation to decoded <img> dimensions and drawing.
  return {
    width: image.naturalWidth,
    height: image.naturalHeight,
    draw: (context, width, height) => context.drawImage(image, 0, 0, width, height),
    release: () => {
      URL.revokeObjectURL(url);
      image.src = '';
    },
  };
}

function encodeJpeg(width: number, height: number, draw: DecodedImage['draw']): Promise<Blob | null> {
  const canvas = document.createElement('canvas');
  canvas.width = width;
  canvas.height = height;
  const context = canvas.getContext('2d');
  if (!context) return Promise.resolve(null);
  // JPEG has no transparency; keep transparent screenshots readable.
  context.fillStyle = '#ffffff';
  context.fillRect(0, 0, width, height);
  draw(context, width, height);
  return new Promise(resolve => canvas.toBlob(blob => {
    // Release the bitmap now; Safari keeps large canvases alive otherwise.
    canvas.width = 0;
    canvas.height = 0;
    resolve(blob);
  }, 'image/jpeg', JPEG_QUALITY));
}

export async function prepareImageForUpload(
  file: File,
  { decode = decodeImage, encode = encodeJpeg }: { decode?: typeof decodeImage; encode?: typeof encodeJpeg } = {},
): Promise<File> {
  if (!RESIZABLE_TYPES.has(file.type) || file.size <= SMALL_ENOUGH_BYTES) return file;
  let decoded: DecodedImage | null = null;
  try {
    decoded = await decode(file);
    const target = fitWithin(decoded.width, decoded.height);
    const blob = await encode(target.width, target.height, decoded.draw);
    if (!blob || blob.size >= file.size) return file;
    const name = file.name.replace(/\.[^./\\]+$/, '') || 'photo';
    return new File([blob], `${name}.jpg`, { type: 'image/jpeg', lastModified: file.lastModified });
  } catch {
    return file;
  } finally {
    decoded?.release();
  }
}

/**
 * Prepare every attachment in order, one at a time: decoding ten 12MP photos at
 * once can exhaust an iPhone Safari tab. Documents pass through unchanged.
 */
export async function prepareFilesForUpload(files: File[]): Promise<File[]> {
  const prepared: File[] = [];
  for (const file of files) prepared.push(await prepareImageForUpload(file));
  return prepared;
}
