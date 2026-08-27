import { readFile, readdir, stat } from 'node:fs/promises';
import path from 'node:path';

const distDirectory = path.resolve('dist');
const assetsDirectory = path.join(distDirectory, 'assets');
const maxInitialBytes = 400 * 1024;
const maxChunkBytes = 450 * 1024;

const indexHtml = await readFile(path.join(distDirectory, 'index.html'), 'utf8');
const entryMatch = indexHtml.match(/<script[^>]+src="\/assets\/([^"]+\.js)"/);

if (!entryMatch) {
  throw new Error('Could not find the production JavaScript entry in dist/index.html.');
}

const javascriptFiles = (await readdir(assetsDirectory)).filter((file) => file.endsWith('.js'));
const sizes = await Promise.all(
  javascriptFiles.map(async (file) => ({
    file,
    bytes: (await stat(path.join(assetsDirectory, file))).size,
  })),
);

const entry = sizes.find(({ file }) => file === entryMatch[1]);
if (!entry) {
  throw new Error(`Could not inspect production entry asset ${entryMatch[1]}.`);
}

const modulePreloadFiles = [...indexHtml.matchAll(/<link\b[^>]*>/g)].flatMap(([tag]) => {
  if (!/\brel=["']modulepreload["']/.test(tag)) return [];
  const href = tag.match(/\bhref=["']\/assets\/([^"']+\.js)["']/);
  return href ? [href[1]] : [];
});
const initialFiles = [...new Set([entry.file, ...modulePreloadFiles])];
const initialChunks = initialFiles.map((file) => {
  const chunk = sizes.find((size) => size.file === file);
  if (!chunk) {
    throw new Error(`Could not inspect initial JavaScript asset ${file}.`);
  }
  return chunk;
});
const initialBytes = initialChunks.reduce((total, chunk) => total + chunk.bytes, 0);

const oversizedChunks = sizes.filter(({ bytes }) => bytes > maxChunkBytes);
const formatKilobytes = (bytes) => `${(bytes / 1024).toFixed(1)} KiB`;

if (initialBytes > maxInitialBytes || oversizedChunks.length > 0) {
  const failures = [];

  if (initialBytes > maxInitialBytes) {
    failures.push(
      `initial JavaScript is ${formatKilobytes(initialBytes)} across ` +
        `${initialChunks.length} chunks (limit ${formatKilobytes(maxInitialBytes)})`,
    );
  }

  for (const chunk of oversizedChunks) {
    failures.push(
      `chunk ${chunk.file} is ${formatKilobytes(chunk.bytes)} (limit ${formatKilobytes(maxChunkBytes)})`,
    );
  }

  throw new Error(`Production bundle budget exceeded:\n- ${failures.join('\n- ')}`);
}

const largestChunk = sizes.reduce((largest, chunk) =>
  chunk.bytes > largest.bytes ? chunk : largest,
);

console.log(
  `Bundle budget passed: initial JavaScript ${formatKilobytes(initialBytes)} ` +
    `across ${initialChunks.length} chunks, ` +
    `largest chunk ${formatKilobytes(largestChunk.bytes)}, ${sizes.length} JavaScript chunks.`,
);
