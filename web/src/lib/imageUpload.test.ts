import { describe, expect, it, vi } from 'vitest';
import { fitWithin, prepareImageForUpload } from './imageUpload';

const MB = 1024 * 1024;
const photo = (size: number, type = 'image/jpeg', name = 'IMG_7792.JPG') =>
  new File([new Uint8Array(size)], name, { type, lastModified: 42 });

function decoder(width: number, height: number) {
  const release = vi.fn();
  return { release, decode: vi.fn(async () => ({ width, height, draw: vi.fn(), release })) };
}

describe('image upload preparation', () => {
  it('fits the long edge without changing the aspect ratio or enlarging small images', () => {
    expect(fitWithin(4032, 3024)).toEqual({ width: 2560, height: 1920 });
    expect(fitWithin(1290, 2796)).toEqual({ width: 1181, height: 2560 });
    expect(fitWithin(800, 600)).toEqual({ width: 800, height: 600 });
  });

  it('shrinks a large phone photo to a JPEG and keeps its name readable', async () => {
    const { decode, release } = decoder(4032, 3024);
    const encode = vi.fn(async () => new Blob([new Uint8Array(700 * 1024)], { type: 'image/jpeg' }));
    const result = await prepareImageForUpload(photo(5 * MB), { decode, encode });
    expect(encode).toHaveBeenCalledWith(2560, 1920, expect.any(Function));
    expect(result.type).toBe('image/jpeg');
    expect(result.name).toBe('IMG_7792.jpg');
    expect(result.size).toBe(700 * 1024);
    expect(release).toHaveBeenCalled();
  });

  it('leaves small images, GIFs and documents untouched', async () => {
    const decode = vi.fn();
    const small = photo(MB);
    const gif = photo(5 * MB, 'image/gif', 'loop.gif');
    const pdf = photo(5 * MB, 'application/pdf', 'notice.pdf');
    for (const file of [small, gif, pdf]) {
      expect(await prepareImageForUpload(file, { decode })).toBe(file);
    }
    expect(decode).not.toHaveBeenCalled();
  });

  it('keeps the original when decoding fails or re-encoding would not help', async () => {
    const original = photo(3 * MB);
    const failing = vi.fn(async () => { throw new Error('unsupported'); });
    expect(await prepareImageForUpload(original, { decode: failing })).toBe(original);
    const { decode } = decoder(3000, 2000);
    const bigger = vi.fn(async () => new Blob([new Uint8Array(4 * MB)]));
    expect(await prepareImageForUpload(original, { decode, encode: bigger })).toBe(original);
    const empty = vi.fn(async () => null);
    expect(await prepareImageForUpload(original, { decode, encode: empty })).toBe(original);
  });
});
